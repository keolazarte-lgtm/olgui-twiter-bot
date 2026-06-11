import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const content = await db.tweetContent.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(content)
  } catch (error) {
    console.error('Error fetching tweet content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const type = formData.get('type') as string
    const text = formData.get('text') as string
    const file = formData.get('media') as File | null

    let mediaUrl: string | null = null

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      
      // Ensure upload directory exists
      try {
        const { mkdir } = await import('fs/promises')
        await mkdir(uploadDir, { recursive: true })
      } catch { /* dir exists */ }
      
      const filepath = path.join(uploadDir, filename)
      await writeFile(filepath, buffer)
      mediaUrl = `/uploads/${filename}`
    }

    const content = await db.tweetContent.create({
      data: {
        type: type || 'phrase_hot',
        text: text || '',
        mediaUrl,
      },
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    console.error('Error creating tweet content:', error)
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      updateData.status = status
      updateData.postedAt = status === 'posted' ? new Date() : null
    }
    
    const content = await db.tweetContent.update({
      where: { id },
      data: updateData,
    })
    
    return NextResponse.json(content)
  } catch (error) {
    console.error('Error updating tweet content:', error)
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // Get content to delete associated file
    const content = await db.tweetContent.findUnique({ where: { id } })
    if (content?.mediaUrl) {
      try {
        const filepath = path.join(process.cwd(), 'public', content.mediaUrl)
        await unlink(filepath)
      } catch { /* file may not exist */ }
    }

    await db.tweetContent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tweet content:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
