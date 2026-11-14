import { Link, useNavigate } from 'react-router';
import Breadcrumb from "../../../components/ui/Breadcrumb";
import Divider from "../../../components/ui/Divider";
function Tools () {
    const navigate = useNavigate();
    const breadcrumbItems = [
        {
            label: "FORGE Home",
            path: "/"
        },
        {
            label: "Tools",
            path: "/tools"
        },
    ];
    return (
        <div 
            className="tools"
            style={{
                minHeight: "100vh",
                display: "flex",
                gap: "20px",
                alignItems: "start",
                flexDirection: "column",
                boxSizing: "border-box",
            }}
        >
            <Breadcrumb items={breadcrumbItems} />
            <div 
                className="tools_title_and_description"
                style={{
                    display: "flex",
                    alignItems: "start",
                    gap: "20px",
                    width: "100%",
                    flexDirection: "column",
                    paddingLeft: "50px",
                }}
            > 
                <div 
                    className="tools_title"
                    style={{
                        lineHeight: "1.1",
                        fontSize: "44px",
                        fontWeight: "700",
                        paddingTop: "30px"
                    }}
                >
                    FORGE tools
                </div>
                <div 
                    className="tools_description"
                    style={{
                        fontSize: "20px",
                        color: "#555555",
                    }}
                >
                    Free, user-friendly bioinformatics tools that are accessible to all researchers
                </div>
            </div>
            <div 
                id="tools_container"
                style={{
                    width: "100%",
                    boxSizing: "border-box",
                    flex: "auto",
                    paddingLeft: "50px",
                    paddingRight: "50px",
                    display: "flex",
                    gap: "15px",
                    flexDirection: "column",
                }}
            >
                <Divider/>
                <span style={{
                    paddingTop: "20px",
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: "600"
                }}> 
                    In-house tools 
                </span>
                <div 
                    style={{
                        padding: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "row",
                        gap: "20px",
                    }}
                >
                    <div 
                        style={{
                            borderRadius: "10px",
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 100px) / 4)",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "15px",
                        }}
                    >
                        <div 
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                            }}
                        >
                            VCFtoolkit
                            <span style={{ fontSize:"10px", color: "#B23C12", backgroundColor: "#FFEDE5", borderRadius: "5px", padding: "5px 5px", border: "1px solid #F8D5C6"}}> Available soon </span>
                        </div>
                        <div 
                            style={{
                                textAlign: "left",
                                fontSize: "15px",
                                color: "#555555",
                            }}
                        >
                            A toolkit for annotating, and converting VCF files
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "5px",
                                alignItems: "center"
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                VCF
                            </span>
                        </div>
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                paddingTop: "10px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#B23C12",
                                textDecoration: "none",
                            }}
                        // onClick={() => {navigate("/tools/vcftoolkit")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                           e.currentTarget.style.textDecoration = "none";
                        }}
                        >
                            Open tool 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" height="18px" width="18px" fill="#B23C12"><path d="M13.13,10.75H4V9.25h9.13L8.94,5.06L10,4l6,6l-6,6L8.94,14.94l4.19-4.19Z"/></svg>
                        </span>
                    </div>
                    <div 
                        style={{
                            borderRadius: "10px",
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 100px) / 4)",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "15px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                            }}
                        >
                            BioPostgreSQL
                        </div>
                        <div
                            style={{
                                textAlign: "left",
                                fontSize: "15px",
                                color: "#555555",
                            }}
                        >
                            A tool for managing and querying structured biological data with PostgreSQL
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "5px",
                                alignItems: "center"
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                Database
                            </span>
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                Query
                            </span>
                        </div>
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                paddingTop: "10px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#B23C12",
                                textDecoration: "none",
                            }}
                        onClick={() => {navigate("/tools/biopostgresql")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                           e.currentTarget.style.textDecoration = "none";
                        }}
                        >
                            Open tool 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" height="18px" width="18px" fill="#B23C12"><path d="M13.13,10.75H4V9.25h9.13L8.94,5.06L10,4l6,6l-6,6L8.94,14.94l4.19-4.19Z"/></svg>
                        </span>
                    </div>
                </div>
                <span style={{
                    paddingTop: "20px",
                    fontSize: "22px",
                    fontWeight: "600"
                }}> 
                    Third-party tools 
                </span>
                <div 
                    id="tools_grid"
                    style={{
                        padding: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "row",
                        gap: "20px",
                        flexWrap: "wrap",
                    }}
                >
                    <div 
                        style={{
                            borderRadius: "10px",
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 60px) / 4)",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "15px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                            }}
                        >
                            Samtools
                        </div>
                        <div
                            style={{
                                textAlign: "left",
                                fontSize: "15px",
                                color: "#555555",
                            }}
                        >
                            A set of utilities that manipulate alignments in the SAM (Sequence Alignment/Map), BAM, and CRAM formats
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "5px",
                                alignItems: "center"
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                SAM
                            </span>
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                BAM
                            </span>
                        </div>
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                paddingTop: "10px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#B23C12",
                                textDecoration: "none",
                            }}
                        onClick={() => {navigate("/tools/samtools")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                           e.currentTarget.style.textDecoration = "none";
                        }}
                        >
                            Open tool 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" height="18px" width="18px" fill="#B23C12"><path d="M13.13,10.75H4V9.25h9.13L8.94,5.06L10,4l6,6l-6,6L8.94,14.94l4.19-4.19Z"/></svg>
                        </span>
                    </div>
                    <div 
                        style={{
                            borderRadius: "10px",
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 60px) / 4)",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "15px"
                        }}
                    >
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                            }}
                        >
                            Bcftools
                        </div>
                        <div
                            style={{
                                textAlign: "left",
                                fontSize: "15px",
                                color: "#555555",
                            }}
                        >
                            A set of utilities that manipulate variant calls in the Variant Call Format (VCF) and its binary counterpart BCF
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "5px",
                                alignItems: "center"
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                VCF
                            </span>
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                BCF
                            </span>
                        </div>
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                paddingTop: "10px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#B23C12",
                                textDecoration: "none",
                            }}
                        onClick={() => {navigate("/tools/bcftools")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                           e.currentTarget.style.textDecoration = "none";
                        }}
                        >
                            Open tool 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" height="18px" width="18px" fill="#B23C12"><path d="M13.13,10.75H4V9.25h9.13L8.94,5.06L10,4l6,6l-6,6L8.94,14.94l4.19-4.19Z"/></svg>
                        </span>
                    </div>
                    <div 
                        style={{
                            borderRadius: "10px",
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 60px) / 4)",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "15px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                            }}
                        >
                            Tracy
                            {/* <span style={{ fontSize:"10px", color: "#B23C12", backgroundColor: "#FFEDE5", borderRadius: "5px", padding: "5px 5px", border: "1px solid #F8D5C6"}}> Available soon </span> */}
                        </div>
                        <div
                            style={{
                                textAlign: "left",
                                fontSize: "15px",
                                color: "#555555",
                            }}
                        >
                            Basecalling, alignment, assembly and deconvolution of Sanger Chromatogram trace files
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "5px",
                                alignItems: "center"
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                Sanger
                            </span>
                            <span
                                style={{
                                    fontSize: "12px",
                                    color: "#4A3A33",
                                    background: "#F5F0ED",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}
                            >
                                AB1
                            </span>
                        </div>
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                paddingTop: "10px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#B23C12",
                                textDecoration: "none",
                            }}
                        onClick={() => {navigate("/tools/tracy")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                           e.currentTarget.style.textDecoration = "none";
                        }}
                        >
                            Open tool 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" height="18px" width="18px" fill="#B23C12"><path d="M13.13,10.75H4V9.25h9.13L8.94,5.06L10,4l6,6l-6,6L8.94,14.94l4.19-4.19Z"/></svg>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
    )
}
export default Tools;