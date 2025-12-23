"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Grid,
  Users,
  Edit3,
  AlertTriangle,
  Crown,
  UserX,
  Settings,
  Plus,
  Save,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AppsContent from "@/components/apps-content";
import SettingsTeam from "@/components/settings-team";
import { useRouter } from "next/navigation";

export default function OrganizationDetailsContent() {
  return (
    <>
      <Authenticated>
        <OrganizationManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to access organization details
            </p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function OrganizationManager() {
  const organizations = useQuery(api.organizations.getUserOrganizations);
  const currentOrg = organizations?.[0]; // Get first organization for now
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg md:block hidden">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-900">
                {currentOrg?.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage your organization settings, team members, and
                applications
              </p>

              {/* Mobile Organization Switcher */}
              <div className="mt-3 md:hidden">
                <Select
                  value={currentOrg?.name || ""}
                  onValueChange={(value) => {
                    if (value === "create-new") {
                      router.push("/create-organization");
                    } else {
                      // Handle organization switch
                      const selectedOrg = organizations?.find(
                        (org) => org.name === value
                      );
                      if (selectedOrg) {
                        console.log("Switch to:", selectedOrg.name);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org._id} value={org.name || ""}>
                        {org.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="create-new" className="text-teal-600">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create organization
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="apps" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[480px]">
            <TabsTrigger
              value="apps"
              className="flex items-center gap-2 sm:gap-2"
            >
              <Grid className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="flex items-center gap-2 sm:gap-2"
            >
              <Users className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Team Members</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 sm:gap-2"
            >
              <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apps" className="space-y-6">
            <AppsContent />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <SettingsTeam />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <OrganizationSettings currentOrg={currentOrg} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
function OrganizationSettings({ currentOrg }: { currentOrg: any }) {
  return (
    <div className="space-y-6">
      {/* Organization Name */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Edit3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Organization Name</CardTitle>
              <CardDescription>
                Update your organization's display name
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Enter organization name"
              defaultValue={currentOrg?.name || ""}
              className="w-full"
            />
            <Button className="h-10 w-full sm:w-auto sm:self-start">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            This name will be visible to all team members and in your billing
            information.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Ownership */}
          <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-600" />
                <h4 className="font-medium text-amber-900">
                  Transfer Ownership
                </h4>
              </div>
              <p className="text-sm text-amber-700">
                Transfer ownership of this organization to another team
                member. You will lose admin access.
              </p>
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Enter new owner's email"
                  className="w-full h-10 bg-white border-amber-200 focus:border-amber-300"
                />
                <Button
                  variant="outline"
                  className="h-10 w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  Transfer Ownership
                </Button>
              </div>
            </div>
          </div>

          {/* Delete Organization */}
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-start gap-3">
              <UserX className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium text-red-900">
                    Delete Organization
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete this organization and all associated
                    data. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" className="h-10">
                  Delete Organization
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
