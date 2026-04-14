"use client";

import { useData } from "@/context/data-context";
import collectionData from "@/data/collection_data.json";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { useMemo } from "react";

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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Convert "Apr-25", "Mar 2026", "Jan-26" → "2025-04", "2026-03", "2026-01"
function rawToYYYYMM(rawMonth: string): string | null {
  let mon = "",
    yy = "";
  if (rawMonth.includes("-")) {
    [mon, yy] = rawMonth.split("-");
  } else if (rawMonth.includes(" ")) {
    const parts = rawMonth.split(" ");
    mon = parts[0].substring(0, 3);
    yy = parts[1].substring(2, 4);
  } else {
    return null;
  }
  const mNum = monthMap[mon];
  if (!mNum) return null;
  return `20${yy}-${String(mNum).padStart(2, "0")}`;
}

// "2025-04" → "April 2025"
function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
}

export function CollectionGlobalFilters() {
  const { claims, cleanedClaims, filters, setFilters } = useData();

  // Build month list from collection JSON rows (not from claims service dates)
  const collectionMonthKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    collectionData.forEach((row: any) => {
      const raw = row["__EMPTY"];
      if (!raw || String(raw).toLowerCase() === "total") return;
      const key = rawToYYYYMM(String(raw));
      if (key && !seen.has(key) && key !== "2026-04") {
        seen.add(key);
        ordered.push(key);
      }
    });
    // Sort chronologically
    return ordered.sort((a, b) => a.localeCompare(b));
  }, []);

  const years = Array.from(
    new Set(collectionMonthKeys.map((k) => k.split("-")[0])),
  ).sort();

  if (claims.length === 0) return null;

  const providers = Array.from(
    new Set(cleanedClaims.map((c: any) => c.doctorName as string)),
  )
    .filter(Boolean)
    .sort();

  const insurances = Array.from(
    new Set(cleanedClaims.map((c: any) => c.insuranceType as string)),
  )
    .filter((i) => i && i !== "Unknown Insurance")
    .sort();

  const handleProvider = (v: string) =>
    setFilters((prev) => ({ ...prev, provider: v === "all" ? null : v }));

  const handleInsurance = (v: string) =>
    setFilters((prev) => ({ ...prev, insuranceType: v === "all" ? null : v }));

  const handleMonth = (v: string) =>
    setFilters((prev) => ({ ...prev, month: v === "all" ? null : v }));

  return (
    <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 shadow-sm mb-6 transition-all duration-300 hover:border-primary/20">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-muted-foreground">
          Global Filters:
        </span>

        <div className="flex items-center gap-4">
          {/* Provider */}
          <div className="w-auto min-w-[150px] max-w-[250px]">
            <Select
              value={filters.provider || "all"}
              onValueChange={handleProvider}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Insurance */}
          <div className="w-auto min-w-[150px] max-w-[250px]">
            <Select
              value={filters.insuranceType || "all"}
              onValueChange={handleInsurance}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Insurance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Insurances</SelectItem>
                {insurances.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month — sourced from collection JSON, grouped by year */}
          <div className="w-auto min-w-[150px] max-w-[250px]">
            <Select value={filters.month || "all"} onValueChange={handleMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {years.map((year) => (
                  <SelectGroup key={year}>
                    <SelectLabel className="font-bold text-primary">
                      {year}
                    </SelectLabel>
                    {collectionMonthKeys
                      .filter((k) => k.startsWith(year))
                      .map((k) => (
                        <SelectItem key={k} value={k}>
                          {formatMonthKey(k)}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors h-auto py-2"
        onClick={() =>
          setFilters({
            provider: null,
            doctor: null,
            insuranceType: null,
            cptCode: null,
            month: null,
            dateStart: null,
            dateEnd: null,
          })
        }
      >
        Clear Filters
      </Button>
    </div>
  );
}
