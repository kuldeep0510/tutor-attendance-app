import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, BookOpen } from "lucide-react"
import { GoogleSignInButton } from "@/app/components/GoogleSignInButton"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-muted/30">
      <div className="w-full max-w-sm px-4 py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TutorTrack</h1>
          <p className="text-sm text-muted-foreground">
            Attendance & Billing Management
          </p>
        </div>

        {searchParams.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {decodeURIComponent(searchParams.error)}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSignInButton />
            <p className="text-xs text-center text-muted-foreground mt-4">
              Use your Google account to sign in
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
