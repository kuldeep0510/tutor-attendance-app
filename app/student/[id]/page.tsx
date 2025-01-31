import { Suspense } from "react"
import { getStudentById } from "../../actions/studentActions"
import { AttendanceCalendar } from "../../components/AttendanceCalendar"
import { GenerateBillButton } from "../../components/GenerateBillButton"
import { Layout } from "../../components/Layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AttendanceMarker } from "@/app/components/AttendanceMarker"
import { DaysCounter } from "@/app/components/DaysCounter"
import { CollapsibleStudentDetails } from "@/app/components/CollapsibleStudentDetails"

export default async function StudentPage({ params }: { params: { id: string } }) {
  let student = null
  let error = null

  try {
    student = await getStudentById(params.id)
  } catch (e) {
    console.error("Failed to fetch student:", e)
    error = "Student not found or failed to load."
  }

  if (error || !student) {
    return (
      <Layout>
        <div className="space-y-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                {error || "Student not found."}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Student Details Section */}
        <CollapsibleStudentDetails student={student} />

        {/* Attendance Actions */}
        <AttendanceMarker studentId={student.id} whatsappNumber={student.whatsapp_number} />

        {/* Attendance & Billing Section */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6">
          <Card className="hover:shadow-lg transition-shadow order-2 md:order-1">
            <CardContent className="p-4 md:p-6 overflow-x-auto">
              <Suspense fallback={<div className="text-center py-4 text-muted-foreground">Loading calendar...</div>}>
                <AttendanceCalendar studentId={student.id} />
              </Suspense>
            </CardContent>
          </Card>

          <div className="space-y-6 order-1 md:order-2">
            <DaysCounter studentId={student.id} />
            <GenerateBillButton studentId={student.id} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
