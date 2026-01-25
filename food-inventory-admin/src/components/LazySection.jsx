import { useEffect, useRef, useState } from 'react';

/**
 * LazySection - Wrapper component that uses IntersectionObserver
 * to only render children when they're about to enter the viewport
 */
export const LazySection = ({ children, threshold = 0.1, rootMargin = '200px' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Once visible, stop observing
                    observer.disconnect();
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin]);

    return (
        <div ref={ref}>
            {isVisible ? children : <div style={{ minHeight: '100px' }} />}
        </div>
    );
};

export default LazySection;
