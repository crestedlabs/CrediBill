"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Rocket,
  Globe,
  Settings,
  Loader2,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";
import {
  createAppDefaults,
  type CreateAppFormData,
} from "@/lib/schemas/create-app.schema";
import {
  FormInputField,
  FormTextareaField,
  FormSelectField,
  FormNumberField,
} from "@/components/form/form-fields";
import { useOrganization } from "@/contexts/organization-context";
import { Id } from "@/convex/_generated/dataModel";

export function CreateAppFormSimple() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] =
    useState<CreateAppFormData>(createAppDefaults);
  const router = useRouter();
  const { selectedOrg } = useOrganization();
  const createAppMutation = useMutation(api.apps.createApp);

  // Fetch all payment providers (including inactive ones to show them as disabled)
  const providers = useQuery(api.providerCatalog.getAllProviders);

  // Set organization from context
  useEffect(() => {
    if (selectedOrg?._id && !formData.organizationId) {
      setFormData((prev) => ({
        ...prev,
        organizationId: selectedOrg._id as string,
      }));
    }
  }, [selectedOrg, formData.organizationId]);

  // Set default provider when providers load
  useEffect(() => {
    if (
      providers &&
      providers.length > 0 &&
      !(formData as any).paymentProviderId
    ) {
      // Default to first active provider
      const defaultProvider = providers.find((p) => p.isActive) || providers[0];
      setFormData((prev) => ({
        ...prev,
        paymentProviderId: defaultProvider._id as string,
      }));
    }
  }, [providers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (formData.name.length < 3) {
      toast.error("App name must be at least 3 characters");
      return;
    }

    if (!formData.organizationId) {
      toast.error("Please select an organization");
      return;
    }

    if (!(formData as any).paymentProviderId) {
      toast.error("Please select a payment provider");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAppMutation({
        name: formData.name,
        description: formData.description,
        organizationId: formData.organizationId as Id<"organizations">,
        paymentProviderId: (formData as any)
          .paymentProviderId as Id<"providerCatalog">,
        defaultCurrency: formData.defaultCurrency,
        language: formData.language,
        retryPolicy: formData.retryPolicy,
        gracePeriod: formData.gracePeriod,
      });

      toast.success("App created successfully!", {
        description: `${formData.name} is ready to use`,
      });

      router.push(`/overview`);
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error("Failed to create app", {
        description: userFriendlyMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there are any active providers
  const hasActiveProviders = providers?.some((p) => p.isActive) ?? false;
  const allProvidersDown =
    providers && providers.length > 0 && !hasActiveProviders;

  // Get selected provider to check if it's PawaPay (for disabling grace period)
  const selectedProvider = providers?.find(
    (p) => p._id === (formData as any).paymentProviderId
  );
  const isPawaPay = selectedProvider?.name?.toLowerCase() === "pawapay";

  const canSubmit =
    formData.name.length >= 3 &&
    formData.organizationId.length > 0 &&
    hasActiveProviders &&
    !isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Rocket className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Basic Information
              </CardTitle>
              <CardDescription className="text-slate-500">
                Enter the basic details for your new application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization Display (Read-only from context) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Organization <span className="text-red-500">*</span>
              </label>
              <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900">
                {selectedOrg?.name || "Loading..."}
              </div>
              <p className="text-xs text-slate-500">
                App will be created in your current organization
              </p>
            </div>

            <FormInputField
              label="App Name"
              value={formData.name}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, name: value }))
              }
              placeholder="e.g., My SaaS App"
              required
            />
          </div>

          <FormTextareaField
            label="Description"
            value={formData.description || ""}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, description: value }))
            }
            placeholder="Brief description of your application..."
            className="mt-6"
          />
        </CardContent>
      </Card>

      {/* Payment Provider Selection */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Payment Provider
              </CardTitle>
              <CardDescription className="text-slate-500">
                Choose your payment gateway for processing transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {allProvidersDown ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <span className="font-semibold">We're sorry!</span> All payment
                providers are currently unavailable. You cannot create an app at
                this time since payments won't be processed. Please check back
                later or contact support for assistance.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <span className="font-semibold">Important:</span> Payment
                provider selection is{" "}
                <strong>permanent and cannot be changed</strong> after app
                creation. Choose carefully based on your business needs.
              </AlertDescription>
            </Alert>
          )}

          {/* Provider Cards */}
          {!providers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {providers.map((provider) => {
                const isSelected =
                  (formData as any).paymentProviderId === provider._id;
                const isDisabled = !provider.isActive;

                return (
                  <button
                    key={provider._id}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) {
                        setFormData((prev) => ({
                          ...prev,
                          paymentProviderId: provider._id as string,
                        }));
                      }
                    }}
                    disabled={isDisabled}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left flex flex-col ${
                      isDisabled
                        ? "cursor-not-allowed bg-slate-100 border-slate-300 opacity-60 grayscale"
                        : isSelected
                          ? "border-teal-600 bg-teal-50 cursor-pointer"
                          : "border-slate-200 hover:border-slate-300 bg-white cursor-pointer"
                    }`}
                  >
                    {isDisabled && (
                      <div className="absolute top-2 right-2">
                        <div className="px-2 py-1 bg-red-100 border border-red-300 rounded text-xs text-red-700 font-semibold">
                          Unavailable
                        </div>
                      </div>
                    )}
                    {isSelected && !isDisabled && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Logo Section */}
                    <div className="flex items-center justify-center mb-3 h-10">
                      {provider.logoUrl ? (
                        <img
                          src={provider.logoUrl}
                          alt={provider.displayName}
                          className="max-h-10 max-w-full object-contain"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="text-2xl">{provider.logoEmoji}</div>
                      )}
                    </div>

                    {/* Description and Features */}
                    <div className="flex-1">
                      <p
                        className={`text-xs text-center mb-2 ${
                          isDisabled
                            ? "text-slate-400"
                            : isSelected
                              ? "text-teal-700"
                              : "text-slate-600"
                        }`}
                      >
                        {provider.description}
                      </p>

                      <div
                        className={`text-xs space-y-1 text-center ${
                          isDisabled
                            ? "text-slate-400"
                            : isSelected
                              ? "text-teal-700"
                              : "text-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {provider.supportsRecurring && (
                            <span>• Recurring</span>
                          )}
                          {provider.supportsWebhooks && <span>• Webhooks</span>}
                        </div>
                        <div>{provider.regions.length} countries</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Regional Settings
              </CardTitle>
              <CardDescription className="text-slate-500">
                Configure timezone and language preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelectField
              label="Default Currency"
              value={formData.defaultCurrency}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultCurrency: value as any,
                }))
              }
              options={[
                { value: "ugx", label: "🇺🇬 UGX - Ugandan Shilling" },
                { value: "kes", label: "🇰🇪 KES - Kenyan Shilling" },
                { value: "tzs", label: "🇹🇿 TZS - Tanzanian Shilling" },
                { value: "rwf", label: "🇷🇼 RWF - Rwandan Franc" },
                { value: "usd", label: "🇺🇸 USD - US Dollar" },
              ]}
              required
            />

            <FormSelectField
              label="Language"
              value={formData.language || "en"}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, language: value as any }))
              }
              options={[
                { value: "en", label: "🇬🇧 English" },
                { value: "sw", label: "🇰🇪 Swahili" },
                { value: "fr", label: "🇫🇷 French" },
              ]}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Billing Configuration */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Billing Configuration
              </CardTitle>
              <CardDescription className="text-slate-500">
                Set up default billing and payment settings for your app
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelectField
              label="Payment Failure Retry Policy"
              value={formData.retryPolicy || "automatic"}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, retryPolicy: value as any }))
              }
              options={[
                { value: "automatic", label: "Automatic Retries" },
                { value: "manual", label: "Manual Review" },
                { value: "none", label: "No Retries" },
              ]}
              required
            />

            <FormNumberField
              label="Grace Period (days)"
              value={isPawaPay ? 0 : formData.gracePeriod}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, gracePeriod: value }))
              }
              min={0}
              max={30}
              helpText={
                isPawaPay
                  ? "Not applicable for mobile money (requires customer interaction)"
                  : "Additional days before subscription cancellation"
              }
              required
              disabled={isPawaPay}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => router.push("/overview")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-10 px-6" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Create App
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
