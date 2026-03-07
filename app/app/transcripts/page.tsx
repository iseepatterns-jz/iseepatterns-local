"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Search,
    FileText,
    Mic,
    Clock,
    Users,
    ChevronRight,
    X,
    Play,
    Filter,
    Hash,
    Briefcase,
    FolderOpen,
    Loader2,
} from "lucide-react";
import Link from "next/link";

/* ── Types ── */
interface TranscriptMeta {
    slug: string;
    date: string;
    title: string;
    hasTxt: boolean;
    hasCsv: boolean;
    hasAudio: boolean;
    txtLines: number | null;
    speakers: string[];
}

interface Segment {
    timestamp: string;
    startMs: number;
    speaker: string;
    text: string;
}

interface TranscriptDetail {
    slug: string;
    date: string;
    title: string;
    segments: Segment[];
    speakers: string[];
    segmentCount: number;
    durationMs: number;
    audioFile: string | null;
    csvFile: string | null;
    hasAudio: boolean;
    hasCsv: boolean;
}

interface PlayerMatch {
    id: number;
    slug: string;
    display_name: string;
    title: string;
    company: string;
    profile_type: string;
}

/* ── Helpers ── */
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function speakerColor(speaker: string): string {
    const s = speaker.toUpperCase();
    if (s.includes("ZANGRILLI") || s === "JZ") return "var(--accent-cyan)";
    if (s.includes("SYSTEM")) return "var(--text-muted)";
    if (s.includes("GUARIGLIA") || s === "LG") return "var(--accent-red)";
    if (s.includes("JUDGE") || s.includes("COURT")) return "var(--accent-purple)";
    // Rotate colors for other speakers
    const hash = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const colors = [
        "var(--accent-emerald)",
        "var(--accent-orange)",
        "var(--accent-purple)",
        "var(--accent-cyan)",
    ];
    return colors[hash % colors.length];
}

export default function TranscriptsPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>Loading…</div>}>
            <TranscriptsPageInner />
        </Suspense>
    );
}

