"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export interface Claim {
  id: string; // generated internally for table rows
  claimId?: string;
  providerName: string;
  doctorName: string;
  cptCode: string; // single string or comma separated
  insuranceCompany?: string;
  insuranceType: string;
  payerId?: string;
  patientName?: string;
  serviceDate: Date;
  claimSentDate?: Date | null;
  billedAmt?: number;
  paidAmt?: number;
  cptDetails?: { cpt: string; billed: number; paid: number }[];
  claimStatus: string;
  paymentStatus: string;
  arbFlag: boolean;
  denialIndicator: boolean;
}

export interface FilterState {
  provider: string[];
  doctor: string | null;
  insuranceType: string[];
  cptCode: string | null;
  month: string[];
  dateStart: Date | null;
  dateEnd: Date | null;
}

interface DataContextProps {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredClaims: Claim[];
  cleanedClaims: Claim[];
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSortedName(name: unknown) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/[^a-z]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0)
    .sort()
    .join("");
}

function parseDateSafe(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  if (typeof raw === "string") {
    const str = raw.trim();
    if (/^\d{6}$/.test(str)) {
      const m = parseInt(str.substring(0, 2), 10);
      const d = parseInt(str.substring(2, 4), 10);
      let y = parseInt(str.substring(4, 6), 10);
      y += y < 50 ? 2000 : 1900;
      return new Date(y, m - 1, d);
    }
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (p0 > 1000) return new Date(p0, p1 - 1, p2);
        let y = p2;
        if (parts[2].length === 2) y += y < 50 ? 2000 : 1900;
        return new Date(y, p0 - 1, p1);
      }
    }
    const native = new Date(str);
    if (!isNaN(native.getTime())) return native;
  }
  return null;
}

function getValRobust(row: Record<string, unknown>, possibleKeys: string[]) {
  for (const pk of possibleKeys) {
    const exactKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === pk.toLowerCase().trim(),
    );
    if (
      exactKey &&
      row[exactKey] !== undefined &&
      String(row[exactKey]).trim() !== ""
    )
      return row[exactKey];
  }
  for (const pk of possibleKeys) {
    const incKey = Object.keys(row).find((k) =>
      k.toLowerCase().includes(pk.toLowerCase()),
    );
    if (
      incKey &&
      row[incKey] !== undefined &&
      String(row[incKey]).trim() !== ""
    )
      return row[incKey];
  }
  return "";
}

