import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Settings, AlertTriangle } from "lucide-react";

export default function SettingsAdvanced() {
  return (
    <TabsContent value="advanced" className="space-y-8 m-0">
      {/* Advanced Features */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Advanced Features</CardTitle>
              <CardDescription className="text-slate-500">
                Configure advanced billing and subscription options
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Allow Plan Downgrades</p>
                <p className="text-sm text-slate-500">
                  Permit customers to switch to lower-tier plans
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Require Billing Address</p>
                <p className="text-sm text-slate-500">
                  Request address information on checkout forms
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Proration on Plan Changes</p>
                <p className="text-sm text-slate-500">
                  Automatically calculate prorated charges for upgrades
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/30">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Auto-suspend Failed Payments</p>
                <p className="text-sm text-slate-500">
                  Automatically suspend access after payment failures
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-red-900">Danger Zone</CardTitle>
              <CardDescription className="text-red-600">
                Irreversible actions that will permanently affect this app
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="p-4 rounded-lg border border-red-200 bg-red-50/50">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-red-900">Archive Application</p>
                <p className="text-sm text-red-700">
                  This will permanently archive the app and all its data. This action cannot be undone.
                </p>
              </div>
              <Button variant="destructive" className="h-10">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Archive App
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
