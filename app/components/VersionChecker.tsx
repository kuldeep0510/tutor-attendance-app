"use client"

import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/app/lib/supabase"

const APP_VERSION = "0.1.0" // Match with package.json

interface Version {
  version: string
  force_update: boolean
  message: string
  release_date: string
}

export function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_versions')
          .select('*')
          .order('release_date', { ascending: false })
          .limit(1)
          .single()

        if (error) throw error

        const latestVersion = data as Version
        
        if (latestVersion.version !== APP_VERSION) {
          setUpdateAvailable(true)
          
          if (latestVersion.force_update) {
            // For critical updates, show a modal that prevents further interaction
            toast.error(
              `Critical Update Required: ${latestVersion.message}`,
              {
                duration: Infinity,
                description: "Please refresh the page to get the latest version."
              }
            )
          } else {
            // For normal updates, show a dismissible notification
            toast.info(
              `Update Available: v${latestVersion.version}`,
              {
                duration: 10000,
                description: latestVersion.message
              }
            )
          }
        }
      } catch (error) {
        console.error("Error checking for updates:", error)
      }
    }

    // Check for updates on initial load
    checkVersion()

    // Set up periodic version checks (every 30 minutes)
    const interval = setInterval(checkVersion, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (updateAvailable) {
    return (
      <div className="px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-500 flex items-center gap-2 text-sm">
        <AlertCircle className="h-4 w-4" />
        Update Available
      </div>
    )
  }

  return null
}
