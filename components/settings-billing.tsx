import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { File } from "lucide-react";

export default function SettingsBilling() {
  return (
    <TabsContent value="billing" className="space-y-6 m-0">
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Billing & Payments</CardTitle>
          <CardDescription>
            Configure billing policies and payment defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-base font-medium text-slate-900">
              Default Payment Method
            </label>
            <Select defaultValue="momo">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="momo">Mobile Money</SelectItem>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-slate-900">
              Default Trial Length (days)
            </label>
            <Input
              type="number"
              placeholder="14"
              defaultValue="14"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-slate-900">
              Retries
            </label>
            <Select defaultValue="automatic">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="automatic">
                    Automatic Retries
                  </SelectItem>
                  <SelectItem value="manual">Manual Review</SelectItem>
                  <SelectItem value="none">No Retries</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <Button className="h-10">
            <File /> Save Changes
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
