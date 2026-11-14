import { useEffect, useId, useMemo, useRef, useState } from "react";

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
	for (const k of ["basecallQual", "consensus"]) if (k in res) out.gappedTrace[k] = res[k];
    for (const k of ["refchr", "refpos", "refalign", "forward"]) if (k in res) out[k] = res[k];
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
export default function SangerTraceView({ data, className}) {
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
			ticks.push(
				<g
					key={i}
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
						<rect x={FRAME.x0} y={FRAME.y0 - 5} width={FRAME.x1 - FRAME.x0} height={FRAME.y1 - FRAME.y0 + 5} />
					</clipPath>
				</defs>

				<g clipPath={`url(#${clipId})`}>{lines}{glow}</g>
				<rect x={FRAME.x0 - 10} y={CALL_Y - 20} width={FRAME.x1 - (FRAME.x0 - 9)} height={30} rx={5} fill={pickRow == null ? UI.panel : "#ffff"} stroke={UI.border} /> {/* <<< Vùng bo quanh SEQ call từ sanger trace <<< */}
				
				{/* >>> trục x và trục y của Sanger Trace >>> */}
				<line x1={FRAME.x0 - 10} y1={AXIS_Y} x2={FRAME.x1 + 10} y2={AXIS_Y} stroke="black" strokeWidth={0.1} strokeLinecap="square" />
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
						active={hi === ch.base} 
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
				<Btn active={pickRow === "alt1"} onClick={() => setPickRow((r) => (r === "alt1" ? null : "alt1"))}>ALT1</Btn>
				<Btn active={pickRow === "alt2"} onClick={() => setPickRow((r) => (r === "alt2" ? null : "alt2"))}>ALT2</Btn>
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