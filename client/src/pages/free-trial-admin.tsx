import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, MonitorPlay, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FreeTrialAdmin() {
  const { toast } = useToast();
  
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ["/api/trial/config"],
  });
  const config = configData as any;

  const { data: rawDevicesData, isLoading: isDevicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["/api/trial/devices", { isActive: "1" }], // Default to show only active
    refetchInterval: 5000, // Live update every 5 seconds
  });
  const devicesData = rawDevicesData as any;

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/trial/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trial/config"] });
      toast({ title: "Success", description: "Free trial configuration updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const [formState, setFormState] = useState({
    trialKey: "",
    trialMaxSlots: 100,
    trialExpiresAt: "",
  });

  // Sync form state when config loads
  if (config && !formState.trialKey && config.trialKey) {
    setFormState({
      trialKey: config.trialKey || "",
      trialMaxSlots: config.trialMaxSlots || 100,
      trialExpiresAt: config.trialExpiresAt ? new Date(config.trialExpiresAt).toISOString().slice(0, 16) : "",
    });
  }

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      trialKey: formState.trialKey,
      trialMaxSlots: formState.trialMaxSlots,
      trialExpiresAt: formState.trialExpiresAt ? new Date(formState.trialExpiresAt).toISOString() : null,
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Free Trial Management</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trial Configuration</CardTitle>
            <CardDescription>Set the global free trial settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trial Key String</Label>
              <Input 
                placeholder="e.g. FREETRIAL-2026" 
                value={formState.trialKey}
                onChange={(e) => setFormState({ ...formState, trialKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Concurrent Slots</Label>
              <Input 
                type="number" 
                value={formState.trialMaxSlots}
                onChange={(e) => setFormState({ ...formState, trialMaxSlots: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (Optional)</Label>
              <Input 
                type="datetime-local" 
                value={formState.trialExpiresAt}
                onChange={(e) => setFormState({ ...formState, trialExpiresAt: e.target.value })}
              />
            </div>
            <Button 
              onClick={handleSaveConfig} 
              disabled={updateConfigMutation.isPending}
              className="w-full"
            >
              {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Live Slot Monitor
              </div>
              <Badge variant="outline" className="text-lg px-4 py-1">
                {devicesData?.activeCount ?? 0} / {config?.trialMaxSlots ?? 100} Active Slots
              </Badge>
            </CardTitle>
            <CardDescription>Monitoring devices currently using the free trial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HWID</TableHead>
                    <TableHead>First Used</TableHead>
                    <TableHead>Last Seen (Heartbeat)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDevicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : devicesData?.devices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No active trial devices right now.
                      </TableCell>
                    </TableRow>
                  ) : (
                    devicesData?.devices?.map((device: any) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-mono text-xs">{device.hwid}</TableCell>
                        <TableCell>{format(new Date(device.firstUsedAt), "dd MMM, HH:mm")}</TableCell>
                        <TableCell>{format(new Date(device.lastSeenAt), "dd MMM, HH:mm:ss")}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Active
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
