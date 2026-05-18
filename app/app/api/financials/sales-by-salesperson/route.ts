import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/public/data"
);

// ─── Types ───

interface CustomerData {
    gross: number;
    orders: number;
}

// Monthly JSON: { salesperson: { year: { month: { customer: CustomerData } } } }
type MonthlyJson = Record<string, Record<string, Record<string, CustomerData>>>;

// Yearly JSON: { salesperson: { year: { customer: CustomerData } } }
type YearlyJson = Record<string, Record<string, Record<string, CustomerData>>>;

interface MonthlyRow {
    customer: string;
    months: Record<string, number>;
    total: number;
}

interface YearlyRow {
    customer: string;
    years: Record<string, number>;
    total: number;
}

interface SalesSummary {
    totalGross: number;
    orderCount: number;
    activeCustomers: number;
}

interface SalesApiResponse {
    success: boolean;
    view: "monthly" | "yearly";
    salesperson: string;
    year?: number;
    month?: number;
    summary: SalesSummary;
    salespeople: string[];
    availableYears: number[];
    rows: (MonthlyRow | YearlyRow)[];
    totals: Record<string, number>;
}

// ─── Helpers ───

function loadJsonFile<T>(filename: string): T {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        throw new Error(`Data file not found: ${filename}`);
    }
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw) as T;
}

/** Convert zero-padded month key "01".."12" to non-padded "1".."12" (matching frontend column keys) */
function monthKey(zeropad: string): string {
    return String(parseInt(zeropad, 10));
}

// ─── Route handler ───

