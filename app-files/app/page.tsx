import { Layout } from "./components/Layout"
import { StudentList } from "./components/StudentList"
import { AddStudentButton } from "./components/AddStudentButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Separator } from "@/components/ui/separator"

export const revalidate = 0 // Disable caching for this page

export default async function Dashboard() {
  return (
    <Layout>
      <div className="space-y-8 w-full max-w-full overflow-hidden">
        {/* Quick Actions Section */}
        <section className="w-full">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">Add new students or perform common tasks</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <AddStudentButton />
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Students List Section */}
        <section className="w-full">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Students</h2>
            <p className="text-sm text-muted-foreground">View and manage your students</p>
          </div>
          <div className="w-full max-w-full overflow-x-hidden">
            <ErrorBoundary fallback={
              <Card className="border-destructive">
                <CardContent className="p-6">
                  <div className="text-destructive">Something went wrong. Please try again later.</div>
                </CardContent>
              </Card>
            }>
              <StudentList />
            </ErrorBoundary>
          </div>
        </section>
      </div>
    </Layout>
  )
}
