import React, { useState, useRef, useEffect } from 'react';

/**
 * Optimized image component with lazy loading and progressive enhancement
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  lazy = true,
  webp = true,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const imgRef = useRef();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Load image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setIsLoaded(true); // Show alt text
    };
    
    // Use WebP if supported and requested
    if (webp && supportsWebP()) {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      img.src = webpSrc;
    } else {
      img.src = src;
    }
  }, [isInView, src, webp]);

  // Check WebP support
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Placeholder while loading */}
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          {typeof placeholder === 'string' ? (
            <div className="text-gray-400 text-sm">{placeholder}</div>
          ) : (
            placeholder
          )}
        </div>
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
