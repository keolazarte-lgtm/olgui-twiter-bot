import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
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
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename)
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await db.tweetContent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tweet content:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
