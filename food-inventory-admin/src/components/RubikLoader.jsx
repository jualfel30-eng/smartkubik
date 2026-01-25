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
          {/* Front face */}
          <div className="piece face front row-top col-left yellow">Front Top Left</div>
          <div className="piece face front row-top col-center yellow">Front Top Center</div>
          <div className="piece face front row-top col-right yellow">Front Top Right</div>
          <div className="piece face front row-center col-left yellow">Front Center Left</div>
          <div className="piece face front row-center col-center yellow">Front Center Center</div>
          <div className="piece face front row-center col-right yellow">Front Center Right</div>
          <div className="piece face front row-bottom col-left yellow">Front Bottom Left</div>
          <div className="piece face front row-bottom col-center yellow">Front Bottom Center</div>
          <div className="piece face front row-bottom col-right yellow">Front Bottom Right</div>

          {/* Back face */}
          <div className="piece face back row-top col-left white">Back Top Left</div>
          <div className="piece face back row-top col-center white">Back Top Center</div>
          <div className="piece face back row-top col-right white">Back Top Right</div>
          <div className="piece face back row-center col-left white">Back Center Left</div>
          <div className="piece face back row-center col-center white">Back Center Center</div>
          <div className="piece face back row-center col-right white">Back Center Right</div>
          <div className="piece face back row-bottom col-left white">Back Bottom Left</div>
          <div className="piece face back row-bottom col-center white">Back Bottom Center</div>
          <div className="piece face back row-bottom col-right white">Back Bottom Right</div>

          {/* Right face */}
          <div className="piece face right row-top col-left red">Right Top Left</div>
          <div className="piece face right row-top col-center red">Right Top Center</div>
          <div className="piece face right row-top col-right red">Right Top Right</div>
          <div className="piece face right row-center col-left red">Right Center Left</div>
          <div className="piece face right row-center col-center red">Right Center Center</div>
          <div className="piece face right row-center col-right red">Right Center Right</div>
          <div className="piece face right row-bottom col-left red">Right Bottom Left</div>
          <div className="piece face right row-bottom col-center red">Right Bottom Center</div>
          <div className="piece face right row-bottom col-right red">Right Bottom Right</div>

          {/* Left face */}
          <div className="piece face left row-top col-left orange">Left Top Left</div>
          <div className="piece face left row-top col-center orange">Left Top Center</div>
          <div className="piece face left row-top col-right orange">Left Top Right</div>
          <div className="piece face left row-center col-left orange">Left Center Left</div>
          <div className="piece face left row-center col-center orange">Left Center Center</div>
          <div className="piece face left row-center col-right orange">Left Center Right</div>
          <div className="piece face left row-bottom col-left orange">Left Bottom Left</div>
          <div className="piece face left row-bottom col-center orange">Left Bottom Center</div>
          <div className="piece face left row-bottom col-right orange">Left Bottom Right</div>

          {/* Up face */}
          <div className="piece face up row-top col-left blue">Up Top Left</div>
          <div className="piece face up row-top col-center blue">Up Top Center</div>
          <div className="piece face up row-top col-right blue">Up Top Right</div>
          <div className="piece face up row-center col-left blue">Up Center Left</div>
          <div className="piece face up row-center col-center blue">Up Center Center</div>
          <div className="piece face up row-center col-right blue">Up Center Right</div>
          <div className="piece face up row-bottom col-left blue">Up Bottom Left</div>
          <div className="piece face up row-bottom col-center blue">Up Bottom Center</div>
          <div className="piece face up row-bottom col-right blue">Up Bottom Right</div>

          {/* Down face */}
          <div className="piece face down row-top col-left green">Down Top Left</div>
          <div className="piece face down row-top col-center green">Down Top Center</div>
          <div className="piece face down row-top col-right green">Down Top Right</div>
          <div className="piece face down row-center col-left green">Down Center Left</div>
          <div className="piece face down row-center col-center green">Down Center Center</div>
          <div className="piece face down row-center col-right green">Down Center Right</div>
          <div className="piece face down row-bottom col-left green">Down Bottom Left</div>
          <div className="piece face down row-bottom col-center green">Down Bottom Center</div>
          <div className="piece face down row-bottom col-right green">Down Bottom Right</div>
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
