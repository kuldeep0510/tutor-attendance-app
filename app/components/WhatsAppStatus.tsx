"use client"

import { useWhatsAppConnection } from "@/app/contexts/whatsapp-context"
import { cn } from "@/lib/utils"

export function WhatsAppStatus() {
  const { connectionStatus } = useWhatsAppConnection()
  const isConnected = connectionStatus === "connected"

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-2.5 w-2.5">
        {isConnected && (
          <div className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            "animate-ping bg-green-400 dark:bg-green-500"
          )} />
        )}
        {connectionStatus === "connecting" && (
          <div className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            "animate-pulse bg-blue-400 dark:bg-blue-500"
          )} />
        )}
        <div className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          {
            "bg-green-400 dark:bg-green-500": isConnected,
            "bg-blue-400 dark:bg-blue-500": connectionStatus === "connecting",
            "bg-red-400 dark:bg-red-500": connectionStatus === "disconnected"
          }
        )} />
      </div>
      <span className="hidden sm:inline-block text-[11px] text-primary-foreground whitespace-nowrap">
        {connectionStatus === "connected" && "WhatsApp Connected"}
        {connectionStatus === "disconnected" && "WhatsApp Disconnected"}
        {connectionStatus === "connecting" && "WhatsApp Connecting..."}
      </span>
    </div>
  )
}
