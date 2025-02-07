"use client";

import React from 'react';
import { useWhatsApp } from '@/app/contexts/whatsapp-context';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function WhatsAppStatus() {
  const { isConnected, isConnecting, error } = useWhatsApp();

  let icon = null;
  let text = '';
  let colorClass = '';

  if (error) {
    icon = <AlertCircle className="h-4 w-4" />;
    text = 'WhatsApp Error';
    colorClass = 'text-destructive';
  } else if (isConnected) {
    icon = <CheckCircle2 className="h-4 w-4" />;
    text = 'WhatsApp Connected';
    colorClass = 'text-green-500';
  } else if (isConnecting) {
    icon = <Loader2 className="h-4 w-4 animate-spin" />;
    text = 'Connecting WhatsApp';
    colorClass = 'text-muted-foreground';
  } else {
    icon = <AlertCircle className="h-4 w-4" />;
    text = 'WhatsApp Not Connected';
    colorClass = 'text-muted-foreground';
  }

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex items-center">
        {error ? (
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        ) : isConnected ? (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        ) : isConnecting ? (
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-sm ${colorClass}`}>
      {icon}
      <span className="font-medium">{text}</span>
    </div>
  );
}
