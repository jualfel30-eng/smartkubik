import React from 'react';
import Lottie from 'lottie-react';
// Import JSON directly - bundled with the app, no network fetch needed
import rubikAnimation from '@/assets/rubik_cube_loader.json';

/**
 * Componente de loader con animación de Cubo Rubik
 * @param {Object} props - Propiedades del componente
 * @param {number} props.size - Tamaño del loader en píxeles (default: 200)
 * @param {string} props.message - Mensaje opcional a mostrar debajo del loader
 * @param {boolean} props.fullScreen - Si debe ocupar toda la pantalla (default: false)
 */
export const RubikLoader = ({
  size = 120,
  message = 'Cargando...',
  fullScreen = false
}) => {
  const lottieRef = React.useRef(null);

  // Clone and patch the animation data to fix the truncated duration
  // The original file (rubik_cube_loader.json) incorrectly specifies "op": 31 (1 second)
  // but contains animation data for 900 frames (30 seconds). We force the correct duration here.
  const fullDurationAnimation = React.useMemo(() => ({
    ...rubikAnimation,
    op: 900 // Extend animation to full 30 seconds
  }), []);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.play();
    }
  }, []);

  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div style={{ width: size, height: size }}>
        <Lottie
          lottieRef={lottieRef}
          animationData={fullDurationAnimation}
          loop={true}
          autoplay={true}
          onComplete={() => {
            // Force replay on completion just in case loop prop fails on some devices
            lottieRef.current?.goToAndPlay(0, true);
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default RubikLoader;
