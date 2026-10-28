import { useRef, useState, useEffect } from "react";
import useSamtools from '../../../hooks/useSamtools.js'
import { useNavigate} from 'react-router';

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
function SamtoolsIdxstats () {
    const { run, loading, error } = useSamtools();  
    const [rows, setRows] = useState(null);
    const [file, setFile] = useState(null);
    const inputRef = useRef(null);

    const handleFile = (e) => {
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);
            setRows(null);   
        }
    };

    const chooseFile = () => {
        inputRef.current.click();
    };

    const [hover, setHover] = useState(false);
    const [down, setDown] = useState(false);
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
    
    const handleRun = async () => {
        if (!file) return;
        setRows(null);

        const p = `/work/${file.name}`;
        const idxName = file.name.toLowerCase().endsWith(".cram")
            ? `${file.name}.crai`
            : `${file.name}.bai`;

        // Bước 1: tạo index
        const r1 = await run(["index", p, `/tmp/${idxName}`], [file], [idxName]);
        if (!r1 || r1.code !== 0 || !r1.results[idxName]) return;

        // Bước 2: idxstats với BAM + index vừa tạo (cùng nằm trong /work)
        const idxFile = new File([r1.results[idxName]], idxName);
        const r2 = await run(["idxstats", `{${file.name}}`], [file, idxFile], [], { forceMode: "mount" }); // Dùng "mount" cho idxstats vì đây là tác vụ yêu cầu đọc ít => "mount" ít gây ảnh hưởng tốc độ, tiết kiệm thời gian copy file BAM vào FS
        if (!r2 || r2.code !== 0) return;

        setRows(
            r2.stdout
                .split("\n")
                .filter(Boolean)
                .map((line) => line.split("\t")) // [tên, độ dài, mapped, unmapped]
        );
    };
    return (
        <>
            <div
                style={{
                    height: "100vh",
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

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        boxSizing: 'border-box',
                        padding: "20px 20px",
                        borderRadius: "5px",
                        backgroundColor: "#DAECF8",
                        gap: "10px"
                    }}
                
                >   
                    <div
                        style= {{
                            width: "100%",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "20px",
                        }}
                    >
                        <span
                            style= {{
                                width: "150px",
                                fontSize: "15px",
                                fontWeight: 600,
                                borderRight: "1px solid #a6a6a6"
                            }}
                        >
                            Input file
                        </span>

                        <input 
                            ref={inputRef}
                            type="file"
                            onChange={handleFile}
                            style={{ display: "none" }}
                        />

                        {!file ? (
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
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        boxSizing: 'border-box',
                                        backgroundColor: "#ffffff",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        fontSize: "13px",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        width: "300px"
                                    }}
                                >
                                    No file chosen 
                                </div>
                                <button 
                                    onClick={chooseFile}
                                    style={{
                                        border: "1px solid #a6a6a6",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Choose file
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
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        boxSizing: 'border-box',
                                        backgroundColor: "#ffffff",
                                        outline: "1px solid #cfcfcf",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        fontSize: "13px",
                                        minWidth: "300px"
                                    }}
                                >
                                    {file.name} 
                                </div>
                                <button 
                                    onClick={chooseFile}
                                    style={{
                                        border: "1px solid #a6a6a6",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Change file
                                </button>
                            </div>
                        )}
                    </div> 
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "start",
                        width: "100%",
                        height: "60px",
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
                        disabled={!file || loading}
                        onClick={handleRun}
                    >
                        <svg width="20px" height="20px" viewBox="0 0 24 24" fill="#FF7F50" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L7.59662 21.6145C5.53435 22.736 3 21.2763 3 18.9671L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258Z" stroke="#FF7F50" stroke-width="1.5"></path> </g></svg>
                        {loading ? "Running..." : "Run"}
                    </button>
                </div>
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
                {error && (
                    <pre style={{ color: "#c00", whiteSpace: "pre-wrap", width: "100%" }}>{error}</pre>
                )}

                {rows ? (
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
                                {rows.map((r, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #e5e5e5" }}>
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
                {loading && <p>processing...</p>}
            </div>
        </>
    )
}
export default SamtoolsIdxstats;