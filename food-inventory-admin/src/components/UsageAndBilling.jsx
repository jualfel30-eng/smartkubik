import { useState, useEffect } from 'react';
import { getTenantSettings } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { capitalize } from '@/lib/utils';

const UsageAndBilling = () => {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await getTenantSettings();
        if (error) {
          throw new Error(error);
        }
        setSettings(data.data); // Use data.data
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return <div>Cargando información de uso y facturación...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!settings) {
    return null;
  }

  const { 
    subscriptionPlan, 
    limits = { maxUsers: 0, maxProducts: 0, maxOrders: 0, maxStorage: 0 }, 
    usage = { currentUsers: 0, currentProducts: 0, currentOrders: 0, currentStorage: 0 } 
  } = settings || {};

  const getPercentage = (current, max) => {
    if (max === 0 || max === Infinity) return 0;
    return (current / max) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso y Facturación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-semibold">Plan de Suscripción</h3>
          <p className="text-2xl font-bold text-primary">{capitalize(subscriptionPlan || 'N/A')}</p>
          <p className="text-sm text-muted-foreground">
            Aquí puedes ver el uso actual de los recursos de tu plan.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Usuarios</span>
              <span className="text-sm text-muted-foreground">
                {usage.currentUsers} / {limits.maxUsers === Infinity ? 'Ilimitado' : limits.maxUsers}
              </span>
            </div>
            <Progress value={getPercentage(usage.currentUsers, limits.maxUsers)} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Productos</span>
              <span className="text-sm text-muted-foreground">
                {usage.currentProducts} / {limits.maxProducts === Infinity ? 'Ilimitado' : limits.maxProducts}
              </span>
            </div>
            <Progress value={getPercentage(usage.currentProducts, limits.maxProducts)} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Pedidos (mensual)</span>
              <span className="text-sm text-muted-foreground">
                {usage.currentOrders} / {limits.maxOrders === Infinity ? 'Ilimitado' : limits.maxOrders}
              </span>
            </div>
            <Progress value={getPercentage(usage.currentOrders, limits.maxOrders)} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Almacenamiento (MB)</span>
              <span className="text-sm text-muted-foreground">
                {usage.currentStorage.toFixed(2)} / {limits.maxStorage === Infinity ? 'Ilimitado' : limits.maxStorage}
              </span>
            </div>
            <Progress value={getPercentage(usage.currentStorage, limits.maxStorage)} />
          </div>
        </div>
        
        <Alert>
          <AlertTitle>¿Necesitas más?</AlertTitle>
          <AlertDescription>
            Si estás cerca de tus límites, considera actualizar tu plan. Contacta a soporte para más información.
          </AlertDescription>
        </Alert>

      </CardContent>
    </Card>
  );
};

export default UsageAndBilling;
