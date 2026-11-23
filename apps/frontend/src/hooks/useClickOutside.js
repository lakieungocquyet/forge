import { useEffect } from 'react';

export default function useClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (e) => {
            if (!ref.current || ref.current.contains(e.target)) return;
            handler(e);
        }; // Hàm nghe event, nếu ref.current có chứa sự kiện => chạy hàm handler 
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}