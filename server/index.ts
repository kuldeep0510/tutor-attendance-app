import express from "express"
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js"
import qrcode from "qrcode-terminal"
import cors from "cors"
import { v4 as uuidv4 } from "uuid"
import fs from "fs"
import path from "path"
import * as puppeteer from "puppeteer"
import config from "./config"

const app = express()

// Configure CORS
app.use(cors(config.cors))
app.use(express.json({ limit: '50mb' }))

let client: Client | null = null
let qr: string | null = null
let browser: puppeteer.Browser | null = null
let lastConnectionCheck: number = Date.now()
let isReady: boolean = false

const messages: Array<{
  id: string;
  to: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'failed';
}> = []

const formatIndianPhoneNumber = (phone: string): string => {
  try {
    // Remove all non-digits
    const cleanNumber = phone.replace(/\D/g, '')
    
    // If number starts with +91 or 91, remove it
    const withoutPrefix = cleanNumber.replace(/^(\+?91)/, '')

    // Ensure 10 digits
    if (withoutPrefix.length !== 10) {
      throw new Error("Phone number must be 10 digits")
    }

    // Add 91 prefix for WhatsApp
    return `91${withoutPrefix}`
  } catch (error) {
    throw new Error(`Invalid phone number format: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const verifyConnection = async () => {
  if (!client) return false

  try {
    // Check client state and info
    const state = await client.getState()
    const info = await client.info
    isReady = state === 'CONNECTED' && !!info
    lastConnectionCheck = Date.now()
    return isReady
  } catch (error) {
    console.error("Connection verification failed:", error)
    isReady = false
    return false
  }
}

app.get("/status", async (req, res) => {
  try {
    // Force verification if it's been more than 10 seconds
    if (Date.now() - lastConnectionCheck > 10000) {
      const isConnected = await verifyConnection()
      res.json({ connected: isConnected })
      return
    }
    res.json({ connected: isReady })
  } catch (error) {
    console.error("Status check error:", error)
    res.json({ connected: false })
  }
})

app.get("/ping", async (req, res) => {
  if (!client) {
    res.json({ success: false, error: "WhatsApp client not initialized" })
    return
  }

  try {
    const isConnected = await verifyConnection()
    res.json({ success: isConnected })
  } catch (error) {
    console.error("Ping failed:", error)
    res.json({ success: false, error: "Connection verification failed" })
  }
})

let isInitializing = false

const setupWhatsAppClient = async () => {
  try {
    // Clear any existing session
    const authPath = path.join(__dirname, '.wwebjs_auth')
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
    }

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720',
        '--disable-extensions',
        '--ignore-certificate-errors'
      ],
      timeout: 60000
    })

    client = new Client({
      authStrategy: new LocalAuth({ clientId: config.whatsapp.clientId }),
      puppeteer: {
        browserWSEndpoint: browser.wsEndpoint(),
        args: config.whatsapp.puppeteerArgs,
        timeout: config.whatsapp.puppeteerTimeout
      }
    })

    return client
  } catch (error) {
    console.error("Error setting up WhatsApp client:", error)
    throw error
  }
}

app.get("/connect", async (req, res) => {
  if (isInitializing) {
    res.status(400).json({ error: "WhatsApp client is already initializing" })
    return
  }

  // If already connected, verify connection
  if (client) {
    const isConnected = await verifyConnection()
    if (isConnected) {
      res.json({ connected: true })
      return
    }
  }

  isInitializing = true
  qr = null
  isReady = false
  console.log("Starting WhatsApp client initialization...")

  try {
    client = await setupWhatsAppClient()
    let responseHandled = false

    client.on("qr", (qrCode: string) => {
      console.log("New QR code received")
      qr = qrCode
      if (!responseHandled) {
        res.json({ qr: qrCode })
        responseHandled = true
      }
    })

    client.on("ready", async () => {
      console.log("Client is ready!")
      qr = null
      isInitializing = false
      isReady = true
      lastConnectionCheck = Date.now()
      if (!responseHandled) {
        const isConnected = await verifyConnection()
        res.json({ connected: isConnected })
        responseHandled = true
      }
    })

    client.on("disconnected", async () => {
      console.log("Client disconnected")
      isReady = false
      qr = null
      if (browser) {
        await browser.close()
        browser = null
      }
      client = null
      isInitializing = false
    })

    client.on("auth_failure", async (error: any) => {
      console.error("Auth failure:", error)
      isReady = false
      if (browser) {
        await browser.close()
        browser = null
      }
      client = null
      qr = null
      isInitializing = false
    })

    await client.initialize()

    // Timeout handler
    setTimeout(() => {
      if (!responseHandled) {
        console.log("Initialization timeout - no QR generated")
        res.status(408).json({ 
          error: "Connection timeout",
          connected: false
        })
        responseHandled = true
      }
    }, 30000)

  } catch (error) {
    console.error("Failed to initialize client:", error)
    isReady = false
    if (browser) {
      await browser.close()
      browser = null
    }
    client = null
    qr = null
    isInitializing = false
    res.status(500).json({ 
      error: `Failed to initialize WhatsApp client: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})

app.get("/qr", (req, res) => {
  if (qr && !isReady) {
    res.json({ qr })
  } else {
    res.json({ connected: isReady })
  }
})

app.post("/disconnect", async (req, res) => {
  if (client) {
    try {
      console.log("Disconnecting client...")
      isReady = false
      await client.destroy()
      if (browser) {
        await browser.close()
        browser = null
      }
      client = null
      qr = null
      isInitializing = false

      const authPath = path.join(__dirname, '.wwebjs_auth')
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true })
      }

      console.log("Successfully disconnected")
      res.json({ success: true })
    } catch (error) {
      console.error("Error during disconnect:", error)
      res.status(500).json({ 
        success: false, 
        error: `Failed to disconnect properly: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  } else {
    res.json({ success: true })
  }
})

app.post("/send-message", async (req, res) => {
  const { to, message, pdfData } = req.body

  // Verify connection before sending
  if (!client || !isReady || !(await verifyConnection())) {
    res.status(400).json({ success: false, error: "WhatsApp is not connected" })
    return
  }

  try {
    console.log("Sending message to:", to)
    const formattedNumber = formatIndianPhoneNumber(to)
    console.log("Formatted number:", formattedNumber)
    const whatsappId = `${formattedNumber}@c.us`

    // First send the text message
    await client.sendMessage(whatsappId, message)

    // If PDF data is provided, send it as an attachment
    if (pdfData) {
      console.log("Sending PDF...")
      try {
        const media = new MessageMedia(
          'application/pdf',
          pdfData.split(',')[1], // Remove data:application/pdf;base64, prefix
          'bill.pdf'
        )
        await client.sendMessage(whatsappId, media, {
          caption: "Tuition Bill PDF",
          sendMediaAsDocument: true
        })
        console.log("PDF sent successfully")
      } catch (pdfError) {
        console.error("Error sending PDF:", pdfError)
        throw new Error("Failed to send PDF attachment")
      }
    }

    const messageLog = {
      id: uuidv4(),
      to: formattedNumber,
      message: pdfData ? `${message} [PDF Attached]` : message,
      timestamp: new Date().toISOString(),
      status: 'sent' as const,
    }
    messages.push(messageLog)
    res.json({ success: true })
  } catch (error) {
    console.error("Failed to send message:", error)
    const messageLog = {
      id: uuidv4(),
      to,
      message,
      timestamp: new Date().toISOString(),
      status: 'failed' as const,
    }
    messages.push(messageLog)
    res.status(500).json({ 
      success: false, 
      error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})

app.get("/messages", (req, res) => {
  res.json(messages)
})

const cleanup = async () => {
  if (client) {
    await client.destroy()
  }
  if (browser) {
    await browser.close()
  }
  const authPath = path.join(__dirname, '.wwebjs_auth')
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true })
  }
}

process.on('exit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error)
  
  // Only exit if it's a critical error
  if (error.message.includes('Protocol error') || error.message.includes('Session closed')) {
    console.log('Attempting to recover from session error...')
    if (client) {
      try {
        await client.destroy()
      } catch (e) {
        console.error('Error destroying client:', e)
      }
    }
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.error('Error closing browser:', e)
      }
    }
    
    // Reset state
    client = null
    browser = null
    qr = null
    isInitializing = false
    isReady = false
    
    // Try to reinitialize after a short delay
    setTimeout(async () => {
      try {
        console.log('Reinitializing WhatsApp client...')
        client = await setupWhatsAppClient()
        await client.initialize()
      } catch (e) {
        console.error('Failed to reinitialize:', e)
      }
    }, 1000)
  } else {
    await cleanup()
    process.exit(1)
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

app.listen(config.port, () => {
  console.log(`WhatsApp server running at http://localhost:${config.port}`)
})
