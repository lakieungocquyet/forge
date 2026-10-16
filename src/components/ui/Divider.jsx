function Divider({ orientation = "horizontal", margin = "0px", style , color= "#a6a6a6"}) {
    const isHorizontal = orientation === "horizontal";

    return (
        <div
            role="separator"
            aria-orientation={orientation}
            style={{
                width: isHorizontal ? `calc(100% - ${margin} * 2)` : "1px",
                height: isHorizontal ? "1px" : `calc(100% - ${margin} * 2)`,
                borderTop: isHorizontal ? `0.5px solid ${color}` : 0,
                borderLeft: isHorizontal ? 0 : `0.5px solid ${color}`,
                boxSizing: "border-box",
                ...(isHorizontal
                    ? { marginLeft: margin, marginRight: margin }
                    : { marginTop: margin, marginBottom: margin }),
                ...style
            }}
        >
        </div>
    )
}

export default Divider;