"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SubscriptionFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  statusFilter: "active" | "trialing" | "paused" | "cancelled" | undefined;
  onStatusFilterChange: (
    status: "active" | "trialing" | "paused" | "cancelled" | undefined,
  ) => void;
}

export function SubscriptionFilters({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  statusFilter,
  onStatusFilterChange,
}: SubscriptionFiltersProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  return (
    <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by customer name or email..."
            className="pl-10 bg-white h-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </div>
        <Button onClick={onSearchSubmit} className="h-10 px-4" type="button">
          <Search className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Search</span>
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(["All", "active", "trialing", "paused", "cancelled"] as const).map(
          (filter) => {
            const isSelected =
              filter === "All" ? !statusFilter : statusFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  onStatusFilterChange(filter === "All" ? undefined : filter)
                }
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                  isSelected
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
