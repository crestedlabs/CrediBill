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
import { SubscribeCustomerForm } from "@/components/subscriptions/subscribe-customer-form";
import type { Id } from "@/convex/_generated/dataModel";

interface SubscribeCustomerDialogProps {
  appId: Id<"apps">;
  customerId: Id<"customers">;
  customerEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SubscribeCustomerDialog({
  appId,
  customerId,
  customerEmail,
  open,
  onOpenChange,
  onSuccess,
}: SubscribeCustomerDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscribe Customer</DialogTitle>
            <DialogDescription>
              Choose a plan and subscribe this customer
            </DialogDescription>
          </DialogHeader>
          <SubscribeCustomerForm
            appId={appId}
            customerId={customerId}
            customerEmail={customerEmail}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Subscribe Customer</DrawerTitle>
            <DrawerDescription>
              Choose a plan and subscribe this customer
            </DrawerDescription>
          </DrawerHeader>
          <SubscribeCustomerForm
            appId={appId}
            customerId={customerId}
            customerEmail={customerEmail}
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