export async function GET(req: NextRequest) {
    try {
        const url = req.nextUrl;
        const view = url.searchParams.get("view");
        const salesperson = url.searchParams.get("salesperson") || "all";
        const yearStr = url.searchParams.get("year") || "";
        const monthStr = url.searchParams.get("month") || "";

        // Validate view
        if (!view || !["monthly", "yearly"].includes(view)) {
            return NextResponse.json(
                { error: "Invalid or missing 'view' param. Must be 'monthly' or 'yearly'." },
                { status: 400 }
            );
        }

        // Validate month format if provided
        if (monthStr && !/^\d{2}$/.test(monthStr)) {
            return NextResponse.json(
                { error: "Invalid 'month' param. Must be two-digit MM format (e.g., '01', '12')." },
                { status: 400 }
            );
        }

        // Validate year format if provided
        let yearNum: number | undefined;
        if (yearStr) {
            yearNum = parseInt(yearStr, 10);
            if (isNaN(yearNum) || yearStr.length !== 4) {
                return NextResponse.json(
                    { error: "Invalid 'year' param. Must be YYYY format." },
                    { status: 400 }
                );
            }
        }

        const monthNum: number | undefined = monthStr
            ? parseInt(monthStr, 10)
            : undefined;

        // Load salesperson list
        let allSalespeople: string[] = [];
        try {
            const spList = loadJsonFile<Array<{ name: string }>>("salesperson_list.json");
            allSalespeople = spList.map((s) => s.name);
        } catch {
            // Fall back to keys from data files below
        }

        // If "all", merge all salespeople into a virtual "all" entry
        if (salesperson === "all") {
            if (view === "monthly") {
                const origPath = path.join(DATA_DIR, "sales_by_salesperson_monthly.json");
                const data = JSON.parse(fs.readFileSync(origPath, "utf-8")) as MonthlyJson;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const merged: Record<string, any> = {};
                for (const sp of Object.keys(data)) {
                    for (const yr of Object.keys(data[sp])) {
                        if (!merged[yr]) merged[yr] = {};
                        for (const mo of Object.keys(data[sp][yr])) {
                            if (!merged[yr][mo]) merged[yr][mo] = { gross: 0, orders: 0, customers: {} as Record<string, any> };
                            const srcMo = data[sp][yr][mo] as any;
                            const dstMo = merged[yr][mo] as any;
                            dstMo.gross += srcMo.gross || 0;
                            dstMo.orders += srcMo.orders || 0;
                            if (srcMo.customers) {
                                for (const cust of Object.keys(srcMo.customers)) {
                                    if (!dstMo.customers[cust]) dstMo.customers[cust] = { gross: 0, orders: 0 };
                                    dstMo.customers[cust].gross += srcMo.customers[cust].gross || 0;
                                    dstMo.customers[cust].orders += srcMo.customers[cust].orders || 0;
                                }
                            }
                        }
                    }
                }
                const allData = { ...data, all: merged };
                // Temporarily overwrite so buildMonthlyResponse reads merged data
                const backup = fs.readFileSync(origPath, "utf-8");
                fs.writeFileSync(origPath, JSON.stringify(allData));
                try {
                    return buildMonthlyResponse("all", yearStr, monthStr, yearNum, monthNum, allSalespeople);
                } finally {
                    fs.writeFileSync(origPath, backup);
                }
            } else {
                const origPath = path.join(DATA_DIR, "sales_by_salesperson_yearly.json");
                const data = JSON.parse(fs.readFileSync(origPath, "utf-8")) as YearlyJson;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const merged: Record<string, any> = {};
                for (const sp of Object.keys(data)) {
                    for (const yr of Object.keys(data[sp])) {
                        if (!merged[yr]) merged[yr] = { gross: 0, orders: 0, customers: {} as Record<string, any> };
                        const srcYr = data[sp][yr] as any;
                        const dstYr = merged[yr] as any;
                        dstYr.gross += srcYr.gross || 0;
                        dstYr.orders += srcYr.orders || 0;
                        if (srcYr.customers) {
                            for (const cust of Object.keys(srcYr.customers)) {
                                if (!dstYr.customers[cust]) dstYr.customers[cust] = { gross: 0, orders: 0 };
                                dstYr.customers[cust].gross += srcYr.customers[cust].gross || 0;
                                dstYr.customers[cust].orders += srcYr.customers[cust].orders || 0;
                            }
                        }
                    }
                }
                const allData = { ...data, all: merged };
                const backup = fs.readFileSync(origPath, "utf-8");
                fs.writeFileSync(origPath, JSON.stringify(allData));
                try {
                    return buildYearlyResponse("all", yearStr, yearNum, allSalespeople);
                } finally {
                    fs.writeFileSync(origPath, backup);
                }
            }
        }

        if (view === "monthly") {
            return buildMonthlyResponse(salesperson, yearStr, monthStr, yearNum, monthNum, allSalespeople);
        } else {
            return buildYearlyResponse(salesperson, yearStr, yearNum, allSalespeople);
        }
    } catch (error) {
        console.error("Sales by salesperson API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch sales by salesperson data" },
            { status: 500 }
        );
    }
}

// ─── Monthly handler ───

