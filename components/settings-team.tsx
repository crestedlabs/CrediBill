"use client";

import { useState } from "react";
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
import { Plus, Trash2, Users, Mail, Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const mockTeamMembers = [
  { id: 1, name: "Alice Chen", email: "alice@company.com", role: "Owner" },
  { id: 2, name: "Bob Martinez", email: "bob@company.com", role: "Admin" },
  { id: 3, name: "Carol Williams", email: "carol@company.com", role: "Editor" },
];

export default function SettingsTeam() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [orgName, setOrgName] = useState("My Organization");
  const [transferTo, setTransferTo] = useState("");

  // Filter out current owner for transfer dropdown
  const transferableMembers = mockTeamMembers.filter((m) => m.role !== "Owner");

  return (
    <TabsContent value="team" className="space-y-8 m-0">
      {/* Organization Name */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            Organization Name
          </CardTitle>
          <CardDescription className="text-slate-500">
            Update your organization's display name
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Mobile: Stacked */}
          <div className="flex flex-col gap-3 md:hidden">
            <Input
              placeholder="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="h-10"
            />
            <Button className="h-10 w-full">Save Changes</Button>
          </div>

          {/* Desktop: Same Line (70/30 split) */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <Input
              placeholder="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="h-10 flex-[7]"
            />
            <Button className="h-10 flex-[3]">Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite Member */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Invite Team Member
              </CardTitle>
              <CardDescription className="text-slate-500">
                Add new members to collaborate on this app
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-3">
            <Input
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-10"
            />
            <Button className="h-10 px-4">
              <Plus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Team Members
              </CardTitle>
              <CardDescription className="text-slate-500">
                Manage roles and permissions for your team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {mockTeamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex-col sm:flex-row gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-col sm:flex-row">
                  <Select defaultValue={member.role.toLowerCase()}>
                    <SelectTrigger className="w-full sm:w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="owner">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-amber-500" />
                            Owner
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-blue-500" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-green-500" />
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-slate-400" />
                            Viewer
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {member.role !== "Owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
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

      {/* Danger Zone */}
      <Card className="border-0 shadow-sm bg-white border-red-200">
        <CardHeader className="pb-4 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-red-900">
                Danger Zone
              </CardTitle>
              <CardDescription className="text-red-700">
                Irreversible actions that affect your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Transfer Ownership */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                Transfer Ownership
              </h3>
              <p className="text-sm text-slate-500">
                Transfer ownership of this organization to another team member
              </p>
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                You can only transfer ownership to existing members in your
                organization
              </AlertDescription>
            </Alert>

            {/* Mobile: Stacked */}
            <div className="flex flex-col gap-3 md:hidden">
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select new owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {transferableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <span className="text-xs text-slate-500">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                className="h-10 w-full"
                disabled={!transferTo}
              >
                Transfer Ownership
              </Button>
            </div>

            {/* Desktop: Same Line (70/30 split) */}
            <div className="hidden md:flex md:items-center md:gap-3">
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger className="h-10 flex-[7]">
                  <SelectValue placeholder="Select new owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {transferableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <span className="text-xs text-slate-500">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                className="h-10 flex-[3]"
                disabled={!transferTo}
              >
                Transfer Ownership
              </Button>
            </div>
          </div>

          <Separator />

          {/* Delete Organization */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                Delete Organization
              </h3>
              <p className="text-sm text-slate-500">
                Permanently delete this organization and all its data
              </p>
            </div>
            <Button variant="destructive" className="h-10">
              Delete Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
