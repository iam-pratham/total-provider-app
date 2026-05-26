"use client";
import { PageHeader } from "@/components/page-header";

import React, { useMemo } from "react";
import { useData } from "@/context/data-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { GlobalFilters } from "@/components/global-filters";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Cell,
  ResponsiveContainer,
} from "recharts";
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
import { format } from "date-fns";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Stethoscope,
  AlertTriangle,
  Gavel,
  Clock,
  ShieldAlert,
  Layers,
  Ban,
  UserCheck,
  FileWarning,
  CalendarClock,
  Activity,
  ZapOff,
  XOctagon,
  CreditCard,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
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

const STATUS_THEMES: Record<
  string,
  {
    icon: any;
    color: string;
    match: (s: string) => boolean;
  }
> = {
  Paid: {
    icon: CheckCircle2,
    color: "text-green-600",
    match: (s) => s === "paid correctly" || s.startsWith("paid correctly"),
  },
  "Paid - Awaiting Payment": {
    icon: Clock,
    color: "text-emerald-500",
    match: (s) =>
      s.includes("paid-awaiting payment") ||
      s.includes("paid - awaiting payment") ||
      s.includes("awaiting payment"),
  },
  "Patient Responsibility": {
    icon: Stethoscope,
    color: "text-sky-500",
    match: (s) =>
      s.includes("towards deductible") ||
      s.includes("towards dedcutible") ||
      s.includes("towards copay") ||
      s.includes("towards coinsurance") ||
      s.includes("patient responsibility"),
  },
  "Paid With Patient's Responsibility": {
    icon: UserCheck,
    color: "text-teal-500",
    match: (s) =>
      s.includes("paid with patient") ||
      s.includes("paid with patient's responsibility"),
  },
  "Paid With 50% Pre-Cert Penalty": {
    icon: ShieldAlert,
    color: "text-[var(--color-chart-4)]",
    match: (s) => s.includes("paid with 50%") || s.includes("pre-cert"),
  },
  "Under Arbitration": {
    icon: Gavel,
    color: "text-orange-600",
    match: (s) =>
      s.includes("under arbitration") ||
      s.includes("pip-geico") ||
      s.includes("pip geico"),
  },
  "In Process": {
    icon: Clock,
    color: "text-[var(--color-chart-1)]",
    match: (s) => s === "" || s.includes("in process") || s.includes("pending"),
  },
  "Benefit Exhausted / LOP": {
    icon: ZapOff,
    color: "text-orange-600",
    match: (s) =>
      (s.includes("benefit exhausted") && s.includes("lop")) ||
      (s.includes("benefit exhausted") && !s.includes("secondary")),
  },
  "Secondary Insurance": {
    icon: Layers,
    color: "text-[var(--color-chart-2)]",
    match: (s) =>
      (s.includes("benefit exhausted") && s.includes("secondary")) ||
      (s.includes("no oon benefit") && s.includes("secondary")),
  },
  "No OON Benefits / LOP": {
    icon: Ban,
    color: "text-orange-600",
    match: (s) => s.includes("no oon benefit") && s.includes("lop"),
  },
  "No OON Benefits / Pt's Responsibility": {
    icon: UserCheck,
    color: "text-orange-600",
    match: (s) =>
      s.includes("no oon benefit") &&
      (s.includes("pt") || s.includes("patient")),
  },
  "Straight LOP": {
    icon: FileWarning,
    color: "text-orange-600",
    match: (s) =>
      (s === "lop" || s.includes("/lop") || s.startsWith("lop/")) &&
      !s.includes("benefit exhausted") &&
      !s.includes("no oon benefit"),
  },
  "Reached Maximum Visits": {
    icon: CalendarClock,
    color: "text-red-500",
    match: (s) =>
      s.includes("reached maximum") ||
      s.includes("maximum limit") ||
      s.includes("maximum visits"),
  },
  PDPT: {
    icon: Activity,
    color: "text-[var(--color-chart-5)]",
    match: (s) => s === "pdpt" || s.startsWith("pdpt"),
  },
  "Efforts Exhausted": {
    icon: AlertTriangle,
    color: "text-zinc-500",
    match: (s) => s.includes("efforts exhausted"),
  },
  "Not Covered Under Patient's Plan": {
    icon: XOctagon,
    color: "text-red-500",
    match: (s) => s.includes("not covered"),
  },
  "Self Pay": {
    icon: CreditCard,
    color: "text-sky-600",
    match: (s) => s.includes("self pay") || s.includes("selfpay"),
  },
  COB: {
    icon: RefreshCw,
    color: "text-zinc-500",
    match: (s) => s.includes("coordination of benefits") || s === "cob",
  },
};

const STATUS_BUCKETS_LIST = Object.entries(STATUS_THEMES).map(
  ([label, theme]) => ({ label, ...theme }),
);

function getBucket(claimStatus: string): string {
  const s = String(claimStatus || "")
    .toLowerCase()
    .trim();
  for (const [label, theme] of Object.entries(STATUS_THEMES)) {
    if (theme.match(s)) return label;
  }
  return "Other";
}

const chartConfig = {
  value: { label: "Claims", color: "var(--color-primary)" },
} satisfies ChartConfig;

