import { useRef, useState, useEffect } from "react";
import { useNavigate} from 'react-router';
import useSamtools from '../../../hooks/useSamtools.js'
import HelpTip from '../../../components/ui/HelpTip.jsx'
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

export const IDXSTATS_STAGES = [
    { id: "validate", title: "Input validation" },
    { id: "init",     title: "Initialize WebAssembly" },
    { id: "exec",     title: "Execute bedcov" },
    { id: "collect",  title: "Collect output" },
];

function SamtoolsIdxstats () {
    const { run, loading, error } = useSamtools();
    const exec = useExecution(IDXSTATS_STAGES);
    const [result, setResult] = useState(null);

    const [inputFile, setInputFile] = useState(null);

    const [hasIndex, setHasIndex] = useState(false);
    const [baiFile, setBaiFile] = useState(null);

    const inputFileRef = useRef(null);
    const baiFileRef = useRef(null);

    const [inputFmtOpt, setInputFmtOpt] = useState("");
    const [inputFmtFocused, setInputFmtFocused] = useState(false);

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
            setRows(null);
        }
    };

    const chooseInputFile = () => {
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
        setResult(null);

        const idxFileName = inputFile.name.toLowerCase().endsWith(".cram")
            ? `${inputFile.name}.crai`
            : `${inputFile.name}.bai`;

        // ---------- Build options ----------
        const opts = [];
        // --input-fmt-option: mỗi token một cặp cờ
        inputFmtOpt
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .forEach((o) => opts.push("--input-fmt-option", o));
        // ---------- Chạy pipeline có panel ----------
        await exec.execute(async ({ step, setLog }) => {
            setLog({
                command: `samtools idxstats ${opts.join(" ")} ${inputFile.name}`.replace(/\s+/g, " "),
            });
            // Stage 1: không có bước con => chỉ có dòng tóm tắt
            await step("validate", async () => { }, {
                running: "Validating input files",
                done: "BAM file validated",
            });
            // Stage 2: mỗi nhánh là một bước cụ thể
            const idxFile = await step(
                "init",
                async ({ sub }) => {
                    if (baiFile) {
                        return sub("Reading provided index file", async () => new File([baiFile], idxFileName));
                    }
                    return sub("Generating index with samtools index", async () => {
                        const r1 = await run(["index", `{${inputFile.name}}`, `/tmp/${idxFileName}`], [inputFile], [idxFileName]);
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
                    sub("Running samtools idxstats", async () => {
                        const r = await run(
                            ["idxstats", ...opts, `{${inputFile.name}}`],
                            [inputFile, idxFile], [], {}
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
                    await sub("Updating result", async () => {
                        setLog({ stdout: r2.stdout, stderr: r2.stderr ?? "" });
                        setResult(
                            r2.stdout
                                .split("\n")
                                .filter(Boolean)
                                .map((line) => line.split("\t"))
                        );
                    });
                },
                { running: "Collecting output", done: "Output ready" }
            );
        });
    };
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
                                            style={fileBtnStyle({opacity: "0.5", background: "#F1F5F9", cursor: !hasIndex ? "not-allowed" : "pointer"})}
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

                    {result ? (
                        <div style={{ width: "100%", overflowX: "auto" }}>
                            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
                                <thead>
                                    <tr style={{ background: "#DAECF8", textAlign: "left" }}>
                                        <th style={{ padding: "8px 12px" }}>Reference</th>
                                        <th style={{ padding: "8px 12px" }}>Length</th>
                                        <th style={{ padding: "8px 12px" }}>Mapped</th>
                                        <th style={{ padding: "8px 12px" }}>Unmapped</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: "6px 12px" }}>{r[0] === "*" ? "* (unplaced)" : r[0]}</td>
                                            <td style={{ padding: "6px 12px" }}>{Number(r[1]).toLocaleString()}</td>
                                            <td style={{ padding: "6px 12px" }}>{Number(r[2]).toLocaleString()}</td>
                                            <td style={{ padding: "6px 12px" }}>{Number(r[3]).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            title="No idxstats result yet"
                            description="Upload an indexed BAM/CRAM file to see mapped and unmapped read counts per reference sequence"
                        />
                    )}
                </div>
            </div>
        </>
    )
}
export default SamtoolsIdxstats;
