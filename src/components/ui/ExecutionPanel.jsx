import { useState, useEffect, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Tokens (khớp với giao diện SamtoolsBedcov hiện tại)                */
/* ------------------------------------------------------------------ */
const C = {
    border: "#E2E8F0",
    surface: "#ffffff",
    subtle: "#F1F5F9",
    text: "#1f1f1f",
    muted: "#64748B",
    line: "#D9DDE3",
    accent: "#FF7F50",
    blue: "#3b6db4",
    blueBg: "#E6EEF9",
    green: "#2A7C13",
    greenBg: "#E4F3DE",
    greenDot: "#76C457",
    red: "#c00",
    redBg: "#fdecec",
};

const fmtClock = (s) => { // Chuyển thời gian tính bằng giây thành định dạng MM:SS.
    const t = Math.floor(s);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ */
/*  UI nhỏ                                                             */
/* ------------------------------------------------------------------ */
const BADGE = {
    running:   { label: "Running",   color: C.blue,  bg: C.blueBg },
    completed: { label: "Completed", color: C.green, bg: C.greenBg },
    success:   { label: "Success",   color: C.green, bg: C.greenBg },
    failed:    { label: "Failed",    color: C.red,   bg: C.redBg },
};

const Badge = ({ kind }) => {
    const b = BADGE[kind];
    if (!b) return null;
    return (
        <span
            style={{
                fontSize: "12px",
                fontWeight: 600,
                color: b.color,
                background: b.bg,
                borderRadius: "10px",
                padding: "3px 10px",
                whiteSpace: "nowrap",
            }}
        >
            {b.label}
        </span>
    );
};

const StageIcon = ({ status }) => {
    const base = { width: "22px", height: "22px", flexShrink: 0, boxSizing: "border-box" };
    if (status === "completed")
        return (
            <span style={{ ...base, borderRadius: "50%", background: C.greenDot, display: "grid", placeItems: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
        );
    if (status === "failed")
        return (
            <span style={{ ...base, borderRadius: "50%", background: C.red, display: "grid", placeItems: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </span>
        );
    if (status === "running")
        return (
            <span
                style={{
                    ...base,
                    borderRadius: "50%",
                    border: `2.5px solid ${C.accent}`,
                    borderRightColor: "transparent",
                    animation: "exec-spin 0.8s linear infinite",
                }}
            />
        );
    return <span style={{ ...base, borderRadius: "50%", background: C.line }} />;
};

const DetailList = ({ details }) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
        {details.map((d, i) => {
            const last = i === details.length - 1;
            const dot =
                d.status === "completed" ? C.greenDot :
                d.status === "running"   ? C.accent :
                d.status === "failed"    ? C.red : C.line;
            const time =
                d.status === "running"
                    ? fmtClock((Date.now() - d.startedAt) / 1000)   // realtime M:S
                    : d.duration != null ? `${d.duration.toFixed(1)}s` : null;

            return (
                <div key={i} style={{ display: "flex", gap: "10px" , alignItems: "center", flexDirection: "row", paddingBottom: last ? 0 : "8px"}}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "8px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, marginTop: "0px", flexShrink: 0 }} />
                        {!last && <span style={{ flex: 1, width: "1px", background: C.line, margin: "2px 0" }} />}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", fontSize: "12px" }}>
                        <span style={{ color: d.status === "failed" ? C.red : C.muted, wordBreak: "break-word" }}>
                            {d.text}
                        </span>
                        {time && (
                            <span style={{ color: d.status === "running" ? C.blue : "#94A3B8", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                {time}
                            </span>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
);

const Chevron = ({ open }) => (
    <svg
        width="18" height="18" viewBox="0 0 24 24" fill="#555"
        style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
    >
        <path d="M12,15.38l-6-6l1.4-1.4L12,12.55l4.6-4.58L18,9.38l-6,6Z" />
    </svg>
);

const linkBtn = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "13px",
    color: "#555",
    padding: "4px 6px",
    borderRadius: "5px",
};

const MAX_LOG_LINES = 100;

// Lấy tối đa `max` dòng đầu, đồng thời đếm tổng số dòng.
// Dùng indexOf duyệt từng ký tự xuống dòng thay vì split("\n")
// để không tạo ra mảng khổng lồ khi log có hàng trăm nghìn dòng.
const truncateLines = (text, max) => {
    if (!text) return { preview: "", total: 0, truncated: false };

    let pos = -1;
    let count = 0;   // số ký tự "\n"
    let cut = -1;    // vị trí "\n" thứ `max`

    while ((pos = text.indexOf("\n", pos + 1)) !== -1) {
        count++;
        if (count === max) cut = pos;
    }

    const total = text.endsWith("\n") ? count : count + 1;
    if (total <= max) return { preview: text, total, truncated: false };

    return { preview: text.slice(0, cut), total, truncated: true };
};
/* ------------------------------------------------------------------ */
/*  Log viewer: Stdout | Stderr | Command                              */
/* ------------------------------------------------------------------ */
const LogViewer = ({ logs, defaultTab = "stdout", toolName = "tool" }) => {
    const [tab, setTab] = useState(defaultTab);
    const [copied, setCopied] = useState(false);

    useEffect(() => setTab(defaultTab), [defaultTab]);

    const content = logs[tab] || "";
    const { preview, total, truncated } = useMemo(
        () => truncateLines(content, MAX_LOG_LINES),
        [content]
    );
    const empty = tab === "stderr" ? "(no errors)" : "(empty)";

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch { /* ignore */ }
    };

    const download = () => {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${toolName.toLowerCase().replace(/\s+/g, "-")}-${tab}.log`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
                role="tablist"
                style={{ display: "flex", background: C.subtle, borderRadius: "5px", padding: "3px", gap: "3px" }}
            >
                {[["stdout", "Stdout"], ["stderr", "Stderr"], ["command", "Command"]].map(([k, label]) => (
                    <button
                        key={k}
                        role="tab"
                        aria-selected={tab === k}
                        onClick={() => setTab(k)}
                        style={{
                            flex: 1,
                            height: "30px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: 600,
                            color: tab === k ? "#fff" : "#555",
                            background: tab === k ? C.blue : "transparent",
                            transition: "background 0.15s ease",
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <pre
                style={{
                    margin: 0,
                    padding: "12px 14px",
                    background: C.subtle,
                    border: `1px solid ${C.border}`,
                    borderRadius: "5px",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color: content ? C.text : "#999",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: "240px",
                    overflow: "auto",
                }}
            >
                {preview || empty}
            </pre>
            {truncated && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        padding: "8px 12px",
                        borderRadius: "5px",
                        background: C.blueBg,
                        fontSize: "12px",
                        color: C.muted,
                    }}
                >
                    <span>
                        Showing the first {MAX_LOG_LINES} of {total.toLocaleString()} lines.
                        Download the full log to see the rest.
                    </span>
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button onClick={copy} style={linkBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
                    {copied ? "Copied" : "Copy log"}
                </button>
                <button onClick={download} style={linkBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" /></svg>
                    Download log
                </button>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */
export default function ExecutionPanel({ exec, toolName = "Tool" }) {
    const { stages, status, elapsed, logs } = exec;
    const [showSteps, setShowSteps] = useState(true);
    const [showLogs, setShowLogs] = useState(false);

    // Tự đổi chế độ hiển thị theo trạng thái
    useEffect(() => {
        if (status === "running") { setShowSteps(true); setShowLogs(false); }
        if (status === "success") { setShowSteps(false); setShowLogs(false); }
        if (status === "failed")  { setShowSteps(true); setShowLogs(true); }
    }, [status]);

    if (status === "idle") return null;

    const card = {
        width: "100%",
        boxSizing: "border-box",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: "5px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
    };

    const keyframes = <style>{`
        @keyframes exec-spin{
            to{
                transform:rotate(360deg)
            }
        }
        @media (prefers-reduced-motion: reduce){
            [style*="exec-spin"]{
                animation:none!important
            }
        }
    `}</style>;

    /* ---------- Thành công + đang thu gọn: thanh tóm tắt ---------- */
    if (status === "success" && !showSteps) {
        return (
            <div style={{ ...card, padding: "14px 20px", gap: "6px" }}>
                {keyframes}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <StageIcon status="completed" />
                        <span style={{ fontSize: "16px", fontWeight: 600 }}>Execution completed</span>
                    </div>
                    <Badge kind="success" />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: C.muted }}>
                    <span>{stages.length} stages · {elapsed.toFixed(1)} seconds</span>
                    <button onClick={() => { setShowSteps(true); setShowLogs(true); }} style={linkBtn}>
                        View details <Chevron open={false} />
                    </button>
                </div>
            </div>
        );
    }

    /* ---------- Chi tiết đầy đủ (running / failed / success mở rộng) ---------- */
    const headerBadge = status === "running" ? "running" : status === "failed" ? "failed" : "success";

    return (
        <div style={card}>
            {keyframes}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "16px", fontWeight: 600 }}>
                    {status === "success" ? "Execution completed" : status === "failed" ? "Execution failed" : "Execution"}
                </span>
                <Badge kind={headerBadge} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: C.muted }}>
                <span>{toolName}</span>
                <span>
                    {status === "running" ? `Elapsed: ${fmtClock(elapsed)}` : `${elapsed.toFixed(1)} seconds`}
                </span>
            </div>

            <div style={{ height: "1px", background: C.border }} />

            {/* Timeline */}
            <div style={{ display: "flex", flexDirection: "column" }}>
                {stages.map((s, i) => {
                    const last = i === stages.length - 1;
                    return (
                        <div key={s.id} style={{ display: "flex", gap: "14px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <StageIcon status={s.status} />
                                {!last && <div style={{ flex: 1, width: "2px", background: C.border, margin: "4px 0" }} />}
                            </div>
                            <div style={{ paddingBottom: last ? 0 : "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                <span style={{ fontSize: "15px", fontWeight: 600, color: s.status === "waiting" ? "#999" : C.text }}>
                                    {s.title}
                                </span>
                                {s.status !== "waiting" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Badge kind={s.status} />
                                        {s.duration != null && (
                                            <span style={{ fontSize: "12px", color: C.muted }}>{s.duration.toFixed(1)}s</span>
                                        )}
                                    </div>
                                )}
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: s.status === "failed" ? C.red : s.status === "completed" ? C.green : C.muted,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {s.summary}
                                </span>

                                {(s.details?.length ?? 0) > 0 && <DetailList details={s.details} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ height: "1px", background: C.border }} />

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#555" }}>
                <span>Execution details</span>
                <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => setShowLogs((v) => !v)} style={linkBtn}>
                        {showLogs ? "Hide logs" : "View logs"} <Chevron open={showLogs} />
                    </button>
                    {status === "success" && (
                        <button onClick={() => { setShowSteps(false); setShowLogs(false); }} style={linkBtn}>
                            Collapse
                        </button>
                    )}
                </div>
            </div>

            {showLogs && <LogViewer logs={logs} toolName={toolName} defaultTab={status === "failed" ? "stderr" : "stdout"} />}
        </div>
    );
}
