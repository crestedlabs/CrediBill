"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";
import { Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateCustomerFormProps {
  appId: Id<"apps">;
  onSuccess?: () => void;
  className?: string;
}

export function CreateCustomerForm({
  appId,
  onSuccess,
  className,
}: CreateCustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    type: "individual" as "individual" | "business",
    status: "active" as "active" | "inactive" | "blocked",
  });

  const createCustomerMutation = useMutation(api.customers.createCustomer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || formData.email.trim().length === 0) {
      toast.error("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await createCustomerMutation({
        appId,
        email: formData.email.trim(),
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        type: formData.type,
        status: formData.status,
      });

      toast.success("Customer created successfully", {
        description: `${formData.email} has been added`,
      });

      // Reset form
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        type: "individual",
        status: "active",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating customer:", error);
      const userFriendlyMessage = parseConvexError(error);
      toast.error("Failed to create customer", {
        description: userFriendlyMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.email.trim().length > 0 && !isSubmitting;

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="customer@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            disabled={isSubmitting}
            required
            className="h-10"
          />
        </div>

        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="first_name" className="text-sm font-medium">
            First Name
          </Label>
          <Input
            id="first_name"
            type="text"
            placeholder="John"
            value={formData.first_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, first_name: e.target.value }))
            }
            disabled={isSubmitting}
            className="h-10"
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="last_name" className="text-sm font-medium">
            Last Name
          </Label>
          <Input
            id="last_name"
            type="text"
            placeholder="Doe"
            value={formData.last_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, last_name: e.target.value }))
            }
            disabled={isSubmitting}
            className="h-10"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+256 700 000 000"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            disabled={isSubmitting}
            className="h-10"
          />
        </div>

        {/* Customer Type */}
        <div className="space-y-2">
          <Label htmlFor="type" className="text-sm font-medium">
            Customer Type
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: any) =>
              setFormData((prev) => ({ ...prev, type: value }))
            }
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm font-medium">
            Status
          </Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) =>
              setFormData((prev) => ({ ...prev, status: value }))
            }
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full h-10" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Customer"
          )}
        </Button>
      </div>
    </form>
  );
}
