/**
 * Storage abstraction for images.
 * - Development: saves to public/uploads/ (local filesystem)
 * - Production (Vercel): uses Vercel Blob (cloud storage)
 */

import { put, del } from '@vercel/blob'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

const isProduction = process.env.VERCEL === '1'

export interface StorageResult {
  url: string       // Public URL to access the file
  isLocal: boolean  // Whether it's stored locally
}

/**
 * Upload a file - automatically chooses local or Vercel Blob based on environment
 */
export async function uploadFile(file: File): Promise<StorageResult> {
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  if (isProduction) {
    // Vercel Blob storage (cloud)
    const blob = await put(safeName, file, {
      access: 'public',
      contentType: file.type || 'image/png',
    })
    return { url: blob.url, isLocal: false }
  }

  // Local filesystem storage (development)
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
    // Vercel Blob storage (cloud)
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    })
    return { url: blob.url, isLocal: false }
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
 * Delete a file - automatically chooses local or Vercel Blob based on URL
 */
export async function deleteFile(url: string): Promise<void> {
  if (url.startsWith('/') || url.startsWith('/uploads/')) {
    // Local file
    try {
      const filepath = path.join(process.cwd(), 'public', url)
      await unlink(filepath)
    } catch { /* file may not exist */ }
    return
  }

  // Vercel Blob - delete by URL
  if (url.includes('blob.vercel-storage.com') || url.includes('public.blob.vercel-storage.com')) {
    try {
      await del(url)
    } catch (error) {
      console.error('Error deleting blob:', error)
    }
    return
  }
}

/**
 * Get the full public URL for a stored file
 * Handles both local paths (/uploads/...) and cloud URLs
 */
export function getPublicUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url  // Already a full URL (cloud)
  if (url.startsWith('/')) return url      // Local path, served by Next.js
  return `/${url}`
}
