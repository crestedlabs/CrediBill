"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/contexts/app-context";
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, AlertTriangle, Save, Lock, Info } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SettingsApiKeysSection } from "@/components/settings/settings-api-keys-section";

export default function SettingsAdvanced() {
  const { selectedApp } = useApp();
  const { canManageApp } = useAppPermissions();
  const router = useRouter();
  const settings = useQuery(
    api.apps.getAppSettings,
    selectedApp?._id ? { appId: selectedApp._id } : "skip"
  );
  const updateSettings = useMutation(api.apps.updateAppSettings);
  const deleteApp = useMutation(api.apps.deleteApp);

  // Advanced settings state
  const [allowPlanDowngrades, setAllowPlanDowngrades] = useState(true);
  const [requireBillingAddress, setRequireBillingAddress] = useState(false);
  const [enableProration, setEnableProration] = useState(true);
  const [autoSuspendOnFailedPayment, setAutoSuspendOnFailedPayment] =
    useState(true);

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from database
  useEffect(() => {
    if (settings) {
      setAllowPlanDowngrades(settings.allowPlanDowngrades);
      setRequireBillingAddress(settings.requireBillingAddress);
      setEnableProration(settings.enableProration);
      setAutoSuspendOnFailedPayment(settings.autoSuspendOnFailedPayment);
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    if (settings) {
      const changed =
        allowPlanDowngrades !== settings.allowPlanDowngrades ||
        requireBillingAddress !== settings.requireBillingAddress ||
        enableProration !== settings.enableProration ||
        autoSuspendOnFailedPayment !== settings.autoSuspendOnFailedPayment;
      setHasChanges(changed);
    }
  }, [
    settings,
    allowPlanDowngrades,
    requireBillingAddress,
    enableProration,
    autoSuspendOnFailedPayment,
  ]);

  const handleSaveSettings = async () => {
    if (!selectedApp) return;

    setIsSaving(true);
    try {
      await updateSettings({
        appId: selectedApp._id,
        allowPlanDowngrades,
        requireBillingAddress,
        enableProration,
        autoSuspendOnFailedPayment,
      });
      toast.success("Advanced settings saved successfully");
      setHasChanges(false);
    } catch (error) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error(userFriendlyMessage || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!selectedApp) return;

    if (deleteConfirmation !== selectedApp.name) {
      toast.error("App name doesn't match");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteApp({ appId: selectedApp._id });
      toast.success("App deleted successfully");
      setShowDeleteDialog(false);
      // Redirect to apps page
      router.push("/apps");
    } catch (error) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error(userFriendlyMessage || "Failed to delete app");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <TabsContent value="advanced" className="space-y-8 m-0">
        {/* API Keys Section */}
        {selectedApp && <SettingsApiKeysSection appId={selectedApp._id} />}

        {/* Coming Soon Banner */}
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <span className="font-semibold">
              Advanced features are coming soon!
            </span>{" "}
            These settings are currently in development and not yet active in
            the billing system. Enable them now to prepare your configuration
            for when they go live.
          </AlertDescription>
        </Alert>

        {/* Advanced Features */}
        <Card className="border-0 shadow-sm bg-white relative">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Advanced Features
                  <Lock className="h-4 w-4 text-slate-400" />
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Configure advanced billing and subscription options (Coming
                  Soon)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {settings === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                <div className="space-y-4 opacity-60">
                  <div className="group flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50/50 transition-all cursor-not-allowed relative">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">
                          Allow Plan Downgrades
                        </p>
                        <Lock className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-slate-500">
                        Permit customers to switch to lower-tier plans
                      </p>
                    </div>
                    <Switch
                      checked={allowPlanDowngrades}
                      onCheckedChange={setAllowPlanDowngrades}
                      disabled={true}
                    />
                  </div>

                  <div className="group flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50/50 transition-all cursor-not-allowed relative">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">
                          Require Billing Address
                        </p>
                        <Lock className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-slate-500">
                        Request address information on checkout forms
                      </p>
                    </div>
                    <Switch
                      checked={requireBillingAddress}
                      onCheckedChange={setRequireBillingAddress}
                      disabled={true}
                    />
                  </div>

                  <div className="group flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50/50 transition-all cursor-not-allowed relative">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">
                          Proration on Plan Changes
                        </p>
                        <Lock className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-slate-500">
                        Automatically calculate prorated charges for upgrades
                      </p>
                    </div>
                    <Switch
                      checked={enableProration}
                      onCheckedChange={setEnableProration}
                      disabled={true}
                    />
                  </div>

                  <div className="group flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50/50 transition-all cursor-not-allowed relative">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">
                          Auto-suspend Failed Payments
                        </p>
                        <Lock className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-slate-500">
                        Automatically suspend access after payment failures
                      </p>
                    </div>
                    <Switch
                      checked={autoSuspendOnFailedPayment}
                      onCheckedChange={setAutoSuspendOnFailedPayment}
                      disabled={true}
                    />
                  </div>
                </div>

                {/* Save Button - Hidden as features are disabled */}
                {/* {hasChanges && (
                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      You have unsaved changes
                    </p>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )} */}
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-0 shadow-sm bg-white border-red-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-red-900">
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600">
                  Irreversible actions that will permanently affect this app
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!canManageApp && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900 font-medium">
                  {getPermissionMessage(["owner", "admin"])}
                </p>
              </div>
            )}
            <div
              className={`p-4 rounded-lg border border-red-200 bg-red-50/50 ${!canManageApp ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-red-900">Delete Application</p>
                  <p className="text-sm text-red-700 mb-2">
                    This will permanently delete the app and all associated data
                    including customers, subscriptions, invoices, payments,
                    webhooks, and API keys. This action cannot be undone.
                  </p>
                  <p className="text-xs text-red-600 font-medium">
                    Type "{selectedApp?.name}" to confirm deletion
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="h-10"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={!canManageApp}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Delete App
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <span className="font-semibold">{selectedApp?.name}</span> and all
              associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All customers and their data</li>
                <li>All subscriptions and plans</li>
                <li>All invoices and payments</li>
                <li>All webhooks</li>
                <li>All API keys</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type the app name to confirm:
            </label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={selectedApp?.name}
              disabled={isDeleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApp}
              disabled={isDeleting || deleteConfirmation !== selectedApp?.name}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete App"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
