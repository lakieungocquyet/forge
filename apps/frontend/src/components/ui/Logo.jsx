import { useNavigate } from 'react-router';

function Logo () {
    const navigate = useNavigate();
    return(
        <div 
            className="logo" 
            onClick={() => navigate("/home")}
            style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#FF7F50",
                fontSize: "30px",
                fontWeight: "700",
            }}
        >                                    
            <span className="logo">FORGE</span>
        </div>
    )
}
export default Logo;