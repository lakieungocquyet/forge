import { useState, useEffect } from "react";
import Dropdown from "../../../components/ui/Dropdown.jsx";
import { generateInstallationCommands } from "../../../utils/InstallationCommands.js";
import DockerIcon from '../../../components/icon/DockerIcon.jsx'
import LinuxIcon from '../../../components/icon/LinuxIcon.jsx'
import WindowsIcon from "../../../components/icon/WindowsIcon.jsx";
import PythonIcon from "../../../components/icon/PythonIcon.jsx";
import GitIcon from '../../../components/icon/GitIcon.jsx'

function Installation() {
    const [version, setVersion] = useState("latest");
    const [os, setOS] = useState("Windows");
    const [method, setMethod] = useState("docker");
    const [packageManager, setPackageManager] = useState("npm");

    const [showToast, setShowToast] = useState(false);

    const [openDropdown, setOpenDropdown] = useState(null);

    const versions = [
        { value: "latest", label: "v1.0.0 (Latest)" },
        { value: "stable", label: "v0.9.0 (Stable)" }
    ];
    
    const operatingSystems = [
        { value: "linux", label: "Linux", icon: <LinuxIcon/> },
        { value: "Windows", label: "Windows", icon: <WindowsIcon/> },
    ];
    
    const installationMethods = [
        { value: "docker", label: "Docker", icon: <DockerIcon/> },
        { value: "pip", label: "pip", icon: <PythonIcon/> },
        { value: "source", label: "Source", icon: <GitIcon/> }
    ];

    const packageManagers = [
        { value: "npm", label: "npm", icon: "📦" },
        { value: "yarn", label: "yarn", icon: "🧶" },
        { value: "pnpm", label: "pnpm", icon: "⚡" }
    ];

    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const copyToClipboard = () => {
        const textToCopy = commands.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setShowToast(true);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    };
    const commands = generateInstallationCommands(version, os, method, packageManager);

    return (
        <div className="installation">
            <div className="installation_title">
                Installation Varkit
            </div>
            <div className="installation_selectors">
                <span className="selector_label">Get Varkit</span>
                <div className="selector_group">
                    <Dropdown 
                        options={versions}
                        value={version}
                        onChange={setVersion}
                        isOpen={openDropdown === 'version'}
                        onToggle={() => setOpenDropdown(openDropdown === 'version' ? null : 'version')}
                    />
                </div>
                
                <span className="selector_connector">for</span>
                
                <div className="selector_group">
                    <Dropdown 
                        options={operatingSystems}
                        value={os}
                        onChange={setOS}
                        isOpen={openDropdown === 'os'}
                        onToggle={() => setOpenDropdown(openDropdown === 'os' ? null : 'os')}
                    />
                </div>
                
                <span className="selector_connector">using</span>
                
                <div className="selector_group">
                    <Dropdown 
                        options={installationMethods}
                        value={method}
                        onChange={setMethod}
                        isOpen={openDropdown === 'method'}
                        onToggle={() => setOpenDropdown(openDropdown === 'method' ? null : 'method')}
                    />
                </div>
                
                {/* {method === 'docker' && (
                    <>
                        <span className="selector_connector">with</span>
                        <div className="selector_group">
                            <Dropdown 
                                options={packageManagers}
                                value={packageManager}
                                onChange={setPackageManager}
                                isOpen={openDropdown === 'packageManager'}
                                onToggle={() => setOpenDropdown(openDropdown === 'packageManager' ? null : 'packageManager')}
                            />
                        </div>
                    </>
                )} */}
            </div>
            
            {/* Info Banner (optional) */}
            <div className="installation_info_banner">
                <span className="installation_info_banner_icon">INFO</span>
                <span className="installation_info_banner_info"> Want new features sooner? Get the latest version instead!</span>
            </div>
            
            {/* Code Block */}
            <div className="installation_code_block">
                <div className="code_block_header">
                    <span className="code_block_label">Shell</span>
                    <button className="copy_button" onClick={copyToClipboard}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy to clipboard
                    </button>
                </div>
                <pre className="code_block_content">
                    <code>
                        {commands.map((cmd, idx) => (
                            <div key={idx} className="code_line">
                                {cmd}
                            </div>
                        ))}
                    </code>
                </pre>
            </div>
            {showToast && (
                <div className="toast_notification">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Copied to clipboard!</span>
                </div>
            )}
        </div>
    );
}

export default Installation;
