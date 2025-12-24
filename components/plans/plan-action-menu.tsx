"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { EditPlanDialog } from "@/components/plans/edit-plan-dialog";
import { toast } from "sonner";

interface PlanActionMenuProps {
  plan: any;
}

export function PlanActionMenu({ plan }: PlanActionMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deletePlanMutation = useMutation(api.plans.deletePlan);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePlanMutation({ planId: plan._id });
      toast.success("Plan deleted successfully", {
        description: `${plan.name} has been removed`,
      });
    } catch (error: any) {
      toast.error("Failed to delete plan", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete plan"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPlanDialog
        plan={plan}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          toast.success("Plan updated successfully");
        }}
      />
    </>
  );
}
