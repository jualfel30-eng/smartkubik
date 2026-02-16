import React from 'react';
import WasteTrackingWidget from '@/components/restaurant/WasteTrackingWidget';
import { Package, Trash2 } from 'lucide-react';

const WasteManagementPage = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Mermas</h1>
                    <p className="text-muted-foreground">
                        Gestión y análisis de desperdicios para optimización de inventario
                    </p>
                </div>
            </div>

            <WasteTrackingWidget />
        </div>
    );
};

export default WasteManagementPage;
