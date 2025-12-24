"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/contexts/app-context";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

// Available webhook events
const WEBHOOK_EVENTS = [
  { value: "subscription.created", label: "Subscription Created" },
  { value: "subscription.updated", label: "Subscription Updated" },
  { value: "subscription.cancelled", label: "Subscription Cancelled" },
  { value: "invoice.created", label: "Invoice Created" },
  { value: "invoice.paid", label: "Invoice Paid" },
  { value: "invoice.failed", label: "Invoice Failed" },
  { value: "payment.succeeded", label: "Payment Succeeded" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "refund.created", label: "Refund Created" },
  { value: "customer.created", label: "Customer Created" },
  { value: "customer.updated", label: "Customer Updated" },
];

interface AddWebhookDialogProps {
  onSuccess?: () => void;
}

export function AddWebhookDialog({ onSuccess }: AddWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Add Webhook
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook endpoint to receive real-time notifications
              about events in your app.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <WebhookForm
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
        <Button>
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Add New Webhook</DrawerTitle>
          <DrawerDescription>
            Configure a webhook endpoint to receive real-time notifications
            about events in your app.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <WebhookForm
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

interface WebhookFormProps {
  onSuccess: () => void;
}

function WebhookForm({ onSuccess }: WebhookFormProps) {
  const { selectedApp } = useApp();
  const createWebhook = useMutation(api.webhooks.createWebhook);

  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEventToggle = (eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue)
        ? prev.filter((e) => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedApp) {
      toast.error("No app selected");
      return;
    }

    if (!url.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);

    try {
      await createWebhook({
        appId: selectedApp._id,
        url: url.trim(),
        events: selectedEvents,
        status,
        description: description.trim() || undefined,
      });

      toast.success("Webhook created successfully");

      // Reset form
      setUrl("");
      setSelectedEvents([]);
      setStatus("active");
      setDescription("");

      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create webhook"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Webhook URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://api.example.com/webhooks"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isSubmitting}
          required
        />
        <p className="text-sm text-muted-foreground">
          The endpoint that will receive webhook events.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Events to Subscribe</Label>
        <div className="border rounded-lg p-4 space-y-3 max-h-[200px] overflow-y-auto">
          {WEBHOOK_EVENTS.map((event) => (
            <div key={event.value} className="flex items-center space-x-2">
              <Checkbox
                id={event.value}
                checked={selectedEvents.includes(event.value)}
                onCheckedChange={() => handleEventToggle(event.value)}
                disabled={isSubmitting}
              />
              <label
                htmlFor={event.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {event.label}
              </label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Select which events will trigger this webhook.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value: "active" | "inactive") => setStatus(value)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Inactive webhooks will not receive events.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="e.g., Production webhook for billing events"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Webhook"}
        </Button>
      </div>
    </form>
  );
}
