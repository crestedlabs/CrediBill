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
import { MoreVertical, Copy, Trash2, Key, Clock } from "lucide-react";
import { CreateApiKeyDialog } from "@/components/settings/create-api-key-dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface SettingsApiKeysSectionProps {
  appId: Id<"apps">;
}

export function SettingsApiKeysSection({ appId }: SettingsApiKeysSectionProps) {
  const { canManageApiKeys } = useAppPermissions();
  const apiKeys = useQuery(api.apiKeys.getApiKeysByApp, { appId });
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);
  const [keyToRevoke, setKeyToRevoke] = useState<Id<"apiKeys"> | null>(null);
  const [revokingKey, setRevokingKey] = useState(false);

  const handleCopyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    toast.success("Key copied to clipboard");
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    setRevokingKey(true);
    try {
      await revokeApiKey({ apiKeyId: keyToRevoke });
      toast.success("API key revoked successfully");
      setKeyToRevoke(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke API key"
      );
    } finally {
      setRevokingKey(false);
    }
  };

  return (
    <>
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
          <PermissionAwareSection
            canEdit={canManageApiKeys}
            message={getPermissionMessage(["owner", "admin"])}
          >
            {apiKeys === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Key className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No API keys created</p>
                      <p className="text-xs mt-1">
                        Create an API key to access your app's data
                      </p>
                    </div>
                  ) : (
                    apiKeys.map((key) => (
                      <div
                        key={key._id}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">
                              {key.name}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                key.environment === "live"
                                  ? "text-xs bg-green-50 text-green-700 border-green-200"
                                  : "text-xs"
                              }
                            >
                              {key.environment === "live" ? "Live" : "Test"}
                            </Badge>
                            {key.status === "revoked" && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-red-50 text-red-700 border-red-200"
                              >
                                Revoked
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono">
                              {key.keyPrefix}••••{key.keySuffix}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-slate-200"
                              onClick={() =>
                                handleCopyKey(
                                  `${key.keyPrefix}••••${key.keySuffix}`
                                )
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>
                              Created{" "}
                              {new Date(key._creationTime).toLocaleDateString()}
                            </span>
                            {key.lastUsedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last used{" "}
                                {new Date(key.lastUsedAt).toLocaleDateString()}
                              </span>
                            )}
                            {key.expiresAt && (
                              <span className="text-amber-600">
                                Expires{" "}
                                {new Date(key.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.map((scope) => (
                              <Badge
                                key={scope}
                                variant="secondary"
                                className="text-xs"
                              >
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {key.status === "active" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 ml-3"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setKeyToRevoke(key._id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Revoke
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {canManageApiKeys && (
                  <div className="mt-4">
                    <CreateApiKeyDialog />
                  </div>
                )}
              </>
            )}
          </PermissionAwareSection>
        </CardContent>
      </Card>

      {/* Revoke API Key Confirmation Dialog */}
      <AlertDialog
        open={keyToRevoke !== null}
        onOpenChange={(open) => !open && setKeyToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot
              be undone. Any applications using this key will immediately lose
              access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingKey}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeKey}
              disabled={revokingKey}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokingKey ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
