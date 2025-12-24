"use client";

import { useApp } from "@/contexts/app-context";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsApiKeysSection } from "@/components/settings-api-keys-section";
import { SettingsWebhooksSection } from "@/components/settings-webhooks-section";

export default function SettingsWebhooks() {
  const { selectedApp } = useApp();

  if (!selectedApp) return null;

  return (
    <TabsContent value="webhooks" className="space-y-8 m-0">
      <SettingsApiKeysSection appId={selectedApp._id} />
      <SettingsWebhooksSection appId={selectedApp._id} />
    </TabsContent>
  );
}
