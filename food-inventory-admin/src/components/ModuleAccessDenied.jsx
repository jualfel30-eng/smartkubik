import { AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';

/**
 * Component to display when user tries to access a disabled module
 */
export default function ModuleAccessDenied({ moduleName, vertical }) {
  const moduleDisplayNames = {
    tables: 'Gestión de Mesas',
    recipes: 'Recetas',
    kitchenDisplay: 'Display de Cocina',
    menuEngineering: 'Ingeniería de Menú',
    pos: 'Punto de Venta',
    variants: 'Variantes de Producto',
    ecommerce: 'E-commerce',
    loyaltyProgram: 'Programa de Lealtad',
    appointments: 'Citas',
    resources: 'Recursos',
    booking: 'Reservas',
    servicePackages: 'Paquetes de Servicio',
    shipments: 'Envíos',
    tracking: 'Rastreo',
    routes: 'Rutas',
    fleet: 'Flota',
    warehousing: 'Almacenamiento',
    dispatch: 'Despacho',
  };

  const verticalNames = {
    FOOD_SERVICE: 'Servicio de Alimentos',
    RETAIL: 'Retail',
    SERVICES: 'Servicios',
    LOGISTICS: 'Logística',
    HYBRID: 'Híbrido',
  };

  const displayName = moduleDisplayNames[moduleName] || moduleName;
  const verticalDisplay = verticalNames[vertical] || vertical;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center space-x-2 text-amber-500 mb-2">
            <Lock className="h-6 w-6" />
            <CardTitle>Módulo no disponible</CardTitle>
          </div>
          <CardDescription>
            Este módulo no está habilitado para su plan actual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-900 mb-1">
                  El módulo <span className="font-bold">{displayName}</span> no está activo
                </p>
                <p className="text-amber-700">
                  Su negocio está configurado como <span className="font-medium">{verticalDisplay}</span>.
                  Este módulo podría no estar incluido en su vertical actual.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>Para habilitar este módulo, puede:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Contactar con soporte para cambiar su vertical</li>
              <li>Actualizar a un plan que incluya este módulo</li>
              <li>Solicitar la habilitación específica de este módulo</li>
            </ul>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => window.location.href = 'mailto:support@smartkubik.com'}
              className="w-full"
            >
              Contactar Soporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
