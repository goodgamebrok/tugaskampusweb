import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Settings as SettingsIcon, Lock, Eye, EyeOff, Loader2, Moon, Sun, Shield, Code, Terminal, Save, X, CheckCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/lib/theme";
import { apiRequest, queryClient } from "@/lib/queryClient";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loaderScript, setLoaderScript] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  // Fetch current global loader script
  const { data: loaderData } = useQuery<{ loaderScript: string | null }>({
    queryKey: ["/api/loader-script"],
    queryFn: async () => {
      const res = await fetch("/api/loader-script");
      return res.json();
    },
  });

  useEffect(() => {
    if (loaderData?.loaderScript != null) {
      setLoaderScript(loaderData.loaderScript);
    }
  }, [loaderData]);

  const loaderMutation = useMutation({
    mutationFn: async (value: string | null) => {
      const res = await apiRequest("PATCH", "/api/admin/loader-script", { loaderScript: value });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loader-script"] });
      toast({ title: "Loader Script disimpan", description: "Semua user dengan key aktif akan mendapat script terbaru." });
    },
    onError: (e: any) => {
      toast({ title: "Gagal simpan", description: e.message, variant: "destructive" });
    },
  });

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => apiRequest("POST", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    passwordMutation.mutate(data);
  };

  const handleCopy = async () => {
    if (!loaderScript) return;
    await navigator.clipboard.writeText(loaderScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apiEndpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/validate-key`
    : "/api/validate-key";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-wide" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and system settings
        </p>
      </div>

      {/* ── Global Loader Script ── */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Global Loader Script
          </CardTitle>
          <CardDescription>
            Script ini akan tampil di dashboard semua user yang memiliki key aktif. Ubah di sini → semua user otomatis mendapat versi terbaru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview terminal */}
          {loaderScript && (
            <div className="overflow-hidden rounded-xl border border-border/50 bg-zinc-950/80">
              <div className="flex items-center gap-1.5 border-b border-border/30 bg-zinc-900/60 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] text-zinc-500">loader_preview.lua</span>
                <button
                  onClick={handleCopy}
                  className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {copied ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto px-4 py-3 text-[12px] leading-relaxed text-emerald-300">
                <code>{loaderScript}</code>
              </pre>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Script Content</label>
            <Textarea
              value={loaderScript}
              onChange={(e) => setLoaderScript(e.target.value)}
              placeholder={`loadstring(game:HttpGet("https://raw.githubusercontent.com/..."))() `}
              rows={4}
              className="font-mono text-sm"
              data-testid="textarea-loader-script"
            />
            <p className="text-xs text-muted-foreground">
              {loaderScript.length} karakter &mdash; Script ini akan muncul di dashboard user sebagai "Loader Script".
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => loaderMutation.mutate(loaderScript)}
              disabled={loaderMutation.isPending}
              className="gap-2"
              data-testid="button-save-loader"
            >
              {loaderMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Script
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                setLoaderScript("");
                loaderMutation.mutate(null);
              }}
              disabled={loaderMutation.isPending || !loaderScript}
              data-testid="button-clear-loader"
            >
              <X className="h-4 w-4" />
              Hapus Script
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your admin account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            data-testid="input-current-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            data-testid="input-new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Password must be at least 6 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={passwordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {passwordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your dashboard experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <span className="font-medium">Dark Mode</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                  data-testid="switch-dark-mode"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Integration
              </CardTitle>
              <CardDescription>
                Use these endpoints to integrate with your Roblox script
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Validate Key Endpoint</p>
                <code className="mt-1 block rounded-md bg-muted p-3 text-sm break-all">
                  POST {apiEndpoint}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium">Request Body</p>
                <pre className="mt-1 rounded-md bg-muted p-3 text-sm overflow-x-auto">
{`{
  "key": "XXXX-XXXX-XXXX-XXXX",
  "hwid": "device-hardware-id"
}`}
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium">Response</p>
                <pre className="mt-1 rounded-md bg-muted p-3 text-sm overflow-x-auto">
{`{
  "success": true,
  "message": "Key validated successfully",
  "expiresAt": "2025-01-10T00:00:00.000Z"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Security information and tips
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                  API endpoints are rate-limited to prevent abuse
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                  Keys are bound to device HWID on first activation
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                  Expired keys are automatically detected and updated
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                  All admin passwords are securely hashed with bcrypt
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
