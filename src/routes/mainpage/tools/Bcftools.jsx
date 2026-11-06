import { useNavigate, Outlet, useLocation} from 'react-router';
import { useState, useRef } from "react";
import Breadcrumb from "../../../components/ui/Breadcrumb"
import Divider from "../../../components/ui/Divider";

const btnStyle = ({ border = "1px solid #cfcfcf" , backgroundcolor = "#ffffff"} = {}) => ({
    minWidth: "70px",
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

function Bcftools () {
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
            label: "Bcftools",
            path: "/tools/bcftools"
        },
    ];
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Biến thường, tính từ URL mỗi lần render (KHÔNG dùng useState)
    let selectedSection = "bcftools_stats"; // Khởi tạo trạng thái trang gốc dùng để set style nút
    if (pathname.includes("bcftools-stats"))
        selectedSection = "bcftools_stats"; // Dùng để set style nút
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
                id="bcftools_title"
                style={{
                    fontSize: "40px",
                    fontWeight: " 200",
                    paddingLeft: "50px",
                    margin: 0,
                }}
            >
                Bcftools
            </p>
            <p
                id="bcftools_description"
                style={{
                    textAlign: "left",
                    fontSize: "20px",
                    fontWeight: 0,
                    paddingLeft: "50px",
                    margin: 0,
                    color: "#555555",
                }}
            >
                A set of utilities that manipulate variant calls in the Variant Call Format (VCF) and its binary counterpart BCF
            </p>
            <Divider margin="50px" />
            <div
                className="bcftools_programs_grid"
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
                        navigate("/tools/bcftools/bcftools-stats");
                    }}
                    className="samtools_idxstats_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "bcftools_stats") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "bcftools_stats") {
                            e.currentTarget.style.transform = "scale(1)";
                        }
                    }}

                    style={
                        selectedSection === "bcftools_stats" ? btnStyle({backgroundcolor: "#FF7F50", border: "none",}) : btnStyle()
                    }
                >
                    <p
                        id="bcftools_stats_button_title"
                        style={{
                            fontSize: "15px",
                            fontWeight: "500",
                        }}
                    >
                        Stats
                    </p>
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
                    // backgroundColor: "rgb(251, 251, 251)",
                    borderTop: "3px solid #FF7F50",
                }}
            >
                <Outlet />
            </div>
        </div>

    )
}
export default Bcftools;
