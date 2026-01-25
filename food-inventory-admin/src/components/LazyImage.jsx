import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage - Optimized image component with native lazy loading + IntersectionObserver fallback
 * Features:
 * - Native loading="lazy" for modern browsers
 * - IntersectionObserver fallback for older browsers
 * - Smooth fade-in animation on load
 * - Optional blur placeholder
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  style = {},
  width,
  height,
  placeholder = 'blur', // 'blur' | 'skeleton' | 'none'
  threshold = 0.1,
  rootMargin = '100px',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Check for native lazy loading support
    if ('loading' in HTMLImageElement.prototype) {
      setIsInView(true);
      return;
    }

    // Fallback to IntersectionObserver
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const placeholderStyles = {
    blur: {
      filter: isLoaded ? 'none' : 'blur(10px)',
      transform: isLoaded ? 'scale(1)' : 'scale(1.05)',
      transition: 'filter 0.3s ease, transform 0.3s ease, opacity 0.3s ease',
    },
    skeleton: {
      backgroundColor: isLoaded ? 'transparent' : '#1e293b',
      transition: 'background-color 0.3s ease, opacity 0.3s ease',
    },
    none: {},
  };

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      data-src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      className={className}
      style={{
        opacity: isLoaded ? 1 : 0.7,
        ...placeholderStyles[placeholder],
        ...style,
      }}
      {...props}
    />
  );
};

export default LazyImage;
