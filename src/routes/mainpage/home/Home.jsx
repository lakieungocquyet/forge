import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router';
import Breadcrumb from "../../../components/ui/Breadcrumb"
import FlipCell from '../../../components/ui/FlipCell';

function Home() {
    const navigate = useNavigate();
    const [tick, setTick] = useState(0);

    useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(timer);
    }, []);
    return (
        <div className="home">
            <div className="home_title_and_design">
                <div className="home_title">
                    <span>
                        <span style={{ color: "#FF7F50" }}>FO</span>cused<br />
                        <span style={{ color: "#FF7F50" }}>R</span>epository for<br />
                        <span style={{ color: "#FF7F50" }}>G</span>enomic<br />
                        <span style={{ color: "#FF7F50" }}>E</span>xploration
                    </span>
                    <div className="home_title_actions">
                        <button 
                            className="explore_button"
                            onClick={() => {
                                navigate("/tools")
                            }}
                        >
                            Explore Now
                        </button>
                        {/* <button 
                            className="install_button"
                            onClick={() => {
                                navigate("/installation")
                            }}
                        >
                            Install
                        </button> */}
                    </div>
                </div>
                <div className="home_design">
                    <div className="grid">
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={100} interval={15000} />
                        <FlipCell tick={tick} delay={200} interval={15000} />
                        <FlipCell tick={tick} delay={300} interval={15000} />
                        <FlipCell tick={tick} delay={400} interval={15000} />
                        <FlipCell tick={tick} delay={500} interval={15000} />
                        <FlipCell tick={tick} delay={600} interval={15000} />
                        <FlipCell tick={tick} delay={700} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={800} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={900} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={1000} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={1100} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />  
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={1200} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={1300} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={1400} interval={15000} />
                        <FlipCell tick={tick} delay={1500} interval={15000} />
                        <FlipCell tick={tick} delay={1600} interval={15000} />
                        <FlipCell tick={tick} delay={1700} interval={15000} />
                        <FlipCell tick={tick} delay={1800} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={1900} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={2000} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={2100} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={2200} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={2300} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={2400} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={2500} interval={15000} />
                        <FlipCell tick={tick} delay={2600} interval={15000} />
                        <FlipCell tick={tick} delay={2700} interval={15000} />
                        <FlipCell tick={tick} delay={2800} interval={15000} />
                        <FlipCell tick={tick} delay={2900} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={3000} interval={15000} />
                        <FlipCell tick={tick} delay={3100} interval={15000} />
                        <FlipCell tick={tick} delay={3200} interval={15000} />
                        <FlipCell tick={tick} delay={3300} interval={15000} />
                        <FlipCell tick={tick} delay={3400} interval={15000} />
                        <FlipCell tick={tick} delay={3500} interval={15000} />
                        <FlipCell tick={tick} delay={3600} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={3700} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={3800} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={3900} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={4000} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={4100} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={4200} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={4300} interval={15000} />
                        <FlipCell tick={tick} delay={4400} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={4500} interval={15000} />
                        <FlipCell tick={tick} delay={4600} interval={15000} />
                        <FlipCell tick={tick} delay={4700} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={4800} interval={15000} />
                        <FlipCell tick={tick} delay={4900} interval={15000} />
                        <FlipCell tick={tick} delay={5000} interval={15000} />
                        <FlipCell tick={tick} delay={5100} interval={15000} />
                        <FlipCell tick={tick} delay={5200} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5300} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5400} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5500} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5600} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5700} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5800} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={5900} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={6000} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={6100} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={6200} interval={15000} />
                        <FlipCell tick={tick} delay={6300} interval={15000} />
                        <FlipCell tick={tick} delay={6400} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={6500} interval={15000} />
                        <FlipCell tick={tick} delay={6600} interval={15000} />
                        <FlipCell tick={tick} delay={6700} interval={15000} />
                        <FlipCell tick={tick} delay={6800} interval={15000} />
                        <FlipCell tick={tick} delay={6900} interval={15000} />
                        <FlipCell tick={tick} delay={7000} interval={15000} />
                        <FlipCell tick={tick} delay={7100} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7200} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7300} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7400} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7500} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7600} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7700} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7800} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={7900} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={8000} interval={15000} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;