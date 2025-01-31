function formatIndianPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleanNumber = phone.replace(/\D/g, '')
  
  // If number starts with '91', keep it
  if (cleanNumber.startsWith('91')) {
    return cleanNumber
  }
  
  // If it's a 10-digit number, add '91' prefix
  if (cleanNumber.length === 10) {
    return `91${cleanNumber}`
  }
  
  throw new Error("Invalid phone number. Must be a 10-digit number or include '91' prefix")
}

export async function sendWhatsAppMessage(to: string, message: string, pdfData?: string) {
  try {
    const formattedNumber = formatIndianPhoneNumber(to)
    console.log("Sending WhatsApp message to:", formattedNumber)
    
    const response = await fetch("http://localhost:3001/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        to: formattedNumber,
        message,
        pdfData
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send WhatsApp message")
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || "Failed to send WhatsApp message")
    }

    return data
  } catch (error) {
    console.error("WhatsApp message send error:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to send WhatsApp message")
  }
}

export async function checkWhatsAppStatus() {
  try {
    const response = await fetch("http://localhost:3001/status")
    if (!response.ok) throw new Error("WhatsApp server is not responding")
    
    const data = await response.json()
    if (!data.connected) {
      throw new Error("WhatsApp is not connected. Please connect from Settings page.")
    }
    
    return true
  } catch (error) {
    console.error("WhatsApp status check failed:", error)
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "WhatsApp server is not running or not connected"
    )
  }
}
