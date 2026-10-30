import { useRef, useState, useEffect, useMemo } from "react";
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


const inputBoxStyle = ({ opacity = 1 , backgroundcolor = "#ffffff"} = {}) => ({
    display: "flex",
    alignItems: "center",
    boxSizing: 'border-box',
    backgroundColor: `${backgroundcolor}`,
    borderRadius: "5px",
    padding: "10px 20px",
    fontSize: "13px",
    width: "300px",
    height: "35px",
    opacity: `${opacity}`
})

function SamtoolsBedcov () {
    const { run, loading, error } = useSamtools();
    const [rows, setRows] = useState(null);
    const [inputFile, setInputFile] = useState(null);
    const [bedFile, setBedFile] = useState(null);

    const [hasIndex, setHasIndex] = useState(false);
    const [baiFile, setBaiFile] = useState(null);
    const bedFileRef = useRef(null);
    const inputFileRef = useRef(null);
    const baiFileRef = useRef(null);

    const locked = loading;
    const fileBtnStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #a6a6a6",
        borderRadius: "5px",
        cursor: locked ? "not-allowed" : "pointer",
        opacity: locked ? 0.5 : 1,
        background: "#ffffff",
        height: "35px",
        width: "50px",
        boxSizing: "border-box"
    };

    const [moreOptions, setMoreOptions] = useState(false);
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    const handleInputFile = (e) => {
        const selectedInputFile = e.target.files[0];

        if (selectedInputFile) {
            setInputFile(selectedInputFile);
            setRows(null);
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
            setRows(null);
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
            setRows(null);
        }
    };

    const chooseBedFile = () => { // Chạy Sau khi bấm nút, cập nhật inputRef -> inputRef thay đổi -> chạy handleFile
        if (locked) return;
        bedFileRef.current.click();
    };
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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
        const missing = [];
        if (!inputFile) missing.push("Input file");
        if (!bedFile) missing.push("Bed file");

        if (missing.length > 0) {
            setValidationError(`Please choose: ${missing.join(" and ")}`);
            return;
        }
        setValidationError("");
        setRows(null);

        const p = `/work/${inputFile.name}`;
        const idxFileName = inputFile.name.toLowerCase().endsWith(".cram")
            ? `${inputFile.name}.crai`
            : `${inputFile.name}.bai`;

        // Bước 1: tạo index
        let idxFile;
        if (baiFile) {
            console.log(`Using user-provided index file:", ${baiFile.name}`)
            idxFile = new File([baiFile], idxFileName);
        } else {
            console.log("No index provided, generating one with samtools index")
            const r1 = await run(["index", p, `/tmp/${idxFileName}`], [inputFile], [idxFileName]);
            if (!r1 || r1.code !== 0 || !r1.results[idxFileName]) return;
            idxFile = new File([r1.results[idxFileName]], idxFileName);
        }
        // Bước 2: idxstats với BAM + index vừa tạo (cùng nằm trong /work)
        const r2 = await run(["bedcov", `{${bedFile.name}}`, `{${inputFile.name}}`], [inputFile, bedFile, idxFile], [], {});
        if (!r2 || r2.code !== 0) return;

        setRows(
            r2.stdout
                .split("\n")
                .filter(Boolean)
                .map((line) => line.split("\t")) // [tên, độ dài, mapped, unmapped]
        );
    };


    // --- State cho vùng result ---
    const [resultPage, setResultPage] = useState(1);
    const [resultPageSize, setResultPageSize] = useState(10);
    const resultTotalRows = rows?.length ?? 0;
    const resultTotalPages = Math.max(1, Math.ceil(resultTotalRows / resultPageSize));
    // ===== Pagination: PREVIEW =====
    const paginatedResultRows = useMemo(() => {
        if (!rows) return [];
        const start = (resultPage - 1) * resultPageSize;
        return rows.slice(start, start + resultPageSize);
    }, [rows, resultPage, resultPageSize]);

    const goToResultPage = (page) => {
        setResultPage(Math.min(Math.max(1, page), resultTotalPages));
    };

    const handleResultPageSizeChange = (e) => {
        setResultPageSize(Number(e.target.value));
        setResultPage(1);
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
                            alignItems: "stretch",
                            gap: "20px",
                        }}
                    >
                        <span
                            style= {{
                                width: "150px",
                                fontSize: "15px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                borderRight: "1px solid #a6a6a6"
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
                                            style={fileBtnStyle}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffffff";
                                            }}                                            
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M11,16V7.85l-2.6,2.6L7,9l5-5l5,5l-1.4,1.45L13,7.85V16H11ZM6,20q-0.82,0-1.41-0.59T4,18V15H6v3H18V15h2v3q0,0.82-0.59,1.41T18,20H6Z"/></svg>
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
                                            style={fileBtnStyle}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffffff";
                                            }}                                            
                                        >
                                            <svg style={{ display: "block", marginLeft: "5px" }} width="22" height="21" viewBox="0 0 22 21" fill="#555" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M16.6882 5.9238C17.0632 6.29887 17.274 6.80758 17.274 7.33801V8.72C17.274 8.99614 17.0501 9.22 16.774 9.22H15.84C15.5639 9.22 15.34 8.99614 15.34 8.72V7.85517C15.34 7.30288 14.8923 6.85517 14.34 6.85517H10.414V2.93C10.414 2.37771 9.96629 1.93 9.41401 1.93H2.93C2.37771 1.93 1.93 2.37772 1.93 2.93V16.59C1.93 17.1423 2.37772 17.59 2.93 17.59H6.26286C6.539 17.59 6.76286 17.8139 6.76286 18.09V19.0288C6.76286 19.3049 6.539 19.5288 6.26286 19.5288H2.16986C1.57677 19.5288 1.06668 19.3156 0.639939 18.8888C0.2132 18.4621 0 17.952 0 17.3589V2.16986C0 1.56953 0.213201 1.05945 0.639939 0.63994C1.06668 0.220433 1.57677 0.00723287 2.16986 0H9.93595C10.4664 0 10.9751 0.210714 11.3502 0.585787L14.0192 3.25479L16.6882 5.9238Z" fill="#555"/>
                                                <path d="M16.6974 12.603C16.526 12.7768 16.2627 12.8145 16.0354 12.7255C15.8976 12.6715 15.7562 12.6255 15.6114 12.588C15.3333 12.5159 15.0582 12.4794 14.7865 12.4793C14.3587 12.4859 13.9339 12.5765 13.5126 12.7475C13.0913 12.9184 12.7177 13.1677 12.3937 13.4964C12.0503 13.8447 11.7968 14.2369 11.6348 14.6706C11.4731 15.1041 11.4034 15.5515 11.4229 16.0112L11.9528 15.4726C12.2378 15.1829 12.7048 15.1826 12.9901 15.472C13.2688 15.7547 13.2696 16.2085 12.992 16.4922L11.0994 18.4262C10.9031 18.6268 10.5801 18.6265 10.3841 18.4256L8.49909 16.4929C8.22187 16.2087 8.22309 15.7549 8.50183 15.4722C8.78732 15.1826 9.25452 15.1826 9.54 15.4722L9.94387 15.8818C9.95044 15.2706 10.0733 14.6654 10.313 14.0673C10.5528 13.4694 10.9063 12.934 11.3727 12.4608C11.8394 11.9875 12.3742 11.6243 12.9771 11.3745C13.5797 11.1247 14.1892 11.0001 14.8047 11C15.2714 11 15.732 11.0673 16.1857 11.1988C16.2888 11.2286 16.3907 11.2622 16.4915 11.2994C17.0353 11.5002 17.1044 12.1901 16.6974 12.603Z" fill="#555"/>
                                                <path d="M21.1071 16.3937C20.8222 16.6826 20.3568 16.6852 20.0688 16.3994L19.6474 15.9812C19.6474 16.6058 19.532 17.2182 19.2987 17.8165C19.0783 18.421 18.7301 18.959 18.2572 19.4322C17.7907 19.912 17.2528 20.2703 16.6438 20.507C16.0345 20.7437 15.4205 20.863 14.8047 20.863C14.3318 20.8629 13.8707 20.8006 13.4237 20.6758C13.3208 20.6459 13.219 20.6121 13.1184 20.5744C12.5727 20.3699 12.5097 19.6745 12.921 19.2617C13.0941 19.0881 13.3584 19.0509 13.5869 19.1396C13.7235 19.1926 13.8636 19.2378 14.0071 19.275C14.2857 19.3473 14.5622 19.3836 14.8343 19.3837C15.2557 19.3837 15.6778 19.298 16.0991 19.1271C16.52 18.9563 16.892 18.7064 17.2158 18.3782C17.5398 18.0495 17.7879 17.6549 17.9564 17.1947C18.125 16.7345 18.2094 16.2804 18.2094 15.8333L17.6577 16.3917C17.3724 16.6804 16.9058 16.6788 16.6224 16.3882C16.3478 16.1065 16.3479 15.6572 16.6226 15.3755L18.5123 13.438C18.7085 13.2369 19.032 13.2369 19.2282 13.438L21.1099 15.3672C21.3886 15.653 21.3874 16.1094 21.1071 16.3937Z" fill="#555"/>
                                                <path d="M15.6114 12.588C15.7562 12.6255 15.8976 12.6715 16.0354 12.7255C16.2627 12.8145 16.526 12.7768 16.6974 12.603C17.1044 12.1901 17.0353 11.5002 16.4915 11.2994C16.3907 11.2622 16.2888 11.2286 16.1857 11.1988C15.732 11.0673 15.2714 11 14.8047 11C14.1892 11.0001 13.5797 11.1247 12.9771 11.3745C12.3742 11.6243 11.8394 11.9875 11.3727 12.4608C10.9063 12.934 10.5528 13.4694 10.313 14.0673C10.0733 14.6654 9.95044 15.2706 9.94387 15.8818L9.54 15.4722C9.25452 15.1826 8.78732 15.1826 8.50183 15.4722C8.22309 15.7549 8.22187 16.2087 8.49909 16.4929L10.3841 18.4256C10.5801 18.6265 10.9031 18.6268 11.0994 18.4262L12.992 16.4922C13.2696 16.2085 13.2688 15.7547 12.9901 15.472C12.7048 15.1826 12.2378 15.1829 11.9528 15.4726L11.4229 16.0112C11.4034 15.5515 11.4731 15.1041 11.6348 14.6706C11.7968 14.2369 12.0503 13.8447 12.3937 13.4964C12.7177 13.1677 13.0913 12.9184 13.5126 12.7475C13.9339 12.5765 14.3587 12.4859 14.7865 12.4793C15.0582 12.4794 15.3333 12.5159 15.6114 12.588ZM19.6474 15.9812L20.0688 16.3994C20.3568 16.6852 20.8222 16.6826 21.1071 16.3937C21.3874 16.1094 21.3886 15.653 21.1099 15.3672L19.2282 13.438C19.032 13.2369 18.7085 13.2369 18.5123 13.438L16.6226 15.3755C16.3479 15.6572 16.3478 16.1065 16.6224 16.3882C16.9058 16.6788 17.3724 16.6804 17.6577 16.3917L18.2094 15.8333C18.2094 16.2804 18.125 16.7345 17.9564 17.1947C17.7879 17.6549 17.5398 18.0495 17.2158 18.3782C16.892 18.7064 16.52 18.9563 16.0991 19.1271C15.6778 19.298 15.2557 19.3837 14.8343 19.3837C14.5622 19.3836 14.2857 19.3473 14.0071 19.275C13.8636 19.2378 13.7235 19.1926 13.5869 19.1396C13.3584 19.0509 13.0941 19.0881 12.921 19.2617C12.5097 19.6745 12.5727 20.3699 13.1184 20.5744C13.219 20.6121 13.3208 20.6459 13.4237 20.6758C13.8707 20.8006 14.3318 20.8629 14.8047 20.863C15.4205 20.863 16.0345 20.7437 16.6438 20.507C17.2528 20.2703 17.7907 19.912 18.2572 19.4322C18.7301 18.959 19.0783 18.421 19.2987 17.8165C19.532 17.2182 19.6474 16.6058 19.6474 15.9812Z" stroke-width="0.25" stroke="#555"/>
                                            </svg>
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
                                                    style={fileBtnStyle}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                                    }}                                                    
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M11,16V7.85l-2.6,2.6L7,9l5-5l5,5l-1.4,1.45L13,7.85V16H11ZM6,20q-0.82,0-1.41-0.59T4,18V15H6v3H18V15h2v3q0,0.82-0.59,1.41T18,20H6Z"/></svg>
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
                                                    style={fileBtnStyle}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                                    }}                                                    
                                                >
                                                    <svg style={{ display: "block", marginLeft: "5px" }} width="22" height="21" viewBox="0 0 22 21" fill="#555" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M16.6882 5.9238C17.0632 6.29887 17.274 6.80758 17.274 7.33801V8.72C17.274 8.99614 17.0501 9.22 16.774 9.22H15.84C15.5639 9.22 15.34 8.99614 15.34 8.72V7.85517C15.34 7.30288 14.8923 6.85517 14.34 6.85517H10.414V2.93C10.414 2.37771 9.96629 1.93 9.41401 1.93H2.93C2.37771 1.93 1.93 2.37772 1.93 2.93V16.59C1.93 17.1423 2.37772 17.59 2.93 17.59H6.26286C6.539 17.59 6.76286 17.8139 6.76286 18.09V19.0288C6.76286 19.3049 6.539 19.5288 6.26286 19.5288H2.16986C1.57677 19.5288 1.06668 19.3156 0.639939 18.8888C0.2132 18.4621 0 17.952 0 17.3589V2.16986C0 1.56953 0.213201 1.05945 0.639939 0.63994C1.06668 0.220433 1.57677 0.00723287 2.16986 0H9.93595C10.4664 0 10.9751 0.210714 11.3502 0.585787L14.0192 3.25479L16.6882 5.9238Z" fill="#555"/>
                                                        <path d="M16.6974 12.603C16.526 12.7768 16.2627 12.8145 16.0354 12.7255C15.8976 12.6715 15.7562 12.6255 15.6114 12.588C15.3333 12.5159 15.0582 12.4794 14.7865 12.4793C14.3587 12.4859 13.9339 12.5765 13.5126 12.7475C13.0913 12.9184 12.7177 13.1677 12.3937 13.4964C12.0503 13.8447 11.7968 14.2369 11.6348 14.6706C11.4731 15.1041 11.4034 15.5515 11.4229 16.0112L11.9528 15.4726C12.2378 15.1829 12.7048 15.1826 12.9901 15.472C13.2688 15.7547 13.2696 16.2085 12.992 16.4922L11.0994 18.4262C10.9031 18.6268 10.5801 18.6265 10.3841 18.4256L8.49909 16.4929C8.22187 16.2087 8.22309 15.7549 8.50183 15.4722C8.78732 15.1826 9.25452 15.1826 9.54 15.4722L9.94387 15.8818C9.95044 15.2706 10.0733 14.6654 10.313 14.0673C10.5528 13.4694 10.9063 12.934 11.3727 12.4608C11.8394 11.9875 12.3742 11.6243 12.9771 11.3745C13.5797 11.1247 14.1892 11.0001 14.8047 11C15.2714 11 15.732 11.0673 16.1857 11.1988C16.2888 11.2286 16.3907 11.2622 16.4915 11.2994C17.0353 11.5002 17.1044 12.1901 16.6974 12.603Z" fill="#555"/>
                                                        <path d="M21.1071 16.3937C20.8222 16.6826 20.3568 16.6852 20.0688 16.3994L19.6474 15.9812C19.6474 16.6058 19.532 17.2182 19.2987 17.8165C19.0783 18.421 18.7301 18.959 18.2572 19.4322C17.7907 19.912 17.2528 20.2703 16.6438 20.507C16.0345 20.7437 15.4205 20.863 14.8047 20.863C14.3318 20.8629 13.8707 20.8006 13.4237 20.6758C13.3208 20.6459 13.219 20.6121 13.1184 20.5744C12.5727 20.3699 12.5097 19.6745 12.921 19.2617C13.0941 19.0881 13.3584 19.0509 13.5869 19.1396C13.7235 19.1926 13.8636 19.2378 14.0071 19.275C14.2857 19.3473 14.5622 19.3836 14.8343 19.3837C15.2557 19.3837 15.6778 19.298 16.0991 19.1271C16.52 18.9563 16.892 18.7064 17.2158 18.3782C17.5398 18.0495 17.7879 17.6549 17.9564 17.1947C18.125 16.7345 18.2094 16.2804 18.2094 15.8333L17.6577 16.3917C17.3724 16.6804 16.9058 16.6788 16.6224 16.3882C16.3478 16.1065 16.3479 15.6572 16.6226 15.3755L18.5123 13.438C18.7085 13.2369 19.032 13.2369 19.2282 13.438L21.1099 15.3672C21.3886 15.653 21.3874 16.1094 21.1071 16.3937Z" fill="#555"/>
                                                        <path d="M15.6114 12.588C15.7562 12.6255 15.8976 12.6715 16.0354 12.7255C16.2627 12.8145 16.526 12.7768 16.6974 12.603C17.1044 12.1901 17.0353 11.5002 16.4915 11.2994C16.3907 11.2622 16.2888 11.2286 16.1857 11.1988C15.732 11.0673 15.2714 11 14.8047 11C14.1892 11.0001 13.5797 11.1247 12.9771 11.3745C12.3742 11.6243 11.8394 11.9875 11.3727 12.4608C10.9063 12.934 10.5528 13.4694 10.313 14.0673C10.0733 14.6654 9.95044 15.2706 9.94387 15.8818L9.54 15.4722C9.25452 15.1826 8.78732 15.1826 8.50183 15.4722C8.22309 15.7549 8.22187 16.2087 8.49909 16.4929L10.3841 18.4256C10.5801 18.6265 10.9031 18.6268 11.0994 18.4262L12.992 16.4922C13.2696 16.2085 13.2688 15.7547 12.9901 15.472C12.7048 15.1826 12.2378 15.1829 11.9528 15.4726L11.4229 16.0112C11.4034 15.5515 11.4731 15.1041 11.6348 14.6706C11.7968 14.2369 12.0503 13.8447 12.3937 13.4964C12.7177 13.1677 13.0913 12.9184 13.5126 12.7475C13.9339 12.5765 14.3587 12.4859 14.7865 12.4793C15.0582 12.4794 15.3333 12.5159 15.6114 12.588ZM19.6474 15.9812L20.0688 16.3994C20.3568 16.6852 20.8222 16.6826 21.1071 16.3937C21.3874 16.1094 21.3886 15.653 21.1099 15.3672L19.2282 13.438C19.032 13.2369 18.7085 13.2369 18.5123 13.438L16.6226 15.3755C16.3479 15.6572 16.3478 16.1065 16.6224 16.3882C16.9058 16.6788 17.3724 16.6804 17.6577 16.3917L18.2094 15.8333C18.2094 16.2804 18.125 16.7345 17.9564 17.1947C17.7879 17.6549 17.5398 18.0495 17.2158 18.3782C16.892 18.7064 16.52 18.9563 16.0991 19.1271C15.6778 19.298 15.2557 19.3837 14.8343 19.3837C14.5622 19.3836 14.2857 19.3473 14.0071 19.275C13.8636 19.2378 13.7235 19.1926 13.5869 19.1396C13.3584 19.0509 13.0941 19.0881 12.921 19.2617C12.5097 19.6745 12.5727 20.3699 13.1184 20.5744C13.219 20.6121 13.3208 20.6459 13.4237 20.6758C13.8707 20.8006 14.3318 20.8629 14.8047 20.863C15.4205 20.863 16.0345 20.7437 16.6438 20.507C17.2528 20.2703 17.7907 19.912 18.2572 19.4322C18.7301 18.959 19.0783 18.421 19.2987 17.8165C19.532 17.2182 19.6474 16.6058 19.6474 15.9812Z" stroke-width="0.25" stroke="#555"/>
                                                    </svg>
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
                                            style={{
                                                border: "1px solid #a6a6a6",
                                                borderRadius: "5px",
                                                cursor: "not-allowed",
                                                opacity: 0.5,
                                                background: "#e5e5e5",
                                                height: "35px",
                                                width: "50px",
                                                boxSizing: "border-box"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffffff";
                                            }}                                            
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M12,4l5,5l-1.4,1.45L13,7.85v2.3l-2-2L9.43,6.57L12,4ZM11,16V11l2,2v3H11Zm8.78,6.63L17.15,20H6q-0.82,0-1.41-0.59T4,18V15H6v3h9.15L1.38,4.22L2.8,2.8L21.2,21.2l-1.43,1.43ZM20,17.15l-2-2V15h2v2.15Z"/></svg>                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    {/* ==================================================================================================== */}
                    {/* ==================================================================================================== */}
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
                                    style={fileBtnStyle}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                    }}                                    
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M11,16V7.85l-2.6,2.6L7,9l5-5l5,5l-1.4,1.45L13,7.85V16H11ZM6,20q-0.82,0-1.41-0.59T4,18V15H6v3H18V15h2v3q0,0.82-0.59,1.41T18,20H6Z"/></svg>
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
                                    style={fileBtnStyle}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                    }}                                    
                                >
                                    <svg style={{ display: "block", marginLeft: "5px" }} width="22" height="21" viewBox="0 0 22 21" fill="#555" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16.6882 5.9238C17.0632 6.29887 17.274 6.80758 17.274 7.33801V8.72C17.274 8.99614 17.0501 9.22 16.774 9.22H15.84C15.5639 9.22 15.34 8.99614 15.34 8.72V7.85517C15.34 7.30288 14.8923 6.85517 14.34 6.85517H10.414V2.93C10.414 2.37771 9.96629 1.93 9.41401 1.93H2.93C2.37771 1.93 1.93 2.37772 1.93 2.93V16.59C1.93 17.1423 2.37772 17.59 2.93 17.59H6.26286C6.539 17.59 6.76286 17.8139 6.76286 18.09V19.0288C6.76286 19.3049 6.539 19.5288 6.26286 19.5288H2.16986C1.57677 19.5288 1.06668 19.3156 0.639939 18.8888C0.2132 18.4621 0 17.952 0 17.3589V2.16986C0 1.56953 0.213201 1.05945 0.639939 0.63994C1.06668 0.220433 1.57677 0.00723287 2.16986 0H9.93595C10.4664 0 10.9751 0.210714 11.3502 0.585787L14.0192 3.25479L16.6882 5.9238Z" fill="#555"/>
                                        <path d="M16.6974 12.603C16.526 12.7768 16.2627 12.8145 16.0354 12.7255C15.8976 12.6715 15.7562 12.6255 15.6114 12.588C15.3333 12.5159 15.0582 12.4794 14.7865 12.4793C14.3587 12.4859 13.9339 12.5765 13.5126 12.7475C13.0913 12.9184 12.7177 13.1677 12.3937 13.4964C12.0503 13.8447 11.7968 14.2369 11.6348 14.6706C11.4731 15.1041 11.4034 15.5515 11.4229 16.0112L11.9528 15.4726C12.2378 15.1829 12.7048 15.1826 12.9901 15.472C13.2688 15.7547 13.2696 16.2085 12.992 16.4922L11.0994 18.4262C10.9031 18.6268 10.5801 18.6265 10.3841 18.4256L8.49909 16.4929C8.22187 16.2087 8.22309 15.7549 8.50183 15.4722C8.78732 15.1826 9.25452 15.1826 9.54 15.4722L9.94387 15.8818C9.95044 15.2706 10.0733 14.6654 10.313 14.0673C10.5528 13.4694 10.9063 12.934 11.3727 12.4608C11.8394 11.9875 12.3742 11.6243 12.9771 11.3745C13.5797 11.1247 14.1892 11.0001 14.8047 11C15.2714 11 15.732 11.0673 16.1857 11.1988C16.2888 11.2286 16.3907 11.2622 16.4915 11.2994C17.0353 11.5002 17.1044 12.1901 16.6974 12.603Z" fill="#555"/>
                                        <path d="M21.1071 16.3937C20.8222 16.6826 20.3568 16.6852 20.0688 16.3994L19.6474 15.9812C19.6474 16.6058 19.532 17.2182 19.2987 17.8165C19.0783 18.421 18.7301 18.959 18.2572 19.4322C17.7907 19.912 17.2528 20.2703 16.6438 20.507C16.0345 20.7437 15.4205 20.863 14.8047 20.863C14.3318 20.8629 13.8707 20.8006 13.4237 20.6758C13.3208 20.6459 13.219 20.6121 13.1184 20.5744C12.5727 20.3699 12.5097 19.6745 12.921 19.2617C13.0941 19.0881 13.3584 19.0509 13.5869 19.1396C13.7235 19.1926 13.8636 19.2378 14.0071 19.275C14.2857 19.3473 14.5622 19.3836 14.8343 19.3837C15.2557 19.3837 15.6778 19.298 16.0991 19.1271C16.52 18.9563 16.892 18.7064 17.2158 18.3782C17.5398 18.0495 17.7879 17.6549 17.9564 17.1947C18.125 16.7345 18.2094 16.2804 18.2094 15.8333L17.6577 16.3917C17.3724 16.6804 16.9058 16.6788 16.6224 16.3882C16.3478 16.1065 16.3479 15.6572 16.6226 15.3755L18.5123 13.438C18.7085 13.2369 19.032 13.2369 19.2282 13.438L21.1099 15.3672C21.3886 15.653 21.3874 16.1094 21.1071 16.3937Z" fill="#555"/>
                                        <path d="M15.6114 12.588C15.7562 12.6255 15.8976 12.6715 16.0354 12.7255C16.2627 12.8145 16.526 12.7768 16.6974 12.603C17.1044 12.1901 17.0353 11.5002 16.4915 11.2994C16.3907 11.2622 16.2888 11.2286 16.1857 11.1988C15.732 11.0673 15.2714 11 14.8047 11C14.1892 11.0001 13.5797 11.1247 12.9771 11.3745C12.3742 11.6243 11.8394 11.9875 11.3727 12.4608C10.9063 12.934 10.5528 13.4694 10.313 14.0673C10.0733 14.6654 9.95044 15.2706 9.94387 15.8818L9.54 15.4722C9.25452 15.1826 8.78732 15.1826 8.50183 15.4722C8.22309 15.7549 8.22187 16.2087 8.49909 16.4929L10.3841 18.4256C10.5801 18.6265 10.9031 18.6268 11.0994 18.4262L12.992 16.4922C13.2696 16.2085 13.2688 15.7547 12.9901 15.472C12.7048 15.1826 12.2378 15.1829 11.9528 15.4726L11.4229 16.0112C11.4034 15.5515 11.4731 15.1041 11.6348 14.6706C11.7968 14.2369 12.0503 13.8447 12.3937 13.4964C12.7177 13.1677 13.0913 12.9184 13.5126 12.7475C13.9339 12.5765 14.3587 12.4859 14.7865 12.4793C15.0582 12.4794 15.3333 12.5159 15.6114 12.588ZM19.6474 15.9812L20.0688 16.3994C20.3568 16.6852 20.8222 16.6826 21.1071 16.3937C21.3874 16.1094 21.3886 15.653 21.1099 15.3672L19.2282 13.438C19.032 13.2369 18.7085 13.2369 18.5123 13.438L16.6226 15.3755C16.3479 15.6572 16.3478 16.1065 16.6224 16.3882C16.9058 16.6788 17.3724 16.6804 17.6577 16.3917L18.2094 15.8333C18.2094 16.2804 18.125 16.7345 17.9564 17.1947C17.7879 17.6549 17.5398 18.0495 17.2158 18.3782C16.892 18.7064 16.52 18.9563 16.0991 19.1271C15.6778 19.298 15.2557 19.3837 14.8343 19.3837C14.5622 19.3836 14.2857 19.3473 14.0071 19.275C13.8636 19.2378 13.7235 19.1926 13.5869 19.1396C13.3584 19.0509 13.0941 19.0881 12.921 19.2617C12.5097 19.6745 12.5727 20.3699 13.1184 20.5744C13.219 20.6121 13.3208 20.6459 13.4237 20.6758C13.8707 20.8006 14.3318 20.8629 14.8047 20.863C15.4205 20.863 16.0345 20.7437 16.6438 20.507C17.2528 20.2703 17.7907 19.912 18.2572 19.4322C18.7301 18.959 19.0783 18.421 19.2987 17.8165C19.532 17.2182 19.6474 16.6058 19.6474 15.9812Z" stroke-width="0.25" stroke="#555"/>
                                    </svg>
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
                        fontSize: "13px",
                        cursor: "pointer"
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
                    {!moreOptions ? (
                            <svg style ={{marginTop: "2px"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#000000"><path d="M12,15.38l-6-6l1.4-1.4L12,12.55l4.6-4.58L18,9.38l-6,6Z"/></svg>
                        ) : (
                            <svg style ={{marginTop: "2px"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#000000"><path d="M7.4,15.38L6,13.98l6-6l6,6l-1.4,1.4L12,10.8L7.4,15.38Z"/></svg>                        
                        )
                    }
                </div>
                {!moreOptions && (
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

                    {rows ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                <span style={{ color: "#555", fontSize: "14px" }}>{resultTotalRows} rows total</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <label style={{ fontSize: "14px", color: "#555" }}>Rows per page:</label>
                                    <select value={resultPageSize} onChange={handleResultPageSizeChange} style={{ padding: "4px 8px", fontSize: "14px", border: "solid 1px #cfcfcf", }}>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            <div
                                className="table"
                                style={{
                                    overflowX: "auto",
                                    maxWidth: "calc(100vw - 100px * 2 )",
                                    minWidth: "calc(100vw - 100px * 2 )",
                                }}
                            >
                                <table
                                    style={{
                                        borderCollapse: "collapse",
                                        fontSize: "14px",
                                        width: "max-content",
                                        minWidth: "100%",
                                    }}
                                >
                                    <thead>
                                        <tr style={{ background: "#DAECF8", textAlign: "left" }}>
                                            <th style={{ padding: "8px 12px" }}>Reference</th>
                                            <th style={{ padding: "8px 12px" }}>Start()</th>
                                            <th style={{ padding: "8px 12px" }}>End</th>
                                            <th style={{ padding: "8px 12px" }}>Sum per base depth</th>
                                            <th style={{ padding: "8px 12px" }}>Annotation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedResultRows.map((row, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: "6px 12px" }}>{row[0] === "*" ? "* (unplaced)" : row[0]}</td>
                                                <td style={{ padding: "6px 12px" }}>{Number(row[1]).toLocaleString()}</td>
                                                <td style={{ padding: "6px 12px" }}>{Number(row[2]).toLocaleString()}</td>
                                                <td style={{ padding: "6px 12px" }}>{Number(row[4]).toLocaleString()}</td>
                                                <td style={{ padding: "6px 12px" }}>{row[3]}</td>
                                            </tr>
                                        ))}
                                        {/* Dòng trống để trang cuối vẫn đủ chiều cao */}
                                        {Array.from({ length: Math.max(0, resultPageSize - paginatedResultRows.length) }).map((_, i) => (
                                            <tr key={`empty-${i}`} aria-hidden="true">
                                                <td style={{ padding: "6px 12px" }}>{"\u00A0"}</td>
                                                <td style={{ padding: "6px 12px" }}>{"\u00A0"}</td>
                                                <td style={{ padding: "6px 12px" }}>{"\u00A0"}</td>
                                                <td style={{ padding: "6px 12px" }}>{"\u00A0"}</td>
                                                <td style={{ padding: "6px 12px" }}>{"\u00A0"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {renderPaginationBar(resultPage, resultTotalPages, goToResultPage)}
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
                            title="No bedcov result yet"
                            description="Upload a BAM file and a BED file, then click Run to see the total read depth for each region"
                        />
                    )}
                    {loading && <p>processing...</p>}
                </div>
            </div>
        </>
    )
}
export default SamtoolsBedcov;
