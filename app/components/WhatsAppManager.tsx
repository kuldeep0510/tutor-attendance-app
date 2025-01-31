"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import config from "@/app/config"
import { Loader2, CheckCircle, XCircle, RefreshCw, Smartphone } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useWhatsAppConnection, ConnectionStatus } from "@/app/contexts/whatsapp-context"

interface ConnectionState {
  status: ConnectionStatus;
  qrCode: string | null;
  isPolling: boolean;
  retryCount: number;
}

export function WhatsAppManager() {
  const { connectionStatus, checkConnectionStatus } = useWhatsAppConnection()
  const [state, setState] = useState<ConnectionState>({
    status: "disconnected",
    qrCode: null,
    isPolling: false,
    retryCount: 0
  })

  // Force connection status check on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [checkConnectionStatus])

  const updateState = useCallback((updates: Partial<ConnectionState>) => {
    setState(curr => ({ ...curr, ...updates }))
  }, [])

  const clearQRCode = useCallback(() => {
    updateState({ qrCode: null, isPolling: false, retryCount: 0 })
  }, [updateState])

  const pollForQRCode = async () => {
    if (!state.isPolling) return

    try {
      const response = await fetch(`${config.whatsappServer}/qr`)
      if (!response.ok) throw new Error("Failed to fetch QR code")
      
      const data = await response.json()
      
      if (data.qr) {
        updateState({
          qrCode: data.qr,
          status: "connecting",
          retryCount: 0
        })
      } else if (data.connected) {
        await checkConnectionStatus()
        clearQRCode()
      } else if (state.retryCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        updateState({ retryCount: state.retryCount + 1 })
        await pollForQRCode()
      } else {
        toast.error("Failed to get QR code. Please try reconnecting.")
        updateState({
          status: "disconnected",
          isPolling: false,
          retryCount: 0
        })
      }
    } catch (error) {
      console.error("QR code polling error:", error)
      if (state.retryCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        updateState({ retryCount: state.retryCount + 1 })
        await pollForQRCode()
      } else {
        toast.error("Failed to get QR code. Please try reconnecting.")
        updateState({
          status: "disconnected",
          isPolling: false,
          retryCount: 0
        })
      }
    }
  }

  useEffect(() => {
    if (state.isPolling && !state.qrCode && state.status !== "connected") {
      pollForQRCode()
    }
  }, [state.isPolling, state.status, state.qrCode])

  useEffect(() => {
    console.log("Connection status changed:", connectionStatus)
    // Only show connection success message when transitioning from a non-connected state
    if (connectionStatus === "connected" && state.status !== "connected") {
      clearQRCode()
      toast.success("WhatsApp connected successfully!")
      updateState({ status: "connected" })
    } else if (connectionStatus === "disconnected" && state.status !== "disconnected") {
      updateState({ status: "disconnected" })
    }
  }, [connectionStatus, state.status, clearQRCode, updateState])

  const handleConnect = async () => {
    try {
      updateState({
        status: "connecting",
        isPolling: true,
        qrCode: null // Clear any existing QR code
      })
      
      const response = await fetch(`${config.whatsappServer}/connect`)
      if (!response.ok) {
        updateState({
          status: "disconnected",
          isPolling: false,
          qrCode: null
        })
        toast.error("Connection failed. Please try again.")
        return
      }
      
      const data = await response.json()
      if (data.qr) {
        updateState({
          qrCode: data.qr,
          status: "connecting"
        })
      } else if (data.connected) {
        await checkConnectionStatus()
        clearQRCode()
      } else {
        await pollForQRCode()
      }
    } catch (error) {
      console.error("Connection error:", error)
      updateState({
        status: "disconnected",
        isPolling: false,
        qrCode: null
      })
      toast.error("Connection failed. Please check your network connection.")
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch(`${config.whatsappServer}/disconnect`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      const data = await response.json()
      if (data.success) {
        await checkConnectionStatus()
        clearQRCode()
        toast.success("WhatsApp disconnected successfully!")
      } else {
        throw new Error("Failed to disconnect")
      }
    } catch (error) {
      console.error("Disconnect error:", error)
      toast.error("Failed to disconnect WhatsApp. Please try again.")
    }
  }

  const handleRetry = () => {
    clearQRCode()
    handleConnect()
  }

  // Use local status for rendering to ensure smooth transitions
  const displayStatus = state.qrCode ? "connecting" : state.status

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 dark:bg-primary/10 p-4">
        <h3 className="text-primary flex items-center gap-2 text-base font-medium">
          <Smartphone className="h-5 w-5" />
          WhatsApp Connection Manager
        </h3>
      </div>

      <div className="p-4">
        {/* Status Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <span className="text-muted-foreground mr-2">Status:</span>
            <div className="flex items-center gap-2 font-medium">
              {displayStatus === "connected" && (
                <CheckCircle className="text-green-500 dark:text-green-400" />
              )}
              {displayStatus === "disconnected" && (
                <XCircle className="text-red-500 dark:text-red-400" />
              )}
              {displayStatus === "connecting" && (
                <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" />
              )}
              <span className="capitalize">{displayStatus}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full sm:w-auto flex justify-end gap-2">
            {displayStatus === "connected" ? (
              <Button onClick={handleDisconnect} variant="destructive">
                Disconnect
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleRetry} 
                  variant="outline"
                  disabled={displayStatus === "connecting"}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button 
                  onClick={handleConnect} 
                  disabled={displayStatus === "connecting"}
                >
                  Connect
                </Button>
              </>
            )}
          </div>
        </div>

        {/* QR Code Section */}
        {state.qrCode && (
          <div className="mt-6 p-4 rounded-lg bg-muted/30">
            <div className="text-center">
              <h3 className="font-medium mb-4">Scan QR Code to Connect</h3>
              <div className="inline-block p-2 bg-white rounded-lg w-full max-w-[280px] mx-auto">
                <QRCodeSVG 
                  value={state.qrCode} 
                  size={280} 
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open WhatsApp on your phone</li>
                <li>Go to Menu or Settings {`>`} Linked Devices</li>
                <li>Tap on Link a Device</li>
                <li>Point your phone to this screen to scan the QR code</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
