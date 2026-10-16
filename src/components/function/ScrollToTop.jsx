import { useEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollToTop() {
	const { pathname } = useLocation();

	useEffect(() => {
		const scrollContainer = document.querySelector('.body_and_footer');
		if (scrollContainer) {
			scrollContainer.scrollTo({
				top: 0,
				left: 0,
				behavior: "instant" // or "smooth"
			});
		} else {
			window.scrollTo({
				top: 0,
				left: 0,
				behavior: "instant" // or "smooth"
			});
		}
	}, [pathname]);
	return null;
}
