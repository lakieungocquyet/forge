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

    const DELAY_START = 100
    const DELAY_STEP = 100
    const INTERVAL = 20000
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
                        <FlipCell tick={tick} delay={DELAY_START} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 2*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 3*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 4*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 5*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 6*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 7*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 8*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 9*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 10*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 11*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 12*DELAY_STEP} interval={INTERVAL} />
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
                        <FlipCell tick={tick} delay={DELAY_START + 13*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 14*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 15*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 16*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 17*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 18*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 19*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 20*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 21*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 22*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 23*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 24*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 25*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 26*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 27*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 28*DELAY_STEP} interval={INTERVAL} />
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
                        <FlipCell tick={tick} delay={DELAY_START + 29*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 30*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 31*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 32*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 33*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 34*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 35*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 36*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 37*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 38*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 39*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 40*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 41*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 42*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 43*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 44*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 45*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 46*DELAY_STEP} interval={INTERVAL} />
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
                        <FlipCell tick={tick} delay={DELAY_START + 47*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 48*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 49*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 50*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 51*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 52*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 53*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 54*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 55*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 56*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 57*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 58*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 59*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 60*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 61*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 62*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 63*DELAY_STEP} interval={INTERVAL} />
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
                        <FlipCell tick={tick} delay={DELAY_START + 64*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 65*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 66*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 67*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 68*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 69*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} delay={DELAY_START + 70*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 71*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 72*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 73*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 74*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 75*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 76*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />

                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 77*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 78*DELAY_STEP} interval={INTERVAL} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} rotate={false} />
                        <FlipCell tick={tick} delay={DELAY_START + 79*DELAY_STEP} interval={INTERVAL} />
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
