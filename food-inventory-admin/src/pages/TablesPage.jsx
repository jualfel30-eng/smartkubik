import React from 'react';
import { FloorPlan } from '../components/restaurant/FloorPlan';

export default function TablesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Mesas</h1>
        <p className="text-muted-foreground">
          Administra el layout del restaurante y el estado de las mesas
        </p>
      </div>
      <FloorPlan />
    </div>
  );
}