function buildMonthlyResponse(
    salesperson: string,
    yearStr: string,
    monthStr: string,
    yearNum: number | undefined,
    monthNum: number | undefined,
    knownSalespeople: string[]
): NextResponse {
    let data: MonthlyJson;
    try {
        data = loadJsonFile<MonthlyJson>("sales_by_salesperson_monthly.json");
    } catch {
        return NextResponse.json(
            { error: "Monthly sales data not available" },
            { status: 404 }
        );
    }

    // Validate salesperson
    if (!(salesperson in data)) {
        const validNames =
            knownSalespeople.length > 0
                ? knownSalespeople
                : Object.keys(data).filter((k) => k !== "all");
        return NextResponse.json(
            {
                error: `Salesperson "${salesperson}" not found.`,
                validSalespeople: validNames,
            },
            { status: 404 }
        );
    }

    const spData = data[salesperson];

    // All available years for this salesperson
    const availableYears: number[] = Object.keys(spData)
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

    // Determine which years to iterate
    const yearsToIterate: string[] =
        yearStr && yearStr in spData ? [yearStr] : Object.keys(spData);

    // customerName -> { months: Map<"1".."12", amount>, totalAmount, orderCount }
    const customerMap = new Map<
        string,
        {
            months: Map<string, number>;
            totalAmount: number;
            orderCount: number;
        }
    >();

    // monthTotals keyed by non-padded month ("1".."12")
    const monthTotals: Record<string, number> = {};

    for (const year of yearsToIterate) {
        const yearData = spData[year];
        if (!yearData) continue;

        for (const [zpMonth, monthData] of Object.entries(yearData)) {
            // Skip if a specific month is requested
            if (monthStr && zpMonth !== monthStr) continue;

            const displayMonth = monthKey(zpMonth);

            // monthData is { gross, orders, customers: { name: { gross, orders } } }
            const custData = (monthData as any).customers || {};
            for (const [customerName, cust] of Object.entries(custData) as [string, any][]) {
                if (!customerMap.has(customerName)) {
                    customerMap.set(customerName, {
                        months: new Map(),
                        totalAmount: 0,
                        orderCount: 0,
                    });
                }

                const entry = customerMap.get(customerName)!;
                const prev = entry.months.get(displayMonth) || 0;
                entry.months.set(displayMonth, prev + cust.gross);
                entry.totalAmount += cust.gross;
                entry.orderCount += cust.orders;

                monthTotals[displayMonth] =
                    (monthTotals[displayMonth] || 0) + cust.gross;
            }
        }
    }

    // Build rows
    const rows: MonthlyRow[] = [];
    let totalGross = 0;
    let totalOrderCount = 0;
    const activeCustomers = new Set<string>();

    for (const [customer, entry] of customerMap) {
        const months: Record<string, number> = {};
        for (const [m, amt] of entry.months) {
            months[m] = amt;
        }
        rows.push({
            customer,
            months,
            total: Math.round(entry.totalAmount * 100) / 100,
        });
        totalGross += entry.totalAmount;
        totalOrderCount += entry.orderCount;
        activeCustomers.add(customer);
    }

    // Sort descending by total
    rows.sort((a, b) => b.total - a.total);

    // Build totals: fill zeros for any month missing from monthTotals
    const totals: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
        const key = String(m);
        totals[key] = monthTotals[key]
            ? Math.round(monthTotals[key] * 100) / 100
            : 0;
    }
    totals["total"] = Math.round(totalGross * 100) / 100;

    // Salespeople list
    const salespeople: string[] =
        knownSalespeople.length > 0
            ? knownSalespeople
            : Object.keys(data).filter((k) => k !== "all");

    const response: SalesApiResponse = {
        success: true,
        view: "monthly",
        salesperson,
        year: yearNum,
        month: monthNum,
        summary: {
            totalGross: Math.round(totalGross * 100) / 100,
            orderCount: totalOrderCount,
            activeCustomers: activeCustomers.size,
        },
        salespeople,
        availableYears,
        rows,
        totals,
    };

    return NextResponse.json(response);
}

// ─── Yearly handler ───

