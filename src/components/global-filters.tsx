"use client";

import { useData } from "@/context/data-context";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";

export function GlobalFilters() {
  const { claims, cleanedClaims, filters, setFilters } = useData();

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

  const monthsKeys = Array.from(
    new Set(
      claims
        .map((c) => {
          if (!c.serviceDate) return null;
          const d = new Date(c.serviceDate);
          if (isNaN(d.getTime())) return null;
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => (a as string).localeCompare(b as string)) as string[];

  const formatMonth = (monthKey: string) => {
    const [y, m] = monthKey.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const years = Array.from(
    new Set(monthsKeys.map((m) => m.split("-")[0])),
  ).sort();

  const providerOptions = providers.map((p) => ({ value: p, label: p }));
  const insuranceOptions = insurances.map((i) => ({ value: i, label: i }));
  const monthGroups = years.map((year) => ({
    label: year,
    options: monthsKeys
      .filter((m) => m.split("-")[0] === year)
      .map((m) => ({ value: m, label: formatMonth(m) })),
  }));

  return (
    <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 shadow-sm mb-6 transition-all duration-300 hover:border-primary/20">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-muted-foreground">
          Global Filters:
        </span>

        <div className="flex items-center gap-4">
          <div className="w-auto min-w-[150px] max-w-[250px]">
            <MultiSelect
              options={providerOptions}
              selected={filters.provider}
              onChange={(vals) =>
                setFilters((prev) => ({ ...prev, provider: vals }))
              }
              placeholder="All Providers"
            />
          </div>

          <div className="w-auto min-w-[150px] max-w-[250px]">
            <MultiSelect
              options={insuranceOptions}
              selected={filters.insuranceType}
              onChange={(vals) =>
                setFilters((prev) => ({ ...prev, insuranceType: vals }))
              }
              placeholder="All Insurances"
            />
          </div>

          <div className="w-auto min-w-[150px] max-w-[250px]">
            <MultiSelect
              groups={monthGroups}
              selected={filters.month}
              onChange={(vals) =>
                setFilters((prev) => ({ ...prev, month: vals }))
              }
              placeholder="All Months"
            />
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors h-auto py-2"
        onClick={() =>
          setFilters({
            provider: [],
            doctor: null,
            insuranceType: [],
            cptCode: null,
            month: [],
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
