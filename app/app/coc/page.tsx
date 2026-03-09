"use client";

import { useEffect, useMemo, useState } from "react";

type CocRecord = {
    id: number;
    source_path: string;
    source_type: string;
    sha256: string;
    size_bytes: number;
    case_id: string | null;
    notes: string | null;
    ingested_at: string;
    last_updated_at: string | null;  // NEW
};

function shortHash(sha: string) {
    if (!sha) return "";
    return sha.slice(0, 10);
}

function fileNameFromPath(p: string) {
    if (!p) return "";
    const parts = p.split("/");
    return parts[parts.length - 1] || p;
}

function buildCsvFilename(rows: CocRecord[]) {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10); // e.g. 2026-03-08
    const firstWithCase = rows.find((r) => r.case_id);
    const caseId = firstWithCase?.case_id || "unknown-case";
    return `${caseId}_chain_of_custody_${iso}.csv`;
}

function recordsToCsv(rows: CocRecord[]): string {
    const header = [
        "id",
        "source_type",
        "source_path",
        "sha256",
        "size_bytes",
        "case_id",
        "notes",
        "ingested_at",
        "last_updated_at",   // NEW
    ];
    const escape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        if (/[",\n]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const lines = [
        header.join(","),
        ...rows.map((r) =>
            [
                r.id,
                r.source_type,
                r.source_path,
                r.sha256,
                r.size_bytes,
                r.case_id ?? "",
                r.notes ?? "",
                r.ingested_at,
                r.last_updated_at ?? "",  // NEW
            ]
                .map(escape)
                .join(",")
        ),
    ];
    return lines.join("\n");
}


export default function ChainOfCustodyPage() {
    const [records, setRecords] = useState<CocRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [verifyingId, setVerifyingId] = useState<number | null>(null);
    const [verifyResults, setVerifyResults] = useState<
        Record<number, { matches: boolean } | undefined>
    >({});
    const [notesDrafts, setNotesDrafts] = useState<Record<number, string>>({});
    const [savingNotesId, setSavingNotesId] = useState<number | null>(null);

    const [historyForId, setHistoryForId] = useState<number | null>(null);
    const [historyRecords, setHistoryRecords] = useState<
        {
            coc_id: number;
            note_text: string | null;
            changed_at: string;
            changed_by: string | null;
            source: string | null;
        }[]
    >([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/coc");
                const data = await res.json();
                const rows: CocRecord[] = data.records ?? data;
                setRecords(rows);
                setNotesDrafts(
                    rows.reduce((acc, r) => {
                        acc[r.id] = r.notes ?? "";
                        return acc;
                    }, {} as Record<number, string>)
                );
            } catch (e: any) {
                console.error("Failed to load CoC:", e);
                setError("Failed to load chain of custody data.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);


    const filteredRecords = useMemo(() => {
        if (typeFilter === "all") return records;
        return records.filter((r) => r.source_type === typeFilter);
    }, [records, typeFilter]);

    const typeOptions = useMemo(() => {
        const set = new Set(records.map((r) => r.source_type));
        return Array.from(set).sort();
    }, [records]);

    if (loading) return <div className="p-4">Loading chain of custody…</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-semibold">Chain of Custody</h1>
                <div className="flex items-center gap-3 text-sm text-gray-800">
                    <button
                        type="button"
                        className="border border-gray-300 rounded px-3 py-1 bg-white hover:bg-gray-50 text-gray-800"
                        onClick={() => {
                            const csv = recordsToCsv(filteredRecords);
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = buildCsvFilename(filteredRecords);
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }}
                    >
                        Export CSV
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Filter type:</span>
                        <select
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-800"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {typeOptions.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-auto border border-gray-200 rounded">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                ID
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Type
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Filename
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Hash
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Size (bytes)
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Ingested
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Last updated
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Notes
                            </th>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">
                                Verify
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map((r) => (
                            <tr key={r.id} className="border-t">
                                <td className="px-2 py-1">{r.id}</td>
                                <td className="px-2 py-1">{r.source_type}</td>
                                <td className="px-2 py-1">
                                    <span
                                        className="font-mono text-xs truncate max-w-xl inline-block align-middle"
                                        title={r.source_path}
                                    >
                                        {fileNameFromPath(r.source_path)}
                                    </span>
                                </td>
                                <td className="px-2 py-1">
                                    <span className="font-mono text-xs" title={r.sha256}>
                                        {shortHash(r.sha256)}
                                    </span>
                                </td>
                                <td className="px-2 py-1">
                                    {r.size_bytes.toLocaleString()}
                                </td>
                                <td className="px-2 py-1">
                                    {new Date(r.ingested_at).toLocaleString()}
                                </td>
                                <td className="px-2 py-1">
                                    {r.last_updated_at
                                        ? new Date(r.last_updated_at).toLocaleString()
                                        : "-"}
                                </td>

                                {/* Notes cell */}
                                <td className="px-2 py-1 align-top">
                                    <div className="flex flex-col gap-1">
                                        <textarea
                                            className="w-64 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-800"
                                            rows={2}
                                            value={notesDrafts[r.id] ?? ""}
                                            onChange={(e) =>
                                                setNotesDrafts((prev) => ({
                                                    ...prev,
                                                    [r.id]: e.target.value,
                                                }))
                                            }
                                        />
                                        <div className="flex gap-2">
                                            {/* Save */}
                                            <button
                                                type="button"
                                                className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-50"
                                                disabled={
                                                    savingNotesId === r.id ||
                                                    (notesDrafts[r.id] ?? "") === (r.notes ?? "")
                                                }
                                                onClick={async () => {
                                                    try {
                                                        setSavingNotesId(r.id);
                                                        const newNotes = notesDrafts[r.id] ?? "";
                                                        const res = await fetch("/api/coc/notes", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ id: r.id, notes: newNotes }),
                                                        });
                                                        const data = await res.json();
                                                        if (!res.ok || !data.ok) {
                                                            console.error("Notes update error:", data);
                                                            return;
                                                        }
                                                        setRecords((prev) =>
                                                            prev.map((rec) =>
                                                                rec.id === r.id
                                                                    ? {
                                                                        ...rec,
                                                                        notes: newNotes,
                                                                        last_updated_at: data.lastUpdatedAt ?? rec.last_updated_at,
                                                                    }
                                                                    : rec
                                                            )
                                                        );
                                                    } finally {
                                                        setSavingNotesId(null);
                                                    }
                                                }}
                                            >
                                                {savingNotesId === r.id ? "Saving…" : "Save"}
                                            </button>

                                            {/* Reset */}
                                            <button
                                                type="button"
                                                className="border border-gray-200 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                                                disabled={savingNotesId === r.id}
                                                onClick={() =>
                                                    setNotesDrafts((prev) => ({
                                                        ...prev,
                                                        [r.id]: r.notes ?? "",
                                                    }))
                                                }
                                            >
                                                Reset
                                            </button>

                                            {/* History */}
                                            <button
                                                type="button"
                                                className="border border-gray-200 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                                                disabled={savingNotesId === r.id}
                                                onClick={async () => {
                                                    try {
                                                        setLoadingHistory(true);
                                                        setHistoryForId(r.id);
                                                        const res = await fetch("/api/coc/history", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ id: r.id }),
                                                        });
                                                        const data = await res.json();
                                                        if (!res.ok) {
                                                            console.error("History error:", data);
                                                            setHistoryRecords([]);
                                                            return;
                                                        }
                                                        setHistoryRecords(data.records || []);
                                                    } finally {
                                                        setLoadingHistory(false);
                                                    }
                                                }}
                                            >
                                                {loadingHistory && historyForId === r.id ? "Loading…" : "History"}
                                            </button>
                                        </div>
                                    </div>
                                </td>

                                {/* Verify cell (what you already added) */}
                                <td className="px-2 py-1">
                                    <button
                                        type="button"
                                        className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-50"
                                        disabled={verifyingId === r.id}
                                        onClick={async () => {
                                            try {
                                                setVerifyingId(r.id);
                                                const res = await fetch("/api/coc/verify", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ id: r.id }),
                                                });
                                                const data = await res.json();
                                                if (!res.ok) {
                                                    console.error("Verify error:", data);
                                                    setVerifyResults((prev) => ({
                                                        ...prev,
                                                        [r.id]: undefined,
                                                    }));
                                                    return;
                                                }
                                                setVerifyResults((prev) => ({
                                                    ...prev,
                                                    [r.id]: { matches: data.matches },
                                                }));
                                            } finally {
                                                setVerifyingId(null);
                                            }
                                        }}
                                    >
                                        {verifyingId === r.id ? "Verifying…" : "Verify"}
                                    </button>
                                    {verifyResults[r.id] && (
                                        <span
                                            className={
                                                verifyResults[r.id]!.matches
                                                    ? "ml-2 text-xs text-emerald-600"
                                                    : "ml-2 text-xs text-red-600"
                                            }
                                        >
                                            {verifyResults[r.id]!.matches ? "OK" : "Mismatch"}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {historyForId !== null && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg max-w-xl w-full max-h-[70vh] overflow-auto p-4 text-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-gray-800">
                                Notes history for ID {historyForId}
                            </h2>
                            <button
                                type="button"
                                className="text-xs text-gray-500 hover:text-gray-800"
                                onClick={() => {
                                    setHistoryForId(null);
                                    setHistoryRecords([]);
                                }}
                            >
                                Close
                            </button>
                        </div>
                        {loadingHistory ? (
                            <div>Loading…</div>
                        ) : historyRecords.length === 0 ? (
                            <div className="text-gray-500">No history entries.</div>
                        ) : (
                            <ul className="space-y-2">
                                {historyRecords.map((h, idx) => (
                                    <li key={idx} className="border-b border-gray-100 pb-2">
                                        <div className="text-xs text-gray-500">
                                            {new Date(h.changed_at).toLocaleString()}{" "}
                                            {h.changed_by ? `by ${h.changed_by}` : ""}
                                            {h.source ? ` (${h.source})` : ""}
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap">
                                            {h.note_text || <span className="text-gray-400">[empty]</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
