import { useRef, useState, useEffect, useMemo } from "react";
import useSamtools from '../../../hooks/useSamtools.js'
import { useNavigate} from 'react-router';
import Chart from "chart.js/auto";
import HelpTip from '../../../components/ui/HelpTip.jsx'
import Divider from '../../../components/ui/Divider.jsx';
import ExecutionPanel from '../../../components/ui/ExecutionPanel.jsx';
import useExecution from '../../../hooks/useExecution'

const EmptyState = ({style, icon, title, description }) => (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minHeight: "300px",
            border: "1px dashed #d0d0d0",
            borderRadius: "6px",
            background: "#fafafa",
            color: "#888",
            textAlign: "center",
            padding: "20px",
            width: "100%",
            boxSizing: "border-box",
            ...style

        }}
    >
        <div style={{ fontSize: "32px", lineHeight: 1 }}>{icon}</div>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#666" }}>{title}</p>
        <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>{description}</p>
    </div>
);


const inputBoxStyle = ({ opacity = 1 , backgroundcolor = "#F1F5F9"} = {}) => ({
    display: "flex",
    alignItems: "center",
    boxSizing: 'border-box',
    backgroundColor: `${backgroundcolor}`,
    borderRadius: "5px",
    padding: "10px 20px",
    fontSize: "13px",
    width: "605px",
    height: "35px",
    opacity: `${opacity}`
})

const uploadFileBtn = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="20px" width="20px" fill="#555"><path d="M11,16V7.85l-2.6,2.6L7,9l5-5l5,5l-1.4,1.45L13,7.85V16H11ZM6,20q-0.82,0-1.41-0.59T4,18V15H6v3H18V15h2v3q0,0.82-0.59,1.41T18,20H6Z"/></svg>
)

const changeFileBtn = () => (
    <svg style={{ display: "block", marginLeft: "2px" }} width="17" height="16.5" viewBox="0 0 22 21" fill="#555" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.6882 5.9238C17.0632 6.29887 17.274 6.80758 17.274 7.33801V8.72C17.274 8.99614 17.0501 9.22 16.774 9.22H15.84C15.5639 9.22 15.34 8.99614 15.34 8.72V7.85517C15.34 7.30288 14.8923 6.85517 14.34 6.85517H10.414V2.93C10.414 2.37771 9.96629 1.93 9.41401 1.93H2.93C2.37771 1.93 1.93 2.37772 1.93 2.93V16.59C1.93 17.1423 2.37772 17.59 2.93 17.59H6.26286C6.539 17.59 6.76286 17.8139 6.76286 18.09V19.0288C6.76286 19.3049 6.539 19.5288 6.26286 19.5288H2.16986C1.57677 19.5288 1.06668 19.3156 0.639939 18.8888C0.2132 18.4621 0 17.952 0 17.3589V2.16986C0 1.56953 0.213201 1.05945 0.639939 0.63994C1.06668 0.220433 1.57677 0.00723287 2.16986 0H9.93595C10.4664 0 10.9751 0.210714 11.3502 0.585787L14.0192 3.25479L16.6882 5.9238Z" fill="#555"/>
        <path d="M16.6974 12.603C16.526 12.7768 16.2627 12.8145 16.0354 12.7255C15.8976 12.6715 15.7562 12.6255 15.6114 12.588C15.3333 12.5159 15.0582 12.4794 14.7865 12.4793C14.3587 12.4859 13.9339 12.5765 13.5126 12.7475C13.0913 12.9184 12.7177 13.1677 12.3937 13.4964C12.0503 13.8447 11.7968 14.2369 11.6348 14.6706C11.4731 15.1041 11.4034 15.5515 11.4229 16.0112L11.9528 15.4726C12.2378 15.1829 12.7048 15.1826 12.9901 15.472C13.2688 15.7547 13.2696 16.2085 12.992 16.4922L11.0994 18.4262C10.9031 18.6268 10.5801 18.6265 10.3841 18.4256L8.49909 16.4929C8.22187 16.2087 8.22309 15.7549 8.50183 15.4722C8.78732 15.1826 9.25452 15.1826 9.54 15.4722L9.94387 15.8818C9.95044 15.2706 10.0733 14.6654 10.313 14.0673C10.5528 13.4694 10.9063 12.934 11.3727 12.4608C11.8394 11.9875 12.3742 11.6243 12.9771 11.3745C13.5797 11.1247 14.1892 11.0001 14.8047 11C15.2714 11 15.732 11.0673 16.1857 11.1988C16.2888 11.2286 16.3907 11.2622 16.4915 11.2994C17.0353 11.5002 17.1044 12.1901 16.6974 12.603Z" fill="#555"/>
        <path d="M21.1071 16.3937C20.8222 16.6826 20.3568 16.6852 20.0688 16.3994L19.6474 15.9812C19.6474 16.6058 19.532 17.2182 19.2987 17.8165C19.0783 18.421 18.7301 18.959 18.2572 19.4322C17.7907 19.912 17.2528 20.2703 16.6438 20.507C16.0345 20.7437 15.4205 20.863 14.8047 20.863C14.3318 20.8629 13.8707 20.8006 13.4237 20.6758C13.3208 20.6459 13.219 20.6121 13.1184 20.5744C12.5727 20.3699 12.5097 19.6745 12.921 19.2617C13.0941 19.0881 13.3584 19.0509 13.5869 19.1396C13.7235 19.1926 13.8636 19.2378 14.0071 19.275C14.2857 19.3473 14.5622 19.3836 14.8343 19.3837C15.2557 19.3837 15.6778 19.298 16.0991 19.1271C16.52 18.9563 16.892 18.7064 17.2158 18.3782C17.5398 18.0495 17.7879 17.6549 17.9564 17.1947C18.125 16.7345 18.2094 16.2804 18.2094 15.8333L17.6577 16.3917C17.3724 16.6804 16.9058 16.6788 16.6224 16.3882C16.3478 16.1065 16.3479 15.6572 16.6226 15.3755L18.5123 13.438C18.7085 13.2369 19.032 13.2369 19.2282 13.438L21.1099 15.3672C21.3886 15.653 21.3874 16.1094 21.1071 16.3937Z" fill="#555"/>
        <path d="M15.6114 12.588C15.7562 12.6255 15.8976 12.6715 16.0354 12.7255C16.2627 12.8145 16.526 12.7768 16.6974 12.603C17.1044 12.1901 17.0353 11.5002 16.4915 11.2994C16.3907 11.2622 16.2888 11.2286 16.1857 11.1988C15.732 11.0673 15.2714 11 14.8047 11C14.1892 11.0001 13.5797 11.1247 12.9771 11.3745C12.3742 11.6243 11.8394 11.9875 11.3727 12.4608C10.9063 12.934 10.5528 13.4694 10.313 14.0673C10.0733 14.6654 9.95044 15.2706 9.94387 15.8818L9.54 15.4722C9.25452 15.1826 8.78732 15.1826 8.50183 15.4722C8.22309 15.7549 8.22187 16.2087 8.49909 16.4929L10.3841 18.4256C10.5801 18.6265 10.9031 18.6268 11.0994 18.4262L12.992 16.4922C13.2696 16.2085 13.2688 15.7547 12.9901 15.472C12.7048 15.1826 12.2378 15.1829 11.9528 15.4726L11.4229 16.0112C11.4034 15.5515 11.4731 15.1041 11.6348 14.6706C11.7968 14.2369 12.0503 13.8447 12.3937 13.4964C12.7177 13.1677 13.0913 12.9184 13.5126 12.7475C13.9339 12.5765 14.3587 12.4859 14.7865 12.4793C15.0582 12.4794 15.3333 12.5159 15.6114 12.588ZM19.6474 15.9812L20.0688 16.3994C20.3568 16.6852 20.8222 16.6826 21.1071 16.3937C21.3874 16.1094 21.3886 15.653 21.1099 15.3672L19.2282 13.438C19.032 13.2369 18.7085 13.2369 18.5123 13.438L16.6226 15.3755C16.3479 15.6572 16.3478 16.1065 16.6224 16.3882C16.9058 16.6788 17.3724 16.6804 17.6577 16.3917L18.2094 15.8333C18.2094 16.2804 18.125 16.7345 17.9564 17.1947C17.7879 17.6549 17.5398 18.0495 17.2158 18.3782C16.892 18.7064 16.52 18.9563 16.0991 19.1271C15.6778 19.298 15.2557 19.3837 14.8343 19.3837C14.5622 19.3836 14.2857 19.3473 14.0071 19.275C13.8636 19.2378 13.7235 19.1926 13.5869 19.1396C13.3584 19.0509 13.0941 19.0881 12.921 19.2617C12.5097 19.6745 12.5727 20.3699 13.1184 20.5744C13.219 20.6121 13.3208 20.6459 13.4237 20.6758C13.8707 20.8006 14.3318 20.8629 14.8047 20.863C15.4205 20.863 16.0345 20.7437 16.6438 20.507C17.2528 20.2703 17.7907 19.912 18.2572 19.4322C18.7301 18.959 19.0783 18.421 19.2987 17.8165C19.532 17.2182 19.6474 16.6058 19.6474 15.9812Z" stroke-width="0.25" stroke="#555"/>
    </svg>
)

