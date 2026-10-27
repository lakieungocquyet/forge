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
        <div className="tools">
            <Breadcrumb items={breadcrumbItems} />
            <div className="tools_title_and_description"> 
                <div className="tools_title">FORGE tools</div>
                <div className="tools_description">Our mission is to develop and maintain free, user-friendly bioinformatics tools that are accessible to all researchers</div>
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
                    gap: "50px",
                    flexDirection: "column",
                }}
            >
                <Divider/>
                <span style={{
                    padding: 0,
                    margin: 0,
                    fontSize: "25px",
                    fontWeight: "500"
                }}> In-house Tools </span>
                <div 
                    style={{
                        padding: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "row",
                        gap: "20px",
                    }}
                >
                    {/* <button 
                        onClick={() => {navigate("/tools/vcftoolkit")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        style={{
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 100px) / 4)",
                            height: "150px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "20px",
                        }}
                    >
                        <p 
                            style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            VCFtoolkit
                        </p>
                        <p 
                            style={{
                                textAlign: "left",
                                fontSize: "13px",
                                fontWeight: 0,
                                textAlign: "justify",
                                padding: 0,
                                margin: 0,
                                color: "#555555",
                            }}
                        >
                            A toolkit for annotating, and converting VCF files
                        </p>
                    </button> */}
                    <button 
                        onClick={() => {navigate("/tools/biopostgresql")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        style={{
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 100px) / 4)",
                            height: "150px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "20px",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            BioPostgreSQL
                        </p>
                        <p
                            style={{
                                textAlign: "left",
                                fontSize: "13px",
                                fontWeight: 0,
                                textAlign: "justify",
                                padding: 0,
                                margin: 0,
                                color: "#555555",
                            }}
                        >
                            A tool for managing and querying structured biological data with PostgreSQL
                        </p>
                    </button>
                </div>
                <Divider/>
                <span style={{
                    padding: 0,
                    margin: 0,
                    fontSize: "25px",
                    fontWeight: "500"
                }}> 
                    Third-party Tools 
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
                    {/* <button 
                        onClick={() => {navigate("/tools/vcftoolkit")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        style={{
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 60px) / 4)",
                            height: "150px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "20px",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            BWA
                        </p>
                        <p
                            style={{
                                textAlign: "left",
                                fontSize: "13px",
                                textAlign: "justify",
                                fontWeight: 0,
                                padding: 0,
                                margin: 0,
                                color: "#555555",
                            }}
                        >
                            A software package for mapping short-read DNA sequences against a large reference genome
                        </p>
                    </button> */}
                    <button 
                        onClick={() => {navigate("/tools/samtools")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        style={{
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 60px) / 4)",
                            height: "150px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "20px",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            Samtools
                        </p>
                        <p
                            style={{
                                textAlign: "left",
                                fontSize: "13px",
                                fontWeight: 0,
                                textAlign: "justify",
                                padding: 0,
                                margin: 0,
                                color: "#555555",
                            }}
                        >
                            A set of utilities that manipulate alignments in the SAM (Sequence Alignment/Map), BAM, and CRAM formats
                        </p>
                    </button>
                    <button 
                        onClick={() => {navigate("/tools/bcftools")}} 
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        style={{
                            minWidth: "300px",
                            flex: "0 0 calc((100% - 60px) / 4)",
                            height: "150px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cfcfcf",
                            transition: "transform 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            padding: "30px 30px",
                            gap: "20px",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            Bcftools
                        </p>
                        <p
                            style={{
                                textAlign: "left",
                                fontSize: "13px",
                                textAlign: "justify",
                                fontWeight: 0,
                                padding: 0,
                                margin: 0,
                                color: "#555555",
                            }}
                        >
                            A set of utilities that manipulate variant calls in the Variant Call Format (VCF) and its binary counterpart BCF
                        </p>
                    </button>
                </div>
            </div>
        </div>
        
    )
}
export default Tools;