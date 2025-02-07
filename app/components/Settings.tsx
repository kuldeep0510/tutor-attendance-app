"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { MessageLog } from "./MessageLog"
import { WhatsAppManager } from "./WhatsAppManager"
import { Bell, MessageCircle } from "lucide-react"
import { useWhatsApp } from "../contexts/whatsapp-context"
import { VersionManager } from "./VersionManager"
import { toast } from "sonner"

export function Settings() {
  const [notifications, setNotifications] = useState(false)
  const [autoConnect, setAutoConnect] = useState(() => {
    // Try to restore from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whatsapp-auto-connect') === 'true'
    }
    return false
  })
  const { isConnected, checkConnection, connect } = useWhatsApp()

  useEffect(() => {
    // Save auto-connect preference
    localStorage.setItem('whatsapp-auto-connect', autoConnect.toString())

    // If auto-connect is enabled and WhatsApp is disconnected, try to connect
    if (autoConnect && !isConnected) {
      connect().catch((error: Error) => {
        console.error("Auto-connect error:", error)
        toast.error("Failed to auto-connect to WhatsApp")
      })
    }
  }, [autoConnect, isConnected, connect])

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* WhatsApp Connection Manager */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            WhatsApp Connection
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your WhatsApp connection and scan QR code
          </p>
        </div>
        <WhatsAppManager />
      </section>

      {/* Preferences Section */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Preferences
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure your notification and connection preferences
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <Label htmlFor="notifications" className="text-base">Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for WhatsApp events
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <Separator />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <Label htmlFor="auto-connect" className="text-base">Auto Connect</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically connect to WhatsApp on startup
                  </p>
                </div>
                <Switch
                  id="auto-connect"
                  checked={autoConnect}
                  onCheckedChange={setAutoConnect}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Message Log Section */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Message History
          </h2>
          <p className="text-sm text-muted-foreground">
            View your sent messages and their delivery status
          </p>
        </div>
        <MessageLog />
      </section>

      {/* Version Management Section */}
      <VersionManager />
    </div>
  )
}
