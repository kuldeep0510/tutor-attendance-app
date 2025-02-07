import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const error_description = requestUrl.searchParams.get("error_description")

  // Handle OAuth error response
  if (error) {
    console.error("OAuth error:", error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (!code) {
    console.error("No code in callback")
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=No authorization code received`
    )
  }

  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      }
    )
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error("Session exchange error:", exchangeError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!data.session) {
      console.error("No session data received")
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=Failed to create session`
      )
    }

    // Log successful auth
    console.log("Auth successful, redirecting to home")
    return NextResponse.redirect(requestUrl.origin)

  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent("An unexpected error occurred")}`
    )
  }
}
