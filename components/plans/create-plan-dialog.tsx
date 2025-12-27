"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
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
import { CreatePlanForm } from "@/components/form/create-plan-form";
import { Plus } from "lucide-react";

interface CreatePlanDialogProps {
  appId: string;
  trigger?: React.ReactNode;
}

export function CreatePlanDialog({ appId, trigger }: CreatePlanDialogProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSuccess = () => {
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          {/* Fixed Header */}
          <div className="border-b border-slate-200 p-6 pb-4">
            <DialogHeader className="space-y-1">
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Set up a new pricing plan for your application. Define the
                pricing model, billing interval, and usage parameters.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <CreatePlanForm
              appId={appId}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="max-h-[96vh] flex flex-col">
        {/* Fixed Header */}
        <div className="border-b border-slate-200">
          <DrawerHeader className="text-left">
            <DrawerTitle>Create New Plan</DrawerTitle>
            <DrawerDescription>
              Set up a new pricing plan for your application. Define the pricing
              model, billing interval, and usage parameters.
            </DrawerDescription>
          </DrawerHeader>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <CreatePlanForm
            appId={appId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
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
