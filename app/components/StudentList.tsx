import { Suspense } from "react"
import { getStudents } from "../actions/studentActions"
import { StudentListClient } from "./StudentListClient"

export async function StudentList() {
  let students
  try {
    students = await getStudents()
  } catch (error) {
    console.error("Failed to fetch students:", error)
    students = []
  }

  return (
    <Suspense fallback={<div className="text-center py-4 text-muted-foreground">Loading students...</div>}>
      <StudentListClient initialStudents={students} />
    </Suspense>
  )
}
