import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import { Save } from "lucide-react";
export default function SettingsGeneral() {
  return (
    <div className="space-y-6">
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">General Settings</CardTitle>
          <CardDescription>
            Configure basic preferences for your app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2 md:grid md:grid-cols-5 md:items-start md:gap-4 md:space-y-0">
            <div className="md:col-span-3">
              <label className="text-base font-medium text-slate-900">
                Billing Currency
              </label>
              <p className="text-sm text-slate-500">
                Select the default currency for all new subscriptions and
                invoices.
              </p>
            </div>
            <div className="md:col-span-2">
              <Select defaultValue="ugx">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ugx">UGX</SelectItem>
                    <SelectItem value="kex">KEX </SelectItem>
                    <SelectItem value="tzs">TZS </SelectItem>
                    <SelectItem value="frc">RWF</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 md:grid md:grid-cols-5 md:items-start md:gap-4 md:space-y-0">
            <div className="md:col-span-3">
              <label className="text-base font-medium text-slate-900">
                Time Zone
              </label>
              <p className="text-sm text-slate-500">
                Set the time zone for reporting and invoice generation
                dates.
              </p>
            </div>
            <div className="md:col-span-2">
              <Select defaultValue="eat">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="eat">EAT (GMT+3)</SelectItem>
                    <SelectItem value="cat">CAT (GMT+2)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 md:grid md:grid-cols-5 md:items-start md:gap-4 md:space-y-0">
            <div className="md:col-span-3">
              <label className="text-base font-medium text-slate-900">
                Language
              </label>
              <p className="text-sm text-slate-500">
                Choose the default language for the dashboard and customer
                communications.
              </p>
            </div>
            <div className="md:col-span-2">
              <Select defaultValue="en">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="kis">Kiswahili</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button className="h-10">
              <Save className="mr-2 h-4 w-4" />Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
