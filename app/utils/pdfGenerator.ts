import { jsPDF } from 'jspdf'
import autoTable, { RowInput, Color } from 'jspdf-autotable'
import { format } from 'date-fns'
import { supabase } from "@/app/lib/supabase"

interface BillData {
  studentName: string
  startDate: Date
  endDate: Date
  presentDays: number
  dailyCharge: number
  totalAmount: number
}

async function getAttendanceData(
  studentId: string, 
  startDate: string, 
  endDate: string
) {
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })

  const attendanceMap = new Map()
  attendance?.forEach(record => {
    attendanceMap.set(record.date, record.status)
  })

  const dailyRecords = []
  let currentDate = new Date(startDate)
  const end = new Date(endDate)
  
  while (currentDate <= end) {
    const dateStr = format(currentDate, "yyyy-MM-dd")
    const status = attendanceMap.get(dateStr) || "absent"
    dailyRecords.push({
      date: dateStr,
      day: format(currentDate, "EEE"),
      status: status,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dailyRecords
}

export async function generateBillPDF(data: BillData & { studentId: string }): Promise<string> {
  const doc = new jsPDF()
  const dailyAttendance = await getAttendanceData(
    data.studentId,
    format(data.startDate, "yyyy-MM-dd"),
    format(data.endDate, "yyyy-MM-dd")
  )

  // Add header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Tuition Bill', 105, 20, { align: 'center' })

  // Add student details first
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Student Name: ${data.studentName}`, 20, 40)
  doc.text(`Bill Date: ${format(new Date(), 'dd MMM yyyy')}`, 20, 50)
  doc.text(`Period: ${format(data.startDate, 'dd MMM yyyy')} to ${format(data.endDate, 'dd MMM yyyy')}`, 20, 60)

  // Add total amount
  doc.setFillColor(41, 128, 185)
  doc.rect(15, 70, 180, 15, 'F')
  doc.setTextColor(255)
  doc.setFontSize(14)
  doc.text(`Total Amount Due: Rs ${data.totalAmount}/-`, 105, 80, { align: 'center' })

  // Add daily attendance table
  const tableRows: RowInput[] = dailyAttendance.map(record => [
    format(new Date(record.date), 'dd MMM yyyy'),
    record.day,
    {
      content: record.status === 'present' ? 'Present' : 'Absent',
      styles: {
        fillColor: record.status === 'present' ? [46, 204, 113] as Color : [231, 76, 60] as Color,
        textColor: 255,
        fontSize: 10,
        cellPadding: 1,
        minCellHeight: 5
      }
    },
    {
      content: record.status === 'present' ? `Rs ${data.dailyCharge}` : `Rs 0`,
      styles: {
        fontSize: 10,
        cellPadding: 1,
        minCellHeight: 5
      }
    }
  ])

  autoTable(doc, {
    startY: 95,
    head: [['Date', 'Day', 'Status', 'Fee']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185] as Color, 
      textColor: 255,
      fontStyle: 'bold',
      cellPadding: 1,
      fontSize: 10,
      minCellHeight: 5
    },
    styles: { 
      cellPadding: 1,
      fontSize: 10,
      minCellHeight: 5,
      cellWidth: 'auto'
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 }
    },
    margin: { left: 20, right: 20 }
  })

  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text('Summary:', 20, finalY)
  doc.text(`Total Days: ${dailyAttendance.length}`, 20, finalY + 8)
  doc.text(`Present Days: ${data.presentDays}`, 20, finalY + 16)
  doc.text(`Daily Charge: Rs ${data.dailyCharge}/-`, 20, finalY + 24)
  doc.setFillColor(41, 128, 185)
  doc.rect(15, finalY + 28, 180, 12, 'F')
  doc.setTextColor(255)
  doc.setFontSize(12)
  doc.text(`Total Amount: Rs ${data.totalAmount}/-`, 105, finalY + 36, { align: 'center' })

  // Add footer
  doc.setTextColor(0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Please make the payment at your earliest convenience using the UPI link provided.', 20, finalY + 55)
  doc.text('Thank you for your cooperation!', 20, finalY + 63)

  // Get PDF as base64 string
  return doc.output('datauristring')
}
