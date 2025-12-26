"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";

interface OrganizationDeleteDialogProps {
  organizationId: Id<"organizations">;
  organizationName: string;
  userRole: string;
}

export default function OrganizationDeleteDialog({
  organizationId,
  organizationName,
  userRole,
}: OrganizationDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteOrgMutation = useMutation(api.organizations.deleteOrganization);
  const router = useRouter();

  // Get apps count for this organization
  const apps = useQuery(api.apps.getUserApps, {
    organizationId,
  });

  const isOwner = userRole === "owner";
  const isConfirmTextValid = confirmText === organizationName;
  const appsCount = apps?.length || 0;

  const handleDelete = async () => {
    if (!isConfirmTextValid || !isOwner) return;

    setIsDeleting(true);
    try {
      const result = await deleteOrgMutation({
        organizationId,
      });

      toast.success("Organization deleted successfully", {
        description: `${result.deletedApps} app(s) and all associated data have been removed.`,
      });

      // Redirect to a safe page after deletion
      router.push("/overview");
    } catch (error: any) {
      toast.error("Failed to delete organization", {
        description: error.message || "Please try again",
      });
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="h-10" disabled={!isOwner}>
          Delete Organization
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Delete Organization
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="text-base text-slate-700">
              This action{" "}
              <span className="font-semibold text-red-600">
                cannot be undone
              </span>
              . Deleting{" "}
              <span className="font-semibold">{organizationName}</span> will
              permanently remove:
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <p className="text-sm text-red-900">
                  <span className="font-semibold">
                    {appsCount} application{appsCount !== 1 ? "s" : ""}
                  </span>{" "}
                  in this organization
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <p className="text-sm text-red-900">
                  All{" "}
                  <span className="font-semibold">
                    customers, plans, and subscriptions
                  </span>{" "}
                  across all apps
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <p className="text-sm text-red-900">
                  All{" "}
                  <span className="font-semibold">
                    invoices and payment records
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <p className="text-sm text-red-900">
                  All <span className="font-semibold">team members</span> will
                  lose access
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-text" className="text-slate-700">
                To confirm, type{" "}
                <span className="font-mono font-semibold bg-slate-100 px-1 rounded">
                  {organizationName}
                </span>{" "}
                below:
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type organization name"
                disabled={isDeleting}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            disabled={isDeleting}
            onClick={() => setConfirmText("")}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmTextValid || isDeleting}
            className="sm:ml-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>Delete Organization</>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
