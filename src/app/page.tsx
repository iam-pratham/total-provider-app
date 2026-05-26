"use client";
import { PageHeader } from "@/components/page-header";

import React, { useMemo } from "react";
import { useData } from "@/context/data-context";
import { GlobalFilters } from "@/components/global-filters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  LabelList,
  LineChart,
  Line,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

const parseDateSafe = (dateStr: any) => {
  if (!dateStr) return new Date();
  if (
    typeof dateStr === "string" &&
    dateStr.includes("-") &&
    !dateStr.includes("T")
  ) {
    return new Date(dateStr + "T00:00:00");
  }
  return new Date(dateStr);
};

const chartConfig = {
  value: {
    label: "Claims",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    transitionEnd: { transform: "none", "-webkit-transform": "none" },
  },
};

export default function DashboardPage() {
  const { filteredClaims, claims, isLoading } = useData();

  // Calculate KPIs
  const totalClaims = filteredClaims.length;

  const arbLopNoOonCount = useMemo(
    () =>
      filteredClaims.filter((c) => {
        const s = String(c.claimStatus || "")
          .toLowerCase()
          .trim();
        if (
          s.includes("paid correctly") ||
          s.includes("paid with 50%") ||
          s.includes("paid with patient")
        )
          return false;
        if (
          s.includes("towards dedcutible") ||
          s.includes("towards deductible") ||
          s.includes("self pay")
        )
          return false;
        if (s.includes("in process") || s.includes("pending")) return false;
        return (
          s.includes("under arbitration") ||
          s.includes("benefit exhausted") ||
          s.includes("denied-no oon") ||
          s.includes("denied - no oon") ||
          s.includes("no oon") ||
          s === "lop" ||
          s.includes("/lop") ||
          String(c.insuranceType || "").toUpperCase() === "LOP" ||
          c.arbFlag
        );
      }).length,
    [filteredClaims],
  );

  const paidCount = useMemo(
    () =>
      filteredClaims.filter((c) => {
        const s = String(c.claimStatus || "")
          .toLowerCase()
          .trim();
        return (
          s.includes("paid correctly") ||
          s.includes("paid with 50%")
        );
      }).length,
    [filteredClaims],
  );

  const unpaidCount = totalClaims - paidCount - arbLopNoOonCount;

  // Generate Monthly Claims Data (DOS)
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    filteredClaims.forEach((c) => {
      if (c.serviceDate) {
        const d = new Date(c.serviceDate);
        if (!isNaN(d.getTime())) {
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap[sortKey] = (monthMap[sortKey] || 0) + 1;
        }
      }
    });

    const result: Array<{
      sortKey: string;
      name: string;
      shortName: string;
      value: number;
    }> = [];

    const sortKeys = Object.keys(monthMap).sort();
    if (sortKeys.length > 0) {
      const minKey = sortKeys[0];
      const maxKey = sortKeys[sortKeys.length - 1];
      let [currY, currM] = minKey.split("-").map(Number);
      const [maxY, maxM] = maxKey.split("-").map(Number);

      while (currY < maxY || (currY === maxY && currM <= maxM)) {
        const key = `${currY}-${String(currM).padStart(2, "0")}`;
        const d = new Date(currY, currM - 1, 1);
        result.push({
          sortKey: key,
          name: d.toLocaleString("default", { month: "long" }),
          shortName: d.toLocaleString("default", { month: "short" }),
          value: monthMap[key] || 0,
        });
        currM++;
        if (currM > 12) {
          currM = 1;
          currY++;
        }
      }
    }
    return result;
  }, [filteredClaims]);

  // Determine the display year/range for the title
  const dateRangeTitle = useMemo(() => {
    if (monthlyData.length === 0) return "2025";
    if (monthlyData.length === 1) return monthlyData[0].name;
    return `${monthlyData[0].shortName} - ${monthlyData[monthlyData.length - 1].shortName}`;
  }, [monthlyData]);

  // Analytics helper for the side panel
  const stats = useMemo(() => {
    if (monthlyData.length === 0)
      return { peak: null, avg: 0, topFive: [], max: 0 };
    const sorted = [...monthlyData].sort((a, b) => b.value - a.value);
    const peak = sorted[0];
    const avg =
      monthlyData.reduce((acc, d) => acc + d.value, 0) / monthlyData.length;
    const topFive = sorted.slice(0, 5);
    return { peak, avg, topFive, max: peak ? peak.value : 0 };
  }, [monthlyData]);

  // Early returns AFTER all hooks
  if (isLoading) return null;

  if (claims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <p className="text-lg font-bold text-foreground">No data found</p>
        <p className="text-sm text-muted-foreground">
          Make sure claims.xlsx is placed in the public folder.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Chiro / PT / OT - Claims Overview" />

      <GlobalFilters />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalClaims.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                100% of total claims
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {paidCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((paidCount / totalClaims) * 100 || 0).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unpaid Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {unpaidCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((unpaidCount / totalClaims) * 100 || 0).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                ARB / LOP / No OON
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {arbLopNoOonCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((arbLopNoOonCount / totalClaims) * 100 || 0).toFixed(1)}% of
                total
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-1"
      >
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Monthly Claims Volume
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Growth and scaling trends across the year
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-[500px]">
                {/* Main Timeline Chart */}
                <div className="lg:col-span-8 flex flex-col h-full bg-background p-6 lg:border-r border-border/20">
                  <div className="flex-1 w-full min-h-[350px]">
                    <ChartContainer
                      config={chartConfig}
                      className="w-full h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={monthlyData}
                          margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorLineGradient"
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="0"
                            >
                              <stop
                                offset="0%"
                                stopColor="var(--color-chart-1)"
                              />
                              <stop
                                offset="50%"
                                stopColor="var(--color-chart-2)"
                              />
                              <stop
                                offset="100%"
                                stopColor="var(--color-chart-5)"
                              />
                            </linearGradient>
                            <linearGradient
                              id="areaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--color-chart-2)"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--color-chart-2)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                            strokeOpacity={0.2}
                          />
                          <XAxis
                            dataKey="shortName"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "var(--color-muted-foreground)",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "var(--color-muted-foreground)",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          />
                          <RechartsTooltip
                            content={
                              <ChartTooltipContent className="bg-background/95 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-3" />
                            }
                            cursor={{
                              stroke: "var(--color-primary)",
                              strokeWidth: 1,
                              strokeDasharray: "4 4",
                              fill: "transparent",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="url(#colorLineGradient)"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#areaGradient)"
                            dot={{
                              fill: "var(--color-background)",
                              stroke: "var(--color-chart-2)",
                              strokeWidth: 2,
                              r: 4,
                            }}
                            activeDot={{
                              r: 6,
                              fill: "var(--color-chart-5)",
                              stroke: "var(--color-background)",
                              strokeWidth: 2,
                            }}
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>

                {/* Detailed List Sidebar */}
                <div className="lg:col-span-4 flex flex-col p-6 bg-background space-y-6">
                  {/* Summary Metric */}
                  <div className="p-4 rounded-xl border border-border/30 bg-muted/10 shadow-sm">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Avg. Monthly Volume
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-foreground">
                        {Math.ceil(stats.avg).toLocaleString()}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground/70">
                        claims / mo
                      </p>
                    </div>
                  </div>

                  {/* Top 5 list */}
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="px-1">
                      <h4 className="text-sm font-semibold text-foreground tracking-tight">
                        Top 5 Volume Months
                      </h4>
                    </div>

                    <div className="flex-col space-y-2">
                      {stats.topFive.map((d, i) => (
                        <div
                          key={d.sortKey}
                          className="group flex flex-col justify-center p-3 rounded-xl bg-card border border-border/30 shadow-sm relative overflow-hidden"
                        >
                          {/* Progress background */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-primary/[0.03] transition-all duration-1000 origin-left"
                            style={{ width: `${(d.value / stats.max) * 100}%` }}
                          />

                          <div className="relative flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                {i + 1}
                              </span>
                              <span className="text-sm font-semibold tracking-tight text-foreground">
                                {d.name}
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-sm font-bold text-foreground">
                                {d.value.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
