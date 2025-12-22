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
import { Plus, Trash2 } from "lucide-react";

const mockTeamMembers = [
  { id: 1, name: "Alice Chen", email: "alice@company.com", role: "Owner" },
  { id: 2, name: "Bob Martinez", email: "bob@company.com", role: "Admin" },
  { id: 3, name: "Carol Williams", email: "carol@company.com", role: "Editor" },
];

export default function SettingsTeam() {
  const [inviteEmail, setInviteEmail] = useState("");

  return (
    <TabsContent value="team" className="space-y-6 m-0">
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>
            Invite and manage team members on this app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-base font-medium text-slate-900">
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
            <p className="text-sm font-semibold uppercase text-slate-500">
              Current Members
            </p>
            {mockTeamMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border border-slate-200 p-3 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-base font-medium text-slate-900">
                    {member.name}
                  </p>
                  <p className="text-sm text-slate-600">{member.email}</p>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <Select defaultValue={member.role.toLowerCase()}>
                    <SelectTrigger className="w-full md:w-28">
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
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 shrink-0"
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
  );
}
