"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TabsContent } from "@/components/ui/tabs";
import {
  MoreVertical,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

const mockApiKeys = [
  {
    id: "key_1",
    name: "Production Key",
    keyPrefix: "pk_live_abc123...",
    createdAt: "Dec 1, 2024",
  },
  {
    id: "key_2",
    name: "Development Key",
    keyPrefix: "pk_test_xyz789...",
    createdAt: "Nov 15, 2024",
  },
];

const mockWebhooks = [
  {
    id: "wh_1",
    url: "https://api.example.com/webhooks/billing",
    events: "subscription.created, invoice.paid",
    status: "Active",
  },
  {
    id: "wh_2",
    url: "https://api.example.com/webhooks/process_refunds",
    events: "refund.created",
    status: "Active",
  },
];

export default function SettingsWebhooks() {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  return (
    <TabsContent value="webhooks" className="space-y-6 m-0">
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">API Keys</CardTitle>
          <CardDescription>
            Manage API keys for secure integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {mockApiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-base font-medium text-slate-900">
                    {key.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-slate-600">
                      {showKey[key.id]
                        ? key.keyPrefix.replace("...", "")
                        : key.keyPrefix}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        setShowKey((prev) => ({
                          ...prev,
                          [key.id]: !prev[key.id],
                        }))
                      }
                    >
                      {showKey[key.id] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">
                    Created {key.createdAt}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Webhooks</CardTitle>
          <CardDescription>
            Manage webhook endpoints for real-time events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {mockWebhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="space-y-2 rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm text-slate-600 truncate flex-1 min-w-0">
                    {webhook.url}
                  </code>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Test</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    Events: {webhook.events}
                  </p>
                  <Badge className="bg-emerald-100 text-emerald-800">
                    {webhook.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
