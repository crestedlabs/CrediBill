"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Edit3, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface OrganizationNameEditProps {
  organizationId: Id<"organizations">;
  currentName: string;
  userRole: string;
}

export default function OrganizationNameEdit({
  organizationId,
  currentName,
  userRole,
}: OrganizationNameEditProps) {
  const [orgName, setOrgName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const renameOrgMutation = useMutation(api.organizations.renameOrg);

  // Check if there's been a change and the name is valid
  const hasChanged = orgName.trim() !== currentName && orgName.trim().length > 0;
  const isOwner = userRole === "owner";

  const handleRename = async () => {
    if (!hasChanged || !isOwner) return;

    setIsLoading(true);
    try {
      await renameOrgMutation({
        organizationId,
        newName: orgName.trim(),
      });
      
      toast.success("Organization renamed successfully!", {
        description: `Your organization is now called "${orgName.trim()}"`,
      });
    } catch (error: any) {
      toast.error("Failed to rename organization", {
        description: error.message || "Please try again",
      });
      // Reset to current name on error
      setOrgName(currentName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && hasChanged && !isLoading) {
      handleRename();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Edit3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Organization Name</CardTitle>
            <CardDescription>
              Update your organization&apos;s display name
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="org-name">Organization Name</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="org-name"
              placeholder="Enter organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !isOwner}
              className="flex-1 h-10"
            />
            <Button
              onClick={handleRename}
              disabled={!hasChanged || isLoading || !isOwner}
              className="h-10 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          {isOwner ? (
            <>
              This name will be visible to all team members and in your billing
              information.
            </>
          ) : (
            <span className="text-amber-600">
              Only organization owners can rename the organization.
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
