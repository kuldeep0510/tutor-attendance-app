"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import config from "@/app/config"

export type ConnectionStatus = "disconnected" | "connecting" | "connected"

interface WhatsAppContextType {
  connectionStatus: ConnectionStatus;
  checkConnectionStatus: () => Promise<void>;
}

export const WhatsAppContext = createContext<WhatsAppContextType>({
  connectionStatus: "disconnected",
  checkConnectionStatus: async () => {},
})

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [checkAttempts, setCheckAttempts] = useState(0)

  const checkConnectionStatus = useCallback(async () => {
    try {
      // First check status
      const response = await fetch(`${config.whatsappServer}/status`)
      if (!response.ok) {
        console.error("Status check failed:", await response.text())
        throw new Error("WhatsApp server not responding")
      }

      const data = await response.json()
      console.log("Status check response:", data)

      if (data.connected) {
        setConnectionStatus("connected")
        setCheckAttempts(0)
        return
      }

      // If not connected, verify with ping
      const pingResponse = await fetch(`${config.whatsappServer}/ping`)
      if (!pingResponse.ok) {
        console.error("Ping check failed:", await pingResponse.text())
        throw new Error("WhatsApp connection verification failed")
      }

      const pingData = await pingResponse.json()
      console.log("Ping check response:", pingData)

      if (pingData.success) {
        setConnectionStatus("connected")
        setCheckAttempts(0)
      } else {
        setConnectionStatus("disconnected")
      }
    } catch (error) {
      console.error("Connection check failed:", error)
      
      // If currently connected, give a few retries before disconnecting
      if (connectionStatus === "connected" && checkAttempts < 3) {
        console.log("Retrying connection check, attempt:", checkAttempts + 1)
        setCheckAttempts(prev => prev + 1)
      } else {
        console.log("Marking as disconnected after", checkAttempts, "failed attempts")
        setConnectionStatus("disconnected")
        setCheckAttempts(0)
      }
    }
  }, [connectionStatus, checkAttempts])

  useEffect(() => {
    checkConnectionStatus()
    const intervalId = setInterval(checkConnectionStatus, 5000)
    return () => clearInterval(intervalId)
  }, [checkConnectionStatus])

  return (
    <WhatsAppContext.Provider value={{ connectionStatus, checkConnectionStatus }}>
      {children}
    </WhatsAppContext.Provider>
  )
}

export const useWhatsAppConnection = () => useContext(WhatsAppContext)
