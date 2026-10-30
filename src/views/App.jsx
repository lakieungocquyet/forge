import { Routes, Route} from "react-router";
import ScrollToTop from '../components/function/ScrollToTop.jsx'
import Main from '../pages/MainPage.jsx'
import Home from '../routes/mainpage/home/Home.jsx'

import Tools from '../routes/mainpage/tools/Tools.jsx'
import BioPostgreSQL from '../routes/mainpage/tools/BioPostgreSQL.jsx'


import VCFtoolkit from '../routes/mainpage/tools/VCFtoolkit.jsx'
import VCFtoolkitConvert from "../routes/mainpage/tools/VCFtoolkitConvert.jsx";

import Samtools from '../routes/mainpage/tools/Samtools.jsx'
import SamtoolsSort from '../routes/mainpage/tools/SamtoolsSort.jsx'
import SamtoolsView from '../routes/mainpage/tools/SamtoolsView.jsx'
import SamtoolsIdxstats from '../routes/mainpage/tools/SamtoolsIdxstats.jsx'
import SamtoolsFaidx from '../routes/mainpage/tools/SamtoolsFaidx.jsx'
import SamtoolsBedcov from "../routes/mainpage/tools/SamtoolsBedcov.jsx";

import Bcftools from "../routes/mainpage/tools/Bcftools.jsx";
import BcftoolsStats from "../routes/mainpage/tools/BcftoolsStats.jsx";

import Documentation from '../routes/mainpage/docs/Documentation.jsx'
import AboutUs from '../routes/mainpage/docs/AboutUs.jsx'
import WhatIsFORGE from '../routes/mainpage/docs/WhatIsFORGE.jsx'
import License from '../routes/mainpage/docs/License.jsx'
import FAQ from '../routes/mainpage/docs/FAQ.jsx'
import ContactUs from '../routes/mainpage/docs/ContactUs.jsx'
import ReportAnIssue from '../routes/mainpage/docs/ReportAnIssue.jsx'

import Installation from '../routes/mainpage/installation/Installation.jsx'
import Analytics from '../components/analytics/Analytics.jsx'
import '../styles/App.scss'
function App() {
	return (
		<div className="App">
			<div className="app_routes">
				<ScrollToTop />
				<Analytics />
				<Routes>
					<Route path="/" element={<Main />}>
						<Route index element={<Home />} />

						<Route path="home" element={<Home />}/>

						<Route path="docs" element={<Documentation />}>
							<Route index element={<AboutUs />} />
							<Route path="about-us" element={<AboutUs />}/>
							<Route path="license" element={<License />}/>
							<Route path="what-is-forge" element={<WhatIsFORGE />}/>
							<Route path="faq" element={<FAQ />}/>
							<Route path="contact-us" element={<ContactUs />}/>
							<Route path="report-an-issue" element={<ReportAnIssue />}/>
						</Route>

						<Route path="installation" element={<Installation />}/>

						<Route path="tools" element={<Tools />}/> 
						
						<Route path="tools/vcftoolkit" element={<VCFtoolkit />}/>
						<Route path="tools/vcftoolkit/vcftoolkit-convert" element={<VCFtoolkitConvert />}/>

						<Route path="tools/biopostgresql" element={<BioPostgreSQL />}/>

						<Route path="tools/samtools" element={<Samtools />}>
							<Route index element={<SamtoolsIdxstats />} />
							<Route path="samtools-sort" element={<SamtoolsSort />} />
							<Route path="samtools-view" element={<SamtoolsView />} />
							<Route path="samtools-idxstats" element={<SamtoolsIdxstats />} />
							<Route path="samtools-faidx" element={<SamtoolsFaidx />} />
							<Route path="samtools-bedcov" element={<SamtoolsBedcov />} />
						</Route>

						<Route path="tools/bcftools" element={<Bcftools />}> 
							<Route index element={<BcftoolsStats />} />
							<Route path="bcftools-stats" element={<BcftoolsStats />} />
						</Route>
					</Route>
				</Routes>
			</div>
		</div>
	)
}
export default App
