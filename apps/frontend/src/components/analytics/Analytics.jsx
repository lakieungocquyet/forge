import { useEffect } from 'react';
import { useLocation } from 'react-router';

const GA_TRACKING_ID = 'G-K8GQ7ZXG3H';

function Analytics() {
    const location = useLocation();

    useEffect(() => {
        // console.log('Route changed to:', location.pathname, location.hash);
        // console.log('Is gtag exists?', typeof window.gtag);
        if (typeof window.gtag == 'function') {
            // Ping Google Analytics manually
            window.gtag('event', 'page_view', {
                page_location: window.location.href,
                page_path: location.pathname + location.search,
                page_title: document.title,
                send_to: GA_TRACKING_ID
            });
        }
    }, [location]);
    return null;
}

export default Analytics;