"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, CheckCircle, XCircle, Clock, Webhook } from "lucide-react";

export function SettingsWebhooksSection({ appId }: { appId: Id<"apps"> }) {
  const appSettings = useQuery(api.apps.getAppSettings, { appId });
  const updateWebhook = useMutation(api.apps.updateWebhookConfig);
  const testWebhook = useMutation(api.apps.testWebhook);
  const webhookDeliveries = useQuery(api.webhookDelivery.listWebhookDeliveries, {
    appId,
    limit: 20,
  });

  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  // Initialize form when data loads
  useEffect(() => {
    if (appSettings) {
      setWebhookUrl(appSettings.webhookUrl || "");
    }
  }, [appSettings]);

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      setMessage({
        type: "error",
        text: "Webhook URL is required",
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const result = await updateWebhook({
        appId,
        webhookUrl: webhookUrl.trim(),
      });
      
      // Store the generated secret from the response
      if (result.webhookSecret) {
        setGeneratedSecret(result.webhookSecret);
      }
      
      setMessage({
        type: "success",
        text: "Webhook configuration saved successfully",
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
        text: "Test webhook sent successfully. Check the delivery log below.",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-api.com/webhooks/credibill"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll send POST requests to this URL when events occur.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <div className="space-y-2">
              {(appSettings?.webhookSecret || generatedSecret) ? (
                <div className="p-3 bg-slate-50 rounded border">
                  <code className="text-sm font-mono break-all">
                    {generatedSecret || appSettings?.webhookSecret}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ Use this secret to verify webhook signatures in your app.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded border border-amber-200">
                  <p className="text-sm text-amber-700">
                    A webhook secret will be generated when you save your webhook URL.
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              CrediBill generates this secret automatically and uses it to sign webhook payloads with HMAC-SHA256.
            </p>
          </div>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
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
          </div>
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
              <h3 className="text-base font-semibold">Payment Provider Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure your payment providers to send webhooks to CrediBill
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-orange-800 mb-2">⚠️ Required Setup</p>
              <p className="text-orange-700">
                For CrediBill to track your payments, configure these webhook URLs in your payment provider dashboards:
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Flutterwave</h4>
                  <code className="text-xs bg-slate-100 p-1 rounded block break-all">
                    https://giant-goldfish-922.convex.site/webhooks/flutterwave
                  </code>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">PawaPay</h4>
                  <code className="text-xs bg-slate-100 p-1 rounded block break-all">
                    https://giant-goldfish-922.convex.site/webhooks/pawapay
                  </code>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Pesapal</h4>
                  <code className="text-xs bg-slate-100 p-1 rounded block break-all">
                    https://giant-goldfish-922.convex.site/webhooks/pesapal
                  </code>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">DPO Pay</h4>
                  <code className="text-xs bg-slate-100 p-1 rounded block break-all">
                    https://giant-goldfish-922.convex.site/webhooks/dpo
                  </code>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>How it works:</strong> When customers pay through your payment forms, 
                  the payment provider notifies CrediBill → CrediBill updates subscription status → 
                  CrediBill sends webhook to your app above.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium text-slate-900">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                  <li>Log into your payment provider dashboard</li>
                  <li>Find the webhook/IPN/callback configuration section</li>
                  <li>Add the CrediBill webhook URL for your provider</li>
                  <li>Ensure the webhook includes transaction status and reference</li>
                  <li>Test with a small payment to verify the flow</li>
                </ol>
              </div>
            </div>
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
              <h4 className="font-medium text-slate-900 mb-2">Subscription Events</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.created
                  </code>
                  <span className="text-muted-foreground">New subscription created</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.activated
                  </code>
                  <span className="text-muted-foreground">Payment successful, subscription active</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.renewed
                  </code>
                  <span className="text-muted-foreground">Subscription renewed for new billing period</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.cancelled
                  </code>
                  <span className="text-muted-foreground">Subscription cancelled</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.plan_changed
                  </code>
                  <span className="text-muted-foreground">Plan upgrade or downgrade</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.trial_expired
                  </code>
                  <span className="text-muted-foreground">Trial ended, payment collection needed</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    subscription.past_due
                  </code>
                  <span className="text-muted-foreground">Payment failed, subscription past due</span>
                </div>
              </div>
            </div>

            {/* Invoice Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Invoice Events</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.created
                  </code>
                  <span className="text-muted-foreground">New invoice generated</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.paid
                  </code>
                  <span className="text-muted-foreground">Invoice marked as paid</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.overdue
                  </code>
                  <span className="text-muted-foreground">Invoice payment overdue</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                    invoice.voided
                  </code>
                  <span className="text-muted-foreground">Invoice voided or cancelled</span>
                </div>
              </div>
            </div>

            {/* Customer Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Customer Events</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    customer.created
                  </code>
                  <span className="text-muted-foreground">New customer added</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    customer.updated
                  </code>
                  <span className="text-muted-foreground">Customer details updated</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    customer.deleted
                  </code>
                  <span className="text-muted-foreground">Customer removed</span>
                </div>
              </div>
            </div>

            {/* Payment Events */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Payment Events</h4>
              <div className="space-y-2 ml-2">
                <div className="flex items-start gap-2">
                  <code className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">
                    payment.due
                  </code>
                  <span className="text-muted-foreground">Recurring payment due for collection</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">
                    payment.failed
                  </code>
                  <span className="text-muted-foreground">Payment attempt failed</span>
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
                  <span className="text-muted-foreground">New pricing plan created</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
                    plan.updated
                  </code>
                  <span className="text-muted-foreground">Plan details updated</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
                    plan.archived
                  </code>
                  <span className="text-muted-foreground">Plan archived (no new subscriptions)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery History */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <h3 className="text-base font-semibold">Recent Deliveries</h3>
          <p className="text-sm text-muted-foreground">
            Last 20 webhook delivery attempts
          </p>
        </CardHeader>
        <CardContent>
          {!webhookDeliveries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webhookDeliveries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webhook deliveries yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Last Attempt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookDeliveries.map((delivery) => (
                    <TableRow key={delivery._id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {delivery.event}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>{delivery.attempts}</TableCell>
                      <TableCell>
                        {delivery.responseStatus ? (
                          <span
                            className={
                              delivery.responseStatus >= 200 &&
                              delivery.responseStatus < 300
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {delivery.responseStatus}
                          </span>
                        ) : delivery.error ? (
                          <span className="text-red-600 text-xs">
                            {delivery.error.substring(0, 50)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {delivery.lastAttemptAt
                          ? new Date(delivery.lastAttemptAt).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
