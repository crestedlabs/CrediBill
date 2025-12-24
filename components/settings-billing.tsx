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
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SettingsBilling() {
  const { selectedApp } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const appSettings = useQuery(
    api.apps.getAppSettings,
    selectedApp?._id ? { appId: selectedApp._id } : "skip"
  );

  const updateSettings = useMutation(api.apps.updateAppSettings);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [retryPolicy, setRetryPolicy] = useState<string>("");
  const [trialLength, setTrialLength] = useState<number>(14);
  const [gracePeriod, setGracePeriod] = useState<number>(3);

  // Initialize form with current values
  useEffect(() => {
    if (appSettings) {
      setPaymentMethod(appSettings.defaultPaymentMethod);
      setRetryPolicy(appSettings.retryPolicy);
      setTrialLength(appSettings.defaultTrialLength);
      setGracePeriod(appSettings.gracePeriod);
    }
  }, [appSettings]);

  // Check if form has changes
  const hasChanges =
    appSettings &&
    (paymentMethod !== appSettings.defaultPaymentMethod ||
      retryPolicy !== appSettings.retryPolicy ||
      trialLength !== appSettings.defaultTrialLength ||
      gracePeriod !== appSettings.gracePeriod);

  const handleSave = async () => {
    if (!selectedApp?._id || !hasChanges) return;

    // Validate numbers
    if (trialLength < 0 || trialLength > 365) {
      toast.error("Invalid trial length", {
        description: "Trial length must be between 0 and 365 days",
      });
      return;
    }

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
        retryPolicy: retryPolicy as any,
        defaultTrialLength: trialLength,
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
              <CardTitle className="text-lg font-semibold">Payment Configuration</CardTitle>
              <CardDescription className="text-slate-500">
                Configure default payment methods and billing policies
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Default Payment Method
              </label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Payment Retry Policy
              </label>
              <Select value={retryPolicy} onValueChange={setRetryPolicy}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="automatic">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 text-green-500" />
                        Automatic Retries
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Manual Review
                      </div>
                    </SelectItem>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-500" />
                        No Retries
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Trial & Grace Periods</CardTitle>
              <CardDescription className="text-slate-500">
                Set default trial periods and grace periods for subscriptions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Default Trial Length
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="14"
                  value={trialLength}
                  onChange={(e) => setTrialLength(parseInt(e.target.value) || 0)}
                  min={0}
                  max={365}
                  className="h-10 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  days
                </span>
              </div>
              <p className="text-xs text-slate-500">
                How long new subscriptions can be trialed for free (0-365 days)
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Grace Period
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="3"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
                  min={0}
                  max={30}
                  className="h-10 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  days
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Additional days before subscription cancellation (0-30 days)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex justify-end pt-4">
        <Button
          className="h-10 px-6"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
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
