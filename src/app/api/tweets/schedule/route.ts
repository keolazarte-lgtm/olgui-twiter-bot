import { db } from '@/lib/db'
import { isTurso, tursoGetSchedules, tursoCreateSchedule, tursoDeleteSchedule, tursoToggleSchedule } from '@/lib/turso'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    if (isTurso()) {
      const schedules = await tursoGetSchedules()
      return NextResponse.json(schedules)
    }

    const schedules = await db.tweetSchedule.findMany({
      orderBy: { hourUtc: 'asc' },
    })
    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (isTurso()) {
      const schedule = await tursoCreateSchedule({ hourUtc: body.hourUtc, timezone: body.timezone })
      return NextResponse.json(schedule, { status: 201 })
    }

    const schedule = await db.tweetSchedule.create({
      data: {
        hourUtc: body.hourUtc,
        timezone: body.timezone,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (isTurso()) {
      await tursoToggleSchedule(body.id, body.isActive)
      const schedules = await tursoGetSchedules()
      const updated = schedules.find(s => s.id === body.id)
      return NextResponse.json(updated)
    }

    const schedule = await db.tweetSchedule.update({
      where: { id: body.id },
      data: { isActive: body.isActive },
    })
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    if (isTurso()) {
      await tursoDeleteSchedule(id)
      return NextResponse.json({ success: true })
    }

    await db.tweetSchedule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
