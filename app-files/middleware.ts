import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const isLoginPage = requestUrl.pathname === "/login"

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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)"],
}
