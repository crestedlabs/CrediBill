"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/contexts/app-context";
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import { PermissionAwareSection } from "@/components/ui/permission-aware";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";
import { useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  Smartphone,
  Star,
} from "lucide-react";

const PROVIDER_INFO: Record<
  string,
  {
    name: string;
    description: string;
    logo: string;
    methods: string[];
    comingSoon?: boolean;
  }
> = {
  flutterwave: {
    name: "Flutterwave",
    description: "Mobile Money + Cards across Africa",
    logo: "🦋",
    methods: ["MTN", "Airtel", "Tigo", "Vodacom", "Visa", "Mastercard"],
  },
  pawapay: {
    name: "PawaPay",
    description: "Mobile Money only - East Africa",
    logo: "🐾",
    methods: ["MTN", "Airtel", "Tigo"],
  },
  pesapal: {
    name: "Pesapal",
    description: "Cards + Mobile Money - East Africa",
    logo: "💳",
    methods: ["Visa", "Mastercard", "M-Pesa"],
  },
  dpo: {
    name: "DPO Group",
    description: "Cards + Alternative payments - Africa-wide",
    logo: "🌍",
    methods: ["Visa", "Mastercard", "Mobile Money"],
  },
};

export default function SettingsPaymentProviders() {
  const { selectedApp } = useApp();
  const { canManageSettings } = useAppPermissions();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query providers
  const providers = useQuery(
    api.paymentProviders.getPaymentProviders,
    selectedApp?._id ? { appId: selectedApp._id } : "skip"
  );

  // Delete mutation
  const removeProvider = useMutation(
    api.paymentProviders.removePaymentProvider
  );

  if (!selectedApp) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">No app selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Payment Providers
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Connect your payment provider accounts to start collecting payments.
          Money goes directly to your account.
        </p>
        <div className="mt-3 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Important:</span> CrediBill never
            holds your money. Payments go directly to your payment provider
            account.
          </p>
        </div>
      </div>

      {/* Connected Providers */}
      <PermissionAwareSection
        canEdit={canManageSettings}
        message={getPermissionMessage(["owner", "admin"])}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-900">
              Connected Providers
            </h3>
            {canManageSettings && (
              <Button
                onClick={() => setShowAddDialog(true)}
                size="sm"
                disabled={!canManageSettings}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            )}
          </div>

          {!providers || providers.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-slate-100 p-4">
                  <CreditCard className="h-8 w-8 text-slate-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-slate-900">
                No providers connected
              </h3>
              <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
                Connect a payment provider to start collecting payments from
                your customers.
              </p>
              {canManageSettings && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="mt-4"
                  disabled={!canManageSettings}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Provider
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4">
              {providers.map((provider: any) => (
                <ProviderCard
                  key={provider._id}
                  provider={provider}
                  onDelete={() => {
                    setSelectedProvider(provider);
                    setShowDeleteDialog(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </PermissionAwareSection>

      {/* Add Provider Dialog */}
      {showAddDialog && (
        <AddProviderDialog
          appId={selectedApp._id}
          onClose={() => setShowAddDialog(false)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedProvider?.provider}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async () => {
                if (!selectedProvider) return;

                setIsDeleting(true);
                try {
                  await removeProvider({
                    providerId: selectedProvider._id,
                  });
                  toast.success("Provider removed successfully");
                  setShowDeleteDialog(false);
                  setSelectedProvider(null);
                } catch (error: any) {
                  const userFriendlyMessage = parseConvexError(error);
                  toast.error(
                    userFriendlyMessage || "Failed to remove provider"
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProviderCard({
  provider,
  onDelete,
}: {
  provider: any;
  onDelete: () => void;
}) {
  const testConnection = useAction(api.paymentProviders.testProviderConnection);
  const setPrimary = useMutation(api.paymentProviders.setPrimaryProvider);
  const [testing, setTesting] = useState(false);

  const info = PROVIDER_INFO[provider.provider as keyof typeof PROVIDER_INFO];

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testConnection({ providerId: provider._id });
      if (result.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(result.message || "Connection failed");
      }
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error(userFriendlyMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimary({ providerId: provider._id });
      toast.success("Primary provider updated");
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error(userFriendlyMessage);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{info?.logo}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900">{info?.name}</h4>
              {provider.isPrimary && (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" />
                  Primary
                </Badge>
              )}
              <Badge
                variant={
                  provider.environment === "live" ? "default" : "outline"
                }
              >
                {provider.environment}
              </Badge>
              {provider.connectionStatus === "connected" ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-green-700 border-green-300"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : provider.connectionStatus === "error" ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-red-700 border-red-300"
                >
                  <XCircle className="h-3 w-3" />
                  Error
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{info?.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {info?.methods.map((method) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method}
                </Badge>
              ))}
            </div>
            {provider.lastError && (
              <p className="mt-2 text-sm text-red-600">{provider.lastError}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!provider.isPrimary && (
            <Button variant="outline" size="sm" onClick={handleSetPrimary}>
              Set as Primary
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AddProviderDialog({
  appId,
  onClose,
}: {
  appId: string;
  onClose: () => void;
}) {
  const addProvider = useAction(api.paymentProviders.addPaymentProvider);
  const [provider, setProvider] = useState("flutterwave");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Map human-readable method names to schema literals
      const methodMap: Record<string, string> = {
        mtn: "mobile_money_mtn",
        airtel: "mobile_money_airtel",
        tigo: "mobile_money_tigo",
        vodacom: "mobile_money_vodacom",
        visa: "card_visa",
        mastercard: "card_mastercard",
        "m-pesa": "mobile_money_mtn", // M-Pesa is MTN mobile money
        "mobile money": "mobile_money_mtn", // Default mobile money
      };

      const selectedProviderInfo =
        PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO];
      const supportedMethods = selectedProviderInfo.methods
        .map((m) => methodMap[m.toLowerCase()])
        .filter(Boolean); // Remove undefined values

      await addProvider({
        appId: appId as any,
        provider: provider as any,
        credentials: {
          secretKey,
          publicKey: publicKey || undefined,
        },
        environment,
        supportedMethods: supportedMethods as any,
        isPrimary: true,
      });

      toast.success("Provider added successfully!");
      onClose();
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error(userFriendlyMessage);
    } finally {
      setSaving(false);
    }
  };

  const selectedProviderInfo =
    PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="border-b border-slate-200 p-6 pb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Add Payment Provider
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect a payment provider to start collecting payments
          </p>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      disabled={info.comingSoon}
                    >
                      <div className="flex items-center gap-2">
                        <span>{info.logo}</span>
                        <span>{info.name}</span>
                        {info.comingSoon && (
                          <Badge variant="outline" className="ml-2">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProviderInfo && (
                <p className="text-sm text-slate-600">
                  {selectedProviderInfo.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={environment}
                onValueChange={(v: any) => setEnvironment(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test / Sandbox</SelectItem>
                  <SelectItem value="live">Live / Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Secret Key *</Label>
              <Input
                type="password"
                placeholder="sk_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
              <p className="text-xs text-slate-600">
                Your API secret key from {selectedProviderInfo?.name} dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label>Public Key (Optional)</Label>
              <Input
                type="text"
                placeholder="pk_..."
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Security Note:</span> Your
                credentials are encrypted and stored securely. We never see your
                money - payments go directly to your{" "}
                {selectedProviderInfo?.name} account.
              </p>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="border-t border-slate-200 p-6 pt-4 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !secretKey}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Provider"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
