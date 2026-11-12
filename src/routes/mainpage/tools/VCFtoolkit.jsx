import { useNavigate, Outlet, useLocation} from 'react-router';
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

function VCFtoolkit () {
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
    ];
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Biến thường, tính từ URL mỗi lần render (KHÔNG dùng useState)
    let selectedSection = "vcftoolkit_convert"; // Khởi tạo trạng thái trang gốc dùng để set style nút
    if (pathname.includes("vcftoolkit-convert")) 
        selectedSection = "vcftoolkit_convert"; // Dùng để set style nút
    else if (pathname.includes("samtools-view")) 
        selectedSection = "samtools_view"; // Dùng để set style nút
    return (
        <div 
            className="vcftoolkit"
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
                className="vcftoolkit_title"
                style={{
                    fontSize: "40px",
                    fontWeight: " 200",
                    paddingLeft: "50px",
                    margin: 0,
                }}
            >
                VCFtoolkit
            </p>
            <p 
                className="vcftoolkit_description"
                style={{
                    textAlign: "left",
                    fontSize: "20px",
                    fontWeight: 0,
                    paddingLeft: "50px",
                    margin: 0,
                    color: "#555555",
                }}
            >
                A toolkit for annotating, and converting VCF files
            </p>
            <Divider margin="50px" />
            <div 
                className="vcftoolkit_programs_grid"
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
                    onClick={() => {navigate("/tools/vcftoolkit/vcftoolkit-convert")}} 
                    className="vcftoolkit_convert_button"
                    onMouseEnter={(e) => {
                        if (selectedSection !== "vcftoolkit_convert") {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        } else {
                            e.currentTarget.style.cursor = "default";
                        } 
                    }}
                    onMouseLeave={(e) => {
                        if (selectedSection !== "vcftoolkit_convert") {
                            e.currentTarget.style.transform = "scale(1)";
                        } 
                    }}
                    
                    style={
                        selectedSection === "vcftoolkit_convert" ? btnStyle({backgroundcolor: "#FF7F50", border: "none",}) : btnStyle()
                    }
                >
                    Convert
                </button>
                {/* <button className="vcftoolkit_annotate_button">
                    <p className="vcftoolkit_annotate_button_title">
                        VCFtoolkit annotate
                    </p>
                    <p className="vcftoolkit_annotate_button_description">
                        Convert a VCF file into another format (xlsx, csv and tsv)
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
export default VCFtoolkit;