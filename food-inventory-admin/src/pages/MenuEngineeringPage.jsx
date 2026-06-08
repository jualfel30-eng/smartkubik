import React from 'react';
import MenuEngineeringWidget from '@/components/MenuEngineeringWidget';

/**
 * Página principal de Ingeniería de Menú (food-service).
 *
 * Análisis de matriz Stars / Plowhorses / Puzzles / Dogs basado en
 * popularidad y rentabilidad de cada platillo. La implementación
 * funcional vive en MenuEngineeringWidget (selector de período, tabla,
 * matriz, recomendaciones estratégicas).
 */
const MenuEngineeringPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <MenuEngineeringWidget />
    </div>
  );
};

export default MenuEngineeringPage;
