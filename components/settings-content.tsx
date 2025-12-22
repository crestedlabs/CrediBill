import SettingsAdvanced from "@/components/settings-advanced";
import SettingsBilling from "@/components/settings-billing";
import SettingsGeneral from "@/components/settings-general";
import SettingsTeam from "@/components/settings-team";
import SettingsWebhooks from "@/components/settings-webhooks";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsContent() {
  return (
    <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-base text-slate-600">
          Manage app configuration and preferences
        </p>
      </div>

      <Separator className="my-2" />

      <Tabs defaultValue="general" className="w-full">
        {/* Mobile: Horizontal Tabs Below Separator */}
        <div className="md:grid md:grid-cols-4 md:gap-6">
          {/* Mobile Tabs */}
          <TabsList className="flex flex-nowrap w-full gap-1 overflow-x-auto bg-slate-100 p-1 h-auto md:hidden md:col-span-1 mb-4 md:mb-0">
            <TabsTrigger
              value="general"
              className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm"
            >
              Team
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm"
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm"
            >
              Webhooks
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm"
            >
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Desktop: Vertical Navigation Sidebar */}
          <aside className="hidden md:flex md:flex-col md:col-span-1">
            <TabsList className="flex w-full flex-col items-start gap-2 p-0 h-auto bg-transparent">
              <TabsTrigger
                value="general"
                className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900"
              >
                Team
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900"
              >
                Billing
              </TabsTrigger>
              <TabsTrigger
                value="webhooks"
                className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900"
              >
                Webhooks
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900"
              >
                Advanced
              </TabsTrigger>
            </TabsList>
          </aside>
          <div className="md:col-span-3 space-y-6">
            <SettingsGeneral />
            <SettingsTeam />
            <SettingsBilling />
            <SettingsWebhooks />
            <SettingsAdvanced />
          </div>
        </div>
      </Tabs>
    </div>
  );
}
