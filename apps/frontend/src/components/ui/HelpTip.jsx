import { useState, useId } from "react";

const styles = {
    wrapper: {
        position: "relative",
        display: "inline-block",
    },
    icon: (open) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 15,
        height: 15,
        borderRadius: "50%",
        border: `1px solid ${open ? "#FF7F50" : "#888"}`,
        background: open ? "#FF7F50" : "#fff",
        color: open ? "#fff" : "#555",
        cursor: "help",
        outline: "none",
        transition: "all 0.15s",
        padding: 0,
    }),
    bubble: {
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-20%)", // 50% nếu căn giữa
        width: "max-content",
        padding: "10px 10px",
        borderRadius: 8,
        background: "#fff",
        border: "1px solid #ddd",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10,
    },
    arrow: {
        position: "absolute",
        top: "100%",
        left: "20%",   // trùng với số trong translateX(-20%) của bubble
        width: 8,
        height: 8,
        background: "#fff",
        borderRight: "1px solid #ddd",
        borderBottom: "1px solid #ddd",
        transform: "translate(-50%, -50%) rotate(45deg)",
    },
};

export default function HelpTip({ children }) {
    const [open, setOpen] = useState(false);
    const id = useId();

    return (
        <span style={styles.wrapper}>
            <button
                type="button"
                style={styles.icon(open)}
                aria-describedby={open ? id : undefined}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => setOpen((o) => !o)} // để chạm trên mobile cũng bật/tắt được
            >
                <svg width="6" height="9" viewBox="0 0 5 8" fill="none" style={{ flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.125 7.5H1.875V6.25H3.125V7.5ZM2.5 0C3.88125 0 5 1.11875 5 2.5C5 4.0625 3.125 4.21875 3.125 5.625H1.875C1.875 3.59375 3.75 3.75 3.75 2.5C3.75 1.8125 3.1875 1.25 2.5 1.25C1.8125 1.25 1.25 1.8125 1.25 2.5H0C2.57482e-07 1.11875 1.11875 2.57478e-07 2.5 0Z" fill={open ? "#ffffff" : "#555555"}/>
                </svg>
            </button>

            {open && (
                <span role="tooltip" id={id} style={styles.bubble}>
                    {children}
                    <span style={styles.arrow} />
                </span>
            )}
        </span>
  );
}
