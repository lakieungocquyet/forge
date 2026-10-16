import { useNavigate } from 'react-router';
import Breadcrumb from "../../../components/ui/Breadcrumb"

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
    return (
        <div className="vcftoolkit">
            <Breadcrumb items={breadcrumbItems} />
            <p className="vcftoolkit_title">VCFtoolkit</p>
            <p className="vcftoolkit_description">A toolkit for annotating, and converting VCF files</p>
            <div className="vcftoolkit_programs_container">
                <div className="divider"></div>
                <div className="vcftoolkit_programs_grid">
                    <button onClick={() => {navigate("/tools/vcftoolkit/vcftoolkit-convert")}} className="vcftoolkit_convert_button">
                        <p className="vcftoolkit_convert_button_title">
                            VCFtoolkit convert
                        </p>
                        <p className="vcftoolkit_convert_button_description">
                            Convert a VCF file into another format (xlsx, csv and tsv)
                        </p>
                    </button>
                    <button className="vcftoolkit_annotate_button">
                        <p className="vcftoolkit_annotate_button_title">
                            VCFtoolkit annotate
                        </p>
                        <p className="vcftoolkit_annotate_button_description">
                            Convert a VCF file into another format (xlsx, csv and tsv)
                        </p>
                    </button>
                </div>
            </div>
        </div>
        
    )
}
export default VCFtoolkit;