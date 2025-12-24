"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EditPlanForm } from "@/components/plans/edit-plan-form";

interface EditPlanDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPlanDialog({
  plan,
  open,
  onOpenChange,
  onSuccess,
}: EditPlanDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update your pricing plan. Changes may affect existing
              subscriptions.
            </DialogDescription>
          </DialogHeader>
          <EditPlanForm plan={plan} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit Plan</DrawerTitle>
            <DrawerDescription>
              Update your pricing plan. Changes may affect existing
              subscriptions.
            </DrawerDescription>
          </DrawerHeader>
          <EditPlanForm
            plan={plan}
            onSuccess={handleSuccess}
            className="px-4"
          />
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
