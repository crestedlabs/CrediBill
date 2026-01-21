"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/contexts/app-context";
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import { PermissionAwareField } from "@/components/ui/permission-aware";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { parseConvexError } from "@/lib/error-utils";
import { Loader2, CreditCard, AlertCircle, Lock, Save } from "lucide-react";

export default function SettingsPaymentProviders() {
  const { selectedApp } = useApp();
  const { canManageSettings } = useAppPermissions();
  const [isSaving, setIsSaving] = useState(false);
  const saveCredentialsMutation = useMutation(
    api.paymentProviderCredentials.saveCredentials,
  );

  // Form state
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");

  // Get app settings including payment provider ID
  const appSettings = useQuery(
    api.apps.getAppSettings,
    selectedApp?._id ? { appId: selectedApp._id } : "skip",
  );

  // Get existing credentials
  const existingCredentials = useQuery(
    api.paymentProviderCredentials.getCredentials,
    selectedApp?._id ? { appId: selectedApp._id } : "skip",
  );

  // Fetch the specific provider details from catalog
  const selectedProvider = useQuery(
    api.providerCatalog.getProviderById,
    appSettings?.paymentProviderId
      ? { providerId: appSettings.paymentProviderId }
      : "skip",
  );

  // Load existing credentials into form
  useEffect(() => {
    if (existingCredentials) {
      setEnvironment(existingCredentials.environment || "test");
      // Note: We don't load secret keys back for security reasons
      // User must re-enter them to update
      if (existingCredentials.credentials?.publicKey) {
        setPublicKey(existingCredentials.credentials.publicKey);
      }
    }
  }, [existingCredentials]);

  if (!selectedApp) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">No app selected</p>
      </div>
    );
  }

  if (!appSettings || selectedProvider === undefined) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // App has no payment provider configured (old format before migration)
  if (!appSettings?.paymentProviderId || !selectedProvider) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This app was created before payment provider selection was required.
            Please create a new app to select a payment provider.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedApp?._id) {
      toast.error("No app selected");
      return;
    }

    if (!secretKey.trim()) {
      toast.error("Secret key is required");
      return;
    }

    setIsSaving(true);
    try {
      await saveCredentialsMutation({
        appId: selectedApp._id,
        credentials: {
          publicKey: publicKey.trim() || undefined,
          secretKey: secretKey.trim(),
        },
        environment,
      });

      toast.success("Provider credentials saved successfully");

      // Clear only the secret key from state (keep public key visible)
      setSecretKey("");
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error(userFriendlyMessage || "Failed to save provider credentials");
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading if no provider selected or not found
  if (!selectedProvider) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Provider</h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure your payment provider credentials.
          </p>
        </div>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <span className="font-semibold">Notice:</span> No payment provider
            has been set for this app yet. Please create a new app and select a
            provider during creation.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Provider</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure your payment provider credentials. Money goes directly to
          your account.
        </p>
      </div>

      {/* Immutability Warning */}
      <Alert className="border-amber-200 bg-amber-50">
        <Lock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900">
          <span className="font-semibold">Important: </span>
          {selectedProvider.displayName} was set during app creation and{" "}
          <strong>cannot be changed</strong>. You can only update the API
          credentials where applicable.
        </AlertDescription>
      </Alert>

      {/* Selected Provider Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
              {selectedProvider.logoUrl ? (
                <img
                  src={selectedProvider.logoUrl}
                  alt={selectedProvider.displayName}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <span className="text-2xl">{selectedProvider.logoEmoji}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">
                  {selectedProvider.displayName}
                </CardTitle>
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Active Provider
                </Badge>
              </div>
              <CardDescription className="text-slate-500 mt-1">
                {selectedProvider.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Features */}
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Payment Methods Supported
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProvider.paymentMethods.map((method) => (
                  <Badge key={method} variant="outline" className="text-xs">
                    {method.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Capabilities
              </Label>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                {selectedProvider.supportsRecurring && (
                  <span className="flex items-center gap-1">
                    ✓ Recurring Billing
                  </span>
                )}
                {selectedProvider.supportsWebhooks && (
                  <span className="flex items-center gap-1">✓ Webhooks</span>
                )}
                {selectedProvider.supportsRefunds && (
                  <span className="flex items-center gap-1">✓ Refunds</span>
                )}
              </div>
            </div>

            {/* Info Alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <span className="font-semibold">Security:</span> Your
                credentials are encrypted and stored securely. CrediBill never
                holds your money - payments go directly to your{" "}
                {selectedProvider.displayName} account.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Info: No credentials needed */}
      <Alert className="border-slate-200 bg-slate-50">
        <AlertCircle className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-slate-700">
          <span className="font-semibold">Note: </span>
          CrediBill does not require your {selectedProvider.displayName} API
          credentials. Your client applications will initiate payments directly
          using their own credentials. CrediBill only receives webhook
          notifications to track payment status.
        </AlertDescription>
      </Alert>
    </div>
  );
}