function TranscriptsPageInner() {
    const [transcripts, setTranscripts] = useState<TranscriptMeta[]>([]);
    const [search, setSearch] = useState("");
    const [speakerSearch, setSpeakerSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<TranscriptDetail | null>(null);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeSpeakerFilter, setActiveSpeakerFilter] = useState("");
    const [total, setTotal] = useState(0);
    const [currentTimeMs, setCurrentTimeMs] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const transcriptBodyRef = useRef<HTMLDivElement | null>(null);
    const activeSegRef = useRef<HTMLDivElement | null>(null);
    const lastScrolledIdx = useRef(-1);

    /* Player badges for speakers */
    const [speakerPlayers, setSpeakerPlayers] = useState<Map<string, PlayerMatch>>(new Map());

    /* Section picker for evidence assignment */
    interface SectionInfo { name: string; totalItems: number; }
    const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
    const [availableSections, setAvailableSections] = useState<SectionInfo[]>([]);
    const [assigningEvidence, setAssigningEvidence] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ title: string; error?: boolean } | null>(null);

    const showToast = (title: string, error = false) => {
        setToastMsg({ title, error });
        setTimeout(() => setToastMsg(null), 3500);
    };

    const fetchList = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (speakerSearch) params.set("speaker", speakerSearch);
        params.set("limit", "100");
        try {
            const res = await fetch(`/api/transcripts?${params}`);
            const data = await res.json();
            setTranscripts(data.transcripts || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error("Failed to fetch transcripts:", e);
        }
        setLoading(false);
    }, [search, speakerSearch]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Auto-open transcript from ?open=slug query param (e.g. from Correlator link)
    const searchParams = useSearchParams();
    useEffect(() => {
        const openSlug = searchParams.get("open");
        if (openSlug && !selectedSlug) {
            selectTranscript(openSlug);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const selectTranscript = async (slug: string) => {
        setSelectedSlug(slug);
        setDetailLoading(true);
        setActiveSpeakerFilter("");
        try {
            const res = await fetch(`/api/transcripts/${encodeURIComponent(slug)}`);
            const data = await res.json();
            setSelected(data);

            // Lookup players for each speaker (best-effort, parallel)
            if (data.speakers?.length) {
                const playerMap = new Map<string, PlayerMatch>();
                const lookups = data.speakers.map(async (sp: string) => {
                    // Extract last name for better matching
                    const lastName = sp.split(/\s+/).pop() || sp;
                    try {
                        const r = await fetch(`/api/players/lookup?name=${encodeURIComponent(lastName)}`);
                        const d = await r.json();
                        if (d.match && d.player) {
                            playerMap.set(sp, d.player);
                        }
                    } catch { /* skip */ }
                });
                await Promise.all(lookups);
                setSpeakerPlayers(new Map(playerMap));
            } else {
                setSpeakerPlayers(new Map());
            }
        } catch (e) {
            console.error("Failed to fetch transcript:", e);
        }
        setDetailLoading(false);
    };

    const closeDetail = () => {
        setSelected(null);
        setSelectedSlug(null);
        setActiveSpeakerFilter("");
        setCurrentTimeMs(-1);
        setIsPlaying(false);
        lastScrolledIdx.current = -1;
        setSpeakerPlayers(new Map());
    };

    const filteredSegments =
        selected && activeSpeakerFilter
            ? selected.segments.filter(
                (s) => s.speaker.toUpperCase() === activeSpeakerFilter.toUpperCase()
            )
            : selected?.segments || [];

    // Find active segment index based on current playback time
    const activeSegmentIdx = (() => {
        if (currentTimeMs < 0 || !filteredSegments.length) return -1;
        // Find the last segment whose startMs <= currentTimeMs
        let idx = -1;
        for (let i = 0; i < filteredSegments.length; i++) {
            if (filteredSegments[i].startMs <= currentTimeMs) {
                idx = i;
            } else {
                break;
            }
        }
        return idx;
    })();

    // Auto-scroll to active segment
    useEffect(() => {
        if (
            activeSegmentIdx >= 0 &&
            activeSegmentIdx !== lastScrolledIdx.current &&
            isPlaying &&
            activeSegRef.current &&
            transcriptBodyRef.current
        ) {
            lastScrolledIdx.current = activeSegmentIdx;
            activeSegRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [activeSegmentIdx, isPlaying]);

    // Audio time update handler
    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            setCurrentTimeMs(audioRef.current.currentTime * 1000);
        }
    }, []);

    // Seek to a segment when clicked
    const seekToSegment = useCallback((ms: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = ms / 1000;
            setCurrentTimeMs(ms);
            if (audioRef.current.paused) {
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    }, []);

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            {/* Header */}
            <div className="page-header">
                <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <FileText size={28} />
                    Transcripts
                </h1>
                <p>
                    {total} recorded transcripts — calls, court hearings, and meetings
                </p>
            </div>

            {/* Search & Filters */}
            <div
                style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 400 }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                        }}
                    />
                    <input
                        className="input-glass"
                        placeholder="Search transcripts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 34 }}
                    />
                </div>
                <div style={{ position: "relative", minWidth: 180, maxWidth: 260 }}>
                    <Filter
                        size={16}
                        style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                        }}
                    />
                    <input
                        className="input-glass"
                        placeholder="Filter by speaker..."
                        value={speakerSearch}
                        onChange={(e) => setSpeakerSearch(e.target.value)}
                        style={{ paddingLeft: 34 }}
                    />
                </div>
            </div>

            {/* Main Layout */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: selected ? "380px 1fr" : "1fr",
                    gap: "1rem",
                    minHeight: "60vh",
                }}
            >
                {/* Transcript List */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        maxHeight: selected ? "75vh" : "none",
                        overflowY: selected ? "auto" : "visible",
                    }}
                >
                    {loading && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            Loading transcripts...
                        </div>
                    )}
                    {!loading && transcripts.length === 0 && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            No transcripts found
                        </div>
                    )}
                    {transcripts.map((t) => {
                        const isActive = selectedSlug === t.slug;
                        return (
                            <div
                                key={t.slug}
                                onClick={() => selectTranscript(t.slug)}
                                className="glass-panel"
                                style={{
                                    padding: "0.75rem 1rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    borderLeft: isActive
                                        ? "3px solid var(--accent-cyan)"
                                        : "3px solid transparent",
                                    background: isActive
                                        ? "rgba(0, 245, 212, 0.06)"
                                        : undefined,
                                    transition: "all 0.15s ease",
                                }}
                            >
                                {/* Icon */}
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: t.hasAudio
                                            ? "rgba(0, 245, 212, 0.1)"
                                            : "rgba(139, 92, 246, 0.1)",
                                        border: t.hasAudio
                                            ? "1px solid rgba(0, 245, 212, 0.2)"
                                            : "1px solid rgba(139, 92, 246, 0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    {t.hasAudio ? (
                                        <Mic
                                            size={16}
                                            color="var(--accent-cyan)"
                                        />
                                    ) : (
                                        <FileText
                                            size={16}
                                            color="var(--accent-purple)"
                                        />
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: "0.8125rem",
                                            fontWeight: 600,
                                            color: "var(--text-primary)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {t.title}
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            marginTop: "0.2rem",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                fontFamily: "var(--font-mono)",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {t.date}
                                        </span>
                                        {t.speakers.length > 0 && (
                                            <span
                                                style={{
                                                    fontSize: "0.65rem",
                                                    color: "var(--text-secondary)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                }}
                                            >
                                                <Users size={10} />
                                                {t.speakers.length}
                                            </span>
                                        )}
                                        {t.txtLines && (
                                            <span
                                                style={{
                                                    fontSize: "0.65rem",
                                                    color: "var(--text-secondary)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                }}
                                            >
                                                <Hash size={10} />
                                                {t.txtLines}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight
                                    size={14}
                                    style={{
                                        color: "var(--text-muted)",
                                        opacity: isActive ? 1 : 0.4,
                                        flexShrink: 0,
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                {selected && (
                    <div
                        className="glass-panel"
                        style={{
                            padding: "1.25rem",
                            maxHeight: "75vh",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {detailLoading ? (
                            <div
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--text-muted)",
                                }}
                            >
                                Loading transcript...
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: "1rem",
                                        flexShrink: 0,
                                    }}
                                >
                                    <div>
                                        <h3
                                            style={{
                                                margin: 0,
                                                fontSize: "1rem",
                                            }}
                                        >
                                            {selected.title}
                                        </h3>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.75rem",
                                                marginTop: "0.375rem",
                                                color: "var(--text-muted)",
                                                fontSize: "0.75rem",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontFamily: "var(--font-mono)",
                                                }}
                                            >
                                                {selected.date}
                                            </span>
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                }}
                                            >
                                                <Clock size={12} />{" "}
                                                {formatDuration(selected.durationMs)}
                                            </span>
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                }}
                                            >
                                                <Hash size={12} />{" "}
                                                {selected.segmentCount} lines
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                        <button
                                            className="workbench-action-btn"
                                            onClick={async () => {
                                                setSectionPickerOpen(true);
                                                try {
                                                    const r = await fetch('/api/workbench/sections');
                                                    const d = await r.json();
                                                    setAvailableSections(d.sections || []);
                                                } catch { /* */ }
                                            }}
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '4px 10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                color: 'var(--accent-emerald)',
                                                borderColor: 'rgba(0,200,150,0.3)',
                                            }}
                                            title="Add transcript to evidence"
                                        >
                                            <FolderOpen size={12} />
                                            Evidence
                                        </button>
                                        <button
                                            className="workbench-action-btn"
                                            onClick={closeDetail}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Speaker chips */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "6px",
                                        marginBottom: "1rem",
                                        flexShrink: 0,
                                    }}
                                >
                                    <button
                                        className={`workbench-type-tab ${activeSpeakerFilter === "" ? "active" : ""}`}
                                        onClick={() => setActiveSpeakerFilter("")}
                                        style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                                    >
                                        All
                                    </button>
                                    {selected.speakers.map((sp) => {
                                        const player = speakerPlayers.get(sp);
                                        return (
                                            <div key={sp} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                                <button
                                                    className={`workbench-type-tab ${activeSpeakerFilter === sp ? "active" : ""}`}
                                                    onClick={() =>
                                                        setActiveSpeakerFilter(
                                                            activeSpeakerFilter === sp ? "" : sp
                                                        )
                                                    }
                                                    style={{
                                                        fontSize: "0.65rem",
                                                        padding: "2px 8px",
                                                        borderColor: speakerColor(sp),
                                                    }}
                                                >
                                                    {sp}
                                                </button>
                                                {player && (
                                                    <Link
                                                        href="/players"
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "3px",
                                                            padding: "1px 6px",
                                                            borderRadius: 8,
                                                            background: "rgba(0,242,255,0.08)",
                                                            border: "1px solid rgba(0,242,255,0.15)",
                                                            color: "var(--accent-cyan)",
                                                            fontSize: "0.55rem",
                                                            textDecoration: "none",
                                                            fontWeight: 500,
                                                        }}
                                                        title={`${player.display_name} · ${player.title || ""} ${player.company || ""}`}
                                                    >
                                                        {player.profile_type === "entity" ? (
                                                            <Briefcase size={8} />
                                                        ) : (
                                                            <Users size={8} />
                                                        )}
                                                        {player.display_name}
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Audio Player */}
                                {selected.hasAudio && (
                                    <div
                                        style={{
                                            padding: "0.625rem 0.75rem",
                                            background: "rgba(0, 245, 212, 0.06)",
                                            border: "1px solid rgba(0, 245, 212, 0.15)",
                                            borderRadius: 8,
                                            marginBottom: "1rem",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                marginBottom: "0.5rem",
                                                fontSize: "0.7rem",
                                                color: "var(--accent-cyan)",
                                            }}
                                        >
                                            <Mic size={13} />
                                            {selected.audioFile}
                                        </div>
                                        <audio
                                            ref={audioRef}
                                            controls
                                            preload="metadata"
                                            src={`/api/transcripts/${encodeURIComponent(selected.slug)}/audio`}
                                            onTimeUpdate={handleTimeUpdate}
                                            onPlay={() => setIsPlaying(true)}
                                            onPause={() => setIsPlaying(false)}
                                            style={{
                                                width: "100%",
                                                height: 36,
                                                borderRadius: 6,
                                                outline: "none",
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Transcript Body */}
                                <div
                                    ref={transcriptBodyRef}
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.25rem",
                                    }}
                                >
                                    {filteredSegments.map((seg, idx) => {
                                        const isActive = idx === activeSegmentIdx;
                                        return (
                                            <div
                                                key={idx}
                                                ref={isActive ? activeSegRef : undefined}
                                                onClick={() => seekToSegment(seg.startMs)}
                                                style={{
                                                    display: "flex",
                                                    gap: "0.75rem",
                                                    padding: "0.375rem 0.5rem",
                                                    borderLeft: isActive
                                                        ? "3px solid var(--accent-cyan)"
                                                        : "3px solid transparent",
                                                    background: isActive
                                                        ? "rgba(0, 245, 212, 0.08)"
                                                        : "transparent",
                                                    borderBottom:
                                                        "1px solid rgba(255,255,255,0.03)",
                                                    borderRadius: isActive ? 4 : 0,
                                                    cursor: selected.hasAudio ? "pointer" : "default",
                                                    transition: "background 0.2s ease, border-left 0.2s ease",
                                                }}
                                            >
                                                {/* Timestamp */}
                                                <span
                                                    style={{
                                                        fontFamily: "var(--font-mono)",
                                                        fontSize: "0.65rem",
                                                        color: isActive ? "var(--accent-cyan)" : "var(--text-muted)",
                                                        flexShrink: 0,
                                                        width: 70,
                                                        paddingTop: "2px",
                                                        fontWeight: isActive ? 600 : 400,
                                                    }}
                                                >
                                                    {seg.timestamp}
                                                </span>
                                                {/* Speaker */}
                                                <span
                                                    style={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 700,
                                                        color: speakerColor(seg.speaker),
                                                        flexShrink: 0,
                                                        width: 120,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        paddingTop: "1px",
                                                    }}
                                                    title={seg.speaker}
                                                >
                                                    {seg.speaker}
                                                </span>
                                                {/* Text */}
                                                <span
                                                    style={{
                                                        fontSize: "0.8rem",
                                                        color: isActive ? "var(--text-primary)" : "rgba(255,255,255,0.7)",
                                                        lineHeight: 1.5,
                                                        fontWeight: isActive ? 500 : 400,
                                                    }}
                                                >
                                                    {seg.text}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {filteredSegments.length === 0 && (
                                        <div
                                            style={{
                                                textAlign: "center",
                                                padding: "2rem",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            No segments found
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {/* ═══ Section Picker Modal ═══ */}
            {sectionPickerOpen && (
                <>
                    <div className="workbench-overlay" onClick={() => setSectionPickerOpen(false)} />
                    <div className="workbench-modal">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Add Transcript to Evidence</h3>
                            <button
                                onClick={() => setSectionPickerOpen(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {assigningEvidence ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                                <Loader2 size={20} className="spin" />
                                <div style={{ fontSize: '0.8125rem', marginTop: '0.75rem' }}>Assigning transcript…</div>
                            </div>
                        ) : (
                            <div className="workbench-assign-sections">
                                {availableSections.map(sec => (
                                    <div
                                        key={sec.name}
                                        className="workbench-assign-option"
                                        onClick={async () => {
                                            if (!selected) return;
                                            setAssigningEvidence(true);
                                            try {
                                                const res = await fetch('/api/workbench/assign', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        evidenceId: `transcript:${selected.slug}`,
                                                        evidenceType: 'transcript',
                                                        targetSection: sec.name,
                                                        notes: `Transcript: ${selected.title} (${selected.date})`,
                                                    }),
                                                });
                                                if (res.ok) {
                                                    showToast(`✅ Transcript assigned to ${sec.name.replace(/_/g, ' ')}`);
                                                } else {
                                                    showToast('⚠️ Assignment failed', true);
                                                }
                                            } catch {
                                                showToast('⚠️ Assignment failed', true);
                                            }
                                            setAssigningEvidence(false);
                                            setSectionPickerOpen(false);
                                        }}
                                    >
                                        <FolderOpen size={14} color="var(--accent-cyan)" />
                                        <span>{sec.name.replace(/_/g, ' ').replace(/^\d+\s/, '')}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            {sec.totalItems} items
                                        </span>
                                        <ChevronRight size={14} style={{ opacity: 0.4 }} />
                                    </div>
                                ))}
                                {availableSections.length === 0 && (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                        <Loader2 size={16} className="spin" style={{ marginBottom: '0.5rem' }} /><br />
                                        Loading sections…
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ═══ Toast ═══ */}
            {toastMsg && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: toastMsg.error ? '#fef2f2' : '#f0fdf4',
                    color: toastMsg.error ? '#991b1b' : '#166534',
                    border: `1px solid ${toastMsg.error ? '#f87171' : '#86efac'}`,
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                }}>
                    <span>{toastMsg.title}</span>
                </div>
            )}
        </div>
    );
}
