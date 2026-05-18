"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Hash, Calendar, User, Bot, X, ChevronLeft } from "lucide-react";

// ── Types ──
interface Channel {
  id: string;
  name: string;
  topic: string;
  purpose: string;
  memberCount: number;
  members: { id: string; real_name: string; image_72: string }[];
}

interface SlackMessage {
  user: string;
  type: string;
  subtype: string | null;
  ts: string;
  text: string;
  user_profile: {
    real_name?: string;
    display_name?: string;
    image_72?: string;
  } | null;
  is_bot: boolean;
  date?: string; // from search results
}

// ── User color coding ──
const USER_COLORS: Record<string, string> = {
  U0101K42Q0Y: "var(--accent-cyan)",
  U0101K64VR6: "var(--accent-red)",
  U01939YAR8V: "var(--accent-purple)",
};

function getUserColor(userId: string): string {
  return USER_COLORS[userId] || "var(--text-secondary)";
}

function formatTs(ts: string): string {
  const seconds = parseFloat(ts);
  if (isNaN(seconds)) return ts;
  const d = new Date(seconds * 1000);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " · " + d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTsShort(ts: string): string {
  const seconds = parseFloat(ts);
  if (isNaN(seconds)) return ts;
  const d = new Date(seconds * 1000);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Rendering: handle <@U...> mentions and simple links ──
function renderText(text: string): React.ReactNode {
  // Replace <@UXXXXX> with @mention styling
  const parts = text.split(/(<@[A-Z0-9]+>)/g);
  return parts.map((part, i) => {
    const match = part.match(/^<@([A-Z0-9]+)>$/);
    if (match) {
      return (
        <span
          key={i}
          style={{
            color: USER_COLORS[match[1]] || "var(--accent-cyan)",
            fontWeight: 600,
          }}
        >
          @{match[1]}
        </span>
      );
    }
    // Replace newlines with <br>
    if (part.includes("\n")) {
      return (
        <span key={i}>
          {part.split("\n").map((line, j, arr) => (
            j < arr.length - 1 ? (
              <span key={j}>{line}<br /></span>
            ) : (
              <span key={j}>{line}</span>
            )
          ))}
        </span>
      );
    }
    return part;
  });
}

export default function SlackPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SlackMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  // ── Load channels on mount ──
  useEffect(() => {
    fetch("/api/slack?action=channels")
      .then((r) => r.json())
      .then((data) => {
        if (data.channels) setChannels(data.channels);
      })
      .catch(console.error);
  }, []);

  // ── Load dates when channel selected ──
  const selectChannel = useCallback(async (channelName: string) => {
    setSelectedChannel(channelName);
    setSelectedDate(null);
    setMessages([]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchMode(false);
    setLoading(true);
    const res = await fetch(`/api/slack?action=dates&channel=${channelName}`);
    const data = await res.json();
    setDates(data.dates || []);
    setLoading(false);
  }, []);

  // ── Load messages when date selected ──
  const selectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setMessages([]);
    setSearchResults([]);
    setSearchMode(false);
    setSearchQuery("");
    setLoading(true);
    const res = await fetch(
      `/api/slack?action=messages&channel=${selectedChannel}&date=${date}`
    );
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
    // Scroll to end after messages load
    setTimeout(() => messageEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [selectedChannel]);

  // ── Search across channel ──
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim() || !selectedChannel) return;
      setSearching(true);
      setSearchMode(true);
      const res = await fetch(
        `/api/slack?action=search&channel=${selectedChannel}&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data.messages || []);
      setSearching(false);
    },
    [searchQuery, selectedChannel]
  );

  // ── Filter messages client-side when in date view ──
  const filteredMessages =
    searchMode ? [] :
    searchQuery && !searchMode
      ? messages.filter((m) =>
          m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.user_profile?.real_name || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      : messages;

  const displayMessages = searchMode ? searchResults : filteredMessages;

  // ── Filter channels for search ──
  const filteredChannels = channels.filter(
    (ch) =>
      !channelSearch ||
      ch.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      ch.topic.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const selectedChanInfo = channels.find((ch) => ch.name === selectedChannel);

  return (
    <div
      className="animate-in"
      style={{ display: "flex", height: "calc(100vh - 4rem)", gap: 0 }}
    >
      {/* ── LEFT SIDEBAR: Channel List ── */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          borderRight: "1px solid var(--border-glass)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-glass)",
        }}
      >
        {/* Channel list header */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid var(--border-glass)",
          }}
        >
          <h2 style={{ fontSize: "1rem", margin: 0, marginBottom: "0.75rem" }}>
            <Hash
              size={16}
              style={{ marginRight: "0.5rem", verticalAlign: "middle" }}
            />
            Channels
          </h2>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="input-glass"
              placeholder="Filter channels..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              style={{ paddingLeft: "2rem", fontSize: "0.8rem" }}
            />
          </div>
        </div>

        {/* Channel list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {filteredChannels.length === 0 && (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.8125rem",
              }}
            >
              No channels found
            </div>
          )}
          {filteredChannels.map((ch) => {
            const isActive = selectedChannel === ch.name;
            return (
              <div
                key={ch.id}
                onClick={() => selectChannel(ch.name)}
                style={{
                  padding: "0.625rem 0.75rem",
                  marginBottom: "0.25rem",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  background: isActive
                    ? "var(--bg-glass-hover)"
                    : "transparent",
                  border: isActive
                    ? "1px solid var(--border-glass)"
                    : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "var(--bg-glass)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Hash size={14} color="var(--accent-cyan)" />
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    # {ch.name}
                  </div>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {ch.memberCount}
                  </span>
                </div>
                {ch.topic && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.25rem",
                      marginLeft: "1.375rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ch.topic}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header / Search bar */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border-glass)",
            background: "var(--bg-glass)",
          }}
        >
          {selectedChannel ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                {/* Back / channel info */}
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      setMessages([]);
                      setSearchResults([]);
                      setSearchMode(false);
                      setSearchQuery("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Back to date list"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <Hash size={18} color="var(--accent-cyan)" />
                <h2
                  style={{
                    fontSize: "1.125rem",
                    margin: 0,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  # {selectedChannel}
                </h2>
                {selectedChanInfo?.topic && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    — {selectedChanInfo.topic}
                  </span>
                )}
              </div>

              {/* Search Bar */}
              <form
                onSubmit={handleSearch}
                style={{ display: "flex", gap: "0.5rem" }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    className="input-glass"
                    placeholder={
                      selectedDate
                        ? "Filter messages or search all dates..."
                        : "Type a search term and press Enter..."
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // Clear search mode when typing during date view
                      if (!e.target.value && searchMode) {
                        setSearchMode(false);
                        setSearchResults([]);
                      }
                      // In date view, client-side filtering happens reactively
                      if (selectedDate && e.target.value && searchMode) {
                        setSearchMode(false);
                        setSearchResults([]);
                      }
                    }}
                    style={{ paddingLeft: "2rem", fontSize: "0.8125rem" }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchMode(false);
                        setSearchResults([]);
                      }}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={searching || !searchQuery.trim()}
                  style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
                >
                  {searching ? "..." : "Search"}
                </button>
              </form>

              {searchMode && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.375rem",
                  }}
                >
                  Showing {searchResults.length} results for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <Hash
                size={48}
                style={{ marginBottom: "0.75rem", opacity: 0.3 }}
              />
              <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                Slack Message Viewer
              </div>
              <div style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                Select a channel to view messages
              </div>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading...
            </div>
          ) : !selectedChannel ? (
            <div
              style={{
                padding: "4rem 2rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <div
                className="glass-panel"
                style={{ padding: "3rem", display: "inline-block", textAlign: "left" }}
              >
                <h3 style={{ marginTop: 0 }}>Slack Archive Viewer</h3>
                <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
                  Explore the Rowboat Creative Slack workspace
                  (Mar 2020 – Mar 2024)
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                    <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                      Blue
                    </span>{" "}
                    = Joseph Zangrilli
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                    <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>
                      Red
                    </span>{" "}
                    = Lucas Guariglia
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                    <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
                      Purple
                    </span>{" "}
                    = Suzanne
                  </div>
                </div>
              </div>
            </div>
          ) : !selectedDate ? (
            /* Date picker */
            <div style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "1rem" }}>
                <Calendar size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                Select a date
              </h3>
              {dates.length === 0 ? (
                <div style={{ color: "var(--text-muted)" }}>
                  No messages found in this channel.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  {dates.map((d) => {
                    const isActive = selectedDate === d;
                    return (
                      <div
                        key={d}
                        onClick={() => selectDate(d)}
                        className="glass-panel glass-panel-hover"
                        style={{
                          padding: "0.625rem",
                          textAlign: "center",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          borderColor: isActive
                            ? "var(--border-glass-active)"
                            : "var(--border-glass)",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderRadius: "0.5rem",
                          background: isActive
                            ? "var(--bg-glass-hover)"
                            : "var(--bg-glass)",
                        }}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Messages view */
            <div style={{ padding: "1rem" }}>
              {displayMessages.length === 0 ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  No messages for {selectedDate}
                  {searchQuery && " matching your search"}
                </div>
              ) : (
                displayMessages.map((msg, i) => {
                  const color = getUserColor(msg.user);
                  const realName =
                    msg.user_profile?.real_name ||
                    msg.user_profile?.display_name ||
                    msg.user ||
                    "Unknown";
                  const avatar = msg.user_profile?.image_72 || "";
                  const isBot = msg.is_bot;

                  // Show date header when in search mode and date changes
                  const showDateHeader =
                    searchMode &&
                    msg.date &&
                    (i === 0 ||
                      displayMessages[i - 1]?.date !== msg.date);

                  return (
                    <div key={`${msg.ts}-${i}`}>
                      {showDateHeader && msg.date && (
                        <div
                          style={{
                            textAlign: "center",
                            margin: "1.5rem 0 1rem",
                            padding: "0.25rem 0.75rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              background: "var(--bg-glass)",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "1rem",
                              border: "1px solid var(--border-glass)",
                            }}
                          >
                            {msg.date}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.625rem",
                          padding: "0.375rem 0.5rem",
                          borderRadius: "0.375rem",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "var(--bg-glass)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "transparent";
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "0.375rem",
                            minWidth: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isBot
                              ? "var(--bg-glass)"
                              : "transparent",
                            border: isBot
                              ? "1px solid var(--border-glass)"
                              : "none",
                            overflow: "hidden",
                          }}
                        >
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "0.375rem",
                              }}
                            />
                          ) : isBot ? (
                            <Bot size={18} color="var(--text-muted)" />
                          ) : (
                            <User size={16} color={color} />
                          )}
                        </div>

                        {/* Message content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "0.5rem",
                              marginBottom: "0.125rem",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                color,
                              }}
                            >
                              {realName}
                            </span>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              {formatTsShort(msg.ts)}
                            </span>
                            {isBot && (
                              <span
                                className="badge"
                                style={{
                                  fontSize: "0.55rem",
                                  opacity: 0.6,
                                }}
                              >
                                BOT
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              lineHeight: 1.55,
                              color: "var(--text-primary)",
                              wordBreak: "break-word",
                            }}
                          >
                            {renderText(
                              msg.text || (msg.subtype ? `[${msg.subtype}]` : "")
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
