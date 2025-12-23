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
  Key,
  Webhook,
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
    <TabsContent value="webhooks" className="space-y-8 m-0">
      {/* API Keys */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Key className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">API Keys</CardTitle>
              <CardDescription className="text-slate-500">
                Manage API keys for secure integrations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {mockApiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{key.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {key.name.includes('Production') ? 'Live' : 'Test'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono">
                      {showKey[key.id]
                        ? key.keyPrefix.replace("...", "def456ghi789")
                        : key.keyPrefix}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-slate-200"
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
                      className="h-7 w-7 p-0 hover:bg-slate-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Created {key.createdAt}</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 ml-3"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full h-10 mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Webhook className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Webhooks</CardTitle>
              <CardDescription className="text-slate-500">
                Manage webhook endpoints for real-time events
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {mockWebhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono block truncate">
                      {webhook.url}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      {webhook.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-slate-200"
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
                </div>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">Events:</span> {webhook.events}
                </p>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full h-10 mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