function processClaimsWorkbook(workbook: XLSX.WorkBook): Claim[] {
  const groupedClaimsMap = new Map<string, Claim>();

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    }) as Record<string, unknown>[];

    json.forEach((row, index) => {
      const claimId = String(
        getValRobust(row, ["claim id", "claim #", "claim number"]),
      );
      const providerName = toTitleCase(
        String(
          getValRobust(row, [
            "service location",
            "location",
            "service provider",
            "provider",
          ]),
        )
          .split(",")[0]
          .trim(),
      );
      const doctorName = toTitleCase(
        String(
          getValRobust(row, [
            "attending physician",
            "attending",
            "doctor",
            "physician",
          ]),
        )
          .split(",")[0]
          .trim(),
      );
      const insuranceCompany = String(
        getValRobust(row, ["insurance company", "company", "insurance name"]),
      );
      const insuranceType = String(
        getValRobust(row, [
          "insurance category",
          "category",
          "insurance type",
          "payer",
          "plan",
        ]),
      );
      const cptCode = String(
        getValRobust(row, [
          "cpt codes",
          "cpt code",
          "cpt",
          "procedure",
          "hcpcs",
        ]),
      );
      const serviceDateRaw = getValRobust(row, [
        "dos",
        "date of service",
        "service date",
      ]);
      const claimSentDateRaw = getValRobust(row, [
        "claim date",
        "claim sent date",
        "claim sent",
        "sent date",
        "billed date",
      ]);
      const billedAmtRaw = getValRobust(row, [
        "billed amount",
        "billed amt",
        "billed",
        "charge",
        "charges",
      ]);
      const claimStatus = getValRobust(row, [
        "status",
        "claim status",
        "report",
        "deductible",
        "payment status",
      ]);
      const arbFlagRaw = getValRobust(row, ["arb", "arbitration"]);

      if (
        !providerName &&
        !doctorName &&
        !cptCode &&
        !claimId &&
        !insuranceCompany
      )
        return;

      const serviceDate = parseDateSafe(serviceDateRaw) || new Date();
      const claimSentDate = parseDateSafe(claimSentDateRaw);

      let isDeni = false;
      let foundPaid = false;
      let foundDeductible = false;
      let foundLop = false;
      let foundPending = false;
      let foundMaxLimit = false;
      const arbFlagStr = String(arbFlagRaw || "").toLowerCase();
      let isArb =
        arbFlagStr === "yes" || arbFlagStr === "true" || arbFlagRaw === 1;

      let stdStatus = String(claimStatus || "Unknown").trim();
      const lowerStatus = stdStatus.toLowerCase();

      if (stdStatus === "Unknown" || stdStatus === "") {
        for (const val of Object.values(row)) {
          const strVal = String(val).toLowerCase();
          if (strVal.includes("deni")) isDeni = true;
          if (
            strVal.includes("paid with patient") ||
            strVal.includes("paid correctly") ||
            strVal.includes("paid with 50%")
          )
            foundPaid = true;
          if (
            strVal.includes("towards deductible") ||
            strVal.includes("towards ded") ||
            strVal.includes("self pay") ||
            strVal.includes("self-pay") ||
            strVal.includes("selfpay") ||
            strVal.includes("patient responsibility")
          )
            foundDeductible = true;
          if (
            strVal === "lop" ||
            strVal.includes("lop ") ||
            strVal.includes(" lop")
          )
            foundLop = true;
          if (strVal.includes("under arbitration") || strVal.includes("arb"))
            isArb = true;
          if (strVal.includes("in process") || strVal.includes("pending"))
            foundPending = true;
          if (
            strVal.includes("maximum limit") ||
            strVal.includes("reached maximum limit") ||
            strVal.includes("not covered under patient plan") ||
            strVal.includes("not covered")
          )
            foundMaxLimit = true;
        }

        if (isDeni) stdStatus = "Denied";
        else if (foundPaid) stdStatus = "Paid Correctly";
        else if (foundMaxLimit) stdStatus = "Reached Maximum Limit";
        else if (foundDeductible) stdStatus = "Towards Deductible";
        else if (isArb) stdStatus = "Under Arbitration";
        else if (foundLop) stdStatus = "LOP";
        else if (foundPending) stdStatus = "In Process";
      } else {
        if (lowerStatus.includes("denied") || lowerStatus.includes("deni"))
          isDeni = true;
        if (lowerStatus.includes("arbitration")) isArb = true;
      }

      const uniqueId =
        claimId && !claimId.startsWith("CLM-UNKNOWN")
          ? claimId
          : `${sheetName}-${index}`;
      const billedAmt =
        parseFloat(String(billedAmtRaw).replace(/[^0-9.-]/g, "")) || 0;
      const paidAmt = 0;

      const rowCpts = String(cptCode || "N/A")
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c && c !== "N/A");
      if (rowCpts.length === 0) rowCpts.push("Unknown");
      const rowDetails = rowCpts.map((c) => ({
        cpt: c.toUpperCase(),
        billed: billedAmt / rowCpts.length,
        paid: 0,
      }));

      if (groupedClaimsMap.has(uniqueId)) {
        const existing = groupedClaimsMap.get(uniqueId)!;
        const existingCpts = existing.cptCode
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c && c !== "N/A");
        const newCpts = cptCode
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c && c !== "N/A");
        newCpts.forEach((c) => {
          if (!existingCpts.includes(c)) existingCpts.push(c);
        });
        existing.cptCode = existingCpts.join(", ") || "N/A";
        existing.billedAmt = (existing.billedAmt || 0) + billedAmt;
        existing.paidAmt = (existing.paidAmt || 0) + paidAmt;
        if (!existing.cptDetails) existing.cptDetails = [];
        existing.cptDetails = [...existing.cptDetails, ...rowDetails];

        const statusPriority = (s: string) => {
          const low = s.toLowerCase();
          if (low.includes("denied") || low.includes("deni")) return 10;
          if (low.includes("paid")) return 9;
          if (low.includes("maximum limit") || low.includes("not covered"))
            return 8;
          if (low.includes("deductible") || low.includes("self pay")) return 7;
          if (
            low.includes("arbitration") ||
            low.includes("lop") ||
            low.includes("benefit exhausted")
          )
            return 6;
          if (low.includes("in process") || low.includes("pending")) return 4;
          return 0;
        };

        if (statusPriority(stdStatus) > statusPriority(existing.claimStatus)) {
          existing.claimStatus = stdStatus;
          existing.paymentStatus = stdStatus;
        }
        if (isArb) existing.arbFlag = true;
        if (isDeni) existing.denialIndicator = true;
      } else {
        groupedClaimsMap.set(uniqueId, {
          id: `${sheetName}-${index}-${Math.random().toString(36).substring(2, 11)}`,
          claimId: uniqueId,
          providerName: providerName || "Unknown Provider",
          doctorName: doctorName || "Unknown Doctor",
          cptCode: cptCode || "N/A",
          insuranceCompany: insuranceCompany || "Unknown Company",
          insuranceType: insuranceType || "Unknown Insurance",
          payerId: String(
            getValRobust(row, [
              "payer edi id",
              "payer edi",
              "payer id",
              "payer #",
              "payer number",
            ]),
          ),
          patientName: toTitleCase(
            String(
              getValRobust(row, [
                "patient name",
                "patient",
                "subscriber name",
                "subscriber",
              ]) || "Unknown Patient",
            ),
          ),
          serviceDate,
          claimSentDate,
          billedAmt,
          paidAmt,
          cptDetails: [...rowDetails],
          claimStatus: stdStatus,
          paymentStatus: stdStatus,
          arbFlag: isArb,
          denialIndicator: isDeni,
        });
      }
    });
  });

  return Array.from(groupedClaimsMap.values());
}

