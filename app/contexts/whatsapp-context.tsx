"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { checkWhatsAppStatus, initializeConnection, logoutWhatsApp, sendWhatsAppMessage } from "@/app/utils/whatsapp";

export interface WhatsAppContextType {
  isConnecting: boolean;
  isConnected: boolean;
  qrCode: string | null;
  error: string | null;
  lastActivity: number;
  connect: (restore?: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
  checkConnection: () => Promise<void>;
  sendMessage: (phone: string, message: string, pdfData?: string) => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return;
      }
      if (user) {
        setUserId(user.id);
      }
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const resetState = (clearStorage: boolean = true) => {
    setIsConnecting(false);
    setIsConnected(false);
    setQrCode(null);
    setError(null);
    
    if (clearStorage) {
      localStorage.removeItem('whatsapp_connected');
      localStorage.removeItem('whatsapp_last_activity');
      localStorage.removeItem('whatsapp_user_id');
      localStorage.removeItem('whatsapp_terminated');
    }
  };

  const handleError = (error: string) => {
    setError(error);
    setIsConnecting(false);
    toast({
      title: "WhatsApp Error",
      description: error,
      variant: "destructive",
    });
  };

  const checkConnection = async () => {
    if (!userId) return;

    try {
      const status = await checkWhatsAppStatus();
      setIsConnected(status.isConnected);
      if (status.qr) {
        setQrCode(status.qr);
      }
      const currentTime = Date.now();
      setLastActivity(currentTime);
      
      if (status.isConnected) {
        localStorage.setItem('whatsapp_connected', 'true');
        localStorage.setItem('whatsapp_last_activity', currentTime.toString());
      } else {
        localStorage.removeItem('whatsapp_connected');
        localStorage.removeItem('whatsapp_last_activity');
      }
    } catch (error) {
      console.error("Status check error:", error);
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  // Initial connection check - only checks status without attempting to restore
  useEffect(() => {
    const handleConnectionCheck = async () => {
      if (!userId) {
        resetState();
        return;
      }

      try {
        const status = await checkWhatsAppStatus();
        if (status.isTerminated) {
          setError('WhatsApp session ended. Please visit Settings to reconnect.');
          resetState(true);
          return;
        }

        setIsConnected(status.isConnected);
        if (status.qr) {
          setQrCode(status.qr);
        }
        
        if (status.isConnected) {
          const currentTime = Date.now();
          setLastActivity(currentTime);
          localStorage.setItem('whatsapp_last_activity', currentTime.toString());
        }
      } catch (error) {
        console.error('Connection check error:', error);
        setError('Please visit Settings and scan the QR code to connect WhatsApp.');
        resetState(true);
      }
    };

    handleConnectionCheck();
  }, [userId]);

  // Monitor connection status
  useEffect(() => {
    if (!userId || !isConnected) return;

    let checkCount = 0;
    const MAX_SILENT_FAILURES = 3;
    let consecutiveFailures = 0;

    const monitor = setInterval(async () => {
      try {
        checkCount++;
        const status = await checkWhatsAppStatus();

        if (!status.isConnected) {
          consecutiveFailures++;

          if (consecutiveFailures >= MAX_SILENT_FAILURES) {
            setError('Connection lost. Please reconnect WhatsApp.');
            resetState(true);
            localStorage.setItem('whatsapp_terminated', 'true');
          }
        } else {
          consecutiveFailures = 0;
          
          if (checkCount % 10 === 0) {
            const currentTime = Date.now();
            setLastActivity(currentTime);
            localStorage.setItem('whatsapp_last_activity', currentTime.toString());
          }
        }
      } catch (error) {
        console.error('Monitor check failed:', error);
        consecutiveFailures++;
      }
    }, 30000);

    return () => clearInterval(monitor);
  }, [userId, isConnected]);

  const connect = async (restore: boolean = false) => {
    if (isConnecting) return; // Prevent multiple connection attempts

    try {
      localStorage.removeItem('whatsapp_terminated');
      
      setIsConnecting(true);
      setError(null);
      
      const result = await initializeConnection(restore);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.qr) {
        setQrCode(result.qr);
      }
      
      if (result.connected) {
        setIsConnected(true);
        setIsConnecting(false);
        setQrCode(null);
        const currentTime = Date.now();
        setLastActivity(currentTime);
        localStorage.setItem('whatsapp_connected', 'true');
        localStorage.setItem('whatsapp_last_activity', currentTime.toString());
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      if (!isConnected) {
        setIsConnecting(false);
      }
    }
  };

  const disconnect = async () => {
    try {
      const success = await logoutWhatsApp();
      
      if (success) {
        resetState();
        localStorage.setItem('whatsapp_terminated', 'true');
        toast({
          title: "WhatsApp Disconnected",
          description: "To reconnect, please visit Settings and scan the QR code",
        });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : "Failed to disconnect");
    }
  };

  const sendMessage = async (phone: string, message: string, pdfData?: string) => {
    try {
      const success = await sendWhatsAppMessage(phone, message, pdfData);

      if (success) {
        toast({
          title: "Message Sent",
          description: "WhatsApp message sent successfully",
        });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : "Failed to send message");
      throw error;
    }
  };

  const value = {
    isConnecting,
    isConnected,
    qrCode,
    error,
    lastActivity,
    connect,
    disconnect,
    sendMessage,
    checkConnection,
  };

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error("useWhatsApp must be used within a WhatsAppProvider");
  }
  return context;
}
