'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Algo salió mal
        </h1>
        <p className="text-gray-600 mb-8">
          Ocurrió un error al cargar la tienda. Por favor, intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
