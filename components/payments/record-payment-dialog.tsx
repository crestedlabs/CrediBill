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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DollarSign, Loader2 } from "lucide-react";

interface RecordPaymentDialogProps {
  invoiceId: Id<"invoices">;
  invoiceNumber: string;
  currency: string;
  amountDue: number;
  amountPaid: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  invoiceId,
  invoiceNumber,
  currency,
  amountDue,
  amountPaid,
  trigger,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const recordPayment = useMutation(api.payments.recordPayment);

  const remainingBalance = amountDue - amountPaid;

  // Format currency with proper divisor
  const formatAmount = (amount: number) => {
    const divisor =
      currency === "UGX" ||
      currency === "KES" ||
      currency === "TZS" ||
      currency === "RWF"
        ? 1
        : 100;
    return (amount / divisor).toFixed(divisor === 1 ? 0 : 2);
  };

  const handleRecord = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Convert to storage format (smallest unit)
    const divisor =
      currency === "UGX" ||
      currency === "KES" ||
      currency === "TZS" ||
      currency === "RWF"
        ? 1
        : 100;
    const amountInSmallestUnit = Math.round(parseFloat(amount) * divisor);

    if (amountInSmallestUnit > remainingBalance) {
      toast.error(
        `Amount cannot exceed remaining balance of ${currency} ${formatAmount(remainingBalance)}`
      );
      return;
    }

    setIsRecording(true);
    try {
      const result = await recordPayment({
        invoiceId,
        amount: amountInSmallestUnit,
        paymentMethod: paymentMethod as any,
        paymentDate: paymentDate ? new Date(paymentDate).getTime() : undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      toast.success("Payment recorded successfully", {
        description: `${currency} ${formatAmount(amountInSmallestUnit)} recorded. ${result.invoiceStatus === "paid" ? "Invoice marked as paid." : `Remaining: ${currency} ${formatAmount(result.remainingBalance)}`}`,
      });

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to record payment", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsRecording(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setPaymentMethod("");
    setPaymentDate("");
    setReference("");
    setNotes("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <DollarSign className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {/* Invoice Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Remaining Balance:</span>
              <span className="font-semibold text-emerald-600">
                {currency} {formatAmount(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Payment Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {currency}
              </span>
              <Input
                id="amount"
                type="number"
                step={
                  currency === "UGX" ||
                  currency === "KES" ||
                  currency === "TZS" ||
                  currency === "RWF"
                    ? "1"
                    : "0.01"
                }
                min="0"
                max={formatAmount(remainingBalance)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-14"
              />
            </div>
            <p className="text-xs text-slate-500">
              You can enter partial payments. Max: {currency}{" "}
              {formatAmount(remainingBalance)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="momo">Mobile Money</SelectItem>
                <SelectItem value="credit-card">Credit Card</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date (Optional)</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., TXN123456"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isRecording}
          >
            Cancel
          </Button>
          <Button onClick={handleRecord} disabled={isRecording}>
            {isRecording ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
