import { useEffect, useId, useMemo, useRef, useState } from "react";
import useTracy from '../../../hooks/useTracy.js'
import useBcftools from '../../../hooks/useBcftools.js';
import Divider from '../../../components/ui/Divider.jsx';
import HelpTip from '../../../components/ui/HelpTip.jsx'
import ExecutionPanel from '../../../components/ui/ExecutionPanel.jsx';
import useExecution from '../../../hooks/useExecution'
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ChangeFileIcon from "../../../components/ui/ChangeFileIcon.jsx"
import UploadFileIcon from "../../../components/ui/UploadFileIcon.jsx";
import AlignmentView from "../../../components/ui/AlignmentView.jsx";

// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

const UI = { panel: "#EEF3FA", border: "#E2E8F0", text: "#334155", muted: "#94A3B8", grid: "#EEF2F6", axis: "#CBD5E1" };
const BASE_COLOR = { A: "#16A34A", C: "#2563EB", G: "#111827", T: "#EF4444" };

const CHANNELS = [
	{ key: "peakA", base: "A", color: BASE_COLOR.A, faint: "#BBE5C8" },
	{ key: "peakC", base: "C", color: BASE_COLOR.C, faint: "#BFD3F7" },
	{ key: "peakG", base: "G", color: BASE_COLOR.G, faint: "#D1D5DB" },
	{ key: "peakT", base: "T", color: BASE_COLOR.T, faint: "#FBC4C4" },
];

const FRAME = { x0: 0, x1: 1150, y0: 0, y1: 200 }; // vùng vẽ trong toạ độ SVG
const AXIS_Y = FRAME.y1 + 5; // trục X nằm dưới đáy khung 5 đơn vị
const VB = { x: -50, y: -40, w: 1200 }; // viewBox; chiều cao phụ thuộc có ref hay không
const PLOT_LEFT_FRAC = (FRAME.x0 - VB.x) / VB.w; // phần chiều ngang bị chừa cho nhãn trục Y
const PLOT_FRAC = (FRAME.x1 - FRAME.x0) / VB.w;
const GAP_VALUE = -90; // giá trị < -90 = "lỗ hổng" do alignment chèn vào
const MIN_SPAN = 10;
const DEFAULT_SPAN = 500; 
const DEFAULT_Y_MAX = 2000; // Độ cao khởi tạo của trục Y, càng cao hơn trace thì trace càng thấp
const POS_Y  = AXIS_Y + 22;             // baseline số pos
const CALL_Y = FRAME.y0 - 12; 
const ALT1_Y = AXIS_Y + 50;             // baseline hàng alt1
const ALT2_Y = AXIS_Y + 75;             // baseline hàng alt2
const TICK_EVERY = 5;
const MIN_UNITS_PER_BASE = 0;           // dưới mức này thì ẩn chữ alt
const VB_H = 340;

// ---------- Hàm thuần ----------
function normalizeTraceData(res) {
    if (!res || typeof res !== "object") return res;
    if (res.gappedTrace || !("peakA" in res)) return res;
	
    const out = {
        gappedTrace: {
        leadingGaps: 0,
        trailingGaps: 0,
        peakA: res.peakA,
        peakC: res.peakC,
        peakG: res.peakG,
        peakT: res.peakT,
        basecallPos: res.basecallPos,
        basecalls: res.basecalls,
        },
    };
	for (const k of ["basecallQual", "consensus", "trimmed"]) if (k in res) out.gappedTrace[k] = res[k];
    for (const k of ["refchr", "refpos", "refalign", "forward"]) if (k in res) out[k] = res[k];
    return out;
}
function trimRegions(pos, flags, maxX) {
    const out = [];
    let i = 0;
    while (i < flags.length) {
        if (!flags[i]) { i++; continue; }
        let j = i;
        while (j + 1 < flags.length && flags[j + 1]) j++;
        out.push({
            s: i === 0 ? 0 : (pos[i - 1] + pos[i]) / 2,
            e: j === flags.length - 1 ? maxX : (pos[j] + pos[j + 1]) / 2,
            from: i, to: j,
        });
        i = j + 1;
    }
    return out;
}

function validate(d) {
    const gt = d && d.gappedTrace;
    if (!gt) return "Bad JSON data: gappedTrace object missing!";
    for (const k of ["peakA", "peakC", "peakG", "peakT", "basecallPos"]) {
        if (!gt[k]) return `Bad JSON data: ${k} array missing!`;
    }
    if (!gt.basecalls) return "Bad JSON data: basecalls object missing!";
    if (gt.basecallQual && gt.basecallQual.length !== gt.basecallPos.length) {
        return "Bad JSON data: basecallQual length mismatch with basecallPos!";
    }
    return null;
}

// "12" -> "1:C/T"  =>  primary "C", secondary "T" (không có thì secondary = primary)
function parseCall(raw) {
    const s = String(raw) + " ";
    const p = s.indexOf(":");
    const primary = s.charAt(p + 1);
    const secondary = p + 3 < s.length ? s.charAt(p + 3) : primary;
    return { label: String(raw), primary, secondary };
}

// Giữ cửa sổ [st, end] trong [0, maxX] mà không đổi độ rộng (trừ khi quá rộng/hẹp).
function clampWindow(st, end, maxX, minSpan = MIN_SPAN) {
    if (!Number.isFinite(st) || !Number.isFinite(end)) {
        st = 0;
        end = DEFAULT_SPAN;
    }
    const span = Math.min(Math.max(end - st, minSpan), Math.max(maxX, 1));
    const s = Math.min(Math.max(st, 0), Math.max(maxX - span, 0));
    return { st: s, end: s + span };
}
function findCross(X, Y, a, b) {
	a = Math.max(0, Math.floor(a));
	b = Math.min(X.length - 1, Math.ceil(b));
	const mid = Math.floor((a + b) / 2);
	let start = a, best = -Infinity;
	for (let t = a; t <= mid; t++) {            // đỉnh của X nằm ở nửa đầu
		const v = Number(X[t]);
		if (v > best) { best = v; start = t; }
	}
	for (let t = start; t < b; t++) {
		const d0 = Number(X[t]) - Number(Y[t]);
		const d1 = Number(X[t + 1]) - Number(Y[t + 1]);
		if (d0 >= 0 && d1 < 0) {
			const f = d0 / (d0 - d1);            // nội suy tuyến tính
			const x0 = Number(X[t]), y0 = Number(Y[t]);
			return {
				t: t + f,
				vx: x0 + f * (Number(X[t + 1]) - x0),
				vy: y0 + f * (Number(Y[t + 1]) - y0),
			};
		}
	}
	// không có giao điểm: lấy chỗ gần nhất
	let bt = mid, bd = Infinity;
	for (let t = a; t <= b; t++) {
		const diff = Math.abs(Number(X[t]) - Number(Y[t]));
		if (diff < bd) { bd = diff; bt = t; }
	}
	return { t: bt, vx: Number(X[bt]), vy: Number(Y[bt]) };
}

// Cắt 1 kênh thành các đoạn polyline (ngắt tại các lỗ hổng), chỉ duyệt phần trong cửa sổ.
function buildSegments(values, win, yMax, xOf, range = null) {
    const segs = [];
    let cur = null;
    let s = Math.max(0, Math.floor(win.st));
    let e = Math.min(values.length - 1, Math.ceil(win.end));
    if (range) { s = Math.max(s, Math.ceil(range[0])); e = Math.min(e, Math.floor(range[1])); }
    for (let i = s; i <= e; i++) {
        const v = Number(values[i]);
        if (!Number.isFinite(v) || v < GAP_VALUE) { cur = null; continue; }
        if (!cur) segs.push((cur = []));
        const y = FRAME.y1 - Math.min(v / yMax, 1) * (FRAME.y1 - FRAME.y0);
        cur.push(`${xOf(i).toFixed(1)},${y.toFixed(1)}`);
    }
    return segs.map((p) => p.join(" "));
}

function yTicks(yMax) {
    const pow = Math.pow(10, Math.floor(Math.log10(yMax / 10)));
    const step = Math.floor(yMax / 10 / pow) * pow;
    const ticks = [];
    for (let i = 0; i * step < yMax; i++) {
        ticks.push({ value: i * step, y: FRAME.y1 - ((i * step) / yMax) * (FRAME.y1 - FRAME.y0) });
    }
    return ticks;
}

const isForward = (f) => f === true || Number(f) === 1;

