import { useRef, useState, useEffect, useMemo } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
import useBcftools from '../../../hooks/useBcftools.js'
import ExecutionPanel from '../../../components/ui/ExecutionPanel.jsx';
import useExecution from '../../../hooks/useExecution'
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ChangeFileIcon from "../../../components/ui/ChangeFileIcon.jsx"
import UploadFileIcon from "../../../components/ui/UploadFileIcon.jsx";

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

const COL = {
    snp: "#3b6db4",
    indel: "#e5484d",
    teal: "#12a594",
    amber: "#f5a524",
    violet: "#8e4ec6",
    gray: "#6b7280"
};
const fmt = (n) => Number(n).toLocaleString();

function parseStats(text) {
    const d = { src: "", sn: {}, tstv: null, st: [], idd: [], dp: [], qual: [], af: [] };
    for (const line of text.split(/\r?\n/)) {
        if (!line || line[0] === "#") continue;
        const c = line.split("\t");
        if (c[0] === "ID") d.src = c[2] || "";
        else if (c[0] === "SN") d.sn[c[2].replace(/:$/, "").replace("number of ", "")] = +c[3];
        else if (c[0] === "TSTV") d.tstv = { ts: +c[2], tv: +c[3], ratio: +c[4] };
        else if (c[0] === "ST") d.st.push([c[2], +c[3]]);
        else if (c[0] === "IDD") d.idd.push([+c[2], +c[3]]);          // [độ dài, số site]
        else if (c[0] === "DP") d.dp.push([c[2], +c[5]]);             // [bin, số site]
        else if (c[0] === "QUAL") d.qual.push([+c[2], +c[3], +c[6]]); // [QUAL, SNP, indel]
        else if (c[0] === "AF") d.af.push(+c[2]);
    }
    return d;
}

