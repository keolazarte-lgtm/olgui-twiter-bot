import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  matcher: ['/campus/:path*', '/admin/:path*', '/login'],
}
