import { useRef, useState } from "react";
import useBcftools from '../../../hooks/useBcftools.js'
import Breadcrumb from "../../../components/ui/Breadcrumb";
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

function VCFtoolkit_convert () {
    const { run, loading, error } = useBcftools();
    const [inputFile, setInputFile] = useState(null);
    const [hasIndex, setHasIndex] = useState(false);
    const inputFileRef = useRef(null);

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
        </div>
    )
}
export default VCFtoolkit_convert;