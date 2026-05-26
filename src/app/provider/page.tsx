"use client";
import { PageHeader } from "@/components/page-header";

import React, { useMemo } from "react";
import { useData } from "@/context/data-context";
import collectionData from "@/data/collection_data.json";
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
  LabelList,
  Cell,
} from "recharts";
import { GlobalFilters } from "@/components/global-filters";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const volumeConfig = {
  claims: {
    label: "Total Claims",
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

const monthMap: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

export default function ProviderPage() {
  const { filteredClaims, claims, cleanedClaims, filters } = useData();
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );
  const [displayCategory, setDisplayCategory] = React.useState<string | null>(
    null,
  );
  const [modalPage, setModalPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedClaimId, setExpandedClaimId] = React.useState<string | null>(
    null,
  );
  const [isPending, setIsPending] = React.useState(false);
  const modalRowsPerPage = 50;
  const [sortConfig, setSortConfig] = React.useState<{
    key: 'serviceDate' | 'patientName' | 'insuranceCompany' | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: null });

  const handleSort = (key: 'serviceDate' | 'patientName' | 'insuranceCompany') => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'desc') {
          return { key, direction: 'asc' };
        } else if (prev.direction === 'asc') {
          return { key: null, direction: null };
        }
      }
      const defaultDir = key === 'serviceDate' ? 'desc' : 'asc';
      return { key, direction: defaultDir };
    });
    setModalPage(1);
  };

  // Smooth loading effect for search
  React.useEffect(() => {
    if (searchTerm) {
      setIsPending(true);
      const timer = setTimeout(() => setIsPending(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsPending(false);
    }
  }, [searchTerm]);

  // Synchronize display category but don't clear it immediately on close
  React.useEffect(() => {
    if (selectedCategory) {
      setDisplayCategory(selectedCategory);
    }
  }, [selectedCategory]);

  // --- Collection total logic (mirrors Collection tab) ---
  const providersFromClaims = useMemo(() => {
    let validClaims = cleanedClaims;
    if (filters.provider.length > 0)
      validClaims = validClaims.filter((c) =>
        filters.provider.includes(c.doctorName),
      );
    if (filters.doctor)
      validClaims = validClaims.filter((c) => c.doctorName === filters.doctor);
    const set = new Set<string>();
    validClaims.forEach((c) => {
      if (c.doctorName) set.add(c.doctorName);
    });
    return Array.from(set);
  }, [cleanedClaims, filters.provider, filters.doctor]);

  const availableCollectionKeys = useMemo(() => {
    if (!collectionData || collectionData.length === 0) return [];
    const keysSet = new Set<string>();
    collectionData.forEach((row: any) => {
      Object.keys(row).forEach((k) => {
        if (k !== "__EMPTY") keysSet.add(k);
      });
    });
    return Array.from(keysSet);
  }, []);

  const activeCollectionKeys = useMemo(() => {
    const matched = new Set<string>();
    providersFromClaims.forEach((claimName) => {
      const cleanClaimBase = claimName
        .split(" - ")[0]
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .trim();
      const claimWords = cleanClaimBase
        .split(" ")
        .filter(
          (w) =>
            w.length > 2 && !["dpt", "dc", "md", "do", "pt", "ot"].includes(w),
        );
      const match = availableCollectionKeys.find((k) => {
        const cleanKey = k
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .trim();
        const keyWords = cleanKey
          .split(" ")
          .filter(
            (w) =>
              w.length > 2 &&
              !["dpt", "dc", "md", "do", "pt", "ot"].includes(w),
          );
        if (
          cleanClaimBase.includes(cleanKey) ||
          cleanKey.includes(cleanClaimBase)
        )
          return true;
        let matchCount = 0;
        claimWords.forEach((cw) => {
          if (keyWords.includes(cw)) matchCount++;
        });
        return matchCount >= 1;
      });
      if (match) matched.add(match);
    });
    return Array.from(matched);
  }, [providersFromClaims, availableCollectionKeys]);

  const totalFromCollection = useMemo(() => {
    if (activeCollectionKeys.length === 0) return 0;
    let total = 0;
    collectionData.forEach((row: any) => {
      const rawMonth = row["__EMPTY"];
      if (!rawMonth || String(rawMonth).toLowerCase() === "total") return;
      activeCollectionKeys.forEach((key) => {
        total += Number(row[key]) || 0;
      });
    });
    return total;
  }, [activeCollectionKeys]);
  // --- End collection total logic ---

  const {
    providerVolumeMap,
    totalBilled,
    totalPaid,
    totalPaidClaims,
    totalArb,
    totalLop,
    totalNoOon,
    totalChiro,
    totalPT,
    totalOT,
    totalPainMgmt,
  } = useMemo(() => {
    const pMap: Record<string, number> = {};
    let tBilled = 0;
    let tPaid = 0;
    let tPaidClaims = 0;
    let tArb = 0;
    let tLop = 0;
    let tNoOon = 0;
    let tChiro = 0;
    let tPT = 0;
    let tOT = 0;
    let tPainMgmt = 0;

    filteredClaims.forEach((c) => {
      const statusStr = String(
        c.claimStatus || (c as any).report || "",
      ).toLowerCase();
      const payStatusStr = String(c.paymentStatus || "").toLowerCase();
      const combinedStatus = (statusStr + " " + payStatusStr).toLowerCase();
      const isPaid = combinedStatus.includes("paid");
      const isNoOon =
        statusStr.includes("no oon") || statusStr.includes("benefit exhausted");

      const name = c.doctorName || "Unknown";
      const nameLower = name.toLowerCase();

      pMap[name] = (pMap[name] || 0) + 1;
      tBilled += c.billedAmt || 0;
      tPaid += c.paidAmt || 0;
      const isPaidStatus =
        statusStr.includes("paid correctly") ||
        statusStr.includes("paid with 50%");
      const isDeductible =
        statusStr.includes("towards dedcutible") ||
        statusStr.includes("towards deductible") ||
        statusStr.includes("self pay");
      const isInProcess =
        statusStr.includes("in process") || statusStr.includes("pending");

      if (isPaidStatus) tPaidClaims++;

      const isArbMatch =
        statusStr.includes("under arbitration") ||
        statusStr.includes("pip-geico") ||
        statusStr.includes("pip geico");
      const isLopMatch =
        (statusStr === "lop" ||
          statusStr.includes("/lop") ||
          statusStr.startsWith("lop/")) &&
        !statusStr.includes("benefit exhausted") &&
        !statusStr.includes("no oon benefit");

      const isNoOonMatch =
        (statusStr.includes("no oon benefit") && statusStr.includes("lop")) ||
        (statusStr.includes("no oon benefit") &&
          (statusStr.includes("pt") || statusStr.includes("patient")));
      if (isArbMatch) tArb++;
      if (isLopMatch) tLop++;
      if (isNoOonMatch) tNoOon++;

      const isChiro = name.includes(" - Chiro");
      const isPT = name.includes(" - PT");
      const isOT = name.includes(" - OT");
      const isPainMgmt =
        name.includes(" - Pain Mgmt") || name.includes(" - PM");

      if (isChiro) tChiro++;
      if (isPT) tPT++;
      if (isOT) tOT++;
      if (isPainMgmt) tPainMgmt++;
    });
    return {
      providerVolumeMap: pMap,
      totalBilled: tBilled,
      totalPaid: tPaid,
      totalPaidClaims: tPaidClaims,
      totalArb: tArb,
      totalLop: tLop,
      totalNoOon: tNoOon,
      totalChiro: tChiro,
      totalPT: tPT,
      totalOT: tOT,
      totalPainMgmt: tPainMgmt,
    };
  }, [filteredClaims]);

  const providerData = useMemo(
    () =>
      Object.keys(providerVolumeMap)
        .map((k) => ({ name: k, claims: providerVolumeMap[k] }))
        .sort((a, b) => b.claims - a.claims),
    [providerVolumeMap],
  );

  const cptData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredClaims.forEach((c) => {
      const codes = String(c.cptCode || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      codes.forEach((code) => {
        map[code] = (map[code] || 0) + 1;
      });
    });
    return Object.keys(map)
      .map((k) => ({ cpt: k, usage: map[k] }))
      .sort((a, b) => b.usage - a.usage);
  }, [filteredClaims]);

  const totalCptUsages = useMemo(
    () => cptData.reduce((acc, curr) => acc + curr.usage, 0),
    [cptData],
  );

  const activeClaimsForModal = useMemo(() => {
    const target = selectedCategory || displayCategory;
    if (!target) return [];

    let list = filteredClaims.filter((c) => {
      const name = c.doctorName || "";
      if (target === "Chiro") return name.includes(" - Chiro");
      if (target === "PT") return name.includes(" - PT");
      if (target === "OT") return name.includes(" - OT");
      if (target === "Pain Mgmt")
        return name.includes(" - Pain Mgmt") || name.includes(" - PM");
      return false;
    });

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const patName = (c.patientName || "").toLowerCase();
        const insName = (c.insuranceCompany || "").toLowerCase();
        const docName = (c.doctorName || "").toLowerCase();
        const dos = format(parseDateSafe(c.serviceDate), "MM/dd/yyyy");
        return (
          patName.includes(lower) ||
          insName.includes(lower) ||
          docName.includes(lower) ||
          dos.includes(lower)
        );
      });
    }
    if (sortConfig.key && sortConfig.direction) {
      list = [...list].sort((a, b) => {
        if (sortConfig.key === 'serviceDate') {
          const dateA = parseDateSafe(a.serviceDate).getTime();
          const dateB = parseDateSafe(b.serviceDate).getTime();
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sortConfig.key === 'patientName') {
          const valA = String(a.patientName || '').toLowerCase();
          const valB = String(b.patientName || '').toLowerCase();
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        } else if (sortConfig.key === 'insuranceCompany') {
          const valA = String(a.insuranceCompany || '').toLowerCase();
          const valB = String(b.insuranceCompany || '').toLowerCase();
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }
    return list;
  }, [filteredClaims, selectedCategory, displayCategory, searchTerm, sortConfig]);

  const paginatedModalClaims = useMemo(() => {
    return activeClaimsForModal.slice(
      (modalPage - 1) * modalRowsPerPage,
      modalPage * modalRowsPerPage,
    );
  }, [activeClaimsForModal, modalPage]);

  const modalTotalPages = Math.ceil(
    activeClaimsForModal.length / modalRowsPerPage,
  );

  if (claims.length === 0) {
    return <div className="p-6">Navigate to Upload page to load data.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Chiro / PT / OT - Provider Performance" />

      <GlobalFilters />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2"
      >
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Total Claims by Provider</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4 w-full h-full">
              <ChartContainer
                config={volumeConfig}
                className="min-h-[400px] w-full h-full"
              >
                <BarChart
                  accessibilityLayer
                  data={providerData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 120, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    type="number"
                    domain={[
                      0,
                      (dataMax: number) =>
                        dataMax === 0 ? 1 : Math.ceil(dataMax * 1.3),
                    ]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    style={{ fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tickLine={false}
                    axisLine={false}
                    style={{
                      fontSize: "11px",
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--color-primary)", opacity: 0.1 }}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Bar dataKey="claims" radius={[0, 4, 4, 0]} maxBarSize={40}>
                    {providerData.slice(0, 10).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`var(--color-chart-${(index % 5) + 1})`}
                      />
                    ))}
                    <LabelList
                      dataKey="claims"
                      position="right"
                      content={(props: any) => {
                        const { x, y, width, height, value } = props;
                        if (value == null) return null;
                        const pct = (
                          (value / filteredClaims.length) * 100 || 0
                        ).toFixed(1);
                        const rx = (x as number) + (width as number) + 10;
                        const ry = (y as number) + (height as number) / 2 + 4;
                        return (
                          <text x={rx} y={ry} fontSize={11}>
                            <tspan fill="#dc2626" fontWeight={700}>
                              {(value as number).toLocaleString()}
                            </tspan>
                            <tspan
                              fill="var(--color-muted-foreground)"
                              dx={8}
                            >{`(${pct}%)`}</tspan>
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col gap-4 h-full">
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 gap-4 flex-1"
          >
            <Card className="flex flex-col justify-center h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Paid Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {totalPaidClaims.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully collected
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 flex-1"
          >
            <Card
              className="flex flex-col justify-center h-full cursor-pointer hover:bg-primary/[0.02] transition-colors border-primary/5 hover:border-primary/20"
              onClick={() => setSelectedCategory("Chiro")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                  Chiro Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-chart-1)]">
                  {totalChiro.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Click to view details
                </p>
              </CardContent>
            </Card>
            <Card
              className="flex flex-col justify-center h-full cursor-pointer hover:bg-primary/[0.02] transition-colors border-primary/5 hover:border-primary/20"
              onClick={() => setSelectedCategory("PT")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                  PT Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-chart-2)]">
                  {totalPT.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Click to view details
                </p>
              </CardContent>
            </Card>
            <Card
              className="flex flex-col justify-center h-full cursor-pointer hover:bg-primary/[0.02] transition-colors border-primary/5 hover:border-primary/20"
              onClick={() => setSelectedCategory("OT")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-tight whitespace-nowrap">
                  OT Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-chart-4)]">
                  {totalOT.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Click to view details
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 flex-1"
          >
            <Card className="flex flex-col justify-center h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Under Arbitration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {totalArb.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PIP / Arbitration Cases
                </p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Straight LOP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {totalLop.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Letter of Protection Only
                </p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  No OON Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  {totalNoOon.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Non-covered OON
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Top CPT Codes Used</CardTitle>
              <CardDescription>
                Most frequently billed procedure codes for selected providers
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 w-full h-full">
              <ChartContainer
                config={{
                  usage: {
                    label: "Total Usage",
                    color: "var(--color-primary)",
                  },
                }}
                className="min-h-[400px] w-full h-full"
              >
                <BarChart
                  accessibilityLayer
                  data={cptData.slice(0, 15)}
                  margin={{ top: 40, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="cpt"
                    angle={-45}
                    textAnchor="end"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    height={60}
                    style={{ fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    type="number"
                    domain={[
                      0,
                      (dataMax: number) =>
                        dataMax === 0 ? 1 : Math.ceil(dataMax * 1.2),
                    ]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    style={{ fill: "var(--color-muted-foreground)" }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--color-primary)", opacity: 0.1 }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                    {cptData.slice(0, 15).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`var(--color-chart-${(index % 5) + 1})`}
                      />
                    ))}
                    <LabelList
                      dataKey="usage"
                      position="top"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (value == null) return null;
                        const pct = (
                          (value / totalCptUsages) * 100 || 0
                        ).toFixed(1);
                        const cx = (x as number) + (width as number) / 2;
                        const cy = (y as number) - 10;
                        return (
                          <g>
                            <text
                              x={cx}
                              y={cy - 12}
                              textAnchor="middle"
                              fontSize={12}
                            >
                              <tspan fill="#dc2626" fontWeight={700}>
                                {(value as number).toLocaleString()}
                              </tspan>
                            </text>
                            <text
                              x={cx}
                              y={cy + 2}
                              textAnchor="middle"
                              fontSize={11}
                            >
                              <tspan
                                fill="var(--color-muted-foreground)"
                                fontWeight={500}
                              >{`(${pct}%)`}</tspan>
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Claims Detail Modal */}
      <Dialog
        open={!!selectedCategory}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCategory(null);
            setSearchTerm("");
            setExpandedClaimId(null);
            setIsPending(false);
            setSortConfig({ key: null, direction: null });
            setTimeout(() => setModalPage(1), 300);
          }
        }}
      >
        <DialogContent className="sm:max-w-[96vw] w-[96vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border shrink-0 bg-background/50 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-lg uppercase tracking-tighter">
                    {selectedCategory || displayCategory}
                  </span>
                  <span>Claims Detail</span>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
                    {activeClaimsForModal.length} RECORDS
                  </span>
                </DialogTitle>
              </div>
              <div className="relative w-full sm:w-72 sm:pr-10">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient, DOS, provider"
                  className="pl-9 h-10 w-full bg-background/50 border-border focus:border-border focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all font-medium text-sm outline-none"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setModalPage(1);
                    setExpandedClaimId(null);
                  }}
                />
                {isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute right-14 top-1/2 -translate-y-1/2"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                  </motion.div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 bg-muted/10">
            <div className="min-w-max w-full">
              <Table className="relative w-full border-collapse">
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md z-30 shadow-sm border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead 
                      className="w-[140px] py-4 pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('serviceDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Service Date</span>
                        {sortConfig.key === "serviceDate" && sortConfig.direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                        {sortConfig.key === "serviceDate" && sortConfig.direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                        {sortConfig.key !== "serviceDate" && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('patientName')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Patient Name</span>
                        {sortConfig.key === "patientName" && sortConfig.direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                        {sortConfig.key === "patientName" && sortConfig.direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                        {sortConfig.key !== "patientName" && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('insuranceCompany')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Insurance & Payer</span>
                        {sortConfig.key === "insuranceCompany" && sortConfig.direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                        {sortConfig.key === "insuranceCompany" && sortConfig.direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                        {sortConfig.key !== "insuranceCompany" && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </div>
                    </TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Attending Physician
                    </TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      CPT Codes
                    </TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Billed Amount
                    </TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Paid Amount
                    </TableHead>
                    <TableHead className="py-4 pr-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Detailed Claim Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {isPending ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">
                              Updating results...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedModalClaims.map((claim) => (
                        <React.Fragment key={claim.id}>
                          <motion.tr
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`hover:bg-primary/[0.03] transition-colors border-b border-border/50 group/row cursor-pointer ${expandedClaimId === claim.id ? "bg-primary/[0.05]" : ""}`}
                            onClick={() =>
                              setExpandedClaimId(
                                expandedClaimId === claim.id ? null : claim.id,
                              )
                            }
                          >
                            <TableCell className="whitespace-nowrap text-xs font-mono pl-6 py-4">
                              {format(
                                parseDateSafe(claim.serviceDate),
                                "MM/dd/yyyy",
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs font-bold py-4">
                              {claim.patientName}
                            </TableCell>
                            <TableCell className="text-xs py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-foreground line-clamp-1">
                                  {claim.insuranceCompany}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                  {claim.insuranceType}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-foreground line-clamp-1">
                                  {claim.doctorName?.split(" - ")[0] || "N/A"}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                  {claim.doctorName?.includes(" - Chiro")
                                    ? "Chiro"
                                    : claim.doctorName?.includes(" - PT")
                                      ? "PT"
                                      : claim.doctorName?.includes(" - OT")
                                        ? "OT"
                                        : claim.doctorName?.includes(
                                              " - Pain Mgmt",
                                            ) ||
                                            claim.doctorName?.includes(" - PM")
                                          ? "Pain Mgmt"
                                          : "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground py-4">
                              {claim.cptCode}
                            </TableCell>
                            <TableCell className="text-xs font-bold py-4">
                              $
                              {claim.billedAmt?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-xs font-black text-green-600 py-4">
                              $
                              {claim.paidAmt?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="py-4 pr-6">
                              <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-1 rounded inline-block max-w-[280px] break-words uppercase leading-tight">
                                {claim.claimStatus}
                              </span>
                            </TableCell>
                          </motion.tr>
                          <AnimatePresence>
                            {expandedClaimId === claim.id &&
                              claim.cptDetails &&
                              claim.cptDetails.length > 0 && (
                                <motion.tr
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="bg-primary/[0.01] hover:bg-primary/[0.01]"
                                >
                                  <TableCell
                                    colSpan={8}
                                    className="p-0 border-b border-border/50"
                                  >
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pt-2 pb-6 px-4 md:px-8">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="h-3 w-1 bg-primary rounded-full"></div>
                                          <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                                            CPT Payment Breakdown
                                          </h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                          {claim.cptDetails.map((cpt, i) => (
                                            <div
                                              key={i}
                                              className="bg-card border shadow-sm rounded-lg p-3 flex flex-col gap-1 hover:border-primary/30 transition-colors"
                                            >
                                              <div className="flex justify-between items-center w-full">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/60 px-2 py-0.5 rounded border">
                                                  CPT: {cpt.cpt}
                                                </span>
                                              </div>
                                              <div className="flex justify-between items-end mt-2">
                                                <div className="flex flex-col">
                                                  <span className="text-[9px] uppercase font-bold text-muted-foreground/70">
                                                    Billed
                                                  </span>
                                                  <span className="text-xs font-semibold text-foreground">
                                                    $
                                                    {cpt.billed?.toLocaleString(
                                                      undefined,
                                                      {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                      },
                                                    )}
                                                  </span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                  <span className="text-[9px] uppercase font-bold text-green-600/70">
                                                    Paid
                                                  </span>
                                                  <span className="text-xs font-bold text-green-600">
                                                    $
                                                    {cpt.paid?.toLocaleString(
                                                      undefined,
                                                      {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                      },
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </TableCell>
                                </motion.tr>
                              )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-between bg-background shrink-0">
            <p className="text-xs text-muted-foreground font-medium">
              Showing{" "}
              <span className="text-foreground">
                {(modalPage - 1) * modalRowsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="text-foreground">
                {Math.min(
                  modalPage * modalRowsPerPage,
                  activeClaimsForModal.length,
                )}
              </span>{" "}
              of {activeClaimsForModal.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold"
                onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                disabled={modalPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 mx-2">
                <span className="text-xs font-bold">Page {modalPage}</span>
                <span className="text-xs text-muted-foreground">
                  of {modalTotalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold"
                onClick={() =>
                  setModalPage((p) => Math.min(modalTotalPages, p + 1))
                }
                disabled={modalPage === modalTotalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
