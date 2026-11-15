import { useRef, useState, useEffect } from "react";
import useTracy from '../../../hooks/useTracy.js'
import useBcftools from '../../../hooks/useBcftools.js';
import Divider from '../../../components/ui/Divider.jsx';
import HelpTip from '../../../components/ui/HelpTip.jsx'
import ExecutionPanel from '../../../components/ui/ExecutionPanel.jsx';
import useExecution from '../../../hooks/useExecution'
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ChangeFileIcon from "../../../components/ui/ChangeFileIcon.jsx"
import UploadFileIcon from "../../../components/ui/UploadFileIcon.jsx";
import SangerTraceView from "../../../components/ui/SangerTraceView.jsx";
import AlignmentView from "../../../components/ui/AlignmentView.jsx";

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
    const [vcfText, setVcfText] = useState("");
    const exec = useExecution(DECOMPOSE_STAGES);
    const [inputFile, setInputFile] = useState(null);
    const [refFastaFile, setRefFastaFile] = useState(null);
    const [refMode, setRefMode] = useState("text");   // "file" | "text"
    const [refText, setRefText] = useState("");

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

    const [leftChromatogramTrimSize, setLeftChromatogramTrimSize] = useState("50");
    const [leftChromatogramTrimSizeFocused, setLeftChromatogramTrimSizeFocused] = useState(false);

    const [rightChromatogramTrimSize, setRightChromatogramTrimSize] = useState("50");
    const [rightChromatogramTrimSizeFocused, setRightChromatogramTrimSizeFocused] = useState(false);

    const [hasIndex, setHasIndex] = useState(false);
    const [indexFile, setIndexFile] = useState(null);
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
        opts.push("-v")
        opts.push("-l", "100")
        opts.push("-r", `{${refFile.name}}`)
        opts.push("-o", `/tmp/${inputFile.name}`)
        if (leftChromatogramTrimSize !== "")    opts.push("-q", leftChromatogramTrimSize);
        if (rightChromatogramTrimSize !== "")   opts.push("-u", rightChromatogramTrimSize);
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
            {/* <div
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
            </div> */}
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
            </div>
        </div>
    )
}
export default TracyDecompose;