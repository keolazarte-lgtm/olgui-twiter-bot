/**
 * Storage abstraction for images.
 * - Development: saves to public/uploads/ (local filesystem)
 * - Production (Vercel): stores as base64 data URL in database (FREE, no Vercel Blob needed)
 *   Images are compressed to max 800px and JPEG quality 70 to keep size manageable
 */

import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

const isProduction = process.env.VERCEL === '1'

export interface StorageResult {
  url: string       // Public URL or data URL to access the file
  isLocal: boolean  // Whether it's stored locally on filesystem
}

/**
 * Compress and convert an image buffer to a base64 data URL
 * Uses sharp to resize and compress before storing
 */
async function compressToDataUrl(buffer: Buffer, contentType: string): Promise<string> {
  try {
    const sharp = (await import('sharp')).default
    const compressed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer()
    const base64 = compressed.toString('base64')
    return `data:image/jpeg;base64,${base64}`
  } catch {
    // If sharp fails, use raw base64 (shouldn't happen but fallback)
    const base64 = buffer.toString('base64')
    return `data:${contentType};base64,${base64}`
  }
}

/**
 * Upload a file - stores as data URL (production) or local file (development)
 */
export async function uploadFile(file: File): Promise<StorageResult> {
  if (isProduction) {
    // In production: compress, convert to base64 data URL, store in DB
    // This is FREE - no Vercel Blob needed!
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const contentType = file.type || 'image/png'
    const dataUrl = await compressToDataUrl(buffer, contentType)
    return { url: dataUrl, isLocal: false }
  }

  // Local filesystem storage (development)
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  try {
    await mkdir(uploadDir, { recursive: true })
  } catch { /* dir exists */ }

  const filepath = path.join(uploadDir, safeName)
  await writeFile(filepath, buffer)
  return { url: `/uploads/${safeName}`, isLocal: true }
}

/**
 * Upload a buffer with a filename - for canvas-rendered images
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/png'
): Promise<StorageResult> {
  if (isProduction) {
    // In production: compress and convert to base64 data URL
    const dataUrl = await compressToDataUrl(buffer, contentType)
    return { url: dataUrl, isLocal: false }
  }

  // Local filesystem storage (development)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  try {
    await mkdir(uploadDir, { recursive: true })
  } catch { /* dir exists */ }

  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, buffer)
  return { url: `/uploads/${filename}`, isLocal: true }
}

/**
 * Delete a file - only applies to local filesystem
 * Data URLs in the DB are deleted when the DB row is deleted
 */
export async function deleteFile(url: string): Promise<void> {
  if (url.startsWith('data:')) {
    // Data URL - nothing to delete (stored in DB, deleted with row)
    return
  }

  if (url.startsWith('/') || url.startsWith('/uploads/')) {
    // Local file
    try {
      const filepath = path.join(process.cwd(), 'public', url)
      await unlink(filepath)
    } catch { /* file may not exist */ }
    return
  }

  // External URL (old Vercel Blob) - nothing we can do
  return
}

/**
 * Get the full public URL for a stored file
 * Handles local paths, data URLs, and cloud URLs
 */
export function getPublicUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('data:')) return url  // Base64 data URL
  if (url.startsWith('http')) return url   // Cloud URL
  if (url.startsWith('/')) return url       // Local path
  return `/${url}`
}
