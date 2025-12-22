import SettingsAdvanced from "@/components/settings-advanced";
import SettingsBilling from "@/components/settings-billing";
import SettingsGeneral from "@/components/settings-general";
import SettingsTeam from "@/components/settings-team";
import SettingsWebhooks from "@/components/settings-webhooks";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsContent() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Tabs Container */}
      <div>
        <Tabs defaultValue="general" className="mt-6">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
            {/* Desktop Sidebar Navigation */}
            <aside className="hidden lg:block lg:col-span-3 px-4 lg:px-8">
              <nav className="space-y-1 sticky top-6 mt-16">
                <TabsList className="flex w-full flex-col items-stretch gap-1 bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="general"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    General
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Team
                  </TabsTrigger>
                  <TabsTrigger
                    value="billing"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Billing
                  </TabsTrigger>
                  <TabsTrigger
                    value="webhooks"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Webhooks
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>
              </nav>
            </aside>

            {/* Mobile Tabs - Horizontal Scroll */}
            <div className="lg:hidden px-4 mb-6">
              <TabsList className="inline-flex w-full items-center justify-start gap-2 overflow-x-auto bg-slate-100 p-2 rounded-lg h-16">
                <TabsTrigger
                  value="general"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Team
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Billing
                </TabsTrigger>
                <TabsTrigger
                  value="webhooks"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Webhooks
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Advanced
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-9 px-4 sm:px-6 lg:px-8 pb-12">
              <TabsContent value="general" className="mt-0">
                <SettingsGeneral />
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <SettingsTeam />
              </TabsContent>
              <TabsContent value="billing" className="mt-0">
                <SettingsBilling />
              </TabsContent>
              <TabsContent value="webhooks" className="mt-0">
                <SettingsWebhooks />
              </TabsContent>
              <TabsContent value="advanced" className="mt-0">
                <SettingsAdvanced />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
