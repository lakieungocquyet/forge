import { Outlet, Link, useNavigate } from "react-router";
import { useState, useRef } from "react";
import Divider from '../components/ui/Divider';
import Logo from "../components/ui/Logo.jsx"

function Main () {
    const navigate = useNavigate();
    const [openSection, setOpenSection] = useState(null);
    const [selectedSection, setSelectedSection] = useState(null);
    const closeTimer = useRef(null);

    const open = (name) => {
        clearTimeout(closeTimer.current);
        setOpenSection(name);
    };

    const close = () => {
        closeTimer.current = setTimeout(() => {
            setOpenSection(null);
        }, 150);
    };
    const closeImmediately = () => {
        clearTimeout(closeTimer.current);
        setOpenSection(null);
    };

    const [selectedIcon, setSelectedIcon] = useState(false)
    return (
        <div className="main_page">
            <div className="header">
                <Logo></Logo>
                <div
                    className={`header_navigation`}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        height: "100%",
                        width: "800px",
                        boxSizing: "border-box",
                        position: "relative",
                    }}
                >
                    <div className={`dropdown_container`}>
                        <button
                            className={`dropdown_button ${selectedSection === "home" ? "selected" : "" } ${openSection === "home" ? "open" : ""}`}
                            onClick={() => {
                                setSelectedSection("home");
                                navigate("/home")
                            }}
                            onMouseEnter={() => open("home")}
                            onMouseLeave={close}
                        >
                            <span className="dropdown_button_label">
                                Home
                            </span>
                        </button>
                    </div>
                    <div className={`dropdown_container`}>
                        <button
                            className={`dropdown_button ${selectedSection === "tools" ? "selected" : "" } ${openSection === "tools" ? "open" : ""}`}
                            onClick={() => {
                                setSelectedSection("tools");
                                navigate("/tools")
                            }}
                            onMouseEnter={() => open("tools")}
                            onMouseLeave={close}
                        >
                            <span className="dropdown_button_label">
                                Tools
                            </span>
                        </button>
                    </div>
                    {/* <div className={`dropdown_container`}>
                        <button
                            className={`dropdown_button ${selectedSection === "installation" ? "selected" : "" } ${openSection === "installation" ? "open" : ""}`}
                            onClick={() => {
                                setSelectedSection("installation");
                                navigate("/installation")
                            }}
                            onMouseEnter={() => open("installation")}
                            onMouseLeave={close}
                        >
                            <span className="dropdown_button_label">
                                Installation
                            </span>
                        </button>
                    </div> */}
                    {/* <div className={`dropdown_container`}>
                        <button
                            className={`dropdown_button ${selectedSection === "documentation" ? "selected" : "" } ${openSection === "documentation" ? "open" : ""}`}
                            onClick={() => {
                                setSelectedSection("documentation");
                                navigate("/docs")
                            }}
                            onMouseEnter={() => open("documentation")}
                            onMouseLeave={close}
                        >
                            <span className="dropdown_button_label">
                                Documentation
                            </span>
                        </button>
                    </div> */}
                    <div className={`dropdown_container`}>
                        <button
                            className={`dropdown_button ${selectedSection === "about" ? "selected" : "" } ${openSection === "about" ? "open" : ""}`}
                            onClick={() => {
                                setSelectedSection("about");
                                navigate("/docs")
                            }}
                            onMouseEnter={() => open("about")}
                            onMouseLeave={close}
                        >
                            <span className="dropdown_button_label" >
                                Docs
                            </span>
                        </button>
                    </div>
                    {/* {(openSection === "installation")  && (
                        <div
                            className="dropdown_panel"
                            onMouseEnter={() => open("installation")}
                            onMouseLeave={close}
                        >
                            <div className="installation_panel">
                                <div className="window_installation_section">
                                    <div className="window_installation_title">
                                        <svg width="30px" height="30px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>microsoft_windows</title> <rect width="24" height="24" fill="none"></rect> <path d="M3,12V6.75L9,5.43v6.48L3,12M20,3v8.75L10,11.9V5.21L20,3M3,13l6,.09V19.9L3,18.75V13m17,.25V22L10,20.09v-7Z"></path> </g></svg>
                                        Varkit for Windows
                                    </div>
                                </div>
                                <div className="divider"></div>
                                <div className="linux_installation_section">
                                    <div className="linux_installation_title">
                                        <svg fill="#ffffffff" width="30px" height="30px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 0 0-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 0 0-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 0 1-.004-.021l-.004-.024a1.807 1.807 0 0 1-.15.706.953.953 0 0 1-.213.335.71.71 0 0 0-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 0 0-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 0 0-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 0 0-.205.334 1.18 1.18 0 0 0-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 0 1-.018-.2v-.02a1.772 1.772 0 0 1 .15-.768 1.08 1.08 0 0 1 .43-.533.985.985 0 0 1 .594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 0 0-.166-.267.248.248 0 0 0-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 0 0-.12.27.944.944 0 0 0-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 0 1-.131.068 2.62 2.62 0 0 1-.275-.402 1.772 1.772 0 0 1-.155-.667 1.759 1.759 0 0 1 .08-.668 1.43 1.43 0 0 1 .283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 0 1 .016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 0 1-.448-.067 3.566 3.566 0 0 1-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 0 0-.402-.533 1.45 1.45 0 0 0-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 0 0 .314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 0 1 .647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 0 1-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"></path></g></svg>
                                        Varkit for Linux
                                    </div>
                                </div>
                            </div>
                        </div>
                        )
                    } */}
                    {(openSection === "about") && (
                        <div
                            className="dropdown_panel"
                            onMouseEnter={() => open("about")}
                            onMouseLeave={close}
                        >
                            <div
                                className="about_panel"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "grid",
                                    gridTemplateColumns: "1fr 0.5px 1fr",
                                    gridTemplateAreas: '"left middle right"',
                                }}
                            >
                                <div
                                    className="about_panel_actions"
                                    style={{
                                        paddingTop: "20px",
                                        gridArea: "left",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "start",
                                        alignItems: "center",
                                        gap: "5px",
                                    }}
                                >
                                    <button
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "#ffffff";
                                        }}
                                        onClick={() => {
                                            navigate("/docs/about-us");
                                            closeImmediately();
                                        }}
                                        style={{
                                            gap: "5px",
                                            padding: "10px 15px",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "start",
                                            width: "90%",
                                            border: "none",
                                            backgroundColor: "#ffffff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span
                                            className="title"
                                            style={{
                                                fontSize: "16px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            About us
                                        </span>
                                        <div
                                            className="info"
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: "400",
                                                color: "#555555",
                                                marginTop: "5px",
                                            }}
                                        >
                                            Learn more about who we are
                                        </div>
                                    </button>

                                    <button
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "#ffffff";
                                        }}
                                        onClick={() => {
                                            navigate("/docs/license");
                                            closeImmediately();
                                        }}
                                        style={{
                                            gap: "5px",
                                            padding: "10px 15px",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "start",
                                            width: "90%",
                                            border: "none",
                                            backgroundColor: "#ffffff",
                                            cursor: "pointer",
                                        }}

                                    >
                                        <span
                                            className="title"
                                            style={{
                                                fontSize: "16px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            License
                                        </span>
                                        <div
                                            className="info"
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: "400",
                                                color: "#555555",
                                                marginTop: "5px",
                                            }}
                                        >
                                            View Forge in-house and third-party tools licenses
                                        </div>
                                    </button>
                                </div>
                                <Divider orientation = "vertical" margin="20px"/>
                                <div
                                    className="blog"
                                    style={{
                                        paddingTop: "20px",
                                        gridArea: "right",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "start",
                                        alignItems: "center",
                                        gap: "5px",
                                    }}
                                >
                                    <button
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "#ffffff";
                                        }}
                                        onClick={() => {
                                            // navigate("/docs/blog");
                                            closeImmediately();
                                        }}
                                        style={{
                                            gap: "5px",
                                            padding: "10px 15px",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "start",
                                            width: "90%",
                                            border: "none",
                                            backgroundColor: "#ffffff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span
                                            className="title"
                                            style={{
                                                fontSize: "16px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Blog{" "}
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#959595",
                                                    fontWeight: "500"
                                                }}
                                            >
                                                (Coming soon)
                                            </span>
                                        </span>
                                        <div
                                            className="info"
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: "400",
                                                color: "#555555",
                                                marginTop: "5px",
                                            }}
                                        >
                                            Read our latest posts
                                        </div>
                                    </button>
                                    <button
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "#ffffff";
                                        }}
                                        onClick={() => {
                                            navigate("/docs/contact-us");
                                            closeImmediately();
                                        }}
                                        style={{
                                            gap: "5px",
                                            padding: "10px 15px",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "start",
                                            width: "90%",
                                            border: "none",
                                            backgroundColor: "#ffffff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span
                                            className="title"
                                            style={{
                                                fontSize: "16px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Contact
                                        </span>
                                        <div
                                            className="info"
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: "400",
                                                color: "#555555",
                                                marginTop: "5px",
                                            }}
                                        >
                                            Get in touch with us
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                        )
                    }
                </div>
            </div>
            <div className="body_and_footer">
                <div className="body">
                    <Outlet />
                </div>
                <div className="footer">
                    <div
                        className="footer_left"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "start",
                            justifyContent: "start",
                            gap: "20px"
                        }}
                    >
                        <span
                            className="connect_title"
                            style={{
                                marginLeft: "20px",
                                color: "#666",
                                fontSize: "13px",
                            }}
                        >
                            CONNECT WITH FORGE TEAM
                        </span>
                        <button 
                            className="github_repository_button_footer" 
                            onClick={() => window.open("https://github.com/lakieungocquyet/forge", "_blank", "noopener,noreferrer")}
                            style={{
                                marginLeft: "20px",
                                padding: "0px",
                                width: "25px",
                                height: "25px",
                            }}
                            onMouseEnter={(e) => {
                                setSelectedIcon(true)
                                e.currentTarget.style.cursor = "pointer";
                            }}
                            onMouseLeave={(e) => {
                                setSelectedIcon(false)
                            }}
                        >
                            <svg width="25px" height="25px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill={selectedIcon ? "#000000" : "#555"} stroke={selectedIcon ? "#000000" : "#555"}><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>github [#142]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-140.000000, -7559.000000)" fill={selectedIcon ? "#000000" : "#555"}> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M94,7399 C99.523,7399 104,7403.59 104,7409.253 C104,7413.782 101.138,7417.624 97.167,7418.981 C96.66,7419.082 96.48,7418.762 96.48,7418.489 C96.48,7418.151 96.492,7417.047 96.492,7415.675 C96.492,7414.719 96.172,7414.095 95.813,7413.777 C98.04,7413.523 100.38,7412.656 100.38,7408.718 C100.38,7407.598 99.992,7406.684 99.35,7405.966 C99.454,7405.707 99.797,7404.664 99.252,7403.252 C99.252,7403.252 98.414,7402.977 96.505,7404.303 C95.706,7404.076 94.85,7403.962 94,7403.958 C93.15,7403.962 92.295,7404.076 91.497,7404.303 C89.586,7402.977 88.746,7403.252 88.746,7403.252 C88.203,7404.664 88.546,7405.707 88.649,7405.966 C88.01,7406.684 87.619,7407.598 87.619,7408.718 C87.619,7412.646 89.954,7413.526 92.175,7413.785 C91.889,7414.041 91.63,7414.493 91.54,7415.156 C90.97,7415.418 89.522,7415.871 88.63,7414.304 C88.63,7414.304 88.101,7413.319 87.097,7413.247 C87.097,7413.247 86.122,7413.234 87.029,7413.87 C87.029,7413.87 87.684,7414.185 88.139,7415.37 C88.139,7415.37 88.726,7417.2 91.508,7416.58 C91.513,7417.437 91.522,7418.245 91.522,7418.489 C91.522,7418.76 91.338,7419.077 90.839,7418.982 C86.865,7417.627 84,7413.783 84,7409.253 C84,7403.59 88.478,7399 94,7399" id="github-[#142]"> </path> </g> </g> </g> </g></svg>                        
                        </button>
                        <span
                            className="email"
                            style={{
                                marginLeft: "20px",
                                color: "#000000",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                padding: "0px"
                            }}

                        >
                            <div
                                style={{
                                    borderRadius: "50%",
                                    width: "25px",
                                    height: "25px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1.5px solid #555",
                                    marginRight: "10px",
                                    boxSizing: "border-box"
                                }}
                            >
                                <svg width="20px" height="20px" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path stroke="#555" stroke-linejoin="round" stroke-width="10" d="M22 57.265V142c0 5.523 4.477 10 10 10h24V95.056l40 30.278 40-30.278V152h24c5.523 0 10-4.477 10-10V57.265c0-13.233-15.15-20.746-25.684-12.736L96 81.265 47.684 44.53C37.15 36.519 22 44.032 22 57.265Z"></path></g></svg>
                            </div>
                            Email:
                                <a
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.textDecoration = "underline";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.textDecoration = "none";
                                    }}
                                    href="mailto:quyetlakn@gmail.com"
                                    style={{
                                        color: "inherit",
                                        textDecoration: "none",
                                        padding: 0,
                                        margin: 0,
                                        marginLeft: "5px"
                                    }}
                                >
                                    quyetlakn@gmail.com
                                </a>
                        </span>

                        <p>COPYRIGHT © 2026 FORGE</p>
                    </div>

                    <div className="footer_right">
                        <div className="resources">
                            <span className="resources_title">RESOURCES</span>
                            <div
                                className="link"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.textDecoration = "none";
                                }}
                                style={{
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    navigate("/tools")
                                }}
                            >
                                Tools
                            </div>

                        </div>
                        <div className="about">
                            <span className="about_title">ABOUT</span>
                            <div
                                className="link"
                                onClick={() => {
                                    navigate("/docs/about-us")
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.textDecoration = "none";
                                }}
                                style={{
                                    cursor: "pointer",
                                }}
                            >
                                About us
                            </div>
                            <div
                                className="link"
                                onClick={() => {
                                    navigate("/docs/license")
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.textDecoration = "none";
                                }}
                                style={{
                                    cursor: "pointer",
                                }}
                            >
                                License
                            </div>
                            {/* <div
                                className="link"
                                onClick={() => {
                                    navigate("/about")
                                }}
                            >
                                Blog
                            </div> */}
                            <div
                                className="link"
                                onClick={() => {
                                    navigate("/docs/contact-us")
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.textDecoration = "none";
                                }}
                                style={{
                                    cursor: "pointer",
                                }}
                            >
                                Contact
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Main;
