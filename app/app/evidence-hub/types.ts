import { AlertTriangle, Flag, Bookmark, Info } from "lucide-react";

/* ─── Core types ─── */
export interface EvidenceItem {
    id: number;
    canonical_id: string;
    source_type: string;
    title: string;
    summary: string;
    preview: string;
    start_timestamp: string;
    tags: string;
    primary_ids: string;
}

export interface DetailResult {
    evidence: {
        id: number;
        canonical_id: string;
        source_type: string;
        title: string;
        summary: string;
        body_snippet: string;
        start_timestamp: string;
        tags: string;
        primary_ids: string;
        extra: string;
        origins: string;
    };
    participants: { identifier: string; normalized_identifier: string; role: string }[];
    provenance: { origin_system: string; source_file: string; source_rowid: number; created_at: string }[];
}

export interface Stats {
    total: number;
    sources: { source_type: string; count: number }[];
    participants: { id: string; count: number }[];
    origins: { origin_system: string; count: number }[];
    tags: { tag: string; count: number }[];
}

export interface Annotation {
    id: number;
    evidence_id: number;
    annotation_type: string;
    selected_text: string;
    note: string;
    color: string;
    flag_level: string;
    tags: string;
    created_at: string;
}

export interface ThreadEmail {
    row_id: number;
    msg_id: string;
    sender: string;
    account: string;
    subject: string;
    date: string;
    body: string;
    cleaned_body: string;
    to_addr: string;
    cc_addr: string;
    source_file: string;
    zip_path: string;
}

export interface CoCStep { label: string; detail: string; icon: string; timestamp?: string }
export interface CoCChain {
    origin_system: string;
    source_file: string;
    source_rowid: string;
    steps: CoCStep[];
}
export interface CoCData {
    evidence_id: number;
    chain: CoCChain[];
    participants: { identifier: string; normalized_identifier: string; role: string }[];
    origin_count: number;
}

export interface WorkbenchSection {
    name: string;
    prefix: string;
    description?: string;
    totalItems: number;
}

export interface Conversation {
    id: number;
    name: string;
    description: string | null;
    color: string;
    folder: string | null;
    message_count: number;
    created_at: string;
    updated_at: string;
}

/* ─── Constants ─── */
export const FLAG_LEVELS = [
    { value: "critical", label: "Critical", color: "#ef4444", icon: AlertTriangle },
    { value: "important", label: "Important", color: "#f59e0b", icon: Flag },
    { value: "review", label: "Review", color: "#3b82f6", icon: Bookmark },
    { value: "info", label: "Info", color: "#64748b", icon: Info },
];

export const HIGHLIGHT_COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];

export const PLAYER_PROFILES = [
    {
        id: "jz", name: "Joseph Zangrilli", fullName: "Joseph Zangrilli",
        color: "#0b84fe",
        identifiers: ["+17736109104", "joe@rowboatcreative.com", "jfzangrilli@gmail.com"]
    },
    {
        id: "lg", name: "Lucas Guariglia", fullName: "Lucas Guariglia",
        color: "#f59e0b",
        identifiers: ["+18478280944", "lucas@rowboatcreative.com", "lucasideas@gmail.com", "lucas@allworldagency.com", "lucas@allworldmerch.com", "luke@joefreshgoods.com"]
    },
];

/* ─── Helper functions ─── */
export const fmtDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
};

export const parseTags = (tags: string): string[] => {
    if (!tags) return [];
    try { 
        const arr = JSON.parse(tags); 
        if (!Array.isArray(arr)) return [];
        return Array.from(new Set(arr.map(t => String(t))));
    }
    catch { return []; }
};

/* ─── Handle → Full Name map ─── */
let _handleMap: Record<string, string> = {};
export const setHandleMap = (map: Record<string, string>) => { _handleMap = map; };
export const resolveHandle = (handle: string): string => {
    if (!handle || handle === 'Unknown') return handle;
    if (_handleMap[handle]) return _handleMap[handle];
    if (handle.startsWith('+') && _handleMap[handle.slice(1)]) return _handleMap[handle.slice(1)];
    if (!handle.startsWith('+') && _handleMap['+' + handle]) return _handleMap['+' + handle];
    for (const [id, name] of Object.entries(_handleMap)) {
        if (handle.includes(id) || id.includes(handle)) return name;
    }
    return handle;
};
