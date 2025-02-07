"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { RefreshCcw, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  to: string
  message: string
  timestamp: string
  status: 'sent' | 'failed'
}

export function MessageLog() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchMessages = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('http://localhost:3001/messages')
      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [])

  const LoadingSkeleton = () => (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-muted/50 h-[7.5rem] rounded-lg animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquare className="h-4 w-4" />
          <h2 className="text-base font-medium">Message Log</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchMessages}
          disabled={isRefreshing}
          className="h-8 w-8"
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh messages</span>
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <LoadingSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No messages sent yet</p>
            </div>
          ) : (
            messages.slice().reverse().map((message) => (
              <div
                key={message.id}
                className="bg-card rounded-lg border shadow-sm overflow-hidden"
              >
                {/* Message Header */}
                <div className="px-3 py-2.5 bg-muted/30 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {message.to}
                  </p>
                  <Badge
                    variant={message.status === 'sent' ? 'secondary' : 'destructive'}
                    className={`px-2 py-0.5 text-[10px] uppercase font-medium ${
                      message.status === 'sent' 
                        ? 'bg-green-100 hover:bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                        : ''
                    }`}
                  >
                    {message.status}
                  </Badge>
                </div>
                
                {/* Message Content */}
                <div className="px-3 py-3">
                  <p className="text-sm break-words leading-relaxed min-h-[2.5rem]">
                    {message.message}
                  </p>
                  <p className="mt-3 text-[10px] text-muted-foreground border-t pt-2">
                    {format(new Date(message.timestamp), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