export default function ReportsPage() {
  const { filteredClaims, claims } = useData();
  const [selectedBucket, setSelectedBucket] = React.useState<string | null>(
    null,
  );
  const [displayBucket, setDisplayBucket] = React.useState<string | null>(null);
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

  React.useEffect(() => {
    if (searchTerm) {
      setIsPending(true);
      const timer = setTimeout(() => setIsPending(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsPending(false);
    }
  }, [searchTerm]);

  React.useEffect(() => {
    if (selectedBucket) {
      setDisplayBucket(selectedBucket);
    }
  }, [selectedBucket]);

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const claim of filteredClaims) {
      const label = getBucket(claim.claimStatus);
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  }, [filteredClaims]);

  const totalClaims = filteredClaims.length;

  const chartData = useMemo(
    () =>
      STATUS_BUCKETS_LIST.map((b, idx) => ({
        name: b.label,
        value: bucketCounts[b.label] ?? 0,
        fill:
          b.label === "Other"
            ? "var(--color-muted-foreground)"
            : `var(--color-chart-${(idx % 5) + 1})`,
      }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [bucketCounts],
  );

  const otherCount = bucketCounts["Other"] ?? 0;

  const activeClaimsForModal = useMemo(() => {
    const target = selectedBucket || displayBucket;
    if (!target) return [];
    let list = filteredClaims.filter(
      (c) => getBucket(c.claimStatus) === target,
    );

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
  }, [filteredClaims, selectedBucket, displayBucket, searchTerm, sortConfig]);

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
      <PageHeader title="Chiro / PT / OT - Status Breakdown" />

      <GlobalFilters />

      {/* ── Status Bucket Cards ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch"
      >
        {/* Total Card */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalClaims.toLocaleString()}
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1 }}
                    className="h-full bg-primary"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Dataset Share</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Themes Cards */}
        {STATUS_BUCKETS_LIST.map((bucket) => {
          const count = bucketCounts[bucket.label] ?? 0;
          const pct = totalClaims > 0 ? (count / totalClaims) * 100 : 0;

          const getBgColor = (textClass: string) => {
            if (textClass.startsWith("text-["))
              return textClass.replace("text-", "bg-");
            if (textClass.includes("text-green")) return "bg-green-600";
            if (textClass.includes("text-red")) return "bg-red-600";
            if (textClass.includes("text-orange")) return "bg-orange-600";
            if (textClass.includes("text-sky")) return "bg-sky-500";
            if (textClass.includes("text-zinc")) return "bg-zinc-500";
            return textClass.replace("text-", "bg-");
          };

          return (
            <motion.div
              key={bucket.label}
              variants={itemVariants}
              className="h-full"
            >
              <Card
                className={`h-full cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 ${count === 0 ? "opacity-60 grayscale-[0.5]" : ""}`}
                onClick={() => {
                  if (count > 0) {
                    setSelectedBucket(bucket.label);
                    setExpandedClaimId(null);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {bucket.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-bold ${count > 0 ? bucket.color : "text-zinc-400/50"}`}
                  >
                    {count.toLocaleString()}
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1 }}
                        className={`h-full ${count > 0 ? getBgColor(bucket.color) : "bg-muted-foreground/20"}`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Share of total</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Other Card */}
        <motion.div variants={itemVariants} className="h-full">
          <Card
            className="h-full cursor-pointer transition-all hover:ring-2 hover:ring-primary/20"
            onClick={() => {
              if (otherCount > 0) {
                setSelectedBucket("Other");
                setExpandedClaimId(null);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Other / Uncategorized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-400/50">
                {otherCount.toLocaleString()}
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${totalClaims > 0 ? (otherCount / totalClaims) * 100 : 0}%`,
                    }}
                    transition={{ duration: 1 }}
                    className="h-full bg-zinc-400"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Unmatched</span>
                  <span>
                    {totalClaims > 0
                      ? ((otherCount / totalClaims) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Claims Modal */}
      <Dialog
        open={!!selectedBucket}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBucket(null);
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
                    {selectedBucket || displayBucket}
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
              <span className="text-xs font-bold px-3">
                Page {modalPage} of {modalTotalPages}
              </span>
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

      {/* ── Bar Chart ── */}
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <Card className="bg-card/40 backdrop-blur-2xl border-border/50 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              Claim Status Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of claims across all status categories
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <ChartContainer
              config={chartConfig}
              className="min-h-[450px] w-full"
            >
              <BarChart
                data={chartData}
                margin={{ top: 50, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  strokeOpacity={0.1}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={130}
                  tick={{
                    fill: "var(--color-muted-foreground)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  style={{
                    fill: "var(--color-muted-foreground)",
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--color-primary)", opacity: 0.05 }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      fillOpacity={0.8}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, value } = props;
                      if (value == null) return null;
                      const pct = ((value / totalClaims) * 100 || 0).toFixed(1);
                      const cx = (x as number) + (width as number) / 2;
                      const cy = (y as number) - 14;
                      return (
                        <g>
                          <text
                            x={cx}
                            y={cy - 14}
                            textAnchor="middle"
                            fontSize={12}
                            fontWeight={800}
                            fill="#dc2626"
                          >
                            {(value as number).toLocaleString()}
                          </text>
                          <text
                            x={cx}
                            y={cy + 2}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={600}
                            fill="var(--color-muted-foreground)"
                          >
                            {pct}%
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
    </div>
  );
}
