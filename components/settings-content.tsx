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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  File,
} from "lucide-react";

const mockTeamMembers = [
  { id: 1, name: "Alice Chen", email: "alice@company.com", role: "Owner" },
  { id: 2, name: "Bob Martinez", email: "bob@company.com", role: "Admin" },
  { id: 3, name: "Carol Williams", email: "carol@company.com", role: "Editor" },
];

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
    url: "https://api.example.com/webhooks/refunds",
    events: "refund.created",
    status: "Active",
  },
];

export default function SettingsContent() {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [inviteEmail, setInviteEmail] = useState("");

  return (
    <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-600">
          Manage app configuration and preferences
        </p>
      </div>

      <Separator className="my-2" />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex w-full gap-1 overflow-x-auto bg-slate-100 p-1 h-auto md:grid md:w-auto md:grid-cols-5 md:bg-slate-100 md:p-1">
          <TabsTrigger
            value="general"
            className="whitespace-nowrap flex-1 px-3 py-3 text-sm md:flex-none md:px-4 md:py-2"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="whitespace-nowrap flex-1 px-3 py-3 text-sm md:flex-none md:px-4 md:py-2"
          >
            Team
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="whitespace-nowrap flex-1 px-3 py-3 text-sm md:flex-none md:px-4 md:py-2"
          >
            Billing
          </TabsTrigger>
          <TabsTrigger
            value="webhooks"
            className="whitespace-nowrap flex-1 px-3 py-3 text-sm md:flex-none md:px-4 md:py-2"
          >
            Webhooks
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="whitespace-nowrap flex-1 px-3 py-3 text-sm md:flex-none md:px-4 md:py-2"
          >
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">General Settings</CardTitle>
              <CardDescription>
                Configure basic preferences for your app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Billing Currency
                </label>
                <Select defaultValue="ugx">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ugx">UGX</SelectItem>
                      <SelectItem value="kex">KEX </SelectItem>
                      <SelectItem value="tzs">TZS </SelectItem>
                      <SelectItem value="frc">RWF</SelectItem>
                      <SelectItem value="usd">USD</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Time Zone
                </label>
                <Select defaultValue="eat">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="eat">EAT (GMT+3)</SelectItem>
                      <SelectItem value="cat">CAT (GMT+2)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Language
                </label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="en">English</SelectItem>

                      <SelectItem value="kis">Kiswahili</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Team Members</CardTitle>
              <CardDescription>
                Invite and manage team members on this app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Invite Team Member
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Current Members
                </p>
                {mockTeamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-600">{member.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select defaultValue={member.role.toLowerCase()}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {member.role !== "Owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Billing & Payments</CardTitle>
              <CardDescription>
                Configure billing policies and payment defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Default Payment Method
                </label>
                <Select defaultValue="momo">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="momo">Mobile Money</SelectItem>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Default Trial Length (days)
                </label>
                <Input
                  type="number"
                  placeholder="14"
                  defaultValue="14"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  Retries
                </label>
                <Select defaultValue="automatic">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="automatic">
                        Automatic Retries
                      </SelectItem>
                      <SelectItem value="manual">Manual Review</SelectItem>
                      <SelectItem value="none">No Retries</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Button className="h-10">
                <File /> Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">API Keys</CardTitle>
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
                      <p className="text-sm font-medium text-slate-900">
                        {key.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-slate-600">
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
                      <p className="text-xs text-slate-500">
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
              <CardTitle className="text-base">Webhooks</CardTitle>
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
                      <code className="text-xs text-slate-600">
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
                      <p className="text-xs text-slate-600">
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

        <TabsContent value="advanced" className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced features and options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Allow Plan Downgrades
                    </p>
                    <p className="text-xs text-slate-600">
                      Permit customers to switch to lower-tier plans
                    </p>
                  </div>
                  <Button variant="outline" className="text-xs">
                    Enabled
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Require Billing Address
                    </p>
                    <p className="text-xs text-slate-600">
                      Request address on checkout forms
                    </p>
                  </div>
                  <Button variant="outline" className="text-xs">
                    Disabled
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Proration on Plan Changes
                    </p>
                    <p className="text-xs text-slate-600">
                      Automatically prorate charges
                    </p>
                  </div>
                  <Button variant="outline" className="text-xs">
                    Enabled
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  Danger Zone
                </p>
                <p className="text-xs text-slate-600">
                  Irreversible actions for this app
                </p>

                <Button variant="destructive" className="w-full mt-3">
                  Archive App
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
