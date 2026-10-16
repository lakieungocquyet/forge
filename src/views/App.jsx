import { Routes, Route} from "react-router";
import ScrollToTop from '../components/function/ScrollToTop.jsx'
import Main from '../pages/MainPage.jsx'
import Home from '../routes/mainpage/home/Home.jsx'
import Tools from '../routes/mainpage/tools/Tools.jsx'
import BioPostgreSQL from '../routes/mainpage/tools/BioPostgreSQL.jsx'
import VCFtoolkit from '../routes/mainpage/tools/VCFtoolkit.jsx'
import Samtools from '../routes/mainpage/tools/Samtools.jsx'
import SamtoolsSort from '../routes/mainpage/tools/SamtoolsSort.jsx'
import VCFtoolkit_convert from "../routes/mainpage/tools/VCFtoolkit_convert.jsx";
import Documentation from '../routes/mainpage/docs/Documentation.jsx'
import AboutUs from '../routes/mainpage/docs/AboutUs.jsx'
import License from '../routes/mainpage/docs/License.jsx'
import Installation from '../routes/mainpage/installation/Installation.jsx'
import '../styles/App.scss'
function App() {
	return (
		<div className="App">
			<div className="app_routes">
				<ScrollToTop />
				<Routes>
					<Route path="/" element={<Main />}>
						<Route index element={<Home />} />

						<Route path="home" element={<Home />}/>

						<Route path="docs" element={<Documentation />}>
							<Route index element={<AboutUs />} />
							<Route path="about-us" element={<AboutUs />}/>
							<Route path="license" element={<License />}/>
						</Route>

						<Route path="installation" element={<Installation />}/>

						<Route path="tools" element={<Tools />}/> 
						
						<Route path="tools/vcftoolkit" element={<VCFtoolkit />}/>
						<Route path="tools/vcftoolkit/vcftoolkit-convert" element={<VCFtoolkit_convert />}/>

						<Route path="tools/biopostgresql" element={<BioPostgreSQL />}/>

						<Route path="tools/samtools" element={<Samtools />}>
							<Route index element={<SamtoolsSort />} />
							<Route path="samtools-sort" element={<SamtoolsSort />} />
							{/* <Route path="samtools-view" element={<SamtoolsView />} /> */}
						</Route>
					</Route>
				</Routes>
			</div>
		</div>
	)
}
export default App
