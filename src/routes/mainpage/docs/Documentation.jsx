import { Outlet } from "react-router";
import { Link, useNavigate } from 'react-router';
import Breadcrumb from "../../../components/ui/Breadcrumb";
import Divider from "../../../components/ui/Divider";
function Documentation () {
    const navigate = useNavigate();
    const breadcrumbItems = [
        { label: "FORGE Home", path: "/" },
        { label: "About", path: "/docs" },
    ];
    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <div 
                className="documentation"
                style={{
                        minHeight: "100vh",
                        display: "grid",
                        gridTemplateColumns: "300px 1fr",
                        gridTemplateAreas: '"left right"',
                }}
            >
                <div 
                    className="sidebar"
                    style={{
                        width: "100%",
                        height: "100%",
                        gridArea: "left",
                        borderRight: "solid 1px #d5d5d5",
                        display: "flex",
                        flexDirection: "column",
                        paddingTop: "20px",
                        paddingLeft: "50px",
                        paddingRight: "30px",
                        overflowY: "auto",
                        boxSizing: "border-box"
                    }}
                >
                    <style>
                        {`
                            .sidebar_section_title{
                                font-size: 15px;
                                line-height: 21px;
                                font-weight: 600;
                            }
                            .sidebar_button{
                                font-size: 14px;
                                line-height: 21px;      
                                font-weight: 500;
                                width: 100%;
                                display: flex;
                                align-self: start;
                                justify-self: center;
                                padding: 5px 20px;
                                background-color: transparent;
                                border: solid 2px transparent;
                                cursor: pointer;
                                box-sizing: border-box;
                                &:hover{
                                    border: solid 2px #FF7F50;
                                    border-radius: 5px;
                                }
                            }
                        `}
                    </style>
                    <span className="sidebar_section_title">Introduction</span>
                    <button className="sidebar_button" onClick={() => navigate("/docs/about-us")}>About us</button>
                    <button className="sidebar_button" onClick={() => navigate("/docs/what-is-forge")} >What is FORGE?</button>
                    <Divider style={{marginTop: "10px", marginBottom: "10px"}}/>
                    <span className="sidebar_section_title">License</span>
                    <button className="sidebar_button" onClick={() => navigate("/docs/license")}>GPL-3.0 license</button>
                    <button className="sidebar_button">Third-party Packages</button>
                    <Divider style={{marginTop: "10px", marginBottom: "10px"}}/>
                    <span className="sidebar_section_title">Support</span>
                    <button className="sidebar_button" onClick={() => navigate("/docs/faq")}>FAQ</button>
                    <button className="sidebar_button" onClick={() => navigate("/docs/contact-us")}>Contact us</button>
                    <button className="sidebar_button" onClick={() => navigate("/docs/report-an-issue")}>Report an Issue</button>
                </div>
                <div 
                    className="content"
                    style={{
                        padding: "30px 30px",
                        gridArea: "right"
                    }}
                >
                    <Outlet />
                </div>
            </div>
            
        </div>
    )
}
export default Documentation;
