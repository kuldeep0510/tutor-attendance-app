"use client"

import { useWhatsApp } from "@/app/contexts/whatsapp-context"
import { Progress } from "@/components/ui/progress"
import { RefreshCcw, Loader2, QrCode, SmartphoneNfc } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

export function ConnectionStatusBar() {
  const { isConnecting, isConnected, connect } = useWhatsApp()
  const [progress, setProgress] = useState(0)
  const [hasCheckedSession, setHasCheckedSession] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<{
    exists: boolean,
    isValid: boolean,
    isTerminated: boolean
  }>({
    exists: false,
    isValid: false,
    isTerminated: false
  })

  // Check for existing session and its state
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/whatsapp/status');
        const data = await response.json();
        
        setSessionStatus({
          exists: data.data?.hasSession || false,
          isValid: data.data?.hasSession && !data.data?.isTerminated,
          isTerminated: data.data?.isTerminated || false
        });

        // Only attempt auto-restore if session is valid and not terminated
        if (data.data?.hasSession && !data.data?.isTerminated && !isConnected && !isConnecting) {
          connect(true);
        }
        setHasCheckedSession(true);
      } catch (error) {
        console.error('Error checking session:', error);
        setHasCheckedSession(true);
      }
    };
    
    if (!isConnected && !hasCheckedSession) {
      checkSession();
    }
  }, [isConnected, hasCheckedSession, isConnecting, connect]);

  useEffect(() => {
    if (isConnecting && !isConnected) {
      setProgress(0)
      const duration = 30000
      const interval = 100
      const step = (100 * interval) / duration
      
      const timer = setInterval(() => {
        setProgress(prev => {
          const next = prev + step
          return next >= 100 ? 100 : next
        })
      }, interval)

      return () => clearInterval(timer)
    } else {
      setProgress(0)
    }
  }, [isConnecting, isConnected])

  if (isConnected || !hasCheckedSession) return null;

  // Helper to get the appropriate status message and icon
  const getStatusInfo = () => {
    if (!hasCheckedSession) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
        message: "Checking WhatsApp connection status..."
      };
    }
    
    if (isConnecting) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
        message: sessionStatus.exists 
          ? "Restoring existing WhatsApp session..." 
          : "Initializing new WhatsApp connection..."
      };
    }

    if (sessionStatus.isTerminated) {
      return {
        icon: <QrCode className="h-4 w-4 text-muted-foreground" />,
        message: "Previous session ended. Scan QR code in Settings to reconnect."
      };
    }

    if (sessionStatus.exists && sessionStatus.isValid) {
      return {
        icon: <SmartphoneNfc className="h-4 w-4 text-primary" />,
        message: "Found existing WhatsApp session. Click Connect to restore."
      };
    }

    return {
      icon: <QrCode className="h-4 w-4 text-muted-foreground" />,
      message: "No WhatsApp session found. Visit Settings to scan QR code."
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed top-[4rem] left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusInfo.icon}
            <span className="text-sm font-medium">
              {statusInfo.message}
            </span>
          </div>
          {!isConnecting && (
            <Link 
              href="/settings" 
              className="text-sm font-medium text-primary hover:text-primary/90"
            >
              Go to Settings
            </Link>
          )}
        </div>
        
        {isConnecting && (
          <div className="mt-2">
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </div>
    </div>
  )
}
