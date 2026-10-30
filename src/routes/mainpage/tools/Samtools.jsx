import { useNavigate, Outlet, useLocation} from 'react-router';
import { useState, useRef } from "react";
import Breadcrumb from "../../../components/ui/Breadcrumb"
import Divider from "../../../components/ui/Divider";

function Samtools () {
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
            label: "Samtools",
            path: "/tools/samtools"
        },
    ];
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Biến thường, tính từ URL mỗi lần render (KHÔNG dùng useState)
    let selectedSection = "samtools_idxstats"; // Khởi tạo trạng thái trang gốc dùng để set style nút
    if (pathname.includes("samtools-idxstats")) 
        selectedSection = "samtools_idxstats"; // Dùng để set style nút
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
            id="samtools"
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
                id="samtools_title"
                style={{
                    fontSize: "40px",
                    fontWeight: " 200",
                    paddingLeft: "50px",
                    margin: 0,
                }}
            >
                Samtools
            </p>
            <p 
                id="samtools_description"
                style={{
                    textAlign: "left",
                    fontSize: "20px",
                    fontWeight: 0,
                    paddingLeft: "50px",
                    margin: 0,
                    color: "#555555",
                }}
            >
                A set of utilities that manipulate alignments in the SAM (Sequence Alignment/Map), BAM, and CRAM formats
            </p>
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
                {/* <button 
                    onClick={() => {
                        navigate("/tools/samtools/samtools-sort");
                    }} 
                    className="samtools_sort_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "samtools_sort") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "samtools_sort") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "samtools_sort" ? {
                            minWidth: "120px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FF7F50",
                            border: "none",
                        } : {
                            minWidth: "120px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            // padding: "5px 10px",
                        }
                        
                    }
                >
                    <p 
                        id="samtools_sort_button_title"
                        style={{
                            fontSize: "15px",
                            fontWeight: "500",
                        }}
                    >
                        Samtools sort
                    </p>
                </button> */}

                <button 
                    onClick={() => {
                        navigate("/tools/samtools/samtools-idxstats");
                    }} 
                    className="samtools_idxstats_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "samtools_idxstats") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "samtools_idxstats") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "samtools_idxstats" ? {
                            minWidth: "150px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FF7F50",
                            border: "none",
                        } : {
                            minWidth: "150px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            // padding: "5px 10px",
                        }
                        
                    }
                >
                    <p 
                        id="samtools_idxstats_button_title"
                        style={{
                            fontSize: "15px",
                            fontWeight: "500",
                        }}
                    >
                        Samtools idxstats
                    </p>
                </button>

                <button 
                    onClick={() => {
                        navigate("/tools/samtools/samtools-bedcov");
                    }} 
                    className="samtools_bedcov_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "samtools_bedcov") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "samtools_bedcov") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "samtools_bedcov" ? {
                            minWidth: "150px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FF7F50",
                            border: "none",
                        } : {
                            minWidth: "150px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            // padding: "5px 10px",
                        }
                        
                    }
                >
                    <p 
                        id="samtools_bedcov_button_title"
                        style={{
                            fontSize: "15px",
                            fontWeight: "500",
                        }}
                    >
                        Samtools bedcov
                    </p>
                </button>
                
                {/* <button 
                    onClick={() => {
                        navigate("/tools/samtools/samtools-faidx");
                    }} 
                    className="samtools_sort_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "samtools_faidx") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "samtools_faidx") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "samtools_faidx" ? {
                            minWidth: "150px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FF7F50",
                            border: "none",
                        } : {
                            minWidth: "150px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            // padding: "5px 10px",
                        }
                        
                    }
                >
                    <p 
                        id="samtools_faidx_button_title"
                        style={{
                            fontSize: "15px",
                            fontWeight: "500",
                        }}
                    >
                        Samtools faidx
                    </p>
                </button> */}
                
                {/* <button 
                    className="samtools_view_button"
                    onClick={() => {
                        navigate("/tools/samtools/samtools-view")
                    }} 
                    onMouseEnter={(e) => {
                        if (selectedSection !== "samtools_view") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "samtools_view") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "samtools_view" ? {
                            minWidth: "120px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FF7F50",
                            border: "none",
                        } : {
                            minWidth: "120px",
                            flex: "0 0 calc((100% - 180px) / 10)",
                            height: "30px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            // padding: "5px 10px",
                        }
                        
                    }
                >
                    <p 
                        className="samtools_view_button_title"
                        style={{
                            fontSize: "15px",
                            fontWeight: "500",
                        }}
                    >
                        Samtools view
                    </p>
                </button> */}
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
                    // backgroundColor: "rgb(251, 251, 251)",
                    borderTop: "3px solid #FF7F50",
                }}
            >
                <Outlet />
            </div>
        </div>
        
    )
}
export default Samtools;