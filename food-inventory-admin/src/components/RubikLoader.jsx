import React from 'react';

/**
 * Componente de loader con animación CSS pura
 * Versión simplificada para diagnosticar problemas en móvil
 */
export const RubikLoader = ({
  size = 120,
  message = 'Cargando...',
  fullScreen = false
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div
        className="animate-spin rounded-full border-4 border-primary border-t-transparent"
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