function buildYearlyResponse(
    salesperson: string,
    yearStr: string,
    yearNum: number | undefined,
    knownSalespeople: string[]
): NextResponse {
    let data: YearlyJson;
    try {
        data = loadJsonFile<YearlyJson>("sales_by_salesperson_yearly.json");
    } catch {
        return NextResponse.json(
            { error: "Yearly sales data not available" },
            { status: 404 }
        );
    }

    // Validate salesperson
    if (!(salesperson in data)) {
        const validNames =
            knownSalespeople.length > 0
                ? knownSalespeople
                : Object.keys(data).filter((k) => k !== "all");
        return NextResponse.json(
            {
                error: `Salesperson "${salesperson}" not found.`,
                validSalespeople: validNames,
            },
            { status: 404 }
        );
    }

    const spData = data[salesperson];

    // All available years for this salesperson
    const availableYears: number[] = Object.keys(spData)
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

    // Determine which years to iterate
    const yearsToIterate: string[] =
        yearStr && yearStr in spData ? [yearStr] : Object.keys(spData);

    // customerName -> { years: Map<yearStr, amount>, totalAmount, orderCount }
    const customerMap = new Map<
        string,
        {
            years: Map<string, number>;
            totalAmount: number;
            orderCount: number;
        }
    >();

    // yearTotals keyed by year string
    const yearTotals: Record<string, number> = {};

    for (const year of yearsToIterate) {
        const yearData = spData[year];
        if (!yearData) continue;

        // yearData may be:
        //  (A) { month: { gross, orders, customers: { name: { gross, orders } } } }  — legacy
        //  (B) { gross, orders, customers: { name: { gross, orders } } }              — current
        const asAny = yearData as Record<string, any>;
        const directCustomers = asAny.customers as Record<string, any> | undefined;

        if (directCustomers && typeof directCustomers === "object" && !asAny["01"]) {
            // Structure B: flat year data with direct customers
            for (const [customerName, cust] of Object.entries(directCustomers)) {
                if (!customerMap.has(customerName)) {
                    customerMap.set(customerName, {
                        years: new Map(),
                        totalAmount: 0,
                        orderCount: 0,
                    });
                }
                const entry = customerMap.get(customerName)!;
                const prev = entry.years.get(year) || 0;
                entry.years.set(year, prev + cust.gross);
                entry.totalAmount += cust.gross;
                entry.orderCount += cust.orders;
                yearTotals[year] = (yearTotals[year] || 0) + cust.gross;
            }
        } else {
            // Structure A: month-level nesting — flatten all months' customers
            for (const [zpMonth, monthData] of Object.entries(asAny)) {
                const custData = (monthData as any).customers || {};
                for (const [customerName, cust] of Object.entries(custData) as [string, any][]) {
                    if (!customerMap.has(customerName)) {
                        customerMap.set(customerName, {
                            years: new Map(),
                            totalAmount: 0,
                            orderCount: 0,
                        });
                    }
                    const entry = customerMap.get(customerName)!;
                    const prev = entry.years.get(year) || 0;
                    entry.years.set(year, prev + cust.gross);
                    entry.totalAmount += cust.gross;
                    entry.orderCount += cust.orders;
                    yearTotals[year] = (yearTotals[year] || 0) + cust.gross;
                }
            }
        }
    }  // end year

    // Build rows
    const rows: YearlyRow[] = [];
    let totalGross = 0;
    let totalOrderCount = 0;
    const activeCustomers = new Set<string>();

    for (const [customer, entry] of customerMap) {
        const years: Record<string, number> = {};
        for (const [y, amt] of entry.years) {
            years[y] = amt;
        }
        rows.push({
            customer,
            years,
            total: Math.round(entry.totalAmount * 100) / 100,
        });
        totalGross += entry.totalAmount;
        totalOrderCount += entry.orderCount;
        activeCustomers.add(customer);
    }

    // Sort descending by total
    rows.sort((a, b) => b.total - a.total);

    // Build totals: round each year's total
    const totals: Record<string, number> = {};
    for (const y of availableYears) {
        const yStr = String(y);
        totals[yStr] = yearTotals[yStr]
            ? Math.round(yearTotals[yStr] * 100) / 100
            : 0;
    }
    totals["total"] = Math.round(totalGross * 100) / 100;

    // Salespeople list
    const salespeople: string[] =
        knownSalespeople.length > 0
            ? knownSalespeople
            : Object.keys(data).filter((k) => k !== "all");

    const response: SalesApiResponse = {
        success: true,
        view: "yearly",
        salesperson,
        year: yearNum,
        summary: {
            totalGross: Math.round(totalGross * 100) / 100,
            orderCount: totalOrderCount,
            activeCustomers: activeCustomers.size,
        },
        salespeople,
        availableYears,
        rows,
        totals,
    };

    return NextResponse.json(response);
}
