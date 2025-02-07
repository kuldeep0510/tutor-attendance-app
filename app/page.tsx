import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Layout } from "./components/Layout"
import { Card, CardContent } from "@/components/ui/card"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Separator } from "@/components/ui/separator"

// Dynamic imports for components not needed immediately
const AddStudentButton = dynamic(() => import("./components/AddStudentButton").then(mod => mod.AddStudentButton), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md"></div>
  ),
})

const StudentList = dynamic(() => import("./components/StudentList").then(mod => mod.StudentList), {
  ssr: true,
  loading: () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-md"></div>
      ))}
    </div>
  ),
})

// Enable ISR with 60 second revalidation
export const revalidate = 60

export default async function Dashboard() {
  return (
    <Layout>
      <div className="space-y-8 w-full max-w-full overflow-hidden">
        {/* Quick Actions Section */}
        <section className="w-full">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">
              Add new students or perform common tasks
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Suspense
                  fallback={
                    <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md"></div>
                  }
                >
                  <AddStudentButton />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Students List Section */}
        <section className="w-full">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Students</h2>
            <p className="text-sm text-muted-foreground">
              View and manage your students
            </p>
          </div>
          <div className="w-full max-w-full overflow-x-hidden">
            <ErrorBoundary
              fallback={
                <Card className="border-destructive">
                  <CardContent className="p-6">
                    <div className="text-destructive">
                      Something went wrong. Please try again later.
                    </div>
                  </CardContent>
                </Card>
              }
            >
              <Suspense
                fallback={
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 bg-muted/20 animate-pulse rounded-md"
                      ></div>
                    ))}
                  </div>
                }
              >
                <StudentList />
              </Suspense>
            </ErrorBoundary>
          </div>
        </section>
      </div>
    </Layout>
  )
}
