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
import { CreateCustomerForm } from "@/components/customers/create-customer-form";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateCustomerDialogProps {
  appId: Id<"apps">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCustomerDialog({
  appId,
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomerDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
          {/* Fixed Header */}
          <div className="border-b border-slate-200 p-6 pb-4">
            <DialogHeader className="space-y-1">
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Create a new customer for your app. Email is required.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <CreateCustomerForm appId={appId} onSuccess={handleSuccess} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh] flex flex-col">
        {/* Fixed Header */}
        <div className="border-b border-slate-200">
          <DrawerHeader className="text-left">
            <DrawerTitle>Add Customer</DrawerTitle>
            <DrawerDescription>
              Create a new customer for your app. Email is required.
            </DrawerDescription>
          </DrawerHeader>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <CreateCustomerForm
            appId={appId}
            onSuccess={handleSuccess}
            className=""
          />
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-slate-200">
          <DrawerFooter className="pt-4">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
