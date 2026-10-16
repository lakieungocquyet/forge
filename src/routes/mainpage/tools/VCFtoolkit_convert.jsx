import { useRef, useState } from "react";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import CustomSelect from "../../../components/ui/CustomSelect"

function VCFtoolkit_convert () {

    const [file, setFile] = useState(null);
    const inputRef = useRef(null);

    const handleFile = (e) => {
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const chooseFile = () => {
        inputRef.current.click();
    };

    const outputFlieFormatOptions = [
        { value: 'xlsx', label: 'XLSX' },
        { value: 'csv', label: 'CSV' },
        { value: 'tsv', label: 'TSV' },
    ];

    const breadcrumbItems = [
        {
            label: "FORGE Home",
            path: "/"
        },
        {
            label: "Tools",
            path: "/tools"
        },
        {
            label: "VCFtoolkit",
            path: "/tools/vcftoolkit"
        },
        {
            label: "VCFtoolkit convert",
            path: "/tools/vcftoolkit/vcftoolkit-convert"
        },
    ];
    const styles = {
        control: (base, state) => {
            return { 
                ...base, 
                borderColor: state.isFocused ? "#FF7F50" : "#D9DDE3",
                '&:hover': {
                    borderColor: "#a1a7ae",
                    cursor: "pointer",
                }
            };
        },
        option: (base) => {
            return {
                ...base,
                borderColor: "#a1a7ae",
            
            };
        },
    
    };
    return (
        <div 
            style={{
                height: "100vh",
                display: "flex",
                alignItems: "start",
                flexDirection: "column",
                gap: "20px",
            }}
        >
            <Breadcrumb items={breadcrumbItems} />
            <div 
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "column",
                }}
            >
                <span
                    style={{
                        fontSize: "20px",
                        fontWeight: "500",
                    }}
                >
                    VCFtoolkit convert
                </span>
            </div>

            <div
                style={{
                    width: "100%",
                    padding: "0px 50px",
                    boxSizing: "border-box",
                    gap: "10px",
                    display: "flex",
                    flexDirection: "column",

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
                    <span
                        style={{
                            width: "50px",
                            height: "1px",
                            background: "#D9DDE3",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "20px",
                            fontWeight: 500,
                            color: "#000000",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Tool Parameters
                    </span>
                    <span
                        style={{
                            flex: 1,
                            height: "1px",
                            background: "#D9DDE3",
                        }}
                    />
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
                                        boxSizing: 'border-box',
                                        backgroundColor: "#FFCC9A",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        fontSize: "13px",
                                        width: "300px"
                                    }}
                                >
                                    No file chosen 
                                </div>
                                <button onClick={chooseFile}>
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
                                <button onClick={chooseFile}>
                                    Change file
                                </button>
                            </div>
                        )}
                    </div>
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
                            Output format
                        </span>
                        <CustomSelect
                            options={outputFlieFormatOptions}
                            defaultValue={outputFlieFormatOptions[0]}
                            styles={styles}
                        />
                    </div>
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
                            Save Result As
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
                                        boxSizing: 'border-box',
                                        backgroundColor: "#FFCC9A",
                                        borderRadius: "5px",
                                        padding: "10px 20px",
                                        fontSize: "13px",
                                        width: "300px"
                                    }}
                                >
                                    No file chosen 
                                </div>
                                <button onClick={chooseFile}>
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
                                <button onClick={chooseFile}>
                                    Change file
                                </button>
                            </div>
                        )}
                    </div>   
                </div>
            </div>

        </div>
    )
}
export default VCFtoolkit_convert;