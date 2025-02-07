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
  doc.text(`Student Name: ${data.studentName}`, 20, 35)
  doc.text(`Bill Date: ${format(new Date(), 'dd MMM yyyy')}`, 20, 45)
  doc.text(`Period: ${format(data.startDate, 'dd MMM yyyy')} to ${format(data.endDate, 'dd MMM yyyy')}`, 20, 55)

  // Add total amount
  doc.setFillColor(41, 128, 185)
  doc.rect(15, 65, 180, 15, 'F')
  doc.setTextColor(255)
  doc.setFontSize(14)
  doc.text(`Total Amount Due: Rs ${data.totalAmount}/-`, 105, 75, { align: 'center' })

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

  // Configure page layout
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const usableWidth = pageWidth - 2 * margin;
  const tableStartY = 90;

  // Create table with proper page management
  autoTable(doc, {
    startY: tableStartY,
    head: [['Date', 'Day', 'Status', 'Fee']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185] as Color, 
      textColor: 255,
      fontStyle: 'bold',
      cellPadding: 2,
      fontSize: 10,
      minCellHeight: 8
    },
    styles: { 
      cellPadding: 2,
      fontSize: 10,
      minCellHeight: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.3 },
      1: { cellWidth: usableWidth * 0.2 },
      2: { cellWidth: usableWidth * 0.25 },
      3: { cellWidth: usableWidth * 0.25 }
    },
    margin,
    tableWidth: 'auto',
    showHead: 'everyPage',
    didDrawPage: (data) => {
      // Skip header on subsequent pages
      if (data.pageNumber === 1) {
        return;
      }
    },
    willDrawCell: (data) => {
      // Ensure proper coloring for status cells on all pages
      if (data.column.index === 2 && data.row.index >= 0) {
        const isPresent = data.cell.text[0] === 'Present'
        data.cell.styles.fillColor = isPresent ? [46, 204, 113] as Color : [231, 76, 60] as Color
        data.cell.styles.textColor = 255
      }
    }
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

  // Generate proper base64 string directly from PDF binary data
  return Buffer.from(doc.output('arraybuffer')).toString('base64');
}
