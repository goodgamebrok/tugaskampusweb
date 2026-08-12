import { useQuery } from "@tanstack/react-query";
import { Banknote, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RevenueStats {
  totalRevenue: string;
  monthlyRevenue: string;
  weeklyRevenue: string;
  todayRevenue: string;
  revenueByDuration: { duration: string; revenue: number; count: number }[];
  transactions: {
    id: number;
    keyCode: string;
    price: string;
    durationMonths: number;
    createdAt: string;
  }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string;
  icon: any;
  trend?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chart-2/10">
            <Icon className="h-6 w-6 text-chart-2" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-serif text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(" ", "-")}`}>
              {value}
            </p>
            {trend && (
              <p className="flex items-center gap-1 text-xs text-chart-2">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Revenue() {
  const { data: stats, isLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats"],
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-wide" data-testid="text-page-title">
          Revenue Tracking
        </h1>
        <p className="text-muted-foreground">
          Track your earnings and key sales
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatRupiah(stats?.totalRevenue ?? 0)}
          icon={Banknote}
          loading={isLoading}
        />
        <StatCard
          title="This Month"
          value={formatRupiah(stats?.monthlyRevenue ?? 0)}
          icon={Calendar}
          loading={isLoading}
        />
        <StatCard
          title="This Week"
          value={formatRupiah(stats?.weeklyRevenue ?? 0)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="Today"
          value={formatRupiah(stats?.todayRevenue ?? 0)}
          icon={CreditCard}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue by Duration
            </CardTitle>
            <CardDescription>Breakdown of revenue by key duration</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats?.revenueByDuration?.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueByDuration}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="duration"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => formatRupiah(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => [formatRupiah(value), "Pendapatan"]}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {stats.revenueByDuration.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest key sales</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.transactions?.length ? (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.transactions.map((tx) => (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell className="font-mono text-sm">
                          {tx.keyCode.slice(0, 9)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {tx.durationMonths}M
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-chart-2">
                          {formatRupiah(tx.price)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No transactions yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
