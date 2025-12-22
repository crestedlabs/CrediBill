import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";

export default function SettingsAdvanced() {
  return (
    <TabsContent value="advanced" className="space-y-6 m-0">
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Advanced Settings</CardTitle>
          <CardDescription>
            Configure advanced features and options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-base font-medium text-slate-900">
                  Allow Plan Downgrades
                </p>
                <p className="text-sm text-slate-600">
                  Permit customers to switch to lower-tier plans
                </p>
              </div>
              <Button variant="outline" className="text-sm">
                Enabled
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-base font-medium text-slate-900">
                  Require Billing Address
                </p>
                <p className="text-sm text-slate-600">
                  Request address on checkout forms
                </p>
              </div>
              <Button variant="outline" className="text-sm">
                Disabled
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-base font-medium text-slate-900">
                  Proration on Plan Changes
                </p>
                <p className="text-sm text-slate-600">
                  Automatically prorate charges
                </p>
              </div>
              <Button variant="outline" className="text-sm">
                Enabled
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">
              Danger Zone
            </p>
            <p className="text-xs text-slate-600">
              Irreversible actions for this app
            </p>

            <Button variant="destructive" className="w-full mt-3">
              Archive App
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