function buildConfigs(d, logIdd) {
    const sn = d.sn;
    const base = { maintainAspectRatio: false };

    // 1. Loại biến thể
    const types = [
        ["SNP", sn.SNPs, COL.snp], ["Indel", sn.indels, COL.indel], ["MNP", sn.MNPs, COL.teal],
        ["Others", sn.others, COL.amber], ["No-ALT", sn["no-ALTs"], COL.gray],
    ].filter((x) => x[1] > 0);
    const variantType = {
        type: "doughnut",
        data: { labels: types.map((x) => x[0]), datasets: [{ data: types.map((x) => x[1]), backgroundColor: types.map((x) => x[2]), borderWidth: 0 }] },
        options: { ...base, cutout: "62%", plugins: { legend: { position: "right" } } },
    };

    // 2. Substitution types (gộp cặp bổ sung, đậm = transition)
    const pairs = [["C>A", "G>T"], ["C>G", "G>C"], ["C>T", "G>A"], ["T>A", "A>T"], ["T>C", "A>G"], ["T>G", "A>C"]];
    const pairColors = [COL.snp, COL.teal, COL.indel, COL.amber, COL.violet, COL.gray];
    const map = Object.fromEntries(d.st);
    const stLabels = [], stVals = [], stCols = [];
    pairs.forEach((p, i) => p.forEach((k) => {
        stLabels.push(k);
        stVals.push(map[k] || 0);
        stCols.push(pairColors[i] + (i === 2 || i === 4 ? "" : "99"));
    }));
    const subst = {
        type: "bar",
        data: { labels: stLabels, datasets: [{ data: stVals, backgroundColor: stCols, borderRadius: 3 }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: fmt } } } },
    };

    // 3. Độ dài indel
    const idd = [...d.idd].sort((a, b) => a[0] - b[0]);
    const indel = {
        type: "bar",
        data: { labels: idd.map((x) => x[0]), datasets: [{ data: idd.map((x) => x[1]), backgroundColor: idd.map((x) => (x[0] < 0 ? COL.indel : COL.snp)) }] },
        options: {
            ...base, plugins: { legend: { display: false } },
            scales: { y: { type: logIdd ? "logarithmic" : "linear" }, x: { ticks: { maxTicksLimit: 15 }, title: { display: true, text: "Length (bp)" } } },
        },
    };

    // 4. Depth: vẽ DP ≤ 100, phần còn lại gộp thành overflow
    const isNum = (b) => /^\d+$/.test(b);
    const total = d.dp.reduce((s, x) => s + x[1], 0) || 1;
    const shown = d.dp.filter((x) => isNum(x[0]) && +x[0] <= 100);
    const over = d.dp.filter((x) => !isNum(x[0]) || +x[0] > 100).reduce((s, x) => s + x[1], 0);
    let acc = 0, median = ">500";
    for (const x of d.dp.filter((y) => isNum(y[0]))) { acc += x[1]; if (acc >= total / 2) { median = x[0]; break; } }
    const depth = {
        type: "bar",
        data: { labels: shown.map((x) => x[0]), datasets: [{ data: shown.map((x) => (100 * x[1]) / total), backgroundColor: COL.teal }] },
        options: {
            ...base, plugins: { legend: { display: false } },
            scales: { x: { ticks: { maxTicksLimit: 12 }, title: { display: true, text: "DP" } }, y: { ticks: { callback: (v) => v + "%" } } },
        },
    };
    const depthHint = `% sites by DP · median ≈ ${median} · ${((100 * over) / total).toFixed(1)}% of sites have DP > 100`;

    // 5. QUAL: bin theo log10 (bước 0.25 decade, bắt đầu từ 30)
    const lo = Math.log10(30), step = 0.25;
    const maxQ = Math.max(31, ...d.qual.map((x) => x[0]));
    const nb = Math.max(1, Math.ceil((Math.log10(maxQ) - lo) / step));
    const bins = Array.from({ length: nb }, () => [0, 0]);
    d.qual.forEach(([q, s, i]) => {
        const k = Math.min(nb - 1, Math.max(0, Math.floor((Math.log10(Math.max(30, q)) - lo) / step)));
        bins[k][0] += s; bins[k][1] += i;
    });
    const qual = {
        type: "bar",
        data: {
            labels: bins.map((_, i) => { const v = 30 * 10 ** (i * step); return v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v); }),
            datasets: [
                { label: "SNP", data: bins.map((b) => b[0]), backgroundColor: COL.snp },
                { label: "Indel", data: bins.map((b) => b[1]), backgroundColor: COL.indel },
            ],
        },
        options: {
            ...base,
            scales: { x: { stacked: true, title: { display: true, text: "QUAL (lower bound of bin)" } }, y: { stacked: true, ticks: { callback: fmt } } },
        },
    };

    return { variantType, subst, indel, depth, depthHint, qual };
}

export const STATS_STAGES = [
    { id: "validate", title: "Input validation" },
    { id: "init",     title: "Initialize WebAssembly" },
    { id: "exec",     title: "Execute stats" },
    { id: "collect",  title: "Collect output" },
];

