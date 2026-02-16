import { useMemo } from 'react';
import { useAuth } from './use-auth.jsx';

/**
 * Hook to provide adaptive labels for the Tips/Commissions module
 * based on the business vertical.
 * 
 * Food Service: "Propinas" (Tips)
 * All Others: "Comisiones" (Commissions)
 */
export const useTipsLabels = () => {
    const { tenant } = useAuth();

    return useMemo(() => {
        // Check tenant.vertical directly (this is the field in the schema)
        // Fallback to verticalProfile.key for compatibility
        const vertical = tenant?.vertical || tenant?.verticalProfile?.key;
        const isFoodService = vertical === 'FOOD_SERVICE';

        return {
            // Singular forms
            singular: isFoodService ? 'Propina' : 'Comisión',

            // Plural forms
            plural: isFoodService ? 'Propinas' : 'Comisiones',

            // Module name
            moduleName: isFoodService ? 'Gestión de Propinas' : 'Gestión de Comisiones',

            // Employee labels
            employeeLabel: isFoodService ? 'Mesero' : 'Vendedor',
            employeeLabelPlural: isFoodService ? 'Meseros' : 'Vendedores',

            // Action verbs
            distribute: isFoodService ? 'Distribuir Propinas' : 'Distribuir Comisiones',
            register: isFoodService ? 'Registrar Propina' : 'Registrar Comisión',

            // Metrics and labels
            totalLabel: isFoodService ? 'Total Propinas' : 'Total Comisiones',
            averageLabel: isFoodService ? 'Promedio por Orden' : 'Promedio por Venta',
            byEmployee: isFoodService ? 'Propinas por Empleado' : 'Comisiones por Vendedor',
            perDay: isFoodService ? 'Propinas por Día' : 'Comisiones por Día',

            // Table headers
            totalColumn: isFoodService ? 'Total Propinas (USD)' : 'Total Comisiones (USD)',
            ordersServed: isFoodService ? 'Órdenes Servidas' : 'Ventas Realizadas',

            // Status messages
            distributedSuccess: isFoodService
                ? 'Propinas distribuidas correctamente'
                : 'Comisiones distribuidas correctamente',
            registeredSuccess: isFoodService
                ? 'Propina registrada'
                : 'Comisión registrada',

            // Module disabled message
            moduleDisabled: isFoodService
                ? 'Módulo de Propinas no habilitado'
                : 'Módulo de Comisiones no habilitado',

            // Chart/Report labels
            distributionChart: isFoodService ? 'Distribución de Propinas' : 'Distribución de Comisiones',
            reportTitle: isFoodService ? 'Reporte de Propinas' : 'Reporte de Comisiones',

            // Performance labels
            changeLabel: isFoodService ? 'Cambio en Propinas' : 'Cambio en Comisiones',
            topPerformers: isFoodService ? 'Top por Propinas' : 'Top por Comisiones',

            // Export headers
            exportHeaders: isFoodService
                ? ['Empleado', 'Total Propinas (USD)', 'Órdenes Servidas', 'Promedio por Orden', 'Efectivo', 'Tarjeta', 'Digital']
                : ['Vendedor', 'Total Comisiones (USD)', 'Ventas Realizadas', 'Promedio por Venta', 'Efectivo', 'Tarjeta', 'Digital'],
        };
    }, [tenant]);
};