/* ================================================================== */
/*  KẾT QUẢ BEDCOV: tab Table | Visual                                */
/* ================================================================== */
const BC = {
    border: "#E2E8F0",
    subtle: "#F1F5F9",
    muted: "#64748B",
    blue: "#3b6db4",
    head: "#DAECF8",
    accent: "#FF7F50",
};

// Parse stdout: mỗi dòng = <các cột BED...> <sum depth> [read count] [bases >= d]
function parseBedcov(stdout, { readCount = false, depthThreshold = false } = {}) {
    const regions = [];
    const extras = (readCount ? 1 : 0) + (depthThreshold ? 1 : 0);

    for (const line of stdout.split("\n")) {
        if (!line || line.startsWith("#")) continue; // bỏ dòng header của -H

        const f = line.split("\t");
        const sumIdx = f.length - 1 - extras;
        if (sumIdx < 3) continue;

        const start = Number(f[1]);
        const end = Number(f[2]);
        const sum = Number(f[sumIdx]);
        if (![start, end, sum].every(Number.isFinite)) continue;

        const len = Math.max(1, end - start);
        regions.push({
            chrom: f[0],
            start,
            end,
            len,
            sum,
            mean: sum / len,
            annotation: sumIdx > 3 ? f.slice(3, sumIdx).join(" ") : "",
            reads: readCount ? Number(f[sumIdx + 1]) : null,
            covered: depthThreshold ? Number(f[sumIdx + 1 + (readCount ? 1 : 0)]) : null,
        });
    }
    return { regions, hasReads: readCount, hasThreshold: depthThreshold };
}

const fmtNum = (n, d = 1) =>
    Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "–";

const fmtPos = (p) =>
    p >= 1e6 ? `${(p / 1e6).toFixed(1)} Mb` : p >= 1e3 ? `${(p / 1e3).toFixed(0)} kb` : `${Math.round(p)}`;

const chromKey = (c) => {
    const s = c.replace(/^chr/i, "");
    if (/^\d+$/.test(s)) return [0, Number(s), ""];
    const order = { X: 1, Y: 2, M: 3, MT: 3 };
    if (s.toUpperCase() in order) return [1, order[s.toUpperCase()], ""];
    return [2, 0, s];
};
const chromCmp = (a, b) => {
    const A = chromKey(a), B = chromKey(b);
    return A[0] - B[0] || A[1] - B[1] || A[2].localeCompare(B[2]);
};

const HIST_BINS = 30;
const TRACK_COLS = 400;

function summarizeRegions(regions) {
    let totalLen = 0, totalSum = 0, zero = 0, reads = 0;
    const byChrom = new Map();

    for (const r of regions) {
        totalLen += r.len;
        totalSum += r.sum;
        if (r.sum === 0) zero++;
        if (r.reads != null) reads += r.reads;

        const c = byChrom.get(r.chrom) ?? { chrom: r.chrom, len: 0, sum: 0, n: 0 };
        c.len += r.len; c.sum += r.sum; c.n++;
        byChrom.set(r.chrom, c);
    }

    const chroms = [...byChrom.values()]
        .map((c) => ({ ...c, mean: c.sum / c.len }))
        .sort((a, b) => chromCmp(a.chrom, b.chrom));
    const busiest = chroms.reduce((best, c) => (c.n > best.n ? c : best), chroms[0]).chrom;

    const means = regions.map((r) => r.mean).sort((a, b) => a - b);
    const median = means[Math.floor(means.length / 2)];
    const p99 = means[Math.min(means.length - 1, Math.floor(means.length * 0.99))];
    const top = means[means.length - 1];
    const hMax = p99 > 0 ? p99 : top > 0 ? top : 1;
    const binW = hMax / HIST_BINS;
    const counts = new Array(HIST_BINS).fill(0);
    for (const m of means) counts[Math.min(HIST_BINS - 1, Math.floor(m / binW))]++;

    return {
        n: regions.length,
        totalLen,
        meanDepth: totalSum / totalLen,
        median,
        zero,
        reads,
        chroms,
        busiest,
        hist: { counts, hMax, binW, clipped: top > hMax },
        topRegions: regions.slice().sort((a, b) => b.mean - a.mean).slice(0, 10),
    };
}

function buildTrack(regions, chrom) {
    const rs = regions.filter((r) => r.chrom === chrom);
    if (!rs.length) return null;

    let min = Infinity, max = 0;
    for (const r of rs) {
        if (r.start < min) min = r.start;
        if (r.end > max) max = r.end;
    }
    const span = Math.max(1, max - min);
    const cols = new Array(TRACK_COLS).fill(0);

    for (const r of rs) {
        const c0 = Math.min(TRACK_COLS - 1, Math.floor(((r.start - min) / span) * TRACK_COLS));
        const c1 = Math.min(TRACK_COLS - 1, Math.max(c0, Math.floor(((r.end - 1 - min) / span) * TRACK_COLS)));
        for (let c = c0; c <= c1; c++) if (r.mean > cols[c]) cols[c] = r.mean;
    }
    return { min, span, cols, n: rs.length };
}

// Option dùng chung cho mọi biểu đồ
const chartOptions = ({ tooltip, xTicks = {}, intY = false } = {}) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: tooltip } },
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: BC.muted, font: { size: 10 }, maxRotation: 0, autoSkip: true, ...xTicks },
        },
        y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: BC.border },
            ticks: { color: BC.muted, font: { size: 10 }, ...(intY && { precision: 0 }) },
        },
    },
});

const ChartPanel = ({ title, hint, right, children }) => (
    <div style={{ border: `1px solid ${BC.border}`, borderRadius: "5px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px", boxSizing: "border-box", background: "#fff", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "15px", fontWeight: 600 }}>{title}</span>
                {hint && <span style={{ fontSize: "12px", color: BC.muted }}>{hint}</span>}
            </div>
            {right}
        </div>
        {children}
    </div>
);

// Canvas bọc Chart.js: tạo một lần, cập nhật khi data/options đổi, hủy khi unmount
const ChartCanvas = ({ type, data, options, height = 190 }) => {
    const canvas = useRef(null);
    const chart = useRef(null);

    useEffect(() => {
        chart.current = new Chart(canvas.current, { type, data, options });
        return () => chart.current.destroy();
    }, [type]);

    useEffect(() => {
        chart.current.data = data;
        chart.current.options = options;
        chart.current.update();
    }, [data, options]);

    return (
        <div style={{ position: "relative", height }}>
            <canvas ref={canvas} />
        </div>
    );
};

