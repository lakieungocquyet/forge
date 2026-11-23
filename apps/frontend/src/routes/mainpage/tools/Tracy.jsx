import { useNavigate, Outlet, useLocation} from 'react-router';
import { useState, useRef } from "react";
import Breadcrumb from "../../../components/ui/Breadcrumb"
import ToolInfo from "../../../components/ui/ToolInfo"
import Divider from "../../../components/ui/Divider";

const citations = [
    // Primary citation (shown in the collapsed view). The long `abstract` field is ignored.
    `
        TY  - JOUR
        AU  - Rausch, Tobias
        AU  - Fritz, Markus Hsi-Yang
        AU  - Untergasser, Andreas
        AU  - Benes, Vladimir
        PY  - 2020
        DA  - 2020/03/14
        TI  - Tracy: basecalling, alignment, assembly and deconvolution of sanger chromatogram trace files
        JO  - BMC Genomics
        SP  - 230
        VL  - 21
        IS  - 1
        AB  - DNA sequencing is at the core of many molecular biology laboratories. Despite its long history, there is a lack of user-friendly Sanger sequencing data analysis tools that can be run interactively as a web application or at large-scale in batch from the command-line.
        SN  - 1471-2164
        UR  - https://doi.org/10.1186/s12864-020-6635-8
        DO  - 10.1186/s12864-020-6635-8
        ID  - Rausch2020
        ER  - 
    `,
];

const btnStyle = ({ border = "1px solid #cfcfcf" , backgroundcolor = "#ffffff"} = {}) => ({
    minWidth: "100px",
    flex: "0 0 calc((100% - 180px) / 10)",
    height: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: backgroundcolor,
    border: border,
    borderRadius: "5px",
    fontSize: "15px",
    fontWeight: "500",
})

function Tracy () {
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
            label: "Tracy",
            path: "/tools/tracy"
        },
    ];
    const [openToolInfo, setOpenToolInfo] = useState(false)
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Biến thường, tính từ URL mỗi lần render (KHÔNG dùng useState)
    let selectedSection = "tracy_decompose"; // Khởi tạo trạng thái trang gốc dùng để set style nút
    if (pathname.includes("tracy-decompose")) 
        selectedSection = "tracy_decompose"; // Dùng để set style nút
    else if (pathname.includes("samtools-view")) 
        selectedSection = "samtools_view"; // Dùng để set style nút
    else if (pathname.includes("samtools-faidx")) 
        selectedSection = "samtools_faidx"; // Dùng để set style nút
    else if (pathname.includes("samtools-sort")) 
        selectedSection = "samtools_sort"; // Dùng để set style nút
    else if (pathname.includes("samtools-bedcov")) 
        selectedSection = "samtools_bedcov"; // Dùng để set style nút
    return (
        <div 
            id="tracy"
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "start",
                flexDirection: "column",
                gap: "20px",
            }}
        >
            <Breadcrumb items={breadcrumbItems} />
            <p 
                id="tracy_title"
                style={{
                    fontSize: "40px",
                    fontWeight: " 200",
                    paddingLeft: "50px",
                    margin: 0,
                }}
            >
                Tracy
            </p>
            <p 
                id="tracy_description"
                style={{
                    textAlign: "left",
                    fontSize: "20px",
                    fontWeight: 0,
                    paddingLeft: "50px",
                    margin: 0,
                    color: "#555555",
                }}
            >
                Basecalling, alignment, assembly and deconvolution of Sanger Chromatogram trace files
            </p>
            <button
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fdf1ec";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => (
                    setOpenToolInfo(!openToolInfo)
                )}
                style={{
                    borderRadius: "999px",
                    color: '#b5390f',
                    border: "1px solid #e3e3e6",
                    backgroundColor: "#ffffff",
                    marginLeft: "50px",
                    display: 'flex',
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: 'center',
                    gap: "10px",
                    padding: "5px 16px", cursor: "pointer", font: "inherit",
                }}
            >
                {!openToolInfo ? (
                        <>
                            <span
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    marginRight: "auto"
                                }}
                            >
                                Show tool info
                            </span>
                            <svg style ={{marginTop: "2px", marginLeft: "auto"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M12,15.38l-6-6l1.4-1.4L12,12.55l4.6-4.58L18,9.38l-6,6Z"/></svg>
                        </>
                    ) : (
                        <>
                            <span
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    marginRight: "auto"
                                }}
                            >
                                Hide tool info
                            </span>
                            <svg style ={{marginTop: "2px", marginLeft: "auto"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="25px" width="25px" fill="#555"><path d="M7.4,15.38L6,13.98l6-6l6,6l-1.4,1.4L12,10.8L7.4,15.38Z"/></svg>
                        </>
                    )
                }
            </button>
            {openToolInfo &&
                <ToolInfo
                    toolName="Tracy"
                    github="https://github.com/gear-genomics/tracy"
                    docs="https://www.gear-genomics.com/docs/tracy/"
                    license={{ name: "BSD 3-Clause", url: "https://github.com/gear-genomics/tracy/blob/main/LICENSE" }}
                    authors={["Tobias Rausch", "Markus Hsi-Yang Fritz", "Andreas Untntergasser",  "Vladimir Benes"]}
                    citations={citations}
                    style={{marginLeft: "50px", marginRight: "50px"}}
                />
            }
            <Divider margin="50px" />
            <div 
                className="samtools_programs_grid"
                style={{
                    padding: "0px 50px",
                    boxSizing: "border-box",
                    gap: "20px",
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                }}
            >
                <button 
                    onClick={() => {
                        // navigate("/tools/samtools/samtools-idxstats");
                    }} 
                    className="tracy_decompose_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "tracy_decompose") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "tracy_decompose") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "tracy_decompose" ? btnStyle({backgroundcolor: "#FF7F50", border: "none",}) : btnStyle()
                    }
                >
                    Decompose
                </button>
            </div>
            <div
                id="tool_parameters"
                style={{
                    height: "100%",
                    width: "calc(100% - 100px)",
                    marginLeft: "50px",
                    marginRight: "50px",
                    padding: "25px 50px",
                    boxSizing: "border-box",
                    borderRadius: "5px",
                    borderTop: "3px solid #FF7F50",
                }}
            >
                <Outlet />
            </div>
        </div>
    )
}
export default Tracy;