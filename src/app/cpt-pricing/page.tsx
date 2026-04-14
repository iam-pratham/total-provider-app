"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import pricingData from "@/data/cpt-pricing.json";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  },
};

const formatCode = (code: string) => {
  if (code.endsWith(".0")) {
    return code.slice(0, -2);
  }
  return code;
};

const formatCurrency = (val: string) => {
  if (!val) return "-";
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const shortenHeader = (header: string) => {
  if (header.includes("Percentile")) {
    return header
      .replace("Percentile ($)", "($)")
      .replace(" Percentile", "")
      .trim();
  }
  if (header === "Medicare Fee MPFS") return "Medicare ($)";
  if (header === "PIP MVA") return "PIP ($)";
  return header;
};

const DISPLAY_INDICES = [0, 1, 6, 7, 8, 9];

export default function CptPricingPage() {
  const headers = pricingData[0] as string[];
  const rows = (pricingData.slice(1) as string[][]).filter((row) => {
    const code = formatCode(row[0]);
    return code !== "INTPT" && code !== "OVPMT";
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, setIsPending] = useState(false);

  React.useEffect(() => {
    if (searchTerm) {
      setIsPending(true);
      const timer = setTimeout(() => setIsPending(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsPending(false);
    }
  }, [searchTerm]);

  const filteredRows = React.useMemo(() => {
    if (!searchTerm) return rows;
    const lowerTerm = searchTerm.toLowerCase();
    return rows.filter((row) => {
      const code = formatCode(row[0]).toLowerCase();
      const desc = row[1].toLowerCase();
      return code.includes(lowerTerm) || desc.includes(lowerTerm);
    });
  }, [rows, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Chiro / PT / OT - CPT Pricing" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col border-primary/10 shadow-md">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">
                      Market Pricing Percentiles
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1.5">
                    Reference rates including MPFS, PIP MVA, and standard market
                    percentiles.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Code or Description..."
                    className="pl-9 pr-9 bg-background shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {isPending && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                    </motion.div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent">
                      {headers
                        .filter((_, i) => DISPLAY_INDICES.includes(i))
                        .map((header, idx) => (
                          <TableHead
                            key={idx}
                            className={`
                                                        font-black uppercase tracking-widest text-[#2D3142] py-4 text-[10px] sm:text-xs text-center
                                                        ${idx === 0 ? "pl-2 sm:pl-6 text-left" : ""}
                                                        ${idx === 1 ? "text-left" : ""}
                                                        ${idx === 5 ? "pr-2 sm:pr-6 text-right" : ""}
                                                    `}
                          >
                            {shortenHeader(header)}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {isPending ? (
                        <TableRow key="loading">
                          <TableCell
                            colSpan={6}
                            className="h-32 text-center border-b-0"
                          >
                            <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">
                                Updating results...
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((row, i) => (
                          <motion.tr
                            key={`row-${i}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="transition-colors border-b border-border/50 hover:bg-primary/[0.02]"
                          >
                            {row
                              .filter((_, i) => DISPLAY_INDICES.includes(i))
                              .map((cell, idx) => (
                                <TableCell
                                  key={idx}
                                  className={`
                                                                    py-3 text-[11px] sm:text-sm text-center
                                                                    ${idx === 0 ? "font-mono font-bold text-primary pl-2 sm:pl-6 text-left" : ""}
                                                                    ${idx === 1 ? "font-medium text-[#455A64] text-left max-w-[180px] sm:max-w-[400px] whitespace-normal break-words" : ""}
                                                                    ${idx > 1 ? "font-semibold text-green-600/90 tabular-nums px-1 sm:px-3" : ""}
                                                                    ${idx === 5 ? "pr-2 sm:pr-6 text-right" : ""}
                                                                `}
                                >
                                  {idx === 0
                                    ? formatCode(cell)
                                    : idx > 1
                                      ? formatCurrency(cell)
                                      : cell}
                                </TableCell>
                              ))}
                          </motion.tr>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-32 text-center text-muted-foreground font-medium"
                          >
                            No standard pricing data found for "{searchTerm}".
                          </TableCell>
                        </TableRow>
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
