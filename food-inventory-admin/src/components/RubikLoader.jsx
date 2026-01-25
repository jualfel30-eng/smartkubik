import React, { useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import rubikAnimation from '@/assets/rubik_cube_loader.json';

/**
 * Componente de loader con animación de Cubo Rubik
 * Compatible con Safari iOS usando un intervalo para mantener la animación
 */
export const RubikLoader = ({
  size = 120,
  message = 'Cargando...',
  fullScreen = false
}) => {
  const lottieRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Safari iOS fix: Use an interval to keep the animation running
    // This is a workaround for Safari iOS not respecting loop=true
    intervalRef.current = setInterval(() => {
      if (lottieRef.current) {
        const currentFrame = lottieRef.current.animationItem?.currentFrame || 0;
        const totalFrames = lottieRef.current.animationItem?.totalFrames || 31;

        // If animation is near the end or stopped, restart it
        if (currentFrame >= totalFrames - 2 || currentFrame === 0) {
          lottieRef.current.goToAndPlay(0, true);
        }
      }
    }, 50); // Check every 50ms

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <Lottie
        lottieRef={lottieRef}
        animationData={rubikAnimation}
        loop={true}
        autoplay={true}
        style={{ width: size, height: size }}
      />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default RubikLoader;