function copyText(text) {
    if (!text) return;
    const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:absolute;left:-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
        document.execCommand("copy");
        } catch (_) {
        /* bỏ qua */
        }
        document.body.removeChild(ta);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
}

// ---------- Component ngoài: chuẩn hoá + báo lỗi ----------
function SangerTraceView({ data, className}) {
    const trace = useMemo(() => (data ? normalizeTraceData(data) : null), [data]);
    if (!trace) return null;
        const error = validate(trace);
    if (error) {
        return (
        <div role="alert" style={S.error}>
            {error}
        </div>
        );
    }
    return <Viewer trace={trace} className={className} style/>;
}

// ---------- Component trong: giả định data đã hợp lệ ----------
function Viewer({ trace, className }) {
	const gt = trace.gappedTrace;
	const clipId = "tv-clip-" + useId().replace(/:/g, "");
	const [pickRow, setPickRow] = useState(null);   // null | "alt1" | "alt2"
	const rowBase = (call, row) => (row === "alt1" ? call.primary : call.secondary);
	const movedRef = useRef(false);

	// Dữ liệu dẫn xuất: chỉ tính lại khi trace đổi.
	const d = useMemo(() => {
		const pos = gt.basecallPos.map(Number);
		const calls = gt.basecallPos.map((p) => parseCall(gt.basecalls[p]));
		const hasRef = typeof trace.refalign === "string";
		const refAlign = hasRef ? trace.refalign : "";
		const prefix = [];
		let c = 0;
		for (let k = 0; k < refAlign.length; k++) {
			if (refAlign[k] !== "-") c++;
				prefix.push(c);
		}
		return {
			pos,
			calls,
			seq: calls.map((x) => x.primary).join(""),
			hasRef,
			refAlign,
			refGapless: refAlign.replace(/-/g, ""),
			lg: parseInt(gt.leadingGaps || 0, 10),
			maxX: gt.peakA.length - 1,
			// số base không-gap tới idx (tính cả idx) trừ 1 = offset 0-based trong ref không gap
			refOffset: (idx) => {
				if (!prefix.length || idx == null) return null;
				const n = prefix[Math.min(idx, prefix.length - 1)];
				return n > 0 ? n - 1 : null;
			},
		};
	}, [trace, gt]);
	const [win, setWin] = useState(() => clampWindow(0, DEFAULT_SPAN, d.maxX));
	const [yMax, setYMax] = useState(DEFAULT_Y_MAX);
	const [hi, setHi] = useState(null); // null | "A" | "C" | "G" | "T"
	const [dragging, setDragging] = useState(false);
	const [tip, setTip] = useState(null);
	const [hoverI, setHoverI] = useState(null);

	// Reset khi nhận trace mới (pattern "adjust state during render" của React).
	const [prevTrace, setPrevTrace] = useState(trace);
	if (prevTrace !== trace) {
		setPrevTrace(trace);
		setWin(clampWindow(0, DEFAULT_SPAN, d.maxX));
		setYMax(DEFAULT_Y_MAX);
		setHi(null);
		setTip(null);
		setHoverI(null);
		setPickRow(null);
	}

	const winRef = useRef(win);
	winRef.current = win;
	const tracesRef = useRef(null);
	const dragRef = useRef(null);
	const seqRef = useRef(null);
	const refRef = useRef(null);

	const moveTo = (st, end) => setWin(clampWindow(st, end, d.maxX));
	const span = win.end - win.st;
	// ----- Slider zoom (log2 so với DEFAULT_SPAN) -----
	const zoomMin = Math.min(0, Math.log2(DEFAULT_SPAN / Math.max(d.maxX, 1)));
	const zoomMax = Math.log2(DEFAULT_SPAN / MIN_SPAN);
	const zoomVal = Math.log2(DEFAULT_SPAN / span);
	const setZoom = (v) => {
	const c = (win.st + win.end) / 2;                 // zoom quanh tâm khung nhìn
	const sp = DEFAULT_SPAN / Math.pow(2, v);
	moveTo(c - sp / 2, c + sp / 2);
	};

	// ----- Slider độ cao peak (log2 so với DEFAULT_Y_MAX) -----
	const peakVal = Math.log2(DEFAULT_Y_MAX / yMax);    // lớn = peak cao
	const setPeak = (v) => setYMax(DEFAULT_Y_MAX / Math.pow(2, v));

  // ----- Kéo chuột để pan (listener ở window để kéo ra ngoài vẫn chạy) -----
	useEffect(() => {
		let raf = 0;
		const onMove = (e) => {
			const drag = dragRef.current;
			const el = tracesRef.current;
			if (!drag || !el) return;
			if (Math.abs(e.clientX - drag.x) > 3) movedRef.current = true;
			const plotPx = el.getBoundingClientRect().width * PLOT_FRAC;
			if (!plotPx) return;
			// kéo sang phải => về các base trước (đảo chiều như bản gốc)
			const delta = ((e.clientX - drag.x) * (drag.end - drag.st)) / plotPx;
			const next = clampWindow(drag.st - delta, drag.end - delta, d.maxX);
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => setWin(next));
		};
		const onUp = () => {
			dragRef.current = null;
			setDragging(false);
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [d.maxX]);

	// ----- Wheel zoom quanh con trỏ. Phải gắn native với {passive:false}:
	// onWheel của React là passive nên preventDefault() sẽ không chặn được cuộn trang. -----
	useEffect(() => {
		const el = tracesRef.current;
		if (!el) return;
		const onWheel = (e) => {
			if (!e.deltaY) return;
			e.preventDefault();
			const { st, end } = winRef.current;
			const sp = end - st;
			const r = el.getBoundingClientRect();
			const ratio = Math.min(
				1,
				Math.max(0, (e.clientX - r.left - r.width * PLOT_LEFT_FRAC) / (r.width * PLOT_FRAC))
			);
			const center = st + ratio * sp;
			const newSpan = Math.max(MIN_SPAN, sp * (e.deltaY < 0 ? 0.95 : 1.05));
			const newSt = center - ratio * newSpan;
			setWin(clampWindow(newSt, newSt + newSpan, d.maxX));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [d.maxX]);

	// ----- Cuộn khung trình tự tới vùng đang xem -----
	useEffect(() => {
		for (const r of [seqRef, refRef]) {
			const box = r.current;
			const first = box && box.querySelector('[data-hl="1"]');
			if (!first || box.scrollHeight <= box.clientHeight) continue;
			box.scrollTop = Math.max(0, first.offsetTop - box.clientHeight / 2 + first.offsetHeight / 2);
		}
	}, [win]);

  	// ----- SVG: chỉ dựng lại khi window / yMax / highlight đổi (không phải khi tooltip đổi) -----
  	const svgContent = useMemo(() => {
    	const xOf = (v) => FRAME.x0 + ((v - win.st) / (win.end - win.st)) * (FRAME.x1 - FRAME.x0);
		// biên trái/phải của cột base thứ i = trung điểm tới base kề trước/sau
		const colSpan = (i) => {
			const p = d.pos[i];
			const prev = d.pos[i - 1] ?? p - 10;
			const next = d.pos[i + 1] ?? p + 10;
			const xl = xOf((prev + p) / 2);
			const xr = xOf((p + next) / 2);
			return { x: xl, w: xr - xl };
		};
		const pickRowFn = (row) => (e) => {
			e.stopPropagation();
			if (movedRef.current) return;
			setPickRow((r) => (r === row ? null : row));
		};

		// Kênh được highlight vẽ sau cùng để nằm trên.
		const channels = CHANNELS.map((ch) => ({
			...ch,
			stroke: pickRow || (hi && hi !== ch.base) ? ch.faint : ch.color,
			width: hi === ch.base ? 1.5 : 1,
		})).sort((a, b) => (a.base === hi) - (b.base === hi));

		const lines = channels.map((ch) =>
			buildSegments(gt[ch.key], win, yMax, xOf).map((pts, k) => (
				<polyline
					key={ch.base + k}
					points={pts}
					fill="none"
					stroke={ch.stroke}
					strokeWidth={ch.width}
					strokeLinejoin="round"
				/>
			))
		);
		let glow = null;
		if (pickRow && d.pos.length) {
			// kênh của base i theo hàng đã chọn; base lạ (N, H, M...) thì lấy kênh mạnh nhất tại đó
			const baseCh = (i) => {
				const c = d.calls[i];
				const b = pickRow === "alt2" && c.secondary === c.primary ? c.primary : rowBase(c, pickRow);
				const found = CHANNELS.find((x) => x.base === b);
				if (found) return found;
				const p = Math.round(d.pos[i]);
				const sorted = [...CHANNELS].sort((x, y) => Number(gt[y.key][p]) - Number(gt[x.key][p]));
				return sorted[pickRow === "alt2" ? 1 : 0];
			};

			// chia thành các "run" cùng kênh, ranh giới = giao điểm thật
			const runs = [];
			let cur = { ch: baseCh(0), s: { t: Math.max(0, d.pos[0] - 5), v: null } };
			for (let i = 1; i < d.pos.length; i++) {
				const ch = baseCh(i);
				if (ch.key !== cur.ch.key) {
					const cr = findCross(gt[cur.ch.key], gt[ch.key], d.pos[i - 1], d.pos[i]);
					cur.e = { t: cr.t, v: cr.vx };
					runs.push(cur);
					cur = { ch, s: { t: cr.t, v: cr.vy } };
				}
			}
			cur.e = { t: gt.peakA.length - 1, v: null };
			runs.push(cur);

			const yOf = (v) => FRAME.y1 - Math.min(v / yMax, 1) * (FRAME.y1 - FRAME.y0);
			const P = (t, v) => `${xOf(t).toFixed(1)},${yOf(v).toFixed(1)}`;

			glow = runs
				.filter((r) => r.e.t >= win.st - 1 && r.s.t <= win.end + 1)
				.map((r, k) => {
					const vals = gt[r.ch.key];
					const pts = [];
					if (r.s.v !== null) pts.push(P(r.s.t, r.s.v));                  // điểm giao đầu đoạn
					const from = Math.max(Math.ceil(r.s.t), Math.floor(win.st) - 1);
					const to = Math.min(Math.floor(r.e.t), Math.ceil(win.end) + 1);
					for (let t = from; t <= to; t++) {
						const v = Number(vals[t]);
						if (Number.isFinite(v) && v >= GAP_VALUE) pts.push(P(t, v));
					}
					if (r.e.v !== null) pts.push(P(r.e.t, r.e.v));                  // điểm giao cuối đoạn
					return (
						<polyline key={k} points={pts.join(" ")} fill="none" stroke={r.ch.color}
								strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
					);
				});
		}
		const unitsPerBase = (FRAME.x1 - FRAME.x0) / (win.end - win.st);
		const showLetters = unitsPerBase >= MIN_UNITS_PER_BASE;
		const COLOR = { A: "green", C: "blue", G: "black", T: "red" };
		const hatchId = clipId + "-hatch";
		const regions = gt.trimmed ? trimRegions(d.pos, gt.trimmed, d.maxX) : [];
		const trimLayer = regions
			.filter((r) => r.e > win.st && r.s < win.end)
			.map((r, k) => {
				const xa = xOf(Math.max(r.s, win.st));
				const xb = xOf(Math.min(r.e, win.end));
				return (
					<g key={"trim" + k} pointerEvents="none">
						<rect x={xa} y={FRAME.y0 - 5} width={xb - xa - 10} height={FRAME.y1 - FRAME.y0 + 5}
							fill={`url(#${hatchId})`} />
						{r.s >= win.st && (
							<line x1={xa} x2={xa} y1={FRAME.y0 - 5} y2={AXIS_Y} strokeWidth={0} stroke="#94A3B8"/> // Đường line ranh giới chuyển tiếp từ vùng base trimmed sang ko trimmed đầu trace
						)}
						{r.e <= win.end && (
							<line x1={xb} x2={xb} y1={FRAME.y0 - 5} y2={AXIS_Y} strokeWidth={0} stroke="#94A3B8"/> // Đường line ranh giới chuyển tiếp từ vùng base ko trimmed sang trimmed cuối trace
						)}
						{xb - xa > 70 && (
							<text x={(xa + xb) / 2} y={FRAME.y0 + 14} textAnchor="middle" fontSize={12} fill="#64748B">
								Trimmed ({r.to - r.from + 1} bases)
							</text>
						)}
					</g>
				);
			});
		const ticks = [];
		for (let i = 0; i < d.pos.length; i++) {
			const p = d.pos[i];
			if (!(p > win.st && p < win.end)) continue;
			const x = xOf(p);
			const call = d.calls[i];
			const num = i + 1;                          // pos 1-based
			const major = num % TICK_EVERY === 0;
			const het = call.secondary !== call.primary;
			const cons = gt.consensus?.[i] || call.primary;
			const { x: colX, w: colW } = colSpan(i);
			const colTop = CALL_Y - 20;
			const colH = ALT2_Y + 8 - colTop;
			const trimmed = !!gt.trimmed?.[i];
			ticks.push(
				<g
					key={i}
					opacity={trimmed ? 0.4 : 1}
					onMouseEnter={() => setHoverI(i)}
					onMouseLeave={() => { setHoverI(null); setTip(null); }}
					onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, base: call.primary, qual: gt.basecallQual?.[i] ?? "", pos: num })}
				>
					<rect x={colX} y={colTop} width={colW} height={colH} fill="transparent" />
					{/* tick + số pos: chỉ mỗi 25 base */}
					{major && (
						<>
							<line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 7} stroke="black" strokeWidth={0.1} />
							<text x={x} y={POS_Y} fontFamily="inherit" fontSize={10} textAnchor="middle">{num}</text>
							<line x1={x} x2={x} y1={FRAME.y0} y2={AXIS_Y} stroke="black" strokeWidth={0.25} strokeDasharray="3 3" opacity={1} pointerEvents="none" />
						</>
					)}

					{/* Base call trên peak */}
					{showLetters && (
						<text x={x} y={CALL_Y} fontFamily="inherit" fontSize={13}
							fontWeight={500} textAnchor="middle"
							fill={COLOR[cons] || "#333"}
							onClick={(e) => {
								setHi(null);
								pickRowFn(null)(e);
							}}
						>
							{cons}
						</text>
					)}
					{/* alt1 / alt2 nằm dưới pos */}
					{showLetters && (
						<g>
							<text x={x} y={ALT1_Y} fontFamily="inherit" fontSize={13} fontWeight={500} textAnchor="middle"
								fill={COLOR[call.primary] || "#333"}
								onClick={(e) => {
									setHi(null);
									pickRowFn("alt1")(e);
								}}
							>
								{call.primary}
							</text>
							<text x={x} y={ALT2_Y} fontFamily="inherit" fontSize={13} fontWeight={500} textAnchor="middle"
								fill={COLOR[call.secondary] || "#333"}
								onClick={(e) => {
									setHi(null);
									pickRowFn("alt2")(e);
								}}
							>
								{call.secondary}
							</text>
						</g>
					)}
				</g>
			);
		}

		// Toạ độ genomic hai đầu khung (chỉ khi có forward + refpos).
		const hasForward = trace.forward !== undefined;
		const coords = null;
		const orient = hasForward ? (isForward(trace.forward) ? " - forward" : " - reverse") : "";

		return (
			<>
				<defs>
					<clipPath id={clipId}>
						<rect x={FRAME.x0} y={FRAME.y0 - 5} width={FRAME.x1 - FRAME.x0 - 10} height={FRAME.y1 - FRAME.y0 + 5} />
					</clipPath>
					<pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<rect width="8" height="8" fill="#F1F5F9" opacity="0.7" />
						<line x1="0" y1="0" x2="0" y2="8" stroke="#CBD5E1" strokeWidth="2" />
					</pattern>
				</defs>
				{trimLayer}
				<g clipPath={`url(#${clipId})`}>{lines}{glow}</g> {/* Sanger trace */}
				{/* <<< Vùng bo quanh SEQ call từ sanger trace <<< */}
				<rect x={FRAME.x0 - 10} y={CALL_Y - 20} width={FRAME.x1 - (FRAME.x0 - 9)} height={30} rx={5} fill={pickRow == null ? UI.panel : "#ffff"} stroke={UI.border} /> 
				
				{/* >>> trục x và trục y của Sanger Trace >>> */}
				<line x1={FRAME.x0 - 10} y1={AXIS_Y} x2={FRAME.x1} y2={AXIS_Y} stroke="black" strokeWidth={0.1} strokeLinecap="square" />
				<line x1={FRAME.x0 - 10} y1={FRAME.y0 - 5 + 10} x2={FRAME.x0 - 10} y2={AXIS_Y} stroke="black" strokeWidth={0.1} strokeLinecap="square" />
				{/* <<< trục x và trục y của Sanger Trace <<< */}
				
				{/* >>> tick của trục y >>> */}
				{yTicks(yMax).map((t) => (
					<g key={t.value}>
						<line x1={FRAME.x0 - 15} y1={t.y} x2={FRAME.x0 - 10} y2={t.y} stroke="black" strokeWidth={0.1} />
						<text x={FRAME.x0 - 20} y={t.y + 3} fontFamily="inherit" fontSize={10} textAnchor="end">{t.value}</text>
					</g>
				))}
				{/* <<< tick của trục y <<< */}
				{/* Vùng bo quanh cả 2 dòng */}
				<rect x={FRAME.x0 - 10} y={ALT1_Y - 17} width={FRAME.x1 - FRAME.x0 + 9} height={51} rx={5} fill="#fff" stroke={UI.border} />

				{/* Dòng ALT1 */}
				<rect x={FRAME.x0 - 6} y={ALT1_Y - 14.5} width={FRAME.x1 - FRAME.x0 + 1} height={20} rx={4} fill={pickRow == "alt1" ? UI.panel : "#ffff"} />

				{/* Dòng ALT2 */}
				<rect x={FRAME.x0 - 6} y={ALT2_Y - 14.5} width={FRAME.x1 - FRAME.x0 + 1} height={20} rx={4} fill={pickRow == "alt2" ? UI.panel : "#ffff"} />				
				{hoverI !== null && (() => {
					const p = d.pos[hoverI];
					if (!(p > win.st && p < win.end)) return null;
					const { x, w } = colSpan(hoverI);
					const top = CALL_Y - 20;
					return (
						<rect x={x} y={top} width={w} height={ALT2_Y + 10 - top}
							fill="#3B82F6" opacity={0.1} pointerEvents="none" rx={5} />
					);
				})()}
				{ticks}
				<text x={FRAME.x0 - 15} y={ALT1_Y} onClick={pickRowFn("alt1")} fontFamily="inherit" fontSize={13} fontWeight={500} textAnchor="end">ALT1</text>
				<text x={FRAME.x0 - 15} y={ALT2_Y} onClick={pickRowFn("alt2")} fontFamily="inherit" fontSize={13} fontWeight={500} textAnchor="end">ALT2</text>
				{coords}
				{trace.refchr !== undefined && (
					<text x={500} y={AXIS_Y + 80} fontFamily="inherit" fontSize={15} textAnchor="middle">
						{trace.refchr + orient}
					</text>
				)}
			</>
		);
  	}, [win, yMax, hi, d, gt, trace, clipId, pickRow, hoverI]);

	// ----- Trình tự + reference -----
	const inView = (i) => d.pos[i] >= win.st && d.pos[i] <= win.end;
	const visibleIdx = () => d.pos.map((_, i) => i).filter(inView);

	const copyView = () => copyText(visibleIdx().map((i) => d.seq[i]).join(""));
	const copyRefView = () => {
		const idx = visibleIdx().map((i) => i + d.lg);
		if (!idx.length) return;
		copyText(d.refAlign.slice(Math.min(...idx), Math.max(...idx) + 1).replace(/-/g, ""));
	};

  	// Bôi đen một đoạn trình tự => căn giữa + zoom vào đoạn đó (+20% lề).
	const onSeqSelect = () => {
		const sel = window.getSelection();
		const root = seqRef.current;
		if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !root) return;
		const idxOf = (node) => {
			while (node && node !== root) {
				if (node.dataset && node.dataset.idx !== undefined) return parseInt(node.dataset.idx, 10);
				node = node.parentNode;
			}
			return null;
		};
		const r = sel.getRangeAt(0);
		let a = idxOf(r.startContainer);
		let b = idxOf(r.endContainer);
		if (a === null || b === null) return;
		if (r.endOffset === 0) b -= 1;
		if (a > b) [a, b] = [b, a];
		a = Math.max(0, a);
		b = Math.min(d.pos.length - 1, b);
		if (b < a) return;
		const sp = Math.max(MIN_SPAN, Math.max(1, d.pos[b] - d.pos[a] + 1) * 1.2);
		const c = (d.pos[a] + d.pos[b]) / 2;
		moveTo(c - sp / 2, c + sp / 2);
	};

	const Btn = ({ onClick, children, active, style }) => (
		<button 
			type="button" 
			onClick={onClick} 
			style={{ 
				...S.btn, 
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: "50px",
				height: "30px",
				...(active ? S.btnActive : null),
				...style
			}}
		>
			{children}
		</button>
  	);

	return (
		<div 
			className={className} 
			style={{ 
				position: "relative", 
				width: "100%",  
				display: "flex",
				flexDirection: 'column',
				gap: "20px"
			}}
		>
			<div style={S.toolbar}>
				<Btn onClick={() => moveTo(0, span)}>
					<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#555"><path d="M432-240 192-480l240-240 51 51-189 189 189 189-51 51Zm285 0L477-480l240-240 51 51-189 189 189 189-51 51Z"/></svg>
				</Btn>
				<Btn onClick={() => moveTo(win.st - span / 3, win.end - span / 3)}>
                	<svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="-150 -960 960 960" width="12px" fill="#555"><path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
				</Btn>
				<Btn onClick={() => moveTo(win.st + span / 3, win.end + span / 3)}>
                	<svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="#555"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>
				</Btn>
				<Btn onClick={() => {moveTo(d.maxX - span, d.maxX)}}>
                	<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#555"><path d="m242-200 200-280-200-280h98l200 280-200 280h-98Zm238 0 200-280-200-280h98l200 280-200 280h-98Z"/></svg>
				</Btn>
				<span style={{ width: 24 }} />
				{CHANNELS.map((ch) => (
					<Btn 
						key={ch.base} 
						active={hi === ch.base && !pickRow} 
						onClick={() => {setPickRow(null); setHi(ch.base)}}
						style={{
							color: ch.color
						}}
					>
						<strong>{ch.base}</strong>
					</Btn>
				))}
				<Btn active={hi === null && !pickRow} onClick={() => { setHi(null); setPickRow(null); }}>ACGT</Btn>
				<span style={{ width: 24 }} />
				<Btn active={pickRow === "alt1"} onClick={() => {setHi(null); setPickRow((r) => (r === "alt1" ? null : "alt1"))}}>ALT1</Btn>
				<Btn active={pickRow === "alt2"} onClick={() => {setHi(null); setPickRow((r) => (r === "alt2" ? null : "alt2"))}}>ALT2</Btn>
			</div>

			<div style={{ display: "flex", alignItems: "end", gap: "20px" }}>
				<div
					ref={tracesRef}
					onMouseDown={(e) => {
						if (e.button !== 0) return;
						movedRef.current = false;
						dragRef.current = { x: e.clientX, st: win.st, end: win.end };
						setDragging(true);
						e.preventDefault();
					}}
					style={{ 
						flex: 1, 
						minWidth: 0, 
						cursor: dragging ? "grabbing" : "grab",
						userSelect: "none",
						border: "1px solid #E2E8F0",
						padding: "10px 20px",
						boxSizing: 'border-box',
						borderRadius: "10px",
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="100%"
						viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB_H}`}
						shapeRendering="geometricPrecision"
						textRendering="geometricPrecision"
					>
						{svgContent}
					</svg>
				</div>

				{/* Thanh dọc: độ cao peak */}
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, flex: "none" }}>
					<span style={{ fontSize: 12, color: "#666" }}>{Math.pow(2, peakVal).toFixed(1)}x</span>
					<StepSlider vertical length={140} min={-2} max={3} value={peakVal} onChange={setPeak} title="Peak height" />
				</div>
			</div>

			{/* Thanh ngang: zoom */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 15, marginRight: "70px"}}>
				<span style={{ fontSize: 12, color: "#666" }}>{Math.pow(2, zoomVal).toFixed(1)}x</span>
				<StepSlider length={180} min={zoomMin} max={zoomMax} value={zoomVal} onChange={setZoom} title="Zoom" />
			</div>

			{tip && (
				<div style={{ ...S.tip, left: tip.x + 12, top: tip.y + 12 }}>
					<div><strong>Base:</strong> {tip.base}</div>
					<div><strong>Quality:</strong> {tip.qual}</div>
				</div>
			)}

			{/* <SeqPanel
				title="Chromatogram Sequence:"
				boxRef={seqRef}
				chars={d.seq}
				isHl={inView}
				onSelect={onSeqSelect}
				onCopyView={copyView}
				onCopyFull={() => copyText(d.seq)}
			/> */}
			{d.hasRef && (
				<SeqPanel
				title="Reference Sequence:"
				boxRef={refRef}
				chars={d.refAlign}
				isHl={(j) => {
					// ref gapped: base thứ i của trace ứng với ký tự i + leadingGaps
					const i = j - d.lg;
					return i >= 0 && i < d.pos.length && inView(i);
				}}
				onCopyView={copyRefView}
				onCopyFull={() => copyText(d.refGapless)}
				/>
			)}
		</div>
	);
}
function StepSlider({ value, min, max, onChange, vertical = false, length = 140, title }) {
	const clamp = (v) => Math.min(max, Math.max(min, v));
	const bump = (dir) => onChange(clamp(value + dir * 0.25));

	const stepBtn = {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "25px",
		height: "25px",
		padding: 0,
		background: "#FFFFFF",
		border: "1px solid #DCE4EE",
		borderRadius: "5px",
		color: "#475569",
		fontSize: "20px",
		fontWeight: 400,
		lineHeight: 1,
		cursor: "pointer",
		transition: "all 0.15s ease",
		boxSizing: "border-box"
	};

	const input = (style) => (
		<input
			className="zoom-slider"
			type="range" min={min} max={max} step={0.01} value={value} title={title}
			onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
			style={{ accentColor: "#1e88e5", cursor: "pointer", margin: 0, height: "2.5px", ...style }}
		/>
	);

	if (!vertical) {
		return (
		<div 
			style={{ 
				display: "flex", 
				alignItems: "center", 
				gap: 6, 
				height: "40px", 
				boxSizing: "border-box", 
				background: "#F8FAFC",
				border: "1px solid #E2E8F0",
				borderRadius: "10px",
				padding: "10px 10px",
			}}
		>
			<button 
				type="button" 
				style={stepBtn} 
				onClick={() => bump(-1)}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#F0F7FF";
					e.currentTarget.style.borderColor = "#93C5FD";
					e.currentTarget.style.color = "#1687E8";
				e.currentTarget.style.background = "#FFFFFF";
					}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "#FFFFFF";
					e.currentTarget.style.borderColor = "#DCE4EE";
					e.currentTarget.style.color = "#475569";
				}}
			>
				−
			</button>
			{input({ width: length })}
			<button 
				type="button" 
				style={stepBtn} 
				onClick={() => bump(1)}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#F0F7FF";
					e.currentTarget.style.borderColor = "#93C5FD";
					e.currentTarget.style.color = "#1687E8";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = "#DCE4EE";
					e.currentTarget.style.color = "#475569";
				}}
			>
				+
			</button>
		</div>
		);
	}

  // Thanh dọc: xoay input ngang -90° (tương thích mọi trình duyệt). Trên = lớn hơn.
	return (
		<div 
			style={{ 
				display: "flex", 
				flexDirection: "column", 
				alignItems: "center", 
				width: "40px",
				gap: 6, 
				boxSizing: "border-box",
				background: "#F8FAFC",
				border: "1px solid #E2E8F0",
				borderRadius: "10px",
				padding: "10px 10px",
			}}
		>
			<button 
				type="button" 
				style={stepBtn} 
				onClick={() => bump(1)}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#F0F7FF";
					e.currentTarget.style.borderColor = "#93C5FD";
					e.currentTarget.style.color = "#1687E8";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = "#DCE4EE";
					e.currentTarget.style.color = "#475569";
				}}
			>
				+
			</button>
			<div style={{ position: "relative", width: 20, height: length }}>
				{input({
					position: "absolute", left: 7.5, top: length,
					width: length, height: 2.5,
					transform: "rotate(-90deg)", transformOrigin: "0 0",
				})}
			</div>
			<button 
				type="button" 
				style={stepBtn} 
				onClick={() => bump(-1)}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "#F0F7FF";
					e.currentTarget.style.borderColor = "#93C5FD";
					e.currentTarget.style.color = "#1687E8";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = "#DCE4EE";
					e.currentTarget.style.color = "#475569";
				}}
			>
				−
			</button>
		</div>
	);
}

function SeqPanel({ title, boxRef, chars, isHl, onSelect, onCopyView, onCopyFull }) {
	return (
		<div style={{ marginTop: 16 }}>
		<p style={{ margin: "0 0 4px" }}>{title}</p>
		<div
			ref={boxRef}
			onMouseUp={onSelect}
			onKeyUp={onSelect}
			style={S.seqBox}
		>
			{Array.from(chars, (c, i) => {
			const on = isHl(i);
			return (
				<span
				key={i}
				data-idx={i}
				data-hl={on ? "1" : undefined}
				style={on ? { color: "#007bff", fontWeight: 700 } : undefined}
				>
				{c}
				</span>
			);
			})}
		</div>
		<div style={{ marginTop: 4, display: "flex", gap: 8 }}>
			<button type="button" style={S.btn} onClick={onCopyView}>Copy view range</button>
			<button type="button" style={S.btn} onClick={onCopyFull}>Copy full</button>
		</div>
		</div>
	);
}

// ---------- Style (inline, không phụ thuộc Bootstrap) ----------
const S = {
	toolbar: { 
		display: "flex", 
		gap: 4, 
		alignItems: "center", 
		minWidth: "calc(100vw - 100px * 2 )", 
		justifyContent: "end",
		paddingRight: "60px",
		boxSizing: 'border-box'
	},
	btn: {
		font: "inherit",
		fontSize: 14,
		padding: "4px 10px",
		background: "#fff",
		color: "#333",
		border: "1px solid #888",
		borderRadius: 4,
		cursor: "pointer",
	},
	btnActive: { background: "#333", color: "#fff" },
	seqBox: {
		position: "relative",
		height: "7em",
		overflowY: "auto",
		padding: "6px 10px",
		border: "1px solid #ccc",
		borderRadius: 4,
		fontFamily: "monospace",
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere", // CSS tự xuống dòng, không cần tính wrapLen bằng JS như bản gốc
		cursor: "text",
	},
	tip: {
		position: "fixed",
		pointerEvents: "none",
		background: "rgba(255,255,255,0.95)",
		border: "1px solid #ccc",
		borderRadius: 4,
		padding: 6,
		fontSize: 12,
		zIndex: 10,
	},
	error: { padding: 12, border: "1px solid #c00", borderRadius: 4, color: "#900", background: "#fdecec" },
};
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Nén một khối thành 1 block BGZF
async function bgzfBlock(chunk) {
    const cs = new CompressionStream("deflate-raw");
    const w = cs.writable.getWriter();
    w.write(chunk); w.close();
    const deflated = new Uint8Array(await new Response(cs.readable).arrayBuffer());

    // CRC32 của dữ liệu gốc
    let crc = ~0;
    for (let i = 0; i < chunk.length; i++) {
        crc ^= chunk[i];
        for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
    crc = ~crc >>> 0;

    const total = 18 + deflated.length + 8;             // header 18 + data + footer 8
    const out = new Uint8Array(total);
    const dv = new DataView(out.buffer);
    out.set([0x1f, 0x8b, 8, 4, 0, 0, 0, 0, 0, 0xff, 6, 0, 0x42, 0x43, 2, 0]);
    dv.setUint16(16, total - 1, true);                   // BSIZE = tổng - 1
    out.set(deflated, 18);
    dv.setUint32(18 + deflated.length, crc, true);       // CRC32
    dv.setUint32(22 + deflated.length, chunk.length, true); // ISIZE
    return out;
}

export async function bgzip(text) {
    const data = new TextEncoder().encode(text);
    const parts = [];
    const SIZE = 0xff00;                                  // < 64KB để block luôn vừa
    for (let i = 0; i < data.length; i += SIZE) {
        parts.push(await bgzfBlock(data.subarray(i, i + SIZE)));
    }
    parts.push(new Uint8Array([                           // khối EOF chuẩn của BGZF
        0x1f,0x8b,8,4,0,0,0,0,0,0xff,6,0,0x42,0x43,2,0,0x1b,0,3,0,0,0,0,0,0,0,0,0
    ]));
    return new Blob(parts);
}

async function toText(f) {
    if (typeof f === "string") return f;
    if (f instanceof Blob) return f.text();
    return new TextDecoder().decode(f); // Uint8Array
}

export function parseTracyTsv(text, traceFileName = "", trimOpts = {}) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) throw new Error("TSV is empty");

    const header = lines[0].split("\t").map((h) => h.trim());
    const col = {};
    header.forEach((h, i) => (col[h] = i));
    for (const k of ["pos", "peakA", "peakC", "peakG", "peakT", "basenum", "primary", "secondary", "qual"]) {
        if (!(k in col)) throw new Error(`TSV miss column "${k}"`);
    }

    const GAP = -99; // TraceView coi giá trị < -90 là lỗ hổng (ngắt đường)
    const num = (s) => {
        const v = Number(s);
        return s === undefined || s === "NA" || !Number.isFinite(v) ? null : v;
    };

    const peakA = [];
    const peakC = [];
    const peakG = [];
    const peakT = [];
    const basecallPos = [];
    const basecallQual = [];
    const basecalls = {};
    const consensusArr = [];
    const trimRaw = [];

    for (let r = 1; r < lines.length; r++) {
        const f = lines[r].split("\t");
        const i = r - 1; // chỉ số mẫu 0-based (dòng đầu tiên của dữ liệu = mẫu 0)
        peakA.push(num(f[col.peakA]) ?? GAP);
        peakC.push(num(f[col.peakC]) ?? GAP);
        peakG.push(num(f[col.peakG]) ?? GAP);
        peakT.push(num(f[col.peakT]) ?? GAP);

        const basenum = num(f[col.basenum]);
        if (basenum === null) continue;
        trimRaw.push(col.trim !== undefined ? (f[col.trim] ?? "").trim() : "");

        const primary = f[col.primary];
        const secondary = f[col.secondary];
        // nhãn "n:P" hoặc "n:P/S" - đúng định dạng mà TraceView parse
        basecalls[i] = `${basenum}:${primary}` + (secondary && secondary !== "NA" && secondary !== primary ? `/${secondary}` : "");
        basecallPos.push(i);
        basecallQual.push(num(f[col.qual]) ?? 0);
        const cons = col.consensus !== undefined ? f[col.consensus] : undefined;
        consensusArr.push(cons && cons !== "NA" ? cons : primary);
    }

    // Cột trim của tracy: Y = bị trim, N = giữ lại
    const isTrimVal = (v) => /^(y|yes|true|t|1)$/i.test(v);

    const n = basecallPos.length;
    let trimmed;
    if (col.trim !== undefined) {
        trimmed = trimRaw.map(isTrimVal);
    } else {
        const L = Math.min(trimOpts.left || 0, n), R = Math.min(trimOpts.right || 0, n);
        trimmed = basecallPos.map((_, i) => i < L || i >= n - R);
    }

    console.log("[trim] source:", col.trim !== undefined ? "column" : "options",
        "| bases:", n, "| distinct:", [...new Set(trimRaw)],
        "| trimmed:", trimmed.filter(Boolean).length, "| kept:", trimmed.filter((t) => !t).length);

    return { traceFileName, peakA, peakC, peakG, peakT, basecallPos, basecallQual, consensus: consensusArr, trimmed, basecalls };
}

function VcfView({ text }) {
    if (!text) return null;
    const lines = text.replace(/\s+$/, "").split(/\r?\n/);
    return (
        <div style={{ width: "100%", boxSizing: "border-box", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, background: "#fff" }}>
            <pre style={{
                margin: 0, padding: 12, background: "#F1F5F9", borderRadius: 8, overflowX: "auto",
                fontFamily: "Consolas, monospace", fontSize: 13, lineHeight: "20px", color: "#334155",
            }}>
                {lines.map((l, i) => (
                    <div key={i} style={
                        l.startsWith("##") ? { color: "#94A3B8" }
                        : l.startsWith("#") ? { fontWeight: 700, color: "#0C447C" }
                        : undefined
                    }>
                        {l}
                    </div>
                ))}
            </pre>
        </div>
    );
}

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

export const DECOMPOSE_STAGES = [
    { id: "validate", title: "Input validation" },
    { id: "exec",     title: "Execute idxstats" },
    { id: "init",     title: "Build tracy index" },
    { id: "vcf",      title: "Convert BCF to VCF" },
    { id: "collect",  title: "Collect output" },
];

function TracyDecompose () {
    const { run, loading, error } = useTracy();
    const { run: runBcftools } = useBcftools();
    const exec = useExecution(DECOMPOSE_STAGES);

    // Generic options
    const [inputFile, setInputFile] = useState(null); // INPUT
    const [refFastaFile, setRefFastaFile] = useState(null); // -r [ --genome ] arg    (gzipped) fasta or wildtype ab1 file   
    const [refMode, setRefMode] = useState("text");   // "file" | "text"
    const [refText, setRefText] = useState("");
    const [peakRatio, setPeakRatio] = useState("0.330000013") // -p [ --pratio ] arg (=0.330000013)    peak ratio to call base
    const [peakRatioFocused, setPeakRatioFocused] = useState(false)
    const [kmerSize, setKmerSize] = useState("15") // -k [ --kmer ] arg (=15)    kmer size
    const [kmerSizeFocused, setKmerSizeFocused] = useState(false)
    const [minKmerSupport, setMinKmerSupport] = useState("3") //  -s [ --support ] arg (=3)    min. kmer support
    const [minKmerSupportFocused, setMinKmerSupportFocused] = useState(false)
    const [maxIndelSize, setMaxIndelSize] = useState("1000") // -i [ --maxindel ] arg (=1000)    max. indel size in Sanger trace
    const [maxIndelSizeFocused, setMaxIndelSizeFocused] = useState(false)
    const [annotateOption, setAnnotateOption] = useState(null) // -a [ --annotate ] arg    annotate variants [homo_sapiens|homo_sapiens_hg19|mus_musculus|danio_rerio|...]
    const [isCallVariants, setIsCallVariants] = useState(true) // -v [ --callVariants ]    call variants in trace
    // Alignment options
    const [gapOpen, setGapOpen] = useState("-10") // -g [ --gapopen ] arg (=-10)    gap open
    const [gapOpenFocused, setGapOpenFocused] = useState(false)
    const [gapExtension, setGapExtension] = useState("-4") // -e [ --gapext ] arg (=-4)    gap extension
    const [gapExtensionFocused, setGapExtensionFocused] = useState(false)
    const [match, setMatch] = useState("3") // -m [ --match ] arg (=3)    match
    const [matchFocused, setMatchFocused] = useState(false)
    const [mismatch, setMismatch] = useState("-5") // -n [ --mismatch ] arg (=-5)    mismatch
    const [mismatchFocused, setMismatchFocused] = useState(false)
    // Trimming options
    const [leftChromatogramTrimSize, setLeftChromatogramTrimSize] = useState("50");
    const [leftChromatogramTrimSizeFocused, setLeftChromatogramTrimSizeFocused] = useState(false);
    const [rightChromatogramTrimSize, setRightChromatogramTrimSize] = useState("50");
    const [rightChromatogramTrimSizeFocused, setRightChromatogramTrimSizeFocused] = useState(false);

    const [vcfText, setVcfText] = useState("");    
    // File reference thực sự dùng để chạy (từ file chọn hoặc từ text)
    const buildRefFile = async () => {
        if (refMode === "file") return refFastaFile;
        const t = refText.trim();
        if (!t) return null;
        const body = (t.startsWith(">") ? t : `>reference\n${t}`) + "\n";
        return new File([await bgzip(body)], "pasted_reference.fa.gz", { type: "application/gzip" });
    };

    const [outputAlign1File, setOutputAlign1File] = useState()
    const [outputAlign2File, setOutputAlign2File] = useState()
    const [outputAlign3File, setOutputAlign3File] = useState()
    const inputFileRef = useRef(null);
    const refFastaFileRef = useRef(null);
    const [alignItems, setAlignItems] = useState([]);
    

    const [traceData, setTraceData] = useState(null);

    const [moreOptions, setMoreOptions] = useState(false);
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

    const handleInputFile = (e) => {

        const selectedInputFile = e.target.files[0];

        if (selectedInputFile) {
            setInputFile(selectedInputFile);
            // setRows(null);
        }
    };

    const chooseInputFile = () => {
        if (locked) return;
        inputFileRef.current.click();
    };
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        const handleRefFastaFile = (e) => {
        const selectedRefFastaFile = e.target.files[0];

        if (selectedRefFastaFile) {
            setRefFastaFile(selectedRefFastaFile);
            // setResult(null);
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
        if (inputFile) setValidationError("");
    }, [inputFile]);
    
    const handleRun = async () => {
        const refFile = await buildRefFile();
        const missing = [];
        if (!inputFile) missing.push("Input file");
        if (!refFile) missing.push("Reference");

        if (missing.length > 0) {
            setValidationError(`Please choose: ${missing.join(" and ")}`);
            return;
        }
        setValidationError("");
        // ---------- Build options ----------
        const opts = [];
        
        opts.push("-r", `{${refFile.name}}`) // Required        
        opts.push("-l", "100") // Default by WASM
        opts.push("-o", `/tmp/${inputFile.name}`) // Default by WASM
        if (leftChromatogramTrimSize !== "")    opts.push("-q", leftChromatogramTrimSize);
        if (rightChromatogramTrimSize !== "")   opts.push("-u", rightChromatogramTrimSize);
        if (isCallVariants)                     opts.push("-v")        
        // ---------- Chạy pipeline có panel ----------
        await exec.execute(async ({ step, setLog }) => {
            setLog({
                command: `tracy decompose ${opts.join(" ")} ${inputFile.name}`.replace(/\s+/g, " "),
            });
            // Stage 1: không có bước con => chỉ có dòng tóm tắt
            await step("validate", async () => { }, {
                running: "Validating input files",
                done: "Input file validated",
            });
            // Stage 2: mỗi nhánh là một bước cụ thể
            const indexFileName = refFile.name.replace(/\.gz$/, ".fm9")
            const idxFileCheckName = refFile.name.replace(/\.gz$/, ".fm9_check")
            const [idxFile, idxFileCheck] = await step(
                "init",
                async ({ sub }) => {
                    return sub("Generating index with tracy index", async () => {
                        const r1 = await run(["index", "-o", `/tmp/${refFile.name.replace(/\.gz$/, ".fm9")}`, `{${refFile.name}}`], [refFile], [indexFileName, idxFileCheckName]);
                        if (!r1 || r1.code !== 0 || !r1.results[indexFileName])
                            throw new Error(r1?.stderr || error || "Failed to create index");
                        return [new File([r1.results[indexFileName]], indexFileName), new File([r1.results[idxFileCheckName]], idxFileCheckName)];
                    });
                },
                { running: "Preparing index", done: "Samtools module initialized" }
            );
            // Stage 3
            const r2 = await step(
                "exec",
                async ({ sub }) =>
                    sub("Running tracy decompose", async () => {
                        const r = await run(
                            ["decompose", ...opts, `{${inputFile.name}}`],
                            [inputFile, refFile, idxFile, idxFileCheck], [`${inputFile.name}.abif`, `${inputFile.name}.align1`, `${inputFile.name}.align2`, `${inputFile.name}.align3`, `${inputFile.name}.bcf`], {forceMode: "ram"}
                        );
                        if (!r || r.code !== 0) throw new Error(r?.stderr || error || "decompose failed");
                        return r;
                    }),
                { running: "Processing input data", done: "Input data processed" }
            );
            const bcfName = `${inputFile.name}.bcf`;
            const vcf = await step(
                "vcf",
                async ({ sub }) =>
                    sub("Running bcftools view", async () => {
                        const bcf = r2.results[bcfName];
                        if (!bcf) throw new Error(`Tracy did not produce ${bcfName}`);
                        const r3 = await runBcftools(
                            ["view", `{${bcfName}}`],
                            [new File([bcf], bcfName)],
                            []
                        );
                        if (!r3 || r3.code !== 0) throw new Error(r3?.stderr || "bcftools view failed");
                        return r3.stdout;
                    }),
                { running: "Converting BCF to VCF", done: "VCF ready" }
            );
            // Stage 4: nhiều bước con liên tiếp, mỗi bước giữ thời gian riêng
            await step(
                "collect",
                async ({ sub }) => {
                    await sub("Updating result", async () => {
                        setLog({ stdout: r2.stdout, stderr: r2.stderr ?? "" });
                        const resultFiles = r2.results
                        const items = [];
                        for (const k of [1, 2, 3]) {
                            const f = resultFiles[`${inputFile.name}.align${k}`];
                            if (f) items.push({ label: `Align ${k}`, text: await toText(f) });
                        }
                        setAlignItems(items);
                        const tsvFile = resultFiles[`${inputFile.name}.abif`]; // đổi đuôi nếu Tracy đặt tên khác
                        if (tsvFile) {
                            setTraceData(parseTracyTsv(await toText(tsvFile), inputFile.name, {
                                left: parseInt(leftChromatogramTrimSize, 10) || 0,
                                right: parseInt(rightChromatogramTrimSize, 10) || 0,
                            }));
                        }
                        setVcfText(vcf);
                    });
                },
                { running: "Collecting output", done: "Output ready" }
            );
        });

    };

    return (
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
                                accept=".scf, .abi, .ab1, .ab!, .ab"
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
                                        {UploadFileIcon()}
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
                                        style={fileBtnStyle()}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "#ffffff";
                                        }}
                                    >
                                        {ChangeFileIcon()}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
                            Left Chromatogram Trim Size
                        </span>
                    </span>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={leftChromatogramTrimSize}
                        onChange={(e) => setLeftChromatogramTrimSize(e.target.value.replace(/\D/g, ""))}
                        onFocus={() => setLeftChromatogramTrimSizeFocused(true)}
                        onBlur={() => {
                            setLeftChromatogramTrimSizeFocused(false);
                            const n = parseInt(leftChromatogramTrimSize, 10);
                            // rỗng/0 -> để trống (không truyền tham số), còn lại giữ số nguyên dương
                            setLeftChromatogramTrimSize(leftChromatogramTrimSize ==="" || Number.isNaN(n) || n <= 0 ? "0" : String(n));
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
                            borderColor: leftChromatogramTrimSizeFocused ? "#FF7F50" : "transparent",
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
                        borderRadius: "5px",
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
                            Right Chromatogram Trim Size
                        </span>
                    </span>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={rightChromatogramTrimSize}
                        onChange={(e) => setRightChromatogramTrimSize(e.target.value.replace(/\D/g, ""))}
                        onFocus={() => setRightChromatogramTrimSizeFocused(true)}
                        onBlur={() => {
                            setRightChromatogramTrimSizeFocused(false);
                            const n = parseInt(rightChromatogramTrimSize, 10);
                            // rỗng/0 -> để trống (không truyền tham số), còn lại giữ số nguyên dương
                            setRightChromatogramTrimSize(rightChromatogramTrimSize ==="" || Number.isNaN(n) || n <= 0 ? "0" : String(n));
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
                            borderColor: rightChromatogramTrimSizeFocused ? "#FF7F50" : "transparent",
                        }}
                    />
                </div>
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
                    </span>
                    <div 
                        style={{ 
                            display: "flex", 
                            borderRadius: 5,
                            width: 300,
                            background: "#d2e2fc",
                            padding: "3px 3px",
                            boxSizing: "border-box"
                        }}
                    >
                        {[["text", "Text"], ["file", "Upload file"], ].map(([m, label]) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => !locked && setRefMode(m)}
                                style={{
                                    padding: "4px 12px", 
                                    fontSize: 12, 
                                    borderRadius: 5,
                                    cursor: "pointer",
                                    background: refMode === m ? "#fff" : "#d2e2fc",
                                    border: refMode === m ? "1px solid #CBD5E1" : "1px solid #d2e2fc", 
                                    color: refMode === m  ? "#2563EB" : "#64748B",
                                    display: 'flex',
                                    alignItems: "center",
                                    gap: "5px",
                                    width: "50%",
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    justifyContent: "center",
                                    boxSizing: "border-box"
                                }}
                            >
                                {m == "file" && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="20px" width="20px" fill={refMode === m  ? "#2563EB" : "#64748B"}><path d="M11,16V7.85l-2.6,2.6L7,9l5-5l5,5l-1.4,1.45L13,7.85V16H11ZM6,20q-0.82,0-1.41-0.59T4,18V15H6v3H18V15h2v3q0,0.82-0.59,1.41T18,20H6Z"/></svg>
                                )}
                                {label}
                            </button>
                        ))}
                    </div>
                    {refMode === "file" && (
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
                                    accept=".fa.gz, .fasta.gz, .fna.gz"
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
                                            {UploadFileIcon()}
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
                                            {ChangeFileIcon()}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {refMode === "text" && (
                        <textarea
                            value={refText}
                            onChange={(e) => setRefText(e.target.value)}
                            disabled={locked}
                            spellCheck={false}
                            placeholder={">gene\nATGCGT..."}
                            rows={8}
                            style={{
                                width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 5,
                                border: "1px solid transparent", backgroundColor: "#F1F5F9",
                                fontFamily: "monospace, Consolas", fontSize: 13, resize: "vertical", outline: "none",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#FF7F50")}
                            onBlur={(e) => (e.target.style.borderColor = "transparent")}
                        />
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
                                    Peak ratio 
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
                                            -p [ --pratio ]
                                        </span>
                                        <span>
                                            Peak ratio to call base
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={peakRatio}
                                onChange={(e) => setPeakRatio(e.target.value.replace(/\D/g, ""))}
                                onFocus={() => setPeakRatioFocused(true)}
                                onBlur={() => {
                                    setPeakRatioFocused(false);
                                    const n = parseFloat(String(peakRatio).replace(",", "."));
                                    // rỗng/0 -> để trống (không truyền tham số), còn lại giữ số nguyên dương
                                    setPeakRatio(Number.isNaN(n) || n <= 0 ? "0.330000013" : String(n));
                                }}
                                disabled={locked}
                                placeholder="0.330000013"
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
                                    borderColor: peakRatioFocused ? "#FF7F50" : "transparent",
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
                                    Kmer size
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
                                            -k [ --kmer ]
                                        </span>
                                        <span>
                                            Kmer size
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={kmerSize}
                                onChange={(e) => {
                                    // chỉ giữ lại chữ số
                                    setKmerSize(e.target.value.replace(/\D/g, ""));
                                }}
                                onBlur={() => {
                                    setKmerSizeFocused(false);
                                    const n = parseInt(kmerSize, 10);
                                    setKmerSize(Number.isNaN(n) || n <= 0 ? "15" : String(n));
                                }}
                                onFocus={() => setKmerSizeFocused(true)}
                                disabled={locked}
                                placeholder="15"
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
                                    borderColor: kmerSizeFocused ? "#FF7F50" : "transparent",
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
                                    Minimum kmer support
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
                                            -s [ --support ] 
                                        </span>
                                        <span>
                                            Minimum kmer support
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={minKmerSupport}
                                onChange={(e) => {
                                    // chỉ giữ lại chữ số
                                    setMinKmerSupport(e.target.value.replace(/\D/g, ""));
                                }}
                                onBlur={() => {
                                    setMinKmerSupportFocused(false);
                                    const n = parseInt(minKmerSupport, 10);
                                    setMinKmerSupport(Number.isNaN(n) || n <= 0 ? "3" : String(n));
                                }}
                                onFocus={() => setMinKmerSupportFocused(true)}
                                disabled={locked}
                                placeholder="15"
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
                                    borderColor: minKmerSupportFocused ? "#FF7F50" : "transparent",
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
                                    Maximum indel size 
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
                                            -i [ --maxindel ]
                                        </span>
                                        <span>
                                            Maximum indel size in Sanger trace
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={maxIndelSize}
                                onChange={(e) => {
                                    // chỉ giữ lại chữ số
                                    setMaxIndelSize(e.target.value.replace(/\D/g, ""));
                                }}
                                onBlur={() => {
                                    setMaxIndelSizeFocused(false);
                                    const n = parseInt(maxIndelSize, 10);
                                    setMaxIndelSize(Number.isNaN(n) || n <= 0 ? "1000" : String(n));
                                }}
                                onFocus={() => setMaxIndelSizeFocused(true)}
                                disabled={locked}
                                placeholder="1000"
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
                                    borderColor: maxIndelSizeFocused ? "#FF7F50" : "transparent",
                                }}
                            />
                        </div>                                           
                    </div>  
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
                                    Gap open
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
                                            -g [ --gapopen ]
                                        </span>
                                        <span>
                                            Gap open
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={gapOpen}
                                onChange={(e) => setGapOpen(e.target.value)}
                                onFocus={() => setGapOpenFocused(true)}
                                onBlur={() => {
                                    setGapOpenFocused(false);
                                    const n = parseInt(gapOpen, 10);
                                    setGapOpen(Number.isNaN(n) ? "-10" : String(n));
                                }}
                                disabled={locked}
                                placeholder="-10"
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
                                    borderColor: gapOpenFocused ? "#FF7F50" : "transparent",
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
                                    Gap extension
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
                                            -e [ --gapext ]
                                        </span>
                                        <span>
                                            Gap extension
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={gapExtension}
                                onChange={(e) => {
                                    // chỉ giữ lại chữ số
                                    setGapExtension(e.target.value);
                                }}
                                onBlur={() => {
                                    setGapExtensionFocused(false);
                                    const n = parseInt(gapExtension, 10);
                                    setGapExtension(Number.isNaN(n) ? "-4" : String(n));
                                }}
                                onFocus={() => setGapExtensionFocused(true)}
                                disabled={locked}
                                placeholder="15"
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
                                    borderColor: gapExtensionFocused ? "#FF7F50" : "transparent",
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
                                    Match
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
                                            -m [ --match ]  
                                        </span>
                                        <span>
                                            Match
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={match}
                                onChange={(e) => {
                                    // chỉ giữ lại chữ số
                                    setMatch(e.target.value.replace(/\D/g, ""));
                                }}
                                onBlur={() => {
                                    setMatchFocused(false);
                                    const n = parseInt(match, 10);
                                    setMatch(Number.isNaN(n) || n <= 0 ? "3" : String(n));
                                }}
                                onFocus={() => setMatchFocused(true)}
                                disabled={locked}
                                placeholder="3"
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
                                    borderColor: matchFocused ? "#FF7F50" : "transparent",
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
                                    Mismatch 
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
                                            -n [ --mismatch ]
                                        </span>
                                        <span>
                                            Mismatch
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={mismatch}
                                onChange={(e) => {
                                    // chỉ giữ lại chữ số
                                    setMismatch(e.target.value);
                                }}
                                onBlur={() => {
                                    setMismatchFocused(false);
                                    const n = parseInt(mismatch, 10);
                                    setMismatch(Number.isNaN(n) ? "-5" : String(n));
                                }}
                                onFocus={() => setMismatchFocused(true)}
                                disabled={locked}
                                placeholder="-5"
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
                                    borderColor: mismatchFocused ? "#FF7F50" : "transparent",
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
                            gap: "10px",
                            width:"710px"
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
                                    Annotate variants
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
                                            -a [ --annotate ]
                                        </span>
                                        <span>
                                            Annotate variants [homo_sapiens|homo_sapiens_hg19|mus_musculus|danio_rerio|...]
                                        </span>
                                    </div>
                                </HelpTip>
                            </span>
                            <select value={annotateOption} onChange={(e) => setAnnotateOption(e.target.value)} style={{width: "50%", border: "1px solid #cfcfcf", borderRadius: "5px", padding: "5px 10px", background: "#fff", boxSizing: "border-box", fontFamily:"inherit", fontSize: "13px", fontWeight: "500", color: "#555"}}>
                                <option style={{fontFamily:"inherit", fontSize: "13px", fontWeight: "500", color: "#555"}} value="homo_sapiens">Homo sapiens</option>
                                <option style={{fontFamily:"inherit", fontSize: "13px", fontWeight: "500", color: "#555"}} value="homo_sapiens_hg19">Homo sapiens hg19</option>
                                <option style={{fontFamily:"inherit", fontSize: "13px", fontWeight: "500", color: "#555"}} value="mus_musculus">Mus musculus</option>
                                <option style={{fontFamily:"inherit", fontSize: "13px", fontWeight: "500", color: "#555"}} value="danio_rerio">Danio rerio</option>
                            </select>
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
                                        checked={isCallVariants}
                                        onChange={(e) => setIsCallVariants(e.target.checked)}
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
                                            backgroundColor: isCallVariants ? "#FF7F50" : "#fff",
                                            backgroundImage: isCallVariants
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
                                            Call variants in trace
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
                                                    -v [ --callVariants ]
                                                </span>
                                                <span>
                                                    Call variants in trace
                                                </span>
                                            </div>
                                        </HelpTip>
                                    </span>
                                </label>
                            </div>
                        </div>                        
                    </div>
                </div>
            )}            
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
            <ExecutionPanel exec={exec} toolName="Samtools idxstats" />
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
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "20px"
                }}
            >
                {traceData && <SangerTraceView data={traceData} />}
                {alignItems.length > 0 && <AlignmentView items={alignItems} />}
                {vcfText && <VcfView text={vcfText} />}
                {!traceData && alignItems.length === 0 && !vcfText && (
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
                        title="No decompose result yet"
                        description="Upload a Sanger trace file (.ab1) and a reference sequence to decompose the heterozygous indel into its two alleles"
                    />                    
                )}
            </div>
        </div>
    )
}
export default TracyDecompose;