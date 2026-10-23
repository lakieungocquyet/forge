import { useNavigate } from 'react-router';

function Logo () {
    const navigate = useNavigate();
    return(
        <div className="logo" onClick={() => navigate("/home")}>                                    
            <span className="logo">FORGE</span>
        </div>
    )
}
export default Logo;