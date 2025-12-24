"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface OrganizationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  organizations: Array<{ _id: string; name: string }>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function OrganizationSelector({
  value,
  onChange,
  organizations,
  error,
  required,
  disabled,
}: OrganizationSelectorProps) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor="organizationId"
        className="text-sm font-medium text-slate-700"
      >
        Organization {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id="organizationId"
          className={cn(
            "h-10 bg-white border-slate-200",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        >
          <SelectValue placeholder="Select an organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org._id} value={org._id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
