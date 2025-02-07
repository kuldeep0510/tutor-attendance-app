import { Suspense } from "react"
import { getStudents } from "../actions/studentActions"
import { StudentListClient } from "./StudentListClient"

export async function StudentList() {
  let data
  try {
    data = await getStudents(1, 10) // Initial page with 10 items
  } catch (error) {
    console.error("Failed to fetch students:", error)
    data = { students: [], totalCount: 0, currentPage: 1, totalPages: 0 }
  }

  return (
    <Suspense fallback={<div className="text-center py-4 text-muted-foreground">Loading students...</div>}>
      <StudentListClient 
        initialStudents={data.students}
        totalCount={data.totalCount}
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />
    </Suspense>
  )
}

export default StudentList
