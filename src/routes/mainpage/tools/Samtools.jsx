import { useNavigate, Outlet, useLocation} from 'react-router';
import { useState, useRef } from "react";
import Breadcrumb from "../../../components/ui/Breadcrumb"
import ToolInfo from "../../../components/ui/ToolInfo"
import Divider from "../../../components/ui/Divider";

const citations = [
    // Primary citation (shown in the collapsed view). The long `abstract` field is ignored.
    `
        @article{10.1093/gigascience/giab008,
            author = {Danecek, Petr and Bonfield, James K and Liddle, Jennifer and Marshall, John and Ohan, Valeriu and Pollard, Martin O and Whitwham, Andrew and Keane, Thomas and McCarthy, Shane A and Davies, Robert M and Li, Heng},
            title = "{Twelve years of SAMtools and BCFtools}",
            journal = {GigaScience},
            volume = {10},
            number = {2},
            year = {2021},
            month = {02},
            abstract = "{SAMtools and BCFtools are widely used programs for processing and analysing high-throughput sequencing data. They include tools for file format conversion and manipulation, sorting, querying, statistics, variant calling, and effect analysis amongst other methods.The first version appeared online 12 years ago and has been maintained and further developed ever since, with many new features and improvements added over the years. The SAMtools and BCFtools packages represent a unique collection of tools that have been used in numerous other software projects and countless genomic pipelines.Both SAMtools and BCFtools are freely available on GitHub under the permissive MIT licence, free for both non-commercial and commercial use. Both packages have been installed \\&gt;1 million times via Bioconda. The source code and documentation are available from https://www.htslib.org.}",
            issn = {2047-217X},
            doi = {10.1093/gigascience/giab008},
            url = {https://doi.org/10.1093/gigascience/giab008},
            note = {giab008},
            eprint = {https://academic.oup.com/gigascience/article-pdf/10/2/giab008/36332246/giab008.pdf},
        }
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
    const [openToolInfo, setOpenToolInfo] = useState(false)
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
                    toolName="Samtools"
                    github="https://github.com/samtools/samtools"
                    docs="https://www.htslib.org/"
                    license={{ name: "MIT/Expat", url: "https://github.com/samtools/samtools/blob/develop/LICENSE" }}
                    authors={["Heng Li", "Petr Danecek", "James K. Bonfield", "contributors"]}
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
                        selectedSection === "samtools_idxstats" ? btnStyle({backgroundcolor: "#FF7F50", border: "none",}) : btnStyle()
                    }
                >
                    Idxstats
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
                        selectedSection === "samtools_bedcov" ? btnStyle({backgroundcolor: "#FF7F50", border: "none",}) : btnStyle()
                    }
                >
                    Bedcov
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
export default Samtools;