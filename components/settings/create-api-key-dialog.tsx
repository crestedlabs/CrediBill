"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/contexts/app-context";
import { Plus, Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Available scopes
const API_KEY_SCOPES = [
  { value: "read", label: "Read", description: "View data" },
  { value: "write", label: "Write", description: "Create and modify data" },
  { value: "webhooks", label: "Webhooks", description: "Manage webhooks" },
  { value: "admin", label: "Admin", description: "Full access" },
];

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
];

interface CreateApiKeyDialogProps {
  onSuccess?: () => void;
}

export function CreateApiKeyDialog({ onSuccess }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full h-10">
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for secure access to your app's data.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <ApiKeyForm
              onSuccess={() => {
                setOpen(false);
                onSuccess?.();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full h-10">
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create API Key</DrawerTitle>
          <DrawerDescription>
            Generate a new API key for secure access to your app's data.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto max-h-[60vh]">
          <ApiKeyForm
            onSuccess={() => {
              setOpen(false);
              onSuccess?.();
            }}
          />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

interface ApiKeyFormProps {
  onSuccess: () => void;
}

function ApiKeyForm({ onSuccess }: ApiKeyFormProps) {
  const { selectedApp } = useApp();
  const createApiKey = useMutation(api.apiKeys.createApiKey);

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read"]);
  const [expiration, setExpiration] = useState("never");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleScopeToggle = (scopeValue: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeValue)
        ? prev.filter((s) => s !== scopeValue)
        : [...prev, scopeValue]
    );
  };

  const handleCopy = async () => {
    if (createdSecret) {
      await navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("API key copied to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedApp) {
      toast.error("No app selected");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt =
        expiration === "never"
          ? undefined
          : Date.now() + parseInt(expiration) * 24 * 60 * 60 * 1000;

      const result = await createApiKey({
        appId: selectedApp._id,
        name: name.trim(),
        environment,
        scopes: selectedScopes,
        expiresAt,
      });

      // Show the secret in the dialog
      setCreatedSecret(result.secret);
      toast.success("API key created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key"
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (createdSecret) {
      // Reset form
      setName("");
      setEnvironment("test");
      setSelectedScopes(["read"]);
      setExpiration("never");
      setCreatedSecret(null);
      setCopied(false);
      setIsSubmitting(false);
    }
    onSuccess();
  };

  // If key was created, show the secret display
  if (createdSecret) {
    return (
      <div className="space-y-4 py-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <p className="font-semibold mb-2">Save this key now!</p>
            <p className="text-sm">
              This is the only time you'll see the full key. Store it securely
              - you won't be able to retrieve it again.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Your API Key</Label>
          <div className="relative">
            <code className="block w-full p-3 pr-12 text-sm bg-slate-100 border border-slate-200 rounded font-mono break-all">
              {createdSecret}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-8 w-8 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
          <p className="font-medium text-slate-900">Next steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>Copy the key to your clipboard</li>
            <li>Store it in a secure location (password manager, env file)</li>
            <li>Use it in your API requests with the Authorization header</li>
          </ol>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </div>
    );
  }

  // Otherwise show the creation form
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Key Name</Label>
        <Input
          id="name"
          placeholder="e.g., Production Server, CI/CD Pipeline"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          required
        />
        <p className="text-sm text-muted-foreground">
          A descriptive name to help you identify this key.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="environment">Environment</Label>
        <Select
          value={environment}
          onValueChange={(value: "test" | "live") => setEnvironment(value)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
            <SelectItem value="live">Live</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Live keys have access to production data. Use test keys for development.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Permissions (Scopes)</Label>
        <div className="border rounded-lg p-4 space-y-3">
          {API_KEY_SCOPES.map((scope) => (
            <div key={scope.value} className="flex items-start space-x-3">
              <Checkbox
                id={scope.value}
                checked={selectedScopes.includes(scope.value)}
                onCheckedChange={() => handleScopeToggle(scope.value)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <label
                  htmlFor={scope.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {scope.label}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {scope.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiration">Expiration</Label>
        <Select
          value={expiration}
          onValueChange={setExpiration}
          disabled={isSubmitting}
        >
          <SelectTrigger id="expiration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPIRATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Key will automatically stop working after this period.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Key"}
        </Button>
      </div>
    </form>
  );
}
