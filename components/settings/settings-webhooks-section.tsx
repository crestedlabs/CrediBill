"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import { PermissionAwareSection } from "@/components/ui/permission-aware";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Trash, Webhook } from "lucide-react";
import { AddWebhookDialog } from "@/components/settings/add-webhook-dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface SettingsWebhooksSectionProps {
  appId: Id<"apps">;
}

export function SettingsWebhooksSection({
  appId,
}: SettingsWebhooksSectionProps) {
  const { canManageWebhooks } = useAppPermissions();
  const webhooks = useQuery(api.webhooks.getWebhooksByApp, { appId });
  const deleteWebhook = useMutation(api.webhooks.deleteWebhook);
  const updateWebhookStatus = useMutation(api.webhooks.updateWebhookStatus);
  const [webhookToDelete, setWebhookToDelete] = useState<Id<"webhooks"> | null>(
    null
  );
  const [deletingWebhook, setDeletingWebhook] = useState(false);

  const handleDeleteWebhook = async () => {
    if (!webhookToDelete) return;

    setDeletingWebhook(true);
    try {
      await deleteWebhook({ webhookId: webhookToDelete });
      toast.success("Webhook deleted successfully");
      setWebhookToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete webhook"
      );
    } finally {
      setDeletingWebhook(false);
    }
  };

  const handleToggleStatus = async (
    webhookId: Id<"webhooks">,
    currentStatus: "active" | "inactive"
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateWebhookStatus({ webhookId, status: newStatus });
      toast.success(
        `Webhook ${newStatus === "active" ? "activated" : "deactivated"}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update webhook"
      );
    }
  };

  return (
    <>
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
          <PermissionAwareSection
            canEdit={canManageWebhooks}
            message={getPermissionMessage(["owner", "admin"])}
          >
            {webhooks === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {webhooks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Webhook className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-medium">
                        No webhooks configured
                      </p>
                      <p className="text-xs mt-1">
                        Add a webhook to receive real-time event notifications
                      </p>
                    </div>
                  ) : (
                    webhooks.map((webhook) => (
                      <div
                        key={webhook._id}
                        className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono block truncate">
                              {webhook.url}
                            </code>
                            {webhook.description && (
                              <p className="text-xs text-slate-500 mt-2">
                                {webhook.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                webhook.status === "active"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }
                            >
                              {webhook.status === "active"
                                ? "Active"
                                : "Inactive"}
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
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleStatus(
                                      webhook._id,
                                      webhook.status
                                    )
                                  }
                                >
                                  {webhook.status === "active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    setWebhookToDelete(webhook._id)
                                  }
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500">
                          <span className="font-medium">Events:</span>{" "}
                          {webhook.events.join(", ")}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {canManageWebhooks && (
                  <div className="mt-4">
                    <AddWebhookDialog />
                  </div>
                )}
              </>
            )}
          </PermissionAwareSection>
        </CardContent>
      </Card>

      {/* Delete Webhook Confirmation Dialog */}
      <AlertDialog
        open={webhookToDelete !== null}
        onOpenChange={(open) => !open && setWebhookToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot
              be undone and the endpoint will stop receiving events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingWebhook}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWebhook}
              disabled={deletingWebhook}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingWebhook ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
