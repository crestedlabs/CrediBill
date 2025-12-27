"use client";

import * as React from "react";
import {
  BellRing,
  DollarSign,
  CreditCard,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type NotificationType = "payment" | "subscription" | "invoice" | "success";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amount?: number;
  customer?: string;
  timestamp: Date;
  read: boolean;
}

// Mock notifications data - replace with real data from your backend
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "payment",
    title: "Payment Received",
    message: "from Allan Kiprotich",
    amount: 50000,
    customer: "Allan Kiprotich",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
  },
  {
    id: "2",
    type: "subscription",
    title: "New Subscription",
    message: "Sarah Wanjiku upgraded to Pro plan",
    amount: 25000,
    customer: "Sarah Wanjiku",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
  },
  {
    id: "3",
    type: "payment",
    title: "Payment Received",
    message: "from David Mwangi",
    amount: 15000,
    customer: "David Mwangi",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    read: true,
  },
  {
    id: "4",
    type: "invoice",
    title: "Invoice Paid",
    message: "Grace Achieng paid invoice #INV-001",
    amount: 75000,
    customer: "Grace Achieng",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
  },
];

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "payment":
      return <DollarSign className="h-4 w-4 text-emerald-600" />;
    case "subscription":
      return <TrendingUp className="h-4 w-4 text-blue-600" />;
    case "invoice":
      return <CreditCard className="h-4 w-4 text-purple-600" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    default:
      return <BellRing className="h-4 w-4 text-slate-600" />;
  }
}

function formatAmount(amount: number) {
  return amount.toLocaleString();
}

export function NotificationCenter() {
  const [notifications, setNotifications] =
    React.useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 w-10 p-0 hover:bg-slate-100"
        >
          <BellRing className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center min-w-[20px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" sideOffset={8}>
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-auto p-0 text-xs text-slate-600 hover:text-slate-900"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <BellRing className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !notification.read ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mb-1">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        {notification.amount && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-emerald-600">
                              {formatAmount(notification.amount)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              UGX
                            </span>
                          </div>
                        )}

                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-slate-200 p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm text-slate-600 hover:text-slate-900"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
