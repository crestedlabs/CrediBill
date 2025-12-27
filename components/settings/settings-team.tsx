"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";

export default function SettingsTeam() {
  const { selectedOrg } = useOrganization();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member"
  );
  const [isInviting, setIsInviting] = useState(false);

  const members = useQuery(
    api.organizations.getOrganizationMembers,
    selectedOrg?._id ? { organizationId: selectedOrg._id } : "skip"
  );
  const inviteMember = useMutation(api.organizations.inviteMember);
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);
  const removeMember = useMutation(api.organizations.removeMember);

  const handleInvite = async () => {
    if (!selectedOrg?._id || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const result = await inviteMember({
        organizationId: selectedOrg._id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success(result.message);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error) {
      toast.error(parseConvexError(error));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (
    membershipId: any,
    newRole: "admin" | "member" | "viewer"
  ) => {
    try {
      await updateMemberRole({
        membershipId,
        newRole,
      });
      toast.success("Role updated successfully");
    } catch (error) {
      toast.error(parseConvexError(error));
    }
  };

  const handleRemove = async (membershipId: any, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the organization?`)) return;

    try {
      await removeMember({ membershipId });
      toast.success("Member removed successfully");
    } catch (error) {
      toast.error(parseConvexError(error));
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "text-amber-500";
      case "admin":
        return "text-blue-500";
      case "member":
        return "text-green-500";
      case "viewer":
        return "text-slate-400";
      default:
        return "text-slate-400";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <TabsContent value="team" className="space-y-8 m-0">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <span className="font-semibold">Note:</span> You can only invite users
          who already have an account. Ask them to sign up first if they don't
          have one yet.
        </AlertDescription>
      </Alert>

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
                Add existing users to your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-3 flex-col sm:flex-row">
            <Input
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="h-10 flex-1"
              disabled={isInviting}
            />
            <Select
              value={inviteRole}
              onValueChange={(value: "admin" | "member" | "viewer") =>
                setInviteRole(value)
              }
              disabled={isInviting}
            >
              <SelectTrigger className="w-full sm:w-32 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-green-500" />
                      Member
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
            <Button
              className="h-10 px-4 gap-2"
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isInviting ? "Inviting..." : "Invite"}
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
          {members === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No team members yet. Invite someone to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex-col sm:flex-row gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-col sm:flex-row">
                    <Select
                      value={member.role}
                      onValueChange={(value: "admin" | "member" | "viewer") =>
                        handleRoleChange(member._id, value)
                      }
                      disabled={member.role === "owner"}
                    >
                      <SelectTrigger className="w-full sm:w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="owner" disabled>
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
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-green-500" />
                              Member
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

                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(member._id, member.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
