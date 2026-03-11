"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard,
    Mail,
    Briefcase,
    FileText,
    Scale,
    DollarSign,
    Gem,
    Shield,
    LogOut,
    Columns2,
    PanelLeftClose,
    PanelLeftOpen,
    Users,
    Target,
    GitFork,
    Presentation,
    Brain,
    ClipboardList, // ← NEW icon for CoC
} from "lucide-react";


const NAV_ITEMS = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, enabled: true },
    { label: "Communications", href: "/communications", icon: Mail, enabled: true },
    { label: "Correlator", href: "/correlator", icon: Columns2, enabled: true },
    { label: "Workbench", href: "/workbench", icon: Briefcase, enabled: true },
    { label: "Evidence Hub", href: "/evidence-hub", icon: Shield, enabled: true },
    { label: "Players", href: "/players", icon: Users, enabled: true },
    { label: "Transcripts", href: "/transcripts", icon: FileText, enabled: true },
    { label: "Legal", href: "/legal", icon: Scale, enabled: true },
    { label: "Legal Research", href: "/legal/research", icon: Brain, enabled: true },
    { label: "Case Corner", href: "/case-corner", icon: Target, enabled: true },
    { label: "Briefing Room", href: "/briefing", icon: Presentation, enabled: true },
    { label: "Timeline", href: "/timeline", icon: GitFork, enabled: true },
    { label: "Financials", href: "/financials", icon: DollarSign, enabled: true },
    { label: "Chain of Custody", href: "/coc", icon: ClipboardList, enabled: true }, // ← NEW
    { label: "Memory Gems", href: "/gems", icon: Gem, enabled: false },
];


export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);


    // Don't render sidebar on sign-in page
    if (pathname === "/auth/signin") return null;


    const userName = session?.user?.name || "Investigator";
    const userEmail = session?.user?.email || "Not signed in";
    const userInitials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();


    return (
        <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
            {/* ─ Logo ─ */}
            <div style={{ padding: collapsed ? "1rem 0.5rem" : "1.5rem 1.25rem 1rem", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: "0.75rem" }}>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "var(--shadow-glow-cyan)",
                        flexShrink: 0,
                    }}
                >
                    <Shield size={18} color="#fff" strokeWidth={2.5} />
                </div>
                {!collapsed && (
                    <div>
                        <div
                            style={{
                                fontFamily: "var(--font-heading)",
                                fontSize: "1.125rem",
                                fontWeight: 700,
                                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                lineHeight: 1.2,
                            }}
                        >
                            iseepatterns
                        </div>
                        <div
                            style={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase" as const,
                                color: "var(--text-muted)",
                            }}
                        >
                            Forensic Systems
                        </div>
                    </div>
                )}
            </div>


            {/* ─ Active Case Badge ─ */}
            {!collapsed && (
                <div style={{ padding: "0 1.25rem", marginBottom: "1.25rem" }}>
                    <div
                        className="glass-panel"
                        style={{
                            padding: "0.625rem 0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
                        <div
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "var(--accent-emerald)",
                                boxShadow: "0 0 6px var(--accent-emerald)",
                            }}
                        />
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                rowboat-creative
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                                RC-2026
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ─ Navigation ─ */}
            <nav style={{ flex: 1 }}>
                {!collapsed && (
                    <div
                        style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase" as const,
                            color: "var(--text-muted)",
                            padding: "0 1.25rem",
                            marginBottom: "0.5rem",
                        }}
                    >
                        Data Pods
                    </div>
                )}
                {NAV_ITEMS.map((item) => {
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);
                    const Icon = item.icon;


                    return item.enabled ? (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${isActive ? "active" : ""}`}
                            title={collapsed ? item.label : undefined}
                            style={collapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
                        >
                            <Icon size={18} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    ) : (
                        <div key={item.href} className="nav-item disabled" style={collapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined} title={collapsed ? item.label : undefined}>
                            <Icon size={18} />
                            {!collapsed && (
                                <>
                                    <span>{item.label}</span>
                                    <span className="badge badge-cyan" style={{ marginLeft: "auto", fontSize: "0.6rem" }}>
                                        Soon
                                    </span>
                                </>
                            )}
                        </div>
                    );
                })}
            </nav>


            {/* ─ Bottom Section ─ */}
            <div style={{ borderTop: "1px solid var(--border-glass)" }}>
                {/* Collapse toggle */}
                <div style={{ padding: "0.5rem", display: "flex", justifyContent: collapsed ? "center" : "flex-end" }}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="workbench-action-btn"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        style={{ padding: "6px" }}
                    >
                        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                </div>


                {/* User info */}
                <div style={{ padding: collapsed ? "0.5rem" : "0.5rem 1.25rem 1rem", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: "0.75rem" }}>
                    {session?.user?.image ? (
                        <img
                            src={session.user.image}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: 8, border: "var(--glass-border)" }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "var(--bg-glass)",
                                border: "var(--glass-border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                flexShrink: 0,
                            }}
                        >
                            {userInitials}
                        </div>
                    )}
                    {!collapsed && (
                        <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {userName}
                                </div>
                                <div style={{
                                    fontSize: "0.7rem", color: "var(--text-muted)",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {userEmail}
                                </div>
                            </div>
                            <LogOut
                                size={16}
                                style={{ cursor: "pointer", opacity: 0.5, flexShrink: 0 }}
                                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                            />
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}