const StatCard = ({ label, value, sub }) => (
    <div style={{ border: `1px solid ${BC.border}`, borderRadius: "5px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "2px", background: "#fff" }}>
        <span style={{ fontSize: "12px", color: BC.muted }}>{label}</span>
        <span style={{ fontSize: "22px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {sub && <span style={{ fontSize: "12px", color: BC.muted }}>{sub}</span>}
    </div>
);

const bcSelectStyle = { padding: "4px 8px", fontSize: "14px", border: "solid 1px #cfcfcf" };

const BedcovVisual = ({ regions, hasReads }) => {
    const s = useMemo(() => summarizeRegions(regions), [regions]);
    const [chrom, setChrom] = useState(null);
    const selected = chrom && s.chroms.some((c) => c.chrom === chrom) ? chrom : s.busiest;
    const track = useMemo(() => buildTrack(regions, selected), [regions, selected]);

    const maxTop = s.topRegions[0]?.mean || 1;
    const { counts, hMax, binW, clipped } = s.hist;

    // --- Mean depth by chromosome ---
    const chromData = {
        labels: s.chroms.map((c) => c.chrom.replace(/^chr/i, "")),
        datasets: [{
            data: s.chroms.map((c) => c.mean),
            backgroundColor: BC.blue,
            hoverBackgroundColor: BC.blue + "b3",
            borderRadius: 2,
            maxBarThickness: 28,
        }],
    };
    const chromOpts = chartOptions({
        xTicks: { autoSkip: false },
        tooltip: {
            title: (it) => s.chroms[it[0].dataIndex].chrom,
            label: (it) => {
                const c = s.chroms[it.dataIndex];
                return `${fmtNum(c.mean, 2)}x · ${c.n.toLocaleString()} regions`;
            },
        },
    });

    // --- Depth histogram ---
    const histData = {
        labels: counts.map((_, i) => fmtNum(i * binW, 1)),
        datasets: [{
            data: counts,
            backgroundColor: counts.map((_, i) => (clipped && i === HIST_BINS - 1 ? BC.accent : BC.blue)),
            categoryPercentage: 1,
            barPercentage: 0.95,
        }],
    };
    const histOpts = chartOptions({
        intY: true,
        xTicks: { maxTicksLimit: 6 },
        tooltip: {
            title: (it) => {
                const i = it[0].dataIndex;
                return clipped && i === HIST_BINS - 1
                    ? `${fmtNum(i * binW, 1)}+x`
                    : `${fmtNum(i * binW, 1)}–${fmtNum((i + 1) * binW, 1)}x`;
            },
            label: (it) => `${it.parsed.y.toLocaleString()} regions`,
        },
    });

    // --- Depth along chromosome ---
    const trackData = track && {
        labels: track.cols.map((_, i) => fmtPos(track.min + (track.span * i) / TRACK_COLS)),
        datasets: [{
            data: track.cols,
            stepped: true,
            fill: true,
            borderColor: BC.blue,
            backgroundColor: BC.blue + "cc",
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 3,
        }],
    };
    const trackOpts = chartOptions({
        xTicks: { maxTicksLimit: 5 },
        tooltip: { label: (it) => `${fmtNum(it.parsed.y, 2)}x` },
    });
    trackOpts.interaction = { mode: "index", intersect: false };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                <StatCard label="Regions" value={s.n.toLocaleString()} />
                <StatCard label="Total region length" value={`${fmtNum(s.totalLen, 0)} bp`} />
                <StatCard label="Mean depth" value={`${fmtNum(s.meanDepth, 2)}x`} sub="weighted by region length" />
                <StatCard label="Median region depth" value={`${fmtNum(s.median, 2)}x`} />
                <StatCard label="Zero-coverage regions" value={s.zero.toLocaleString()} sub={`${fmtNum((s.zero / s.n) * 100, 1)}% of regions`} />
                {hasReads && <StatCard label="Total reads" value={s.reads.toLocaleString()} />}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "14px" }}>
                <ChartPanel title="Mean depth by chromosome" hint="Sum of depth / total region length">
                    <ChartCanvas type="bar" data={chromData} options={chromOpts} />
                </ChartPanel>

                <ChartPanel title="Depth distribution" hint="Number of regions per mean-depth bin">
                    <ChartCanvas type="bar" data={histData} options={histOpts} />
                </ChartPanel>
            </div>

            <ChartPanel
                title="Depth along chromosome"
                hint={track ? `${track.n.toLocaleString()} regions · highest depth per position bin` : undefined}
                right={
                    <select value={selected} onChange={(e) => setChrom(e.target.value)} style={bcSelectStyle}>
                        {s.chroms.map((c) => <option key={c.chrom} value={c.chrom}>{c.chrom}</option>)}
                    </select>
                }
            >
                {track && <ChartCanvas type="line" height={180} data={trackData} options={trackOpts} />}
            </ChartPanel>

            <ChartPanel title="Top 10 regions by mean depth">
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {s.topRegions.map((r, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 280px) 1fr 80px", alignItems: "center", gap: "12px", fontSize: "12px" }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{r.chrom}:{r.start.toLocaleString()}-{r.end.toLocaleString()}</div>
                                {r.annotation && (
                                    <div title={r.annotation} style={{ color: BC.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {r.annotation}
                                    </div>
                                )}
                            </div>
                            <div style={{ height: "8px", background: BC.subtle, borderRadius: "4px" }}>
                                <div style={{ width: `${(r.mean / maxTop) * 100}%`, height: "100%", background: BC.blue, borderRadius: "4px" }} />
                            </div>
                            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(r.mean, 1)}x</div>
                        </div>
                    ))}
                </div>
            </ChartPanel>
        </div>
    );
};

const tdCell = { padding: "6px 12px" };
const tdNum = { ...tdCell, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

function BedcovResult({ result, renderPaginationBar }) {
    const { regions, hasReads, hasThreshold } = result;
    const [tab, setTab] = useState("table");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalPages = Math.max(1, Math.ceil(regions.length / pageSize));
    const pageRows = useMemo(
        () => regions.slice((page - 1) * pageSize, page * pageSize),
        [regions, page, pageSize]
    );
    const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));
    const colCount = 7 + (hasReads ? 1 : 0) + (hasThreshold ? 1 : 0);

    if (regions.length === 0) {
        return <div style={{ color: BC.muted, fontSize: "14px" }}>No regions found in the output.</div>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div role="tablist" style={{ display: "inline-flex", background: BC.subtle, borderRadius: "5px", padding: "3px", gap: "3px" }}>
                    {[["table", "Table"], ["visual", "Visual"]].map(([k, label]) => (
                        <button
                            key={k}
                            role="tab"
                            aria-selected={tab === k}
                            onClick={() => setTab(k)}
                            style={{
                                height: "30px", padding: "0 18px", border: "none", borderRadius: "4px",
                                cursor: "pointer", fontSize: "13px", fontWeight: 600,
                                color: tab === k ? "#fff" : "#555",
                                background: tab === k ? BC.blue : "transparent",
                                transition: "background 0.15s ease",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ color: "#555", fontSize: "14px" }}>{regions.length.toLocaleString()} regions</span>
                    {tab === "table" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <label style={{ fontSize: "14px", color: "#555" }}>Rows per page:</label>
                            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={bcSelectStyle}>
                                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {tab === "visual" ? (
                <BedcovVisual regions={regions} hasReads={hasReads} />
            ) : (
                <>
                    <div className="table" style={{ overflowX: "auto" }}>
                        <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "max-content", minWidth: "100%" }}>
                            <thead>
                                <tr style={{ background: BC.head, textAlign: "left" }}>
                                    <th style={tdCell}>Reference</th>
                                    <th style={tdCell}>Start (0-based)</th>
                                    <th style={tdCell}>End</th>
                                    <th style={tdCell}>Length</th>
                                    <th style={tdCell}>Mean depth</th>
                                    <th style={tdCell}>Sum per base depth</th>
                                    {hasReads && <th style={tdCell}>Reads</th>}
                                    {hasThreshold && <th style={tdCell}>Bases ≥ threshold</th>}
                                    <th style={tdCell}>Annotation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((r, i) => (
                                    <tr key={i}>
                                        <td style={tdCell}>{r.chrom === "*" ? "* (unplaced)" : r.chrom}</td>
                                        <td style={tdNum}>{r.start.toLocaleString()}</td>
                                        <td style={tdNum}>{r.end.toLocaleString()}</td>
                                        <td style={tdNum}>{r.len.toLocaleString()}</td>
                                        <td style={tdNum}>{fmtNum(r.mean, 2)}x</td>
                                        <td style={tdNum}>{r.sum.toLocaleString()}</td>
                                        {hasReads && <td style={tdNum}>{r.reads.toLocaleString()}</td>}
                                        {hasThreshold && <td style={tdNum}>{r.covered.toLocaleString()}</td>}
                                        <td style={tdCell}>
                                            <div title={r.annotation} style={{ whiteSpace: "nowrap" }}>
                                                {r.annotation || "–"}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {/* Dòng trống để trang cuối vẫn đủ chiều cao */}
                                {Array.from({ length: Math.max(0, pageSize - pageRows.length) }).map((_, i) => (
                                    <tr key={`empty-${i}`} aria-hidden="true">
                                        {Array.from({ length: colCount }).map((__, j) => (
                                            <td key={j} style={tdCell}>{"\u00A0"}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {renderPaginationBar(page, totalPages, goToPage)}
                </>
            )}
        </div>
    );
}

export const BEDCOV_STAGES = [
    { id: "validate", title: "Input validation" },
    { id: "init",     title: "Initialize WebAssembly" },
    { id: "exec",     title: "Execute bedcov" },
    { id: "collect",  title: "Collect output" },
];

function SamtoolsBedcov () {
    const { run, loading, error } = useSamtools();
    const exec = useExecution(BEDCOV_STAGES);
    const [result, setResult] = useState(null);
    const [inputFile, setInputFile] = useState(null);
    const [bedFile, setBedFile] = useState(null);
    const [refFastaFile, setRefFastaFile] = useState(null);

    const [hasIndex, setHasIndex] = useState(false);
    const [baiFile, setBaiFile] = useState(null);
    const bedFileRef = useRef(null);
    const inputFileRef = useRef(null);
    const baiFileRef = useRef(null);
    const refFastaFileRef = useRef(null);

    const [minMapq, setMinMapq] = useState("");
    const [mapqFocused, setMapqFocused] = useState(false);

    const [maxDepth, setMaxDepth] = useState("");        // rỗng = dùng mặc định của samtools
    const [maxDepthFocused, setMaxDepthFocused] = useState(false);

    const [excludeFlags, setExcludeFlags] = useState("");   // rỗng = không truyền -G
    const [excludeFocused, setExcludeFocused] = useState(false);

    const [includeFlags, setIncludeFlags] = useState("");   // rỗng = không truyền -g
    const [includeFocused, setIncludeFocused] = useState(false);

    const [depthThreshold, setDepthThreshold] = useState(""); // rỗng = ko truyền -d
    const [depthThresholdFocused, setDepthThresholdFocused] = useState(false);

    const [inputFmtOpt, setInputFmtOpt] = useState("");
    const [inputFmtFocused, setInputFmtFocused] = useState(false);

    const [skipDelRefskip, setSkipDelRefskip] = useState(false);
    const [showReadCount, setShowReadCount] = useState(false);
    const [printHeader, setPrintHeader] = useState(true);

    const locked = loading;
    const fileBtnStyle = (style) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #a6a6a6",
        borderRadius: "5px",
        cursor: locked ? "not-allowed" : "pointer",
        opacity: locked ? 0.5 : 1,
        background: "#ffffff",
        height: "35px",
        width: "45px",
        boxSizing: "border-box",
        ...style
    });

    const [moreOptions, setMoreOptions] = useState(false);
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    const handleInputFile = (e) => {
        const selectedInputFile = e.target.files[0];

        if (selectedInputFile) {
            setInputFile(selectedInputFile);
            setResult(null);
        }
    };

    const chooseInputFile = () => { // Chạy Sau khi bấm nút, cập nhật inputRef -> inputRef thay đổi -> chạy handleFile
        if (locked) return;
        inputFileRef.current.click();
    };
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    const handleBaiFile = (e) => {
        const selectedBaiFile = e.target.files[0];

        if (selectedBaiFile) {
            setBaiFile(selectedBaiFile);
            setResult(null);
        }
    };

    const chooseBaiFile = () => { // Chạy Sau khi bấm nút, cập nhật inputRef -> inputRef thay đổi -> chạy handleFile
        if (locked) return;
        baiFileRef.current.click();
    };
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    const handleBedFile = (e) => {
        const selectedBedFile = e.target.files[0];

        if (selectedBedFile) {
            setBedFile(selectedBedFile);
            setResult(null);
        }
    };

    const chooseBedFile = () => { // Chạy Sau khi bấm nút, cập nhật inputRef -> inputRef thay đổi -> chạy handleFile
        if (locked) return;
        bedFileRef.current.click();
    };
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        const handleRefFastaFile = (e) => {
        const selectedRefFastaFile = e.target.files[0];

        if (selectedRefFastaFile) {
            setRefFastaFile(selectedRefFastaFile);
            setResult(null);
        }
    };

    const chooseRefFastaFile = () => { // Chạy Sau khi bấm nút, cập nhật inputRef -> inputRef thay đổi -> chạy handleFile
        if (locked) return;
        refFastaFileRef.current.click();
    };
    const [hover, setHover] = useState(false);
    const [down, setDown] = useState(false);
    const [validationError, setValidationError] = useState("");
    const pressed = loading;

    let shadow = "6px 6px 0 #1a3a8f";
    let move = "translate(0, 0)";
    let bg = "#3b6db4";
    let cursor = "pointer"

    if (pressed) {
        // đã click: giữ ở trạng thái hover vĩnh viễn
        shadow = "3px 3px 0 #2A7C13";
        move = "translate(3px, 3px)";
        bg = "#76C457";
        cursor = "default"
    } else if (down) {
        // đang giữ chuột: hết bóng
        shadow = "0 0 0 #1a3a8f";
        move = "translate(6px, 6px)";
    } else if (hover) {
        shadow = "3px 3px 0 #1a3a8f";
        move = "translate(3px, 3px)";
    }
    useEffect(() => { // Tự xóa lỗi khi người dùng đã chọn đủ file (để lỗi không đứng mãi):
        if (inputFile && bedFile) setValidationError("");
    }, [inputFile, bedFile]);
    const handleRun = async () => {
        // ---------- Kiểm tra input (chưa chạy execute) ----------
        const missing = [];
        if (!inputFile) missing.push("Input file");
        if (!bedFile) missing.push("Bed file");

        if (missing.length > 0) {
            setValidationError(`Please choose: ${missing.join(" and ")}`);
            return;
        }
        setValidationError("");
        setResult(null);

        const p = `/work/${inputFile.name}`;
        const idxFileName = inputFile.name.toLowerCase().endsWith(".cram")
            ? `${inputFile.name}.crai`
            : `${inputFile.name}.bai`;

        // ---------- Build options ----------
        const opts = [];
        if (minMapq !== "")        opts.push("-Q", minMapq);
        if (includeFlags !== "")   opts.push("-g", includeFlags);
        if (excludeFlags !== "")   opts.push("-G", excludeFlags);
        if (depthThreshold !== "") opts.push("-d", depthThreshold);
        if (skipDelRefskip)        opts.push("-j");
        if (showReadCount)         opts.push("-c");
        if (printHeader)           opts.push("-H");

        // --input-fmt-option: mỗi token một cặp cờ
        inputFmtOpt
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .forEach((o) => opts.push("--input-fmt-option", o));

        // ---------- Chạy pipeline có panel ----------
        await exec.execute(async ({ step, setLog }) => {
            setLog({
                command: `samtools bedcov ${opts.join(" ")} ${bedFile.name} ${inputFile.name}`.replace(/\s+/g, " "),
            });

            // Stage 1: không có bước con => chỉ có dòng tóm tắt
            await step("validate", async () => {}, {
                running: "Validating input files",
                done: "BAM and BED files validated",
            });

            // Stage 2: mỗi nhánh là một bước cụ thể
            const idxFile = await step(
                "init",
                async ({ sub }) => {
                    if (baiFile) {
                        return sub("Reading provided index file", async () => new File([baiFile], idxFileName));
                    }
                    return sub("Generating index with samtools index", async () => {
                        const r1 = await run(["index", p, `/tmp/${idxFileName}`], [inputFile], [idxFileName]);
                        if (!r1 || r1.code !== 0 || !r1.results[idxFileName])
                            throw new Error(r1?.stderr || error || "Failed to create index");
                        return new File([r1.results[idxFileName]], idxFileName);
                    });
                },
                { running: "Preparing index", done: "Samtools module initialized" }
            );

            // Stage 3
            const r2 = await step(
                "exec",
                async ({ sub }) =>
                    sub("Running samtools bedcov", async () => {
                        const r = await run(
                            ["bedcov", ...opts, `{${bedFile.name}}`, `{${inputFile.name}}`],
                            [inputFile, bedFile, idxFile], [], {}
                        );
                        if (!r || r.code !== 0) throw new Error(r?.stderr || error || "bedcov failed");
                        return r;
                    }),
                { running: "Processing alignment data", done: "Alignment data processed" }
            );

            // Stage 4: nhiều bước con liên tiếp, mỗi bước giữ thời gian riêng
            await step(
                "collect",
                async ({ sub }) => {
                    const parsed = await sub("Parsing stdout", async () =>
                        parseBedcov(r2.stdout, {
                            readCount: showReadCount,
                            depthThreshold: depthThreshold !== "",
                        })
                    );
                    await sub("Updating result", async () => {
                        setLog({ stdout: r2.stdout, stderr: r2.stderr ?? "" });
                        setResult(parsed);
                    });
                },
                { running: "Collecting output", done: "Output ready" }
            );
        });
    };

    const renderPaginationBar = (page, totalPages, onGoToPage) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
            }}
        >
            <button
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(1)}
                disabled={page === 1}
                style={{
                    transition: "transform 0.15s ease",
                    height: "30px",
                    width: "40px",
                    padding: "5px 10px",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    border: "solid 1px #cfcfcf",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                    }}
                >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#555"><path d="M432-240 192-480l240-240 51 51-189 189 189 189-51 51Zm285 0L477-480l240-240 51 51-189 189 189 189-51 51Z"/></svg>
            </button>
            <button
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(page - 1)}
                disabled={page === 1}
                style={{
                    transition: "transform 0.15s ease",
                    height: "30px",
                    width: "40px",
                    padding: "5px 10px",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    border: "solid 1px #cfcfcf",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="-150 -960 960 960" width="15px" fill="#555"><path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
            </button>
            <span style={{ fontSize: "14px", color: "#555" }}>Page {page} / {totalPages}</span>
            <button
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(page + 1)}
                disabled={page === totalPages}
                style={{
                    transition: "transform 0.15s ease",
                    height: "30px",
                    width: "40px",
                    padding: "5px 10px",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    border: "solid 1px #cfcfcf",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="#555"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>
            </button>
            <button
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(totalPages)}
                disabled={page === totalPages}
                style={{
                    transition: "transform 0.15s ease",
                    height: "30px",
                    width: "40px",
                    padding: "5px 10px",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    border: "solid 1px #cfcfcf",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#555"><path d="m242-200 200-280-200-280h98l200 280-200 280h-98Zm238 0 200-280-200-280h98l200 280-200 280h-98Z"/></svg>
            </button>
        </div>
    );

    return (
        <>
            <div
                style={{
                    minHeight: "100vh",
                    width: "100%",
                    boxSizing: "border-box",
                    gap: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "start",
                    gap: "20px",

                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        gap: "20px",
                    }}
                >
                    <span style={{ width: "50px", height: "1px", background: "#D9DDE3", }} />
                    <span
                        style={{
                            fontSize: "20px",
                            fontWeight: "500",
                            color: "#000000",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Tool Parameters
                    </span>
                    <span style={{ flex: 1, height: "1px", background: "#D9DDE3", }} />
                </div>
                {/*
                    --------------------------------------------------
                    DIV LỚN CHỨA TOÀN BỘ FORM CHO REQUIRED ARGS
                    --------------------------------------------------
                */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        boxSizing: 'border-box',
                        padding: "20px 20px",
                        borderRadius: "5px",
                        // backgroundColor: "#DAECF8",
                        border: "1px solid #E2E8F0",
                        gap: "10px"
                    }}

                >
                    {/*
                        --------------------------------------------------
                        DIV CHỨA TOÀN BỘ FORM CHO INPUT FILE
                        --------------------------------------------------
                    */}
                    <div
                        style= {{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: "10px",
                            backgroundColor: "#ffffff",
                            borderRadius: "5px",
                            boxSizing: "border-box"
                        }}
                    >
                        <span
                            style= {{
                                width: "150px",
                                fontSize: "15px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "start",
                            }}
                        >
                            Input file
                        </span>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px"
                            }}
                        >
                            <div>
                                <input
                                    ref={inputFileRef}
                                    type="file"
                                    accept=".bam"
                                    onChange={handleInputFile}
                                    style={{ display: "none" }}
                                />

                                {!inputFile ? (
                                    <div
                                        style={{
                                            boxSizing: 'border-box',
                                            display: "flex",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            padding: 0,
                                            gap: "20px",
                                        }}
                                    >
                                        <div
                                            style={inputBoxStyle()}
                                        >
                                            No file chosen
                                        </div>
                                        <button
                                            onClick={chooseInputFile}
                                            style={fileBtnStyle()}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffffff";
                                            }}
                                        >
                                            {uploadFileBtn()}
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            boxSizing: 'border-box',
                                            display: "flex",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            padding: 0,
                                            gap: "20px",
                                        }}
                                    >
                                        <div
                                            style={inputBoxStyle()}
                                        >
                                            {inputFile.name}
                                        </div>
                                        <button
                                            onClick={chooseInputFile}
                                            disabled={locked}
                                            style={fileBtnStyle()}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffffff";
                                            }}
                                        >
                                            {changeFileBtn()}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: "5px"
                                }}
                            >
                                <input
                                    id="attachIndexFile"
                                    type="checkbox"
                                    checked={hasIndex}
                                    onChange={(e) => {
                                        setHasIndex(e.target.checked);
                                        if (!e.target.checked) {
                                            setBaiFile(null);
                                            if (baiFileRef.current) baiFileRef.current.value = "";
                                        }

                                    }}
                                    style={{
                                        cursor: "pointer",
                                        borderRadius: "none"
                                    }}
                                />
                                <label
                                    for="attachIndexFile"
                                    style={{
                                        fontSize: "12px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Attach index file (.bai) for faster processing
                                </label>
                            </div>

                            {
                                hasIndex ? (
                                    <div>
                                        <input
                                            ref={baiFileRef}
                                            type="file"
                                            accept=".bai"
                                            onChange={handleBaiFile}
                                            style={{ display: "none" }}
                                        />

                                        {!baiFile ? (
                                            <div
                                                style={{
                                                    boxSizing: 'border-box',
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    padding: 0,
                                                    gap: "20px",
                                                }}
                                            >
                                                <div
                                                    style={inputBoxStyle()}
                                                >
                                                    No file chosen
                                                </div>
                                                <button
                                                    onClick={chooseBaiFile}
                                                    style={fileBtnStyle()}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                                    }}
                                                >
                                                    {uploadFileBtn()}
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    boxSizing: 'border-box',
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    padding: 0,
                                                    gap: "20px",
                                                }}
                                            >
                                                <div
                                                    style={inputBoxStyle()}
                                                >
                                                    {baiFile.name}
                                                </div>
                                                <button
                                                    onClick={chooseBaiFile}
                                                    disabled={locked}
                                                    style={fileBtnStyle()}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                                    }}
                                                >
                                                    {changeFileBtn()}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            boxSizing: 'border-box',
                                            display: "flex",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            padding: 0,
                                            gap: "20px",
                                        }}
                                    >
                                        <div
                                            style={inputBoxStyle({opacity: 0.8}) }
                                        >
                                            No file chosen
                                        </div>
                                        <button
                                            disabled="True"
                                            style={fileBtnStyle({opacity: "0.5", background: "#F1F5F9",})}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffffff";
                                            }}
                                        >
                                            {uploadFileBtn()}
                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    {/*
                        --------------------------------------------------
                        DIV CHỨA TOÀN BỘ FORM CHO BED FILE
                        --------------------------------------------------
                    */}
                    <Divider color="#E2E8F0"/>
                    <div
                        style= {{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: "10px",
                            backgroundColor: "#ffffff",
                            borderRadius: "5px",
                            boxSizing: "border-box"
                        }}
                    >
                        <span
                            style= {{
                                display: "flex",
                                alignItems: "start",
                                width: "150px",
                                fontSize: "15px",
                                fontWeight: 600,
                            }}
                        >
                            Bed file
                        </span>

                        <input
                            ref={bedFileRef}
                            type="file"
                            accept=".bed"
                            onChange={handleBedFile}
                            style={{ display: "none" }}
                        />

                        {!bedFile ? (
                            <div
                                style={{
                                    boxSizing: 'border-box',
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    padding: 0,
                                    gap: "20px",
                                }}
                            >
                                <div
                                    style={inputBoxStyle()}
                                >
                                    No file chosen
                                </div>
                                <button
                                    onClick={chooseBedFile}
                                    style={fileBtnStyle()}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                    }}
                                >
                                    {uploadFileBtn()}
                                </button>
                            </div>
                        ) : (
                            <div
                                style={{
                                    boxSizing: 'border-box',
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    padding: 0,
                                    gap: "20px",
                                }}
                            >
                                <div
                                    style={inputBoxStyle()}
                                >
                                    {bedFile.name}
                                </div>
                                <button
                                    onClick={chooseBedFile}
                                    disabled={locked}
                                    style={fileBtnStyle()}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                    }}
                                >
                                    {changeFileBtn()}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        width: "710px"
                    }}
                >
                    {!moreOptions ? (
                            <svg style ={{marginTop: "2px"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M12,15.38l-6-6l1.4-1.4L12,12.55l4.6-4.58L18,9.38l-6,6Z"/></svg>
                        ) : (
                            <svg style ={{marginTop: "2px"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M7.4,15.38L6,13.98l6-6l6,6l-1.4,1.4L12,10.8L7.4,15.38Z"/></svg>
                        )
                    }
                    <span
                        style={{
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: 600,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = "none";
                        }}
                        onClick={() => (
                            setMoreOptions(!moreOptions)
                        )}
                    >
                        More options
                    </span>
                    {
                        moreOptions && (
                            <span
                                style={{
                                    marginLeft: "auto",
                                    display: "flex",
                                    alignItems: "end",
                                    fontSize: "12px",
                                    color: "#64748B",
                                    fontWeight: "400"
                                }}
                            >
                                Advanced settings
                            </span>
                        )
                    }
                </div>
                {moreOptions && (
                    // --------------------------------------------------
                    // DIV LỚN CHỨA TOÀN BỘ FORM CHO OPTIONAL ARGS
                    // --------------------------------------------------
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: "5px",
                            gap: "10px",
                            alignItems: "start"
                        }}
                    >
                        {/*
                            --------------------------------------------------
                            DIV CHỨA FORM LƯỚI 2 CỘT
                            --------------------------------------------------
                        */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, minmax(0, 350px))",
                                justifyContent: "start",
                                boxSizing: 'border-box',
                                borderRadius: "5px",
                                gap: "10px"
                            }}
                        >
                            {/*
                                --------------------------------------------------
                                DIV CHỨA FORM CHO MAXIMUM DEPTH
                                --------------------------------------------------
                            */}
                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: "10px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Maximum depth
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555"

                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 5px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                --max-depth
                                            </span>
                                            <span>
                                                Sets the maximum depth used in the mpileup algorithm
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={maxDepth}
                                    onChange={(e) => setMaxDepth(e.target.value.replace(/\D/g, ""))}
                                    onFocus={() => setMaxDepthFocused(true)}
                                    onBlur={() => {
                                        setMaxDepthFocused(false);
                                        const n = parseInt(maxDepth, 10);
                                        // rỗng/0 -> để trống (không truyền tham số), còn lại giữ số nguyên dương
                                        setMaxDepth(Number.isNaN(n) || n <= 0 ? "" : String(n));
                                    }}
                                    disabled={locked}
                                    placeholder="Default"
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        height: "35px",
                                        borderRadius: "5px",
                                        padding: "0 10px",
                                        outline: "none",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                        backgroundColor: "#F1F5F9",
                                        borderColor: maxDepthFocused ? "#FF7F50" : "transparent",
                                    }}
                                />
                            </div>
                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: "10px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Minimum mapping
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555"

                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 5px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                -Q, --min-MQ
                                            </span>
                                            <span>
                                                Mapping quality threshold [0]
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={minMapq}
                                    onChange={(e) => {
                                        // chỉ giữ lại chữ số
                                        setMinMapq(e.target.value.replace(/\D/g, ""));
                                    }}
                                    onBlur={() => {
                                        setMapqFocused(false);
                                        const n = parseInt(minMapq, 10);
                                        setMinMapq(Number.isNaN(n) ? 0 : Math.min(60, n));
                                    }}
                                    onFocus={() => setMapqFocused(true)}
                                    disabled={locked}
                                    placeholder="0"
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        display: "flex",
                                        height: "35px",
                                        borderRadius: "5px",
                                        alignItems: "center",
                                        padding: "10px 20px",
                                        outline: "none",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                        backgroundColor: "#F1F5F9",
                                        borderColor: mapqFocused ? "#FF7F50" : "transparent",
                                    }}
                                />

                            </div>
                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: "10px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Exclude read flags
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 10px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                -G
                                            </span>
                                            <span>
                                                Add the specified flags to the set used to filter out reads. The default set is UNMAP,SECONDARY,QCFAIL,DUP or 0x704
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>
                                <input
                                    type="text"
                                    value={excludeFlags}
                                    onChange={(e) => {
                                        // cho phép chữ, số, dấu phẩy (tên flag: DUP,QCFAIL hoặc hex: 0x704)
                                        setExcludeFlags(e.target.value.replace(/[^0-9a-zA-Z,]/g, ""));
                                    }}
                                    onFocus={() => setExcludeFocused(true)}
                                    onBlur={() => setExcludeFocused(false)}
                                    disabled={locked}
                                    placeholder="e.g. 0x704 or DUP,QCFAIL"
                                    spellCheck={false}
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        height: "35px",
                                        borderRadius: "5px",
                                        padding: "0 10px",
                                        outline: "none",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                        backgroundColor: "#F1F5F9",
                                        borderColor: excludeFocused ? "#FF7F50" : "transparent",
                                    }}
                                />
                            </div>
                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: "10px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Include read flags
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555"

                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 5px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                -g
                                            </span>
                                            <span>
                                                Remove the specified flags from the set used to filter out reads
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>
                                <input
                                    type="text"
                                    value={includeFlags}
                                    onChange={(e) => {
                                        // cho phép chữ, số, dấu phẩy (DUP,QCFAIL hoặc 0x400)
                                        setIncludeFlags(e.target.value.replace(/[^0-9a-zA-Z,]/g, ""));
                                    }}
                                    onFocus={() => setIncludeFocused(true)}
                                    onBlur={() => setIncludeFocused(false)}
                                    disabled={locked}
                                    placeholder="e.g. DUP or 0x400"
                                    spellCheck={false}
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        height: "35px",
                                        borderRadius: "5px",
                                        padding: "0 10px",
                                        outline: "none",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                        backgroundColor: "#F1F5F9",
                                        borderColor: includeFocused ? "#FF7F50" : "transparent",
                                    }}
                                />
                            </div>
                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: "10px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Depth threshold
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555"

                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 5px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                -d
                                            </span>
                                            <span>
                                                Depth threshold. Number of reference bases with coverage above and including this value will be displayed in a separate column
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={depthThreshold}
                                    onChange={(e) => setDepthThreshold(e.target.value.replace(/\D/g, ""))}
                                    onFocus={() => setDepthThresholdFocused(true)}
                                    onBlur={() => {
                                        setDepthThresholdFocused(false);
                                        const n = parseInt(depthThreshold, 10);
                                        // rỗng/0 -> để trống (không truyền tham số), còn lại giữ số nguyên dương
                                        setDepthThreshold(Number.isNaN(n) || n <= 0 ? "" : String(n));
                                    }}
                                    disabled={locked}
                                    placeholder="0"
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        height: "35px",
                                        borderRadius: "5px",
                                        padding: "0 10px",
                                        outline: "none",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                        backgroundColor: "#F1F5F9",
                                        borderColor: depthThresholdFocused ? "#FF7F50" : "transparent",
                                    }}
                                />
                            </div>
                        </div>
                        {/*
                            FORM DẠNG FLEX COLUMN
                        */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                boxSizing: 'border-box',
                                borderRadius: "5px",
                                gap: "10px"
                            }}
                        >
                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: 'start',
                                    gap: "10px",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Reference FASTA
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 5px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                --reference
                                            </span>
                                            <span>
                                                Reference sequence FASTA FILE [null]
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>

                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: 'start',
                                        gap: '15px'
                                    }}
                                >
                                    <div>
                                        <input
                                            ref={refFastaFileRef}
                                            type="file"
                                            accept=".fa, .fasta"
                                            onChange={handleRefFastaFile}
                                            style={{ display: "none" }}
                                        />

                                        {!refFastaFile ? (
                                            <div
                                                style={{
                                                    boxSizing: 'border-box',
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    padding: 0,
                                                    gap: "20px",
                                                }}
                                            >
                                                <div
                                                    style={inputBoxStyle()}
                                                >
                                                    No file chosen
                                                </div>
                                                <button
                                                    onClick={chooseRefFastaFile}
                                                    style={fileBtnStyle()}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                                    }}
                                                >
                                                    {uploadFileBtn()}
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    boxSizing: 'border-box',
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    padding: 0,
                                                    gap: "20px",
                                                }}
                                            >
                                                <div
                                                    style={inputBoxStyle()}
                                                >
                                                    {refFastaFile.name}
                                                </div>
                                                <button
                                                    onClick={chooseRefFastaFile}
                                                    disabled={locked}
                                                    style={fileBtnStyle()}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                                    }}
                                                >
                                                    {changeFileBtn()}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div
                                style= {{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: 'start',
                                    gap: "10px",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <span
                                    style= {{
                                        display: 'flex',
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "start",
                                        gap: "10px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Input format option
                                    </span>
                                    <HelpTip>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                display: "flex",
                                                gap: "10px",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                color: "#555",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    backgroundColor: "#ffc1ab",
                                                    padding: "5px 5px",
                                                    boxSizing: "border-box",
                                                    color: "#1f1f1f",
                                                    fontWeight: "600"

                                                }}
                                            >
                                                --input-fmt-option
                                            </span>
                                            <span>
                                                Specify a single input file format option in the form of OPTION or OPTION=VALUE
                                            </span>
                                        </div>
                                    </HelpTip>
                                </span>
                                <input
                                    type="text"
                                    value={inputFmtOpt}
                                    onChange={(e) => {
                                        // cho phép chữ, số, _ = . , : / - và dấu cách (nhiều option cách nhau bằng dấu cách)
                                        setInputFmtOpt(e.target.value.replace(/[^0-9a-zA-Z_=.,:/\- ]/g, ""));
                                    }}
                                    onFocus={() => setInputFmtFocused(true)}
                                    onBlur={() => setInputFmtFocused(false)}
                                    disabled={locked}
                                    placeholder="e.g. decode_md=0 required_fields=0x1ff"
                                    spellCheck={false}
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        height: "35px",
                                        borderRadius: "5px",
                                        padding: "0 10px",
                                        outline: "none",
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                        backgroundColor: "#F1F5F9",
                                        borderColor: inputFmtFocused ? "#FF7F50" : "transparent",
                                    }}
                                />
                            </div>

                            {/*
                                FORM CHECKBOX
                            */}
                            <div
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: 'start',
                                    gap: "50px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: 'center',
                                        gap: "10px"
                                    }}
                                >
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={skipDelRefskip}
                                            onChange={(e) => setSkipDelRefskip(e.target.checked)}
                                            disabled={locked}
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "50%",
                                                appearance: "none",
                                                WebkitAppearance: "none",
                                                border: "1px solid #FF7F50",
                                                outline: "none",
                                                cursor: locked ? "not-allowed" : "pointer",
                                                opacity: locked ? 0.5 : 1,
                                                backgroundColor: skipDelRefskip ? "#FF7F50" : "#fff",
                                                backgroundImage: skipDelRefskip
                                                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")`
                                                    : "none",
                                                backgroundSize: "12px 12px",
                                                backgroundPosition: "center",
                                                backgroundRepeat: "no-repeat",
                                                transition: "all 0.15s ease-in-out",
                                                boxSizing: "border-box",
                                                margin: 0,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span
                                            style= {{
                                                display: 'flex',
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "start",
                                                gap: "10px"
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Do not include D and N in coverage
                                            </span>
                                            <HelpTip>
                                                <div
                                                    style={{
                                                        fontSize: "10px",
                                                        display: "flex",
                                                        gap: "10px",
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        color: "#555",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            backgroundColor: "#ffc1ab",
                                                            padding: "5px 5px",
                                                            boxSizing: "border-box",
                                                            color: "#1f1f1f",
                                                            fontWeight: "600"

                                                        }}
                                                    >
                                                        -j
                                                    </span>
                                                    <span>
                                                        Do not include deletions (D) and ref skips (N) in bedcov computation
                                                    </span>
                                                </div>
                                            </HelpTip>
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: 'start',
                                    gap: "50px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: 'center',
                                        gap: "10px"
                                    }}
                                >
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={showReadCount}
                                            onChange={(e) => setShowReadCount(e.target.checked)}
                                            disabled={locked}
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "50%",
                                                appearance: "none",
                                                WebkitAppearance: "none",
                                                border: "1px solid #FF7F50",
                                                outline: "none",
                                                cursor: locked ? "not-allowed" : "pointer",
                                                opacity: locked ? 0.5 : 1,
                                                backgroundColor: showReadCount ? "#FF7F50" : "#fff",
                                                backgroundImage: showReadCount
                                                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")`
                                                    : "none",
                                                backgroundSize: "12px 12px",
                                                backgroundPosition: "center",
                                                backgroundRepeat: "no-repeat",
                                                transition: "all 0.15s ease-in-out",
                                                boxSizing: "border-box",
                                                margin: 0,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span
                                            style= {{
                                                display: 'flex',
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "start",
                                                gap: "10px"
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Show read count
                                            </span>
                                            <HelpTip>
                                                <div
                                                    style={{
                                                        fontSize: "10px",
                                                        display: "flex",
                                                        gap: "10px",
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        color: "#555",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            backgroundColor: "#ffc1ab",
                                                            padding: "5px 5px",
                                                            boxSizing: "border-box",
                                                            color: "#1f1f1f",
                                                            fontWeight: "600"

                                                        }}
                                                    >
                                                        -c
                                                    </span>
                                                    <span>
                                                        Add an additional column showing read count
                                                    </span>
                                                </div>
                                            </HelpTip>
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: 'start',
                                    gap: "50px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "5px",
                                    padding: "20px 20px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: 'center',
                                        gap: "10px"
                                    }}
                                >
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={printHeader}
                                            onChange={(e) => setPrintHeader(e.target.checked)}
                                            disabled={locked}
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "50%",
                                                appearance: "none",
                                                WebkitAppearance: "none",
                                                border: "1px solid #FF7F50",
                                                outline: "none",
                                                cursor: locked ? "not-allowed" : "pointer",
                                                opacity: locked ? 0.5 : 1,
                                                backgroundColor: printHeader ? "#FF7F50" : "#fff",
                                                backgroundImage: printHeader
                                                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")`
                                                    : "none",
                                                backgroundSize: "12px 12px",
                                                backgroundPosition: "center",
                                                backgroundRepeat: "no-repeat",
                                                transition: "all 0.15s ease-in-out",
                                                boxSizing: "border-box",
                                                margin: 0,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span
                                            style= {{
                                                display: 'flex',
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "start",
                                                gap: "10px"
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Print header
                                            </span>
                                            <HelpTip>
                                                <div
                                                    style={{
                                                        fontSize: "10px",
                                                        display: "flex",
                                                        gap: "10px",
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        color: "#555",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            backgroundColor: "#ffc1ab",
                                                            padding: "5px 5px",
                                                            boxSizing: "border-box",
                                                            color: "#1f1f1f",
                                                            fontWeight: "600"

                                                        }}
                                                    >
                                                        -H
                                                    </span>
                                                    <span>
                                                        Print a comment/header line with column information
                                                    </span>
                                                </div>
                                            </HelpTip>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "end",
                        width: "100%",
                        height: "60px",
                        gap: "50px"
                    }}

                >
                    <button
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: bg,
                            color: "#fff",
                            fontSize: 22,
                            width: "150px",
                            fontWeight: 700,
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: 0,
                            cursor: cursor,
                            boxShadow: "6px 6px 0 #1a3a8f",
                            transition: "all 0.15s ease",
                            gap: "10px",
                            boxShadow: shadow,
                            transform: move,
                        }}
                        onMouseEnter={() => setHover(true)}
                        onMouseLeave={() => {
                            setHover(false);
                            setDown(false);
                        }}
                        onMouseDown={() => setDown(true)}
                        onMouseUp={() => setDown(false)}
                        disabled={loading}
                        onClick={handleRun}
                    >
                        <svg width="20px" height="20px" viewBox="0 0 24 24" fill="#FF7F50" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L7.59662 21.6145C5.53435 22.736 3 21.2763 3 18.9671L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258Z" stroke="#FF7F50" stroke-width="1.5"></path> </g></svg>
                        {loading ? "Running..." : "Run"}
                    </button>
                    {validationError && (
                        <div
                            role="alert"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 14px",
                                borderRadius: "5px",
                                border: "1px solid #e0a3a3",
                                backgroundColor: "#fdecec",
                                color: "#c00",
                                fontSize: "13px",
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="20px" width="20px" fill="#c00"><path d="M12.71,16.71Q13,16.43 13,16t-0.29-0.71T12,15t-0.71,0.29T11,16t0.29,0.71T12,17t0.71-0.29ZM11,13h2V7H11v6Zm1,9q-2.07,0-3.9-0.79q-1.82-0.79-3.17-2.14Q3.58,17.73 2.79,15.9T2,12Q2,9.92 2.79,8.1Q3.58,6.27 4.93,4.93Q6.28,3.57 8.1,2.79Q9.93,2 12,2t3.9,0.79t3.17,2.14q1.35,1.35 2.14,3.17Q22,9.92 22,12t-0.79,3.9t-2.14,3.17q-1.35,1.35-3.17,2.14T12,22Zm0-2q3.35,0 5.68-2.32T20,12T17.68,6.32T12,4T6.33,6.32T4,12t2.33,5.68T12,20Zm0-8Z"/></svg>
                            {validationError}
                        </div>
                    )}
                </div>
                <ExecutionPanel exec={exec} toolName="Samtools bedcov" />
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        gap: "20px",
                    }}
                >
                    <span style={{ width: "50px", height: "1px", background: "#D9DDE3", }} />
                    <span
                        style={{
                            fontSize: "20px",
                            fontWeight: "500",
                            color: "#000000",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Result
                    </span>
                    <span style={{flex: 1, height: "1px", background: "#D9DDE3",}}/>
                </div>
                <div
                    id="result"
                    style={{
                        maxWidth: "calc(100vw - 100px * 2 )",
                        minWidth: "calc(100vw - 100px * 2 )",
                        boxSizing: "border-box",
                    }}
                >
                    {error && (
                        <pre style={{ color: "#c00", whiteSpace: "pre-wrap", width: "100%" }}>{error}</pre>
                    )}

                    {result ? (
                        <BedcovResult result={result} renderPaginationBar={renderPaginationBar} />
                    ) : (
                        !loading && !error &&
                        <EmptyState
                            icon={
                                <svg width="36px" height="36px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#000000">
                                    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                        <g fill="#555" fillRule="nonzero">
                                            <path d="M17.5,12 C20.5376,12 23,14.4624 23,17.5 C23,20.5376 20.5376,23 17.5,23 C14.4624,23 12,20.5376 12,17.5 C12,14.4624 14.4624,12 17.5,12 Z M17.5,13.9993 C17.2545778,13.9993 17.0504,14.1762086 17.0080571,14.4094355 L17,14.4993 L17.0005,17 L14.4961,17 C14.22,17 13.9961,17.2239 13.9961,17.5 C13.9961,17.7455111 14.1730086,17.9496198 14.4062355,17.9919462 L14.4961,18 L17.0006,18 L17.0011,20.5035 C17.0011,20.7797 17.225,21.0035 17.5011,21.0035 C17.7466111,21.0035 17.9507198,20.8266704 17.9930462,20.5933908 L18.0011,20.5035 L18.0006,18 L20.503,18 C20.7792,18 21.003,17.7762 21.003,17.5 C21.003,17.2545778 20.8261704,17.0504 20.5928908,17.0080571 L20.503,17 L18.0005,17 L18,14.4993 C18,14.2232 17.7761,13.9993 17.5,13.9993 Z M17.75,3 C19.5449,3 21,4.45507 21,6.25 L21,12.0218 C20.5368,11.7253 20.0335,11.4858 19.5,11.3135 L19.5,10 L15.5,10 L15.5,11.3135 C14.9665,11.4858 14.4632,11.7253 14,12.0218 L14,10 L10,10 L10,14 L12.0218,14 C11.7253,14.4632 11.4858,14.9665 11.3135,15.5 L10,15.5 L10,19.5 L11.3135,19.5 C11.4858,20.0335 11.7253,20.5368 12.0218,21 L6.25,21 C4.45507,21 3,19.5449 3,17.75 L3,6.25 C3,4.45507 4.45507,3 6.25,3 L17.75,3 Z M8.5,15.5 L4.5,15.5 L4.5,17.75 C4.5,18.668175 5.20710875,19.4211925 6.10647256,19.4941988 L6.25,19.5 L8.5,19.5 L8.5,15.5 Z M8.5,10 L4.5,10 L4.5,14 L8.5,14 L8.5,10 Z M8.5,4.5 L6.25,4.5 C5.2835,4.5 4.5,5.2835 4.5,6.25 L4.5,8.5 L8.5,8.5 L8.5,4.5 Z M17.75,4.5 L15.5,4.5 L15.5,8.5 L19.5,8.5 L19.5,6.25 C19.5,5.331825 18.7928913,4.5788075 17.8935274,4.50580119 L17.75,4.5 Z M14,4.5 L10,4.5 L10,8.5 L14,8.5 L14,4.5 Z" />
                                        </g>
                                    </g>
                                </svg>
                            }
                            title="No bedcov result yet"
                            description="Upload a BAM file and a BED file, then click Run to see the total read depth for each region"
                        />
                    )}
                </div>
            </div>
        </>
    )
}
export default SamtoolsBedcov;
