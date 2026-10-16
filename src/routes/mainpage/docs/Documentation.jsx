import { Outlet } from "react-router";
import { Link, useNavigate } from 'react-router';
function Documentation () {
    const navigate = useNavigate();
    return (
        <div className="documentation">
            <div className="sidebar">
                <span className="sidebar_section_title">Introduction</span>
                <button className="sidebar_button" onClick={() => navigate("/docs/about-us")}>About us</button>
                <button className="sidebar_button">What is Varkit?</button>
                <button className="sidebar_button">Key Features</button>
                <div className="divider"></div>
                <span className="sidebar_section_title">Installation</span>
                <button className="sidebar_button">Requirements</button>
                <button className="sidebar_button">Installation for Windows</button>
                <button className="sidebar_button">Installation for Linux</button>

                <div className="divider"></div>

                <span className="sidebar_section_title">License</span>
                <button className="sidebar_button" onClick={() => navigate("/docs/license")}>GPL-3.0 license</button>
                <button className="sidebar_button">Third-party Packages</button>

                <div className="divider"></div>

                <span className="sidebar_section_title">Support</span>
                <button className="sidebar_button">FAQ</button>
                <button className="sidebar_button">Contact us</button>
                <button className="sidebar_button">Report an Issue</button>
            </div>
            <div className="content">
                <Outlet />
            </div>
        </div>
    )
}
export default Documentation;
