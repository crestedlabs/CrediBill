"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { CreditCard, Save, RefreshCw, Clock, Loader2 } from "lucide-react";
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

export default function SettingsBilling() {
  const { selectedApp } = useApp();
  const { canManageSettings } = useAppPermissions();
  const [isSaving, setIsSaving] = useState(false);

  const appSettings = useQuery(
    api.apps.getAppSettings,
    selectedApp?._id ? { appId: selectedApp._id } : "skip",
  );

  // Get provider details to check billing mode
  const selectedProvider = useQuery(
    api.providerCatalog.getProviderById,
    appSettings?.paymentProviderId
      ? { providerId: appSettings.paymentProviderId }
      : "skip",
  );

  const updateSettings = useMutation(api.apps.updateAppSettings);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [gracePeriod, setGracePeriod] = useState<number>(3);

  // Initialize form with current values
  useEffect(() => {
    if (appSettings) {
      setPaymentMethod(appSettings.defaultPaymentMethod);
      setGracePeriod(appSettings.gracePeriod);
    }
  }, [appSettings]);

  // Check if provider is PawaPay
  const isPawaPay = selectedProvider?.name?.toLowerCase() === "pawapay";

  // Force momo for PawaPay
  useEffect(() => {
    if (isPawaPay && paymentMethod !== "momo") {
      setPaymentMethod("momo");
    }
  }, [isPawaPay, paymentMethod]);

  // Check if form has changes (no changes allowed for PawaPay)
  const hasChanges =
    !isPawaPay &&
    appSettings &&
    (paymentMethod !== appSettings.defaultPaymentMethod ||
      gracePeriod !== appSettings.gracePeriod);

  const handleSave = async () => {
    if (!selectedApp?._id || !hasChanges) return;

    // PawaPay apps cannot modify billing settings
    if (isPawaPay) {
      toast.error("Billing settings cannot be modified for PawaPay", {
        description: "PawaPay uses fixed payment configuration",
      });
      return;
    }

    // Validate grace period
    if (gracePeriod < 0 || gracePeriod > 30) {
      toast.error("Invalid grace period", {
        description: "Grace period must be between 0 and 30 days",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        appId: selectedApp._id,
        defaultPaymentMethod: paymentMethod as any,
        gracePeriod: gracePeriod,
      });

      toast.success("Billing settings updated successfully", {
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
      <TabsContent value="billing" className="space-y-8 m-0">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    );
  }
  return (
    <TabsContent value="billing" className="space-y-8 m-0">
      {/* Payment Methods */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Payment Configuration
              </CardTitle>
              <CardDescription className="text-slate-500">
                Configure default payment methods and billing policies
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PermissionAwareField
            canEdit={canManageSettings && !isPawaPay}
            message={
              isPawaPay
                ? "Payment method is fixed to Mobile Money for PawaPay"
                : getPermissionMessage(["owner", "admin"])
            }
          >
            <div className="max-w-xs space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Default Payment Method
              </label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={!canManageSettings || isPawaPay}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="momo">📱 Mobile Money</SelectItem>
                    <SelectItem value="credit-card">💳 Credit Card</SelectItem>
                    <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isPawaPay && (
                <p className="text-xs text-slate-500">
                  PawaPay only supports mobile money payments
                </p>
              )}
            </div>
          </PermissionAwareField>
        </CardContent>
      </Card>

      {/* Grace Period Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Grace Period
              </CardTitle>
              <CardDescription className="text-slate-500">
                Set grace period for failed payments before suspension
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PermissionAwareField
            canEdit={canManageSettings && !isPawaPay}
            message={
              isPawaPay
                ? "Grace period is not applicable for PawaPay"
                : getPermissionMessage(["owner", "admin"])
            }
          >
            <div className="max-w-xs space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Grace Period
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="3"
                  value={gracePeriod}
                  onChange={(e) =>
                    setGracePeriod(parseInt(e.target.value) || 0)
                  }
                  min={0}
                  max={30}
                  className="h-10 pr-12"
                  disabled={!canManageSettings || isPawaPay}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  days
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isPawaPay
                  ? "Grace period does not apply to PawaPay where payment is initiated by client applications"
                  : "Days to wait before suspending service after failed payment (0-30 days)"}
              </p>
            </div>
          </PermissionAwareField>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex justify-end pt-4">
        <Button
          className="h-10 px-6"
          onClick={handleSave}
          disabled={isPawaPay || !hasChanges || isSaving || !canManageSettings}
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
    </TabsContent>
  );
}
