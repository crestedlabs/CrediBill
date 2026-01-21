"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Webhook,
  Copy,
  Check,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

export function SettingsWebhooksSection({ appId }: { appId: Id<"apps"> }) {
  const appSettings = useQuery(api.apps.getAppSettings, { appId });
  const credentials = useQuery(api.paymentProviderCredentials.getCredentials, {
    appId,
  });
  const selectedProvider = useQuery(
    api.providerCatalog.getProviderById,
    appSettings?.paymentProviderId
      ? { providerId: appSettings.paymentProviderId }
      : "skip",
  );
  // Use new Svix endpoints
  const webhookConfig = useQuery(api.webhookEndpoints.getWebhookConfig, {
    appId,
  });
  const configureWebhook = useMutation(
    api.webhookEndpoints.configureWebhookEndpoint,
  );
  const testWebhook = useAction(api.svixEvents.testWebhook);
  const generateDashboard = useAction(
    api.svixDashboard.generateWebhookDashboard,
  );

  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Initialize form when webhook config loads
  useEffect(() => {
    if (webhookConfig?.configured && webhookConfig.webhook) {
      setWebhookUrl(webhookConfig.webhook.url || "");
    }
  }, [webhookConfig]);

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      setMessage({
        type: "error",
        text: "Webhook URL is required",
      });
      return;
    }

    if (!webhookUrl.startsWith("https://")) {
      setMessage({
        type: "error",
        text: "Webhook URL must use HTTPS for security",
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const result = await configureWebhook({
        appId,
        url: webhookUrl.trim(),
        description: "Webhook endpoint for " + appSettings?.name,
      });

      // Store the generated secret from the response
      if (result.secret) {
        setGeneratedSecret(result.secret);
      }

      setMessage({
        type: "success",
        text: result.message || "Webhook configuration saved successfully",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to save webhook configuration",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a webhook URL first",
      });
      return;
    }

    setIsTesting(true);
    setMessage(null);
    try {
      await testWebhook({ appId });
      setMessage({
        type: "success",
        text: "Test webhook sent successfully. Check the delivery log below or view in the dashboard.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to send test webhook",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleViewDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const result = await generateDashboard({ appId });
      if (result.success && result.url) {
        // Open dashboard in new window
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to generate dashboard access",
      });
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Webhook className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Outgoing Webhooks</h2>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications about subscription events
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Svix Info Banner */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900 mb-1">
                  Powered by Svix
                </h4>
                <p className="text-sm text-purple-800 leading-relaxed">
                  Your webhooks are managed by Svix, providing automatic retries
                  with exponential backoff, signature verification, delivery
                  tracking, and a full-featured debugging dashboard. No more
                  manual retry logic!
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-api.com/webhooks/myapp"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll send POST requests to this URL when events occur. Must use
              HTTPS.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <div className="space-y-2">
              {webhookConfig?.webhook?.secret || generatedSecret ? (
                <div className="p-3 bg-slate-50 rounded border">
                  <code className="text-sm font-mono break-all">
                    {generatedSecret || webhookConfig?.webhook?.secret}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ Use this secret to verify Svix webhook signatures in your
                    app.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded border border-amber-200">
                  <p className="text-sm text-amber-700">
                    A webhook secret will be generated when you save your
                    webhook URL.
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Svix generates this secret automatically and uses it to sign
              webhook payloads. Use the Svix SDK to verify signatures.
            </p>
          </div>

          {message && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !webhookUrl.trim()}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test
            </Button>
            {webhookConfig?.configured &&
              webhookConfig.webhook?.hasSvixEndpoint && (
                <Button
                  variant="outline"
                  onClick={handleViewDashboard}
                  disabled={isLoadingDashboard}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100"
                >
                  {isLoadingDashboard ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      <ExternalLink className="h-3 w-3 mr-1" />
                    </>
                  )}
                  View Dashboard
                </Button>
              )}
          </div>

          {webhookConfig?.configured &&
            webhookConfig.webhook?.hasSvixEndpoint && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-900 font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Webhook Dashboard Available
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Access a full-featured dashboard to debug webhooks, view
                  delivery logs, retry failed events, and test your endpoint
                  configuration. Dashboard sessions are valid for 1 hour.
                </p>
              </div>
            )}

          {message && (
            <Alert
              className="mt-4"
              variant={message.type === "error" ? "destructive" : "default"}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Provider Setup */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Webhook className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Payment Provider Configuration
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure your payment providers to send webhooks to CrediBill
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-orange-800 mb-2">
                ⚠️ Required Setup
              </p>
              <p className="text-orange-700">
                For CrediBill to track your payments, configure this webhook URL
                in the {selectedProvider?.displayName} dashboard:
              </p>
            </div>

            {credentials && selectedProvider ? (
              <div className="space-y-3">
                <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                  <h4 className="font-medium text-slate-900 mb-3 text-base">
                    {selectedProvider.displayName} Webhook URL
                  </h4>
                  <div className="flex gap-2">
                    <code className="text-sm bg-white p-3 rounded block break-all border border-slate-200 font-mono flex-1">
                      {`https://api.credibill.tech/v1/webhooks/${selectedProvider.name}`}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyWebhookUrl(
                          `https://api.credibill.tech/v1/webhooks/${selectedProvider.name}`,
                        )
                      }
                    >
                      {copiedWebhook ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    <strong>How it works:</strong> When customers pay through
                    your payment forms, {selectedProvider.displayName} notifies
                    CrediBill → CrediBill updates subscription status →
                    CrediBill sends webhook to your app above.
                  </p>
                </div>

                {/* Provider-specific setup instructions */}
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">
                    Setup Instructions for {selectedProvider.displayName}:
                  </p>
                  {selectedProvider.name === "flutterwave" && (
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                      <li>
                        Log into your{" "}
                        <a
                          href="https://dashboard.flutterwave.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Flutterwave Dashboard
                        </a>
                      </li>
                      <li>
                        Navigate to <strong>Settings → Webhooks</strong>
                      </li>
                      <li>Click "New Webhook" or "Add Webhook URL"</li>
                      <li>Paste the webhook URL above</li>
                      <li>
                        Select events:{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          charge.completed
                        </code>
                        ,{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          charge.failed
                        </code>
                      </li>
                      <li>Save and test with a small transaction</li>
                    </ol>
                  )}
                  {selectedProvider.name === "pawapay" && (
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                      <li>
                        Login to your{" "}
                        <Link
                          href="https://dashboard.sandbox.pawapay.io/#/system/callback-url"
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          pawaPay Merchant Dashboard
                        </Link>
                      </li>
                      <li>
                        Go to system configuration, then select Callback URLs
                        (same as webhooks){" "}
                      </li>
                      <li>
                        In the Deposit field, paste the webhook URL above, then
                        save.
                      </li>
                      <li>
                        <strong>Important:</strong> When making deposit
                        requests, include{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          {`{ "credibill_app_id": "${appId}" }`}
                        </code>{" "}
                        in the metadata array so CrediBill can route the webhook
                        correctly.
                      </li>
                      <li>
                        Ensure callbacks include:{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          depositId
                        </code>
                        ,{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          status
                        </code>
                        ,{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                          amount
                        </code>
                      </li>
                      <li>Test with a sandbox payment to verify setup</li>
                    </ol>
                  )}
                  {selectedProvider.name === "pesapal" && (
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                      <li>
                        Log into your{" "}
                        <a
                          href="https://www.pesapal.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Pesapal Dashboard
                        </a>
                      </li>
                      <li>
                        Go to{" "}
                        <strong>
                          Settings → IPN (Instant Payment Notification)
                        </strong>
                      </li>
                      <li>Click "Register IPN URL"</li>
                      <li>Enter the webhook URL above as your IPN URL</li>
                      <li>
                        Select notification type: <strong>POST</strong>
                      </li>
                      <li>Save and verify with a test transaction</li>
                    </ol>
                  )}
                  {selectedProvider.name === "dpo" && (
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                      <li>
                        Log into your{" "}
                        <a
                          href="https://secure.dpo.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          DPO PayGate Dashboard
                        </a>
                      </li>
                      <li>
                        Navigate to{" "}
                        <strong>Integration → Callback/Redirect URLs</strong>
                      </li>
                      <li>
                        Set <strong>Server Notification URL (Callback)</strong>{" "}
                        to the webhook URL above
                      </li>
                      <li>
                        Ensure the notification method is set to{" "}
                        <strong>POST</strong>
                      </li>
                      <li>
                        Enable notifications for: Payment Completed, Payment
                        Failed
                      </li>
                      <li>Save configuration and test with a demo payment</li>
                    </ol>
                  )}
                  {!["flutterwave", "pawapay", "pesapal", "dpo"].includes(
                    selectedProvider.name,
                  ) && (
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                      <li>
                        Log into your {selectedProvider.displayName} dashboard
                      </li>
                      <li>
                        Find the webhook/IPN/callback configuration section
                      </li>
                      <li>Copy and paste the webhook URL above</li>
                      <li>
                        Ensure the webhook includes transaction status and
                        reference
                      </li>
                      <li>Test with a small payment to verify the flow</li>
                    </ol>
                  )}
                </div>
              </div>
            ) : selectedProvider ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-slate-600">
                  Configure your {selectedProvider.displayName} credentials in
                  the <strong>Provider</strong> tab to see your webhook URL
                  here.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-slate-600">
                  No payment provider selected. Create a new app with a payment
                  provider to see webhook configuration.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Events */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <h3 className="text-base font-semibold">Webhook Events</h3>
          <p className="text-sm text-muted-foreground">
            Your webhook endpoint will receive these events:
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {/* Subscription Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">
                Subscription Events
              </h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.created
                  </code>
                  <span className="text-muted-foreground">
                    New subscription created
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.activated
                  </code>
                  <span className="text-muted-foreground">
                    Payment successful, subscription active
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.renewed
                  </code>
                  <span className="text-muted-foreground">
                    Subscription renewed for new billing period
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.cancelled
                  </code>
                  <span className="text-muted-foreground">
                    Subscription cancelled
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.plan_changed
                  </code>
                  <span className="text-muted-foreground">
                    Plan upgrade or downgrade
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.trial_expired
                  </code>
                  <span className="text-muted-foreground">
                    Trial ended, payment collection needed
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.past_due
                  </code>
                  <span className="text-muted-foreground">
                    Payment failed, subscription past due
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">
                Invoice Events
              </h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.created
                  </code>
                  <span className="text-muted-foreground">
                    New invoice generated
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.paid
                  </code>
                  <span className="text-muted-foreground">
                    Invoice marked as paid
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.overdue
                  </code>
                  <span className="text-muted-foreground">
                    Invoice payment overdue
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.voided
                  </code>
                  <span className="text-muted-foreground">
                    Invoice voided or cancelled
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">
                Customer Events
              </h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    customer.created
                  </code>
                  <span className="text-muted-foreground">
                    New customer added
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    customer.updated
                  </code>
                  <span className="text-muted-foreground">
                    Customer details updated
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    customer.deleted
                  </code>
                  <span className="text-muted-foreground">
                    Customer removed
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">
                Payment Events
              </h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">
                    payment.due
                  </code>
                  <span className="text-muted-foreground">
                    Recurring payment due for collection
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">
                    payment.failed
                  </code>
                  <span className="text-muted-foreground">
                    Payment attempt failed
                  </span>
                </div>
              </div>
            </div>

            {/* Plan Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Plan Events</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
                    plan.created
                  </code>
                  <span className="text-muted-foreground">
                    New pricing plan created
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
                    plan.updated
                  </code>
                  <span className="text-muted-foreground">
                    Plan details updated
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
                    plan.archived
                  </code>
                  <span className="text-muted-foreground">
                    Plan archived (no new subscriptions)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Monitoring */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Monitor Your Webhooks
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              View webhook delivery history, retry attempts, response codes, and
              debug failed deliveries in the Svix Dashboard
            </p>
            <Button
              onClick={handleViewDashboard}
              disabled={
                isLoadingDashboard ||
                !webhookConfig?.configured ||
                !webhookConfig.webhook?.hasSvixEndpoint
              }
              size="lg"
            >
              {isLoadingDashboard ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening Dashboard...
                </>
              ) : !webhookConfig?.configured ||
                !webhookConfig.webhook?.hasSvixEndpoint ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Configure Webhook First
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Svix Dashboard
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
