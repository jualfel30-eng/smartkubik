import React from 'react';
import './RubikLoader.css';

/**
 * Componente de loader con animación 3D de Cubo Rubik en CSS puro
 * Compatible con todos los navegadores incluyendo Safari iOS
 */
export const RubikLoader = ({
  size = 61,
  message = 'Cargando...',
  fullScreen = false
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center p-8';

  // Scale factor based on size (default cube is ~130px)
  const scale = size / 130;

  return (
    <div className={containerClass}>
      <div className="rubiks-loader" style={{ transform: `scale(${scale})` }}>
        <div className="cube">
          {/* base position */}
          <div className="face front piece row-top    col-left   yellow"></div>
          <div className="face front piece row-top    col-center green "></div>
          <div className="face front piece row-top    col-right  white "></div>
          <div className="face front piece row-center col-left   blue  "></div>
          <div className="face front piece row-center col-center green "></div>
          <div className="face front piece row-center col-right  blue  "></div>
          <div className="face front piece row-bottom col-left   green "></div>
          <div className="face front piece row-bottom col-center yellow"></div>
          <div className="face front piece row-bottom col-right  red   "></div>

          {/* first step: E', equator inverted */}
          <div className="face down  piece row-top    col-center green "></div>
          <div className="face down  piece row-center col-center red   "></div>
          <div className="face down  piece row-bottom col-center white "></div>

          {/* second step: M, middle */}
          <div className="face right piece row-center col-left   yellow"></div>
          <div className="face right piece row-center col-center green "></div>
          <div className="face right piece row-center col-right  blue  "></div>

          {/* third step: L, left */}
          <div className="face up    piece row-top    col-left   yellow"></div>
          <div className="face up    piece row-center col-left   blue  "></div>
          <div className="face up    piece row-bottom col-left   green "></div>

          {/* fourth step: D, down */}
          <div className="face left  piece row-bottom col-left   green "></div>
          <div className="face left  piece row-bottom col-center yellow"></div>
          <div className="face left  piece row-bottom col-right  red   "></div>
        </div>
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
