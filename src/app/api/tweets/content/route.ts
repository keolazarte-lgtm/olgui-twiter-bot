import { db } from '@/lib/db'
import { isTurso, tursoGetContent, tursoCreateContent, tursoUpdateContent, tursoDeleteContent } from '@/lib/turso'
import { uploadFile, deleteFile } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    if (isTurso()) {
      const content = await tursoGetContent()
      return NextResponse.json(content)
    }

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
      const result = await uploadFile(file)
      mediaUrl = result.url
    }

    if (isTurso()) {
      const content = await tursoCreateContent({ type: type || 'phrase_hot', text: text || '', mediaUrl })
      return NextResponse.json(content, { status: 201 })
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

    if (isTurso()) {
      const content = await tursoUpdateContent(id, { status })
      return NextResponse.json(content)
    }

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

    if (isTurso()) {
      await tursoDeleteContent(id)
      return NextResponse.json({ success: true })
    }

    // Get content to delete associated file
    const content = await db.tweetContent.findUnique({ where: { id } })
    if (content?.mediaUrl) {
      await deleteFile(content.mediaUrl)
    }

    await db.tweetContent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tweet content:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
