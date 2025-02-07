"use client";

import React from 'react';
import { useWhatsApp } from '@/app/contexts/whatsapp-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/components/ui/use-toast';

export function WhatsAppManager() {
  const { isConnecting, isConnected, qrCode, error, connect, disconnect, lastActivity } = useWhatsApp();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      console.log('Initiating WhatsApp connection...');
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to WhatsApp',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('Disconnecting WhatsApp...');
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Disconnection Error',
        description: error instanceof Error ? error.message : 'Failed to disconnect from WhatsApp',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>WhatsApp Connection</CardTitle>
        <CardDescription>
          {isConnected
            ? `Your WhatsApp account is connected${lastActivity ? ` (Last active: ${new Date(lastActivity).toLocaleString()})` : ''}`
            : 'Connect your WhatsApp account to send messages'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center justify-center space-y-4">
          {qrCode && !isConnected && (
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG value={qrCode} size={256} level="H" />
              <p className="mt-2 text-sm text-center text-muted-foreground">
                Scan this QR code with WhatsApp to connect
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
          {!isConnected ? (
            <>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                variant="default"
              >
                {isConnecting ? 'Connecting...' : 'Connect WhatsApp'}
              </Button>
              {error && error.includes('visit Settings') && (
                <Button
                  onClick={() => window.location.href = '/settings'}
                  variant="secondary"
                  className="ml-2"
                >
                  Go to Settings
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="outline"
            >
              Disconnect
            </Button>
          )}
          </div>

          <div className="text-sm text-muted-foreground text-center space-y-1">
            {isConnecting && !qrCode && (
              <>
                <p>Initializing connection...</p>
                <p className="text-xs">Checking for existing session. Please wait...</p>
              </>
            )}
            {isConnecting && qrCode && (
              <>
                <p>Scan the QR code with WhatsApp</p>
                <p className="text-xs">Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
              </>
            )}
            {isConnected && (
              <>
                <p>WhatsApp is connected and ready to use</p>
                <p className="text-xs">Last active: {new Date(lastActivity).toLocaleString()}</p>
              </>
            )}
            {!isConnecting && !isConnected && !qrCode && (
              <>
                <p>WhatsApp is not connected</p>
                {error?.includes('visit Settings') ? (
                  <p className="text-xs text-orange-500">Please visit Settings page to scan the QR code and connect WhatsApp</p>
                ) : (
                  <p className="text-xs">Click Connect to start a new session or restore an existing one</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
