import { Link } from "react-router";

function Breadcrumb({ items }) {
    return (
        <nav style={{
                display: "flex",
                paddingTop: "25px",
                paddingLeft: "50px",
                alignItems: "center",
                gap: "10px",
                fontSize: "15px",
            }}
            className="breadcrumb"
        >
            {items.map((item, index) => (
                <div 
                    className="breadcrumb-item" 
                    key={index}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
                    {index > 0 && (
                        <span className="breadcrumb-separator">›</span>
                    )}

                    {item.path ? (
                        <Link 
                            style={{
                                color: "#111",
                                textDecoration: "underline",
                            }}  
                            to={item.path}>{item.label}
                        </Link>
                    ) : (
                        <span 
                            className="breadcrumb-current"
                            style={{
                                color: "#111",
                                fontWeight: "700",
                            }}
                        >
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
}

export default Breadcrumb;