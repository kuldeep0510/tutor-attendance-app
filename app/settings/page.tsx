import { Layout } from "../components/Layout"
import { Settings as SettingsComponent } from "../components/Settings"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="space-y-2 pb-4 sm:pb-6">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Configure your tutor attendance app preferences and WhatsApp integration
          </p>
        </header>

        <Separator className="mb-6 sm:mb-8" />

        {/* Settings Content */}
        <div className="pb-8 sm:pb-10">
          <SettingsComponent />
        </div>
      </div>
    </Layout>
  )
}
