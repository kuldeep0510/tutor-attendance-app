"use client"

import Link from "next/link"
import { Home, ChevronRight, LogOut, Settings, Menu, GraduationCap, BookOpen } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { WhatsAppStatus } from "./WhatsAppStatus"
import { VersionChecker } from "./VersionChecker"
import { ConnectionStatusBar } from "./ConnectionStatusBar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { supabase } from "@/app/lib/supabase"

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      router.push("/login")
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  const NavItems = () => (
    <>
      <Button 
        variant="ghost" 
        className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/20" 
        onClick={() => router.push('/settings')}
      >
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <Button 
        variant="ghost" 
        className="text-primary-foreground/90 hover:text-destructive-foreground hover:bg-destructive/20" 
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </>
  )

  const isHome = pathname === "/"
  const isSettings = pathname === "/settings"
  const isStudent = pathname.startsWith("/student/")

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="w-full bg-primary/80 dark:bg-primary/80 backdrop-blur-sm border-b border-primary-foreground/10">
          <div className="container px-4">
            <div className="h-16 flex items-center justify-between">
              {/* Logo and Brand */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/20">
                  <BookOpen className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <Link href="/" className="text-xl font-bold tracking-tight text-primary-foreground">
                    TutorTrack
                  </Link>
                  <p className="text-xs text-primary-foreground/90">
                    Attendance & Billing Management
                  </p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                <WhatsAppStatus />
                <VersionChecker />
                <div className="px-2 py-1 rounded-md bg-primary-foreground/20">
                  <ThemeToggle />
                </div>
                <NavItems />
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center gap-4 md:hidden">
                <div className="px-2 py-1 rounded-md bg-primary-foreground/20">
                  <ThemeToggle />
                </div>
                <WhatsAppStatus />
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/20"
                    >
                      <Menu className="h-5 w-5 text-primary-foreground" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] p-0">
                    <div className="grid gap-4 py-4">
                      <div className="px-4 flex items-center gap-2 border-b pb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">TutorTrack</span>
                      </div>
                      <nav className="grid gap-2 px-4">
                        <Link 
                          href="/" 
                          className="flex items-center gap-2 py-2 px-3 text-sm rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Home className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <Button 
                          variant="ghost"
                          className="justify-start font-normal"
                          onClick={() => {
                            router.push('/settings')
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button 
                          variant="ghost"
                          className="justify-start font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            handleLogout()
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status Bar */}
      <ConnectionStatusBar />

      {/* Main Content */}
      <div className="pt-16"> {/* Add padding for fixed header */}
        {/* Page Header */}
        <div className="border-b bg-background/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex flex-col gap-1 py-4 px-4">
            {/* Navigation */}
            <nav className="flex items-center gap-4 md:gap-6">
              <Link 
                href="/" 
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  isHome ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              {isStudent && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                  <span className="flex items-center gap-2 text-sm font-medium text-primary">
                    <GraduationCap className="h-4 w-4" />
                    Student Details
                  </span>
                </>
              )}
            </nav>

            {/* Page Title */}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isHome ? "Tutor Dashboard" : 
               isSettings ? "Settings" : 
               isStudent ? "Student Details" : ""}
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
