"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import { Save, DollarSign, Clock, Globe, Loader2, Tag } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/contexts/app-context";
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import { PermissionAwareField } from "@/components/ui/permission-aware";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SettingsGeneral() {
  const { selectedApp } = useApp();
  const { canManageApp, canManageSettings } = useAppPermissions();
  const [isSaving, setIsSaving] = useState(false);
  const [isRenamingApp, setIsRenamingApp] = useState(false);

  const appSettings = useQuery(
    api.apps.getAppSettings,
    selectedApp?._id ? { appId: selectedApp._id } : "skip"
  );

  const updateSettings = useMutation(api.apps.updateAppSettings);
  const updateAppName = useMutation(api.apps.updateAppName);

  // Form state
  const [appName, setAppName] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const [language, setLanguage] = useState<string>("");

  // Initialize form with current values
  useEffect(() => {
    if (appSettings) {
      setAppName(appSettings.name);
      setCurrency(appSettings.defaultCurrency);
      setTimezone(appSettings.timezone);
      setLanguage(appSettings.language);
    }
  }, [appSettings]);

  // Check if app name has changes
  const hasAppNameChanges =
    appSettings && appName !== appSettings.name && appName.trim().length >= 3;

  // Check if settings form has changes
  const hasChanges =
    appSettings &&
    (currency !== appSettings.defaultCurrency ||
      timezone !== appSettings.timezone ||
      language !== appSettings.language);

  const handleRenameApp = async () => {
    if (!selectedApp?._id || !hasAppNameChanges) return;

    setIsRenamingApp(true);
    try {
      await updateAppName({
        appId: selectedApp._id,
        name: appName.trim(),
      });

      toast.success("App renamed successfully", {
        description: `Your app is now called "${appName.trim()}"`,
      });
    } catch (error: any) {
      toast.error("Failed to rename app", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsRenamingApp(false);
    }
  };

  const handleSave = async () => {
    if (!selectedApp?._id || !hasChanges) return;

    setIsSaving(true);
    try {
      await updateSettings({
        appId: selectedApp._id,
        defaultCurrency: currency as any,
        timezone: timezone as any,
        language: language as any,
      });

      toast.success("Settings updated successfully", {
        description: "Your changes have been saved",
      });
    } catch (error: any) {
      toast.error("Failed to update settings", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!appSettings) {
    return (
      <div className="space-y-8">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* App Name */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">App Name</CardTitle>
              <CardDescription className="text-slate-500">
                Update your app's display name
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PermissionAwareField
            canEdit={canManageApp}
            message={getPermissionMessage(["owner", "admin"])}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  App Name
                </label>
                <Input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="My Awesome App"
                  className="h-10"
                  disabled={!canManageApp || isRenamingApp}
                />
                {appName.trim().length > 0 && appName.trim().length < 3 && (
                  <p className="text-xs text-red-600">
                    App name must be at least 3 characters
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  className="h-10 px-6"
                  onClick={handleRenameApp}
                  disabled={
                    !hasAppNameChanges || isRenamingApp || !canManageApp
                  }
                >
                  {isRenamingApp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Renaming...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Rename App
                    </>
                  )}
                </Button>
              </div>
            </div>
          </PermissionAwareField>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Currency & Billing
              </CardTitle>
              <CardDescription className="text-slate-500">
                Configure default currency for subscriptions and invoices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PermissionAwareField
            canEdit={canManageSettings}
            message={getPermissionMessage(["owner", "admin"])}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Default Currency
                </label>
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                  disabled={!canManageSettings}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ugx">
                        🇺🇬 UGX - Ugandan Shilling
                      </SelectItem>
                      <SelectItem value="kes">
                        🇰🇪 KES - Kenyan Shilling
                      </SelectItem>
                      <SelectItem value="tzs">
                        🇹🇿 TZS - Tanzanian Shilling
                      </SelectItem>
                      <SelectItem value="rwf">
                        🇷🇼 RWF - Rwandan Franc
                      </SelectItem>
                      <SelectItem value="usd">🇺🇸 USD - US Dollar</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PermissionAwareField>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Regional Settings
              </CardTitle>
              <CardDescription className="text-slate-500">
                Set timezone and language preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PermissionAwareField
            canEdit={canManageSettings}
            message={getPermissionMessage(["owner", "admin"])}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Time Zone
                </label>
                <Select
                  value={timezone}
                  onValueChange={setTimezone}
                  disabled={!canManageSettings}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="eat">
                        East Africa Time (GMT+3)
                      </SelectItem>
                      <SelectItem value="cat">
                        Central Africa Time (GMT+2)
                      </SelectItem>
                      <SelectItem value="wat">
                        West Africa Time (GMT+1)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Language
                </label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                  disabled={!canManageSettings}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Kiswahili</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PermissionAwareField>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex justify-end pt-4">
        <Button
          className="h-10 px-6"
          onClick={handleSave}
          disabled={!hasChanges || isSaving || !canManageSettings}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
