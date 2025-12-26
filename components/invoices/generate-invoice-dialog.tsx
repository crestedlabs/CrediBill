"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

interface GenerateInvoiceDialogProps {
  subscriptionId: Id<"subscriptions">;
  gracePeriod?: number;
  trigger?: React.ReactNode;
}

export function GenerateInvoiceDialog({
  subscriptionId,
  gracePeriod = 7,
  trigger,
}: GenerateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customDueDate, setCustomDueDate] = useState("");

  const generateInvoice = useMutation(api.invoices.generateInvoice);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Calculate due date (convert to timestamp if provided)
      let dueDate: number | undefined;
      if (customDueDate) {
        dueDate = new Date(customDueDate).getTime();
      }

      await generateInvoice({
        subscriptionId,
        dueDate,
      });

      toast.success("Invoice generated successfully");
      setOpen(false);
      setCustomDueDate("");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invoice");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for the current billing period of this
            subscription.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={customDueDate}
              onChange={(e) => setCustomDueDate(e.target.value)}
              placeholder={`Leave empty for ${gracePeriod} days from period end`}
            />
            <p className="text-xs text-slate-500">
              If not specified, invoice will be due {gracePeriod} day
              {gracePeriod !== 1 ? "s" : ""} after period end (based on your
              app's grace period setting).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