function applyPayments(claims: Claim[], workbook: XLSX.WorkBook): Claim[] {
  const updatedClaims = claims.map((c) => ({ ...c }));

  const claimsLookup = new Map<string, number>();
  const partialLookup = new Map<string, number>();

  for (let i = 0; i < updatedClaims.length; i++) {
    const c = updatedClaims[i];
    if (!c.patientName || !c.serviceDate) continue;
    const cDosStr = format(new Date(c.serviceDate), "yyyy-MM-dd");
    const cNameLower = getSortedName(c.patientName);
    const claimCpts = c.cptCode
      .toLowerCase()
      .split(",")
      .map((code) => code.trim());
    partialLookup.set(`${cNameLower}|${cDosStr}`, i);
    for (const cpt of claimCpts) {
      if (!cpt) continue;
      const key = `${cNameLower}|${cDosStr}|${cpt}`;
      if (!claimsLookup.has(key)) claimsLookup.set(key, i);
    }
  }

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    }) as Record<string, unknown>[];

    json.forEach((row) => {
      const pNameRaw = getValRobust(row, [
        "patient name",
        "patient",
        "subscriber name",
        "subscriber",
      ]);
      const dosRaw = getValRobust(row, [
        "dos",
        "date of service",
        "service date",
      ]);
      const cptRaw = getValRobust(row, [
        "cpt code",
        "cpt",
        "procedure code",
        "procedure",
      ]);
      const totalRaw = getValRobust(row, [
        "grand total",
        "total payment",
        "paid",
        "payment",
        "total",
      ]);

      if (!pNameRaw || !dosRaw) return;

      const pNameLower = getSortedName(pNameRaw);
      const dosDate = parseDateSafe(dosRaw);
      const cptStr = String(cptRaw).trim().toLowerCase();
      const total = parseFloat(String(totalRaw).replace(/[^0-9.-]/g, "")) || 0;

      if (!dosDate) return;

      const dosStr = format(dosDate, "yyyy-MM-dd");
      let matchIndex = -1;

      if (cptStr) {
        const foundIdx = claimsLookup.get(`${pNameLower}|${dosStr}|${cptStr}`);
        if (foundIdx !== undefined) matchIndex = foundIdx;
      }

      if (matchIndex === -1) {
        const pIdx = partialLookup.get(`${pNameLower}|${dosStr}`);
        if (pIdx !== undefined) matchIndex = pIdx;
      }

      if (matchIndex !== -1) {
        updatedClaims[matchIndex].paidAmt =
          (updatedClaims[matchIndex].paidAmt || 0) + total;
        if (!updatedClaims[matchIndex].cptDetails)
          updatedClaims[matchIndex].cptDetails = [];
        const exactDetail = updatedClaims[matchIndex].cptDetails!.find(
          (d) => d.cpt.toLowerCase() === cptStr,
        );
        if (exactDetail) {
          exactDetail.paid += total;
        } else {
          if (cptStr && cptStr.length > 0) {
            updatedClaims[matchIndex].cptDetails!.push({
              cpt: cptStr.toUpperCase(),
              billed: 0,
              paid: total,
            });
          } else if (updatedClaims[matchIndex].cptDetails!.length > 0) {
            updatedClaims[matchIndex].cptDetails![0].paid += total;
          }
        }
      }
    });
  });

  return updatedClaims;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>({
    provider: [],
    doctor: null,
    insuranceType: [],
    cptCode: null,
    month: [],
    dateStart: null,
    dateEnd: null,
  });

  // Auto-load both files from /public on startup
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // 1. Load claims file
        const claimsRes = await fetch("/claims.xlsx");
        if (!claimsRes.ok)
          throw new Error(`claims.xlsx not found (${claimsRes.status})`);
        const claimsBuffer = await claimsRes.arrayBuffer();
        const claimsWb = XLSX.read(new Uint8Array(claimsBuffer), {
          type: "array",
        });
        const parsedClaims = processClaimsWorkbook(claimsWb);

        // 2. Load payments file and merge
        try {
          const payRes = await fetch("/payments.xls");
          if (payRes.ok) {
            const payBuffer = await payRes.arrayBuffer();
            const payWb = XLSX.read(new Uint8Array(payBuffer), {
              type: "array",
            });
            const merged = applyPayments(parsedClaims, payWb);
            setClaims(merged);
          } else {
            // payments file not available yet, load claims only
            setClaims(parsedClaims);
          }
        } catch {
          setClaims(parsedClaims);
        }
      } catch (err) {
        console.error("Failed to load data files:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const cleanedClaims = React.useMemo(() => {
    return claims.map((c) => {
      let newIns = c.insuranceType;
      if (
        newIns?.toLowerCase().includes("workers compensation") ||
        newIns?.toLowerCase().includes("worker's compensation") ||
        newIns?.toLowerCase() === "wc" ||
        newIns?.toLowerCase().includes("motor vehicle") ||
        newIns?.toLowerCase() === "mva" ||
        newIns?.toLowerCase() === "mva/wc" ||
        newIns?.toLowerCase() === "mva / wc" ||
        newIns?.toLowerCase().includes("mva/wc") ||
        newIns?.toLowerCase().includes("mva / wc")
      ) {
        newIns = "MVA/WC";
      } else if (
        newIns?.toLowerCase() === "medicaid" ||
        newIns?.toLowerCase() === "lop"
      ) {
        newIns = "LOP";
      } else if (newIns?.toLowerCase().includes("commercial")) {
        newIns = "Commercial";
      } else if (newIns?.toLowerCase().includes("medicare")) {
        newIns = "Medicare";
      }

      const rawDoc = c.doctorName
        ? c.doctorName.split(",")[0].trim()
        : "Unknown Doctor";
      const nameLower = rawDoc.toLowerCase();
      let docSuffix = "";

      if (
        nameLower.includes("jay e brecker") ||
        nameLower.includes("peter j berger") ||
        nameLower.includes("marzili")
      ) {
        docSuffix = " - Chiro";
      } else if (
        nameLower.includes("bruce j buckman") ||
        nameLower.includes("christian s gartner") ||
        nameLower.includes("monroe castro") ||
        nameLower.includes("monreo castro") ||
        nameLower.includes("sridhar yalamanchili") ||
        nameLower.includes("marianne decastro") ||
        nameLower.includes("andy koser") ||
        nameLower.includes("sferra") ||
        nameLower.includes("sferry")
      ) {
        docSuffix = " - PT";
      } else if (
        nameLower.includes("david adin") ||
        nameLower.includes("billy ford")
      ) {
        docSuffix = " - Pain Mgmt";
      } else if (
        nameLower.includes("madison lynn smith") ||
        nameLower.includes("sclafani")
      ) {
        docSuffix = " - OT";
      } else if (nameLower.includes("chiro")) {
        docSuffix = " - Chiro";
      } else if (
        nameLower.includes("physical therapy") ||
        nameLower.includes("pt")
      ) {
        docSuffix = " - PT";
      } else if (
        nameLower.includes("occupational therapy") ||
        nameLower.includes("ot")
      ) {
        docSuffix = " - OT";
      }

      const cleanRaw = rawDoc
        .replace(/\s+(MS|Ms\.?|PT|OT|CHIRO|MD|DPT)$/i, "")
        .replace(/\s+-\s+(Chiro|PT|OT|CHIRO)$/i, "")
        .trim();

      const cleanDoc = docSuffix ? `${cleanRaw}${docSuffix}` : cleanRaw;

      return {
        ...c,
        doctorName: cleanDoc,
        providerName: c.providerName
          ? c.providerName.split(",")[0].trim()
          : "Unknown Provider",
        insuranceType: newIns,
      };
    });
  }, [claims]);

  const filteredClaims = React.useMemo(() => {
    return cleanedClaims.filter((claim) => {
      if (
        filters.provider.length > 0 &&
        !filters.provider.includes(claim.doctorName)
      )
        return false;
      if (filters.doctor && claim.doctorName !== filters.doctor) return false;
      if (
        filters.insuranceType.length > 0 &&
        !filters.insuranceType.includes(claim.insuranceType)
      )
        return false;
      if (filters.cptCode && !claim.cptCode.includes(filters.cptCode))
        return false;
      if (filters.dateStart && claim.serviceDate < filters.dateStart)
        return false;
      if (filters.dateEnd && claim.serviceDate > filters.dateEnd) return false;
      if (filters.month.length > 0) {
        if (!claim.serviceDate) return false;
        const d = new Date(claim.serviceDate);
        if (!isNaN(d.getTime())) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!filters.month.includes(monthKey)) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [cleanedClaims, filters]);

  return (
    <DataContext.Provider
      value={{
        claims,
        setClaims,
        isLoading,
        setIsLoading,
        filters,
        setFilters,
        filteredClaims,
        cleanedClaims,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
