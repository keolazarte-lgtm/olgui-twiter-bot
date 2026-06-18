import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Track visit on every non-API, non-static page
  // We do this by firing an internal fetch to /api/track-visit (which runs on Node runtime)
  // because middleware runs on Edge runtime and cannot import the DB layer directly.
  if (!pathname.startsWith('/_next/') && !pathname.startsWith('/favicon') && !pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               null
    const userAgent = request.headers.get('user-agent') || null
    const referer = request.headers.get('referer') || null

    // Build absolute URL for the internal track endpoint
    const trackUrl = new URL('/api/track-visit', request.url)
    fetch(trackUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip,
        userAgent,
        path: pathname,
        referer,
        method: request.method,
      }),
      // Don't wait — fire and forget
    }).catch(() => {})
  }

  // Allow API routes and static files through
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Allow login page
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Allow admin login page
  if (pathname === '/admin/login') {
    // If already logged in as admin, redirect to dashboard
    const token = request.cookies.get('da_token')?.value
    if (token) {
      const payload = await verifyToken(token)
      if (payload && payload.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Protect /campus/* routes
  if (pathname.startsWith('/campus')) {
    const token = request.cookies.get('da_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('da_token')
      return response
    }

    // If user is inactive and trying to access a module page, redirect to campus (where they see payment)
    if (payload.active === 0 && pathname.startsWith('/campus/modulo')) {
      return NextResponse.redirect(new URL('/campus', request.url))
    }

    // If user is active, don't let them stay on pending page
    if (payload.active === 1 && pathname === '/campus/pending') {
      return NextResponse.redirect(new URL('/campus', request.url))
    }

    return NextResponse.next()
  }

  // Protect /admin routes (except /admin/login which is handled above)
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('da_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      // Non-admin users get redirected to their login or campus
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      if (!payload) {
        response.cookies.delete('da_token')
      }
      return response
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all pages EXCEPT API routes and Next.js internals
  // (track-visit endpoint is hit internally by middleware itself)
  matcher: ['/((?!api|_next/static|_next/image|favicon|.*\\..*).*)'],
}
