import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const niche = searchParams.get('niche')
    const platform = searchParams.get('platform')
    const followerRange = searchParams.get('followerRange')
    const collabType = searchParams.get('collabType')
    const search = searchParams.get('search')

    const where: any = { isActive: true }

    if (niche && niche !== 'all') {
      where.niches = { contains: niche }
    }
    if (platform && platform !== 'all') {
      where.platforms = { contains: platform }
    }
    if (followerRange && followerRange !== 'all') {
      where.followerRange = followerRange
    }
    if (collabType && collabType !== 'all') {
      where.collabTypes = { contains: collabType }
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { bio: { contains: search } },
        { niches: { contains: search } },
      ]
    }

    const creators = await db.creator.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(creators)
  } catch (error) {
    console.error('Error fetching creators:', error)
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const creator = await db.creator.create({
      data: {
        name: body.name,
        username: body.username,
        bio: body.bio,
        niches: body.niches,
        platforms: body.platforms,
        followerRange: body.followerRange,
        collabTypes: body.collabTypes,
        location: body.location || null,
        twitter: body.twitter || null,
        instagram: body.instagram || null,
        onlyfans: body.onlyfans || null,
        fansly: body.fansly || null,
        website: body.website || null,
        avatarUrl: body.avatarUrl || null,
      },
    })

    return NextResponse.json(creator, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    console.error('Error creating creator:', error)
    return NextResponse.json({ error: 'Failed to create creator' }, { status: 500 })
  }
}
