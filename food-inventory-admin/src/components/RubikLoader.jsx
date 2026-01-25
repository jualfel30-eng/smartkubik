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
          animationData={rubikAnimation}
          loop={false}
          autoplay={true}
          onComplete={() => {
            // Force replay on completion to create a manual loop
            // This is more robust on mobile than native loop prop
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
