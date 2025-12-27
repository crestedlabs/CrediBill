"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
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
import { Rocket, Globe, Settings, Loader2 } from "lucide-react";
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

  // Set organization from context
  useEffect(() => {
    if (selectedOrg?._id && !formData.organizationId) {
      setFormData((prev) => ({
        ...prev,
        organizationId: selectedOrg._id as string,
      }));
    }
  }, [selectedOrg, formData.organizationId]);

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

    setIsSubmitting(true);
    try {
      const result = await createAppMutation({
        name: formData.name,
        description: formData.description,
        organizationId: formData.organizationId as Id<"organizations">,
        defaultCurrency: formData.defaultCurrency,
        timezone: formData.timezone,
        language: formData.language,
        defaultPaymentMethod: formData.defaultPaymentMethod,
        retryPolicy: formData.retryPolicy,
        defaultTrialLength: formData.defaultTrialLength,
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

  const canSubmit =
    formData.name.length >= 3 &&
    formData.organizationId.length > 0 &&
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
              label="Timezone"
              value={formData.timezone}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, timezone: value as any }))
              }
              options={[
                { value: "eat", label: "East Africa Time (GMT+3)" },
                { value: "cat", label: "Central Africa Time (GMT+2)" },
                { value: "wat", label: "West Africa Time (GMT+1)" },
              ]}
              required
            />

            <FormSelectField
              label="Language"
              value={formData.language}
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
              label="Default Payment Method"
              value={formData.defaultPaymentMethod}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultPaymentMethod: value as any,
                }))
              }
              options={[
                { value: "momo", label: "📱 Mobile Money" },
                { value: "credit-card", label: "💳 Credit Card" },
                { value: "bank", label: "🏦 Bank Transfer" },
              ]}
              required
            />

            <FormSelectField
              label="Payment Failure Retry Policy"
              value={formData.retryPolicy}
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
              label="Default Trial Period (days)"
              value={formData.defaultTrialLength}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, defaultTrialLength: value }))
              }
              min={0}
              max={365}
              helpText="How long new subscriptions can be trialed for free"
              required
            />

            <FormNumberField
              label="Grace Period (days)"
              value={formData.gracePeriod}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, gracePeriod: value }))
              }
              min={0}
              max={30}
              helpText="Additional days before subscription cancellation"
              required
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
