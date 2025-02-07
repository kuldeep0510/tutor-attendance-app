import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const isLoginPage = requestUrl.pathname === "/login"
  const isAuthCallback = requestUrl.pathname.startsWith("/auth/callback")
  const isWhatsAppApi = requestUrl.pathname.startsWith("/api/")
  
  // Skip middleware for auth callback and WhatsApp API routes
  if (isAuthCallback || isWhatsAppApi) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    }
  )

  // Check auth status
  const { data: { session } } = await supabase.auth.getSession()

  // If user is not signed in and not on login page, redirect to login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If user is signed in and on login page, redirect to home
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth/callback (OAuth callback)
     * - api routes (WhatsApp API)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api).*)',
  ],
}
