"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { supabase } from "@/app/lib/supabase"
import { PackageIcon } from "lucide-react"

interface Version {
  id: string
  version: string
  force_update: boolean
  message: string
  release_date: string
}

export function VersionManager() {
  const [versions, setVersions] = useState<Version[]>([])
  const [newVersion, setNewVersion] = useState("")
  const [forceUpdate, setForceUpdate] = useState(false)
  const [message, setMessage] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchVersions = async () => {
      const { data: versions, error } = await supabase
        .from("app_versions")
        .select("*")
        .order("release_date", { ascending: false })

      if (error) {
        console.error("Error fetching versions:", error)
        return
      }

      setVersions(versions)
    }

    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Error checking admin status:", error)
        return
      }

      setIsAdmin(data.is_admin || false)
    }

    fetchVersions()
    checkAdmin()
  }, [])

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newVersion.trim()) {
      toast.error("Version number is required")
      return
    }

    const { error } = await supabase
      .from("app_versions")
      .insert([
        {
          version: newVersion,
          force_update: forceUpdate,
          message: message || `Version ${newVersion} released`,
        },
      ])

    if (error) {
      console.error("Error adding version:", error)
      toast.error("Failed to add version")
      return
    }

    toast.success("Version added successfully")
    
    // Reset form and refresh versions
    setNewVersion("")
    setForceUpdate(false)
    setMessage("")
    
    const { data: updatedVersions } = await supabase
      .from("app_versions")
      .select("*")
      .order("release_date", { ascending: false })
    
    if (updatedVersions) {
      setVersions(updatedVersions)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <PackageIcon className="w-5 h-5 text-primary" />
          Version Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage application versions and updates
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleAddVersion} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="version">Version Number</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="force-update"
                  checked={forceUpdate}
                  onCheckedChange={setForceUpdate}
                />
                <Label htmlFor="force-update" className="text-sm font-normal">
                  Force Update
                </Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Release Notes</Label>
              <Textarea
                id="message"
                placeholder="What's new in this version?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit">
              Add Version
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium">Version History</h3>
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-3 rounded-lg border bg-card text-card-foreground"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">v{version.version}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(version.release_date).toLocaleDateString()}
                    </div>
                  </div>
                  {version.force_update && (
                    <div className="mt-1 text-xs text-yellow-500">
                      Force Update Required
                    </div>
                  )}
                  {version.message && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {version.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