function BcftoolsStats () {
    const { run, loading, error } = useBcftools();
    const exec = useExecution(STATS_STAGES);
    const [statsText, setStatsText] = useState(null);
    const [inputFile, setInputFile] = useState(null);
    const [hasIndex, setHasIndex] = useState(false);
    const [indexFile, setIndexFile] = useState(null);
    const inputFileRef = useRef(null);
    const indexFileRef = useRef(null);

    const [logIdd, setLogIdd] = useState(true);
    const data = useMemo(() => (statsText ? parseStats(statsText) : null), [statsText]);
    const cfg = useMemo(() => (data ? buildConfigs(data, logIdd) : null), [data, logIdd]);
    const c1 = useRef(null), c2 = useRef(null), c3 = useRef(null), c4 = useRef(null), c5 = useRef(null);

    useEffect(() => {
        if (!cfg) return;
        const charts = [
            new Chart(c1.current, cfg.variantType),
            new Chart(c2.current, cfg.subst),
            new Chart(c3.current, cfg.indel),
            new Chart(c4.current, cfg.depth),
            new Chart(c5.current, cfg.qual),
        ];
        return () => charts.forEach((c) => c.destroy());
    }, [cfg]);

    const cardStyle = { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 5, padding: 14, boxSizing: "border-box" };
    const hintStyle = { margin: "2px 0 8px", fontSize: 12, color: "#888" };
    const canvasBox = { position: "relative", height: 260 };
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
            setStatsText(null);
        }
    };

    const chooseInputFile = () => {
        inputFileRef.current.click();
    };

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    const handleIndexFile = (e) => {
        const selectedIndexFile = e.target.files[0];

        if (selectedIndexFile) {
            setIndexFile(selectedIndexFile);
            setStatsText(null);
        }
    };

    const chooseIndexFile = () => { // Chạy Sau khi bấm nút, cập nhật inputRef -> inputRef thay đổi -> chạy handleFile
        if (locked) return;
        indexFileRef.current.click();
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
        const missing = [];
        if (!inputFile) missing.push("Input file");

        if (missing.length > 0) {
            setValidationError(`Please choose: ${missing.join(" and ")}`);
            return;
        }
        setValidationError("");
        setStatsText(null);

        const idxFileName = inputFile.name.toLowerCase().endsWith(".bcf")
            ? `${inputFile.name}.csi`
            : `${inputFile.name}.tbi`;

        // ---------- Build options ----------
        const opts = [];

        // ---------- Chạy pipeline có panel ----------
        await exec.execute(async ({ step, setLog }) => {
            setLog({
                command: `bcftools stats ${opts.join(" ")} ${inputFile.name}`.replace(/\s+/g, " "),
            });
            // Stage 1: không có bước con => chỉ có dòng tóm tắt
            await step("validate", async () => { }, {
                running: "Validating input files",
                done: "Input files validated",
            });
            // Stage 2: mỗi nhánh là một bước cụ thể
            const idxFile = await step(
                "init",
                async ({ sub }) => {
                    if (indexFile) {
                        return sub("Reading provided index file", async () => new File([indexFile], idxFileName));
                    }
                    return sub("Generating index with samtools index", async () => {
                        const r1 = await run(["index", `{${inputFile.name}}`, `/tmp/${idxFileName}`], [inputFile], [idxFileName]);
                        if (!r1 || r1.code !== 0 || !r1.results[idxFileName])
                            throw new Error(r1?.stderr || error || "Failed to create index");
                        return new File([r1.results[idxFileName]], idxFileName);
                    });
                },
                { running: "Preparing index", done: "Bcftools module initialized" }
            );
            // Stage 3
            const r2 = await step(
                "exec",
                async ({ sub }) =>
                    sub("Running bcftools stats", async () => {
                        const r = await run(
                            ["stats", ...opts, `{${inputFile.name}}`],
                            [inputFile, idxFile], [], {}
                        );
                        if (!r || r.code !== 0) throw new Error(r?.stderr || error || "bedcov failed");
                        return r;
                    }),
                { running: "Processing input data", done: "Input data processed" }
            );
            // Stage 4: nhiều bước con liên tiếp, mỗi bước giữ thời gian riêng
            await step(
                "collect",
                async ({ sub }) => {
                    await sub("Updating result", async () => {
                        setLog({ stdout: r2.stdout, stderr: r2.stderr ?? "" });
                        setStatsText(r2.stdout);
                    });
                },
                { running: "Collecting output", done: "Output ready" }
            );
        });
    };

    const sn = data ? data.sn : {};
    const rec = sn.records || 0;
    const pct = (x) => (rec ? ((100 * x) / rec).toFixed(1) + "%" : "");
    const kpis = data ? [
        ["Samples", fmt(sn.samples || 0), ""],
        ["Records", fmt(rec), ""],
        ["SNPs", fmt(sn.SNPs || 0), pct(sn.SNPs)],
        ["Indels", fmt(sn.indels || 0), pct(sn.indels)],
        ["Ts/Tv", data.tstv ? data.tstv.ratio.toFixed(2) : "-", data.tstv ? `${fmt(data.tstv.ts)} / ${fmt(data.tstv.tv)}` : ""],
        ["Multiallelic", fmt(sn["multiallelic sites"] || 0), ""],
    ] : [];
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
                                    accept=".vcf.gz, .bcf"
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
                                            ref={indexFileRef}
                                            type="file"
                                            accept=".tbi, .csi"
                                            onChange={handleIndexFile}
                                            style={{ display: "none" }}
                                        />

                                        {!indexFile ? (
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
                                                    onClick={chooseIndexFile}
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
                                                    {indexFile.name}
                                                </div>
                                                <button
                                                    onClick={chooseIndexFile}
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
                                            style={fileBtnStyle({opacity: "0.5", background: "#F1F5F9", cursor: !hasIndex ? "not-allowed" : "pointer",})}
                                        >
                                            {UploadFileIcon()}
                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                </div>

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
                    }}
                >
                    {error && (
                        <pre style={{ color: "#c00", whiteSpace: "pre-wrap", width: "100%" }}>{error}</pre>
                    )}

                    {data ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                            {data.src && <div style={{ fontSize: 12, color: "#888", wordBreak: "break-all" }}>{data.src}</div>}

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                                {kpis.map(([label, value, sub]) => (
                                    <div key={label} style={{ background: "#DAECF8", borderRadius: 5, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 12, color: "#555" }}>{label}</div>
                                        <span style={{ fontSize: 22, fontWeight: 700 }}>{value}</span>{" "}
                                        <span style={{ fontSize: 12, color: "#555" }}>{sub}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 12 }}>
                                <div style={cardStyle}>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>Variant types</span>
                                    <p style={hintStyle}>Rows per type (a row can count toward several types)</p>
                                    <div style={canvasBox}><canvas ref={c1} /></div>
                                </div>

                                <div style={cardStyle}>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>Substitution types (SNP)</span>
                                    <p style={hintStyle}>Complementary pairs grouped; solid = transitions</p>
                                    <div style={canvasBox}><canvas ref={c2} /></div>
                                </div>

                                <div style={cardStyle}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 15, fontWeight: 600 }}>Indel length</span>
                                        <label style={{ fontSize: 12, color: "#666", cursor: "pointer" }}>
                                            <input type="checkbox" checked={logIdd} onChange={(e) => setLogIdd(e.target.checked)} /> log scale
                                        </label>
                                    </div>
                                    <p style={hintStyle}>Negative = deletion, positive = insertion</p>
                                    <div style={canvasBox}><canvas ref={c3} /></div>
                                </div>

                                <div style={cardStyle}>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>Depth distribution (DP)</span>
                                    <p style={hintStyle}>{cfg.depthHint}</p>
                                    <div style={canvasBox}><canvas ref={c4} /></div>
                                </div>

                                <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>QUAL distribution</span>
                                    <p style={hintStyle}>Log10 bins, because QUAL spans several orders of magnitude</p>
                                    <div style={canvasBox}><canvas ref={c5} /></div>
                                </div>
                            </div>

                            {data.af.length <= 3 && (
                                <div style={{ fontSize: 13, color: "#888" }}>
                                    The AF section has only {data.af.length} bin(s) with {sn.samples || 1} sample(s), so it is not plotted.
                                </div>
                            )}
                        </div>
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
                            title="No stats result yet"
                            description="Upload a VCF/BCF file and press Run to see variant summary charts"
                        />
                    )}
                </div>
            </div>
        </>
    )
}
export default BcftoolsStats;
