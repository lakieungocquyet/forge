const EmptyState = ({style, icon, title, description }) => (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minHeight: "300px",
            border: "1px dashed #d0d0d0",
            borderRadius: "6px",
            background: "#fafafa",
            color: "#888",
            textAlign: "center",
            padding: "20px",
            width: "100%",
            boxSizing: "border-box",
            ...style

        }}
    >
        <div style={{ fontSize: "32px", lineHeight: 1 }}>{icon}</div>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#666" }}>{title}</p>
        <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>{description}</p>
    </div>
);

export default EmptyState;
