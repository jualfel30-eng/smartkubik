# Plan de Integración: Módulo de Caja + Módulo de Órdenes

## CONTEXTO IMPORTANTE

El sistema tiene dos módulos que DEBEN estar integrados pero actualmente están separados:

1. **Módulo de Órdenes** (`/orders`) - Donde se procesan las ventas
2. **Módulo de Cierre de Caja** (`/cash-register`) - Donde se hace el arqueo al final del turno

**PROBLEMA ACTUAL**: Las órdenes NO saben a qué sesión de caja pertenecen. El cierre de caja NO calcula automáticamente los totales desde las órdenes.

**RUTAS ABSOLUTAS DEL PROYECTO**:
- Backend: `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas`
- Frontend: `/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin`

---

## FASE 1: Modificar el Schema de Order (Backend)

### Archivo a modificar:
```
food-inventory-saas/src/schemas/order.schema.ts
```

### LÍNEA EXACTA DONDE AGREGAR (después de la línea 524, antes de `tenantId`):

Busca esta línea:
```typescript
  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
```

Y ANTES de ella, agrega estos campos:

```typescript
  // ============================================
  // INTEGRACIÓN CON CAJA REGISTRADORA
  // ============================================

  @Prop({ type: Types.ObjectId, ref: 'CashRegisterSession', default: null })
  cashSessionId: Types.ObjectId;

  @Prop({ type: String, default: null })
  cashRegisterId: string; // Nombre de la caja: "Caja 1", "Caja Principal", etc.

```

### También agregar índice al final del archivo (después de línea 567):
```typescript
// Cash Register integration
OrderSchema.index({ cashSessionId: 1, tenantId: 1 });
```

### IMPORTANTE:
- Estos campos son OPCIONALES (default: null) para no romper órdenes existentes
- `cashSessionId` es una referencia a la sesión de caja activa
- `cashRegisterId` es el nombre de la caja (string simple)

---

## FASE 2: Crear el Contexto de Caja (Frontend)

### Archivo a CREAR:
```
/food-inventory-admin/src/contexts/CashRegisterContext.jsx
```

### Contenido EXACTO del archivo:

```jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';

const CashRegisterContext = createContext(null);

export function CashRegisterProvider({ children }) {
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Obtener sesión actual del usuario
  const fetchCurrentSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/cash-register/sessions/current');
      setCurrentSession(response?.session || null);
    } catch (error) {
      console.error('Error fetching cash session:', error);
      setCurrentSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar
  useEffect(() => {
    fetchCurrentSession();
  }, [fetchCurrentSession]);

  // Refrescar sesión (llamar después de abrir/cerrar caja)
  const refreshSession = useCallback(() => {
    fetchCurrentSession();
  }, [fetchCurrentSession]);

  // Verificar si hay sesión activa
  const hasActiveSession = Boolean(currentSession && currentSession.status === 'open');

  const value = {
    currentSession,
    loading,
    hasActiveSession,
    refreshSession,
    // Datos útiles para vincular a órdenes
    sessionId: currentSession?._id || null,
    registerId: currentSession?.registerName || null,
  };

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  const context = useContext(CashRegisterContext);
  if (!context) {
    throw new Error('useCashRegister debe usarse dentro de CashRegisterProvider');
  }
  return context;
}

export default CashRegisterContext;
```

---

## FASE 3: Integrar el Provider en App.jsx

### Archivo a modificar:
```
/food-inventory-admin/src/App.jsx
```

### Paso 1: Agregar el import (arriba del archivo, junto a los otros imports)
```jsx
import { CashRegisterProvider } from './contexts/CashRegisterContext';
```

### Paso 2: Envolver la aplicación con el Provider

Busca donde está el `return` principal y envuelve todo con `<CashRegisterProvider>`:

```jsx
// ANTES (ejemplo simplificado):
return (
  <AuthProvider>
    <TenantProvider>
      <RouterProvider router={router} />
    </TenantProvider>
  </AuthProvider>
);

// DESPUÉS:
return (
  <AuthProvider>
    <TenantProvider>
      <CashRegisterProvider>
        <RouterProvider router={router} />
      </CashRegisterProvider>
    </TenantProvider>
  </AuthProvider>
);
```

**NOTA**: El `CashRegisterProvider` debe ir DENTRO de `AuthProvider` y `TenantProvider` porque necesita el token de autenticación para hacer las llamadas API.

---

## FASE 4: Modificar la Creación de Órdenes (Frontend)

### EL ARCHIVO MÁS IMPORTANTE A MODIFICAR:
```
food-inventory-admin/src/hooks/use-orders.js
```

Este es el hook central que usa toda la app para crear órdenes.

### OPCIÓN A: Modificar el hook (RECOMENDADO)

El hook `use-orders.js` tiene una función `addOrder` en la línea 29.
El problema es que el hook no puede usar `useCashRegister` directamente porque es un hook.

**Solución**: Modificar `addOrder` para aceptar los campos de caja como parámetros.

### Cambiar la función `addOrder` (línea 29-41):

**ANTES:**
```jsx
  const addOrder = async (orderData) => {
    try {
      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      await loadOrders();
      await loadCustomers();
    } catch (err) {
      console.error("Error adding order:", err);
      throw err;
    }
  };
```

**DESPUÉS:**
```jsx
  const addOrder = async (orderData, cashRegisterInfo = null) => {
    try {
      // Si hay info de caja, agregarla a los datos de la orden
      const orderWithCashRegister = cashRegisterInfo
        ? {
            ...orderData,
            cashSessionId: cashRegisterInfo.sessionId,
            cashRegisterId: cashRegisterInfo.registerId,
          }
        : orderData;

      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(orderWithCashRegister),
      });
      await loadOrders();
      await loadCustomers();
    } catch (err) {
      console.error("Error adding order:", err);
      throw err;
    }
  };
```

### LUEGO, en cada componente que use `addOrder`:

Los archivos que PROBABLEMENTE usan `addOrder` son (verificar cada uno):
1. `food-inventory-admin/src/components/orders/v2/NewOrderFormV2.jsx`
2. `food-inventory-admin/src/components/orders/v2/OrdersPOS.jsx`
3. `food-inventory-admin/src/components/orders/v2/PaymentDialogV2.jsx`
4. `food-inventory-admin/src/components/orders/v2/OrderSheetForTables.jsx`

En cada uno de estos archivos, donde se llama a `addOrder(orderData)`:

**Paso 1**: Agregar import del hook de caja
```jsx
import { useCashRegister } from '@/contexts/CashRegisterContext';
```

**Paso 2**: Usar el hook dentro del componente
```jsx
const { sessionId, registerId } = useCashRegister();
```

**Paso 3**: Pasar la info de caja al crear orden
```jsx
// ANTES:
await addOrder(orderData);

// DESPUÉS:
await addOrder(orderData, { sessionId, registerId });
```

### OPCIÓN B: Crear un wrapper hook (ALTERNATIVA)

Si modificar todos los componentes es muy complejo, crear un nuevo hook:

```
food-inventory-admin/src/hooks/use-orders-with-cash-register.js
```

```jsx
import { useOrders } from './use-orders';
import { useCashRegister } from '@/contexts/CashRegisterContext';

export const useOrdersWithCashRegister = () => {
  const ordersHook = useOrders();
  const { sessionId, registerId, hasActiveSession } = useCashRegister();

  const addOrderWithCashRegister = async (orderData) => {
    const orderWithCash = {
      ...orderData,
      cashSessionId: sessionId,
      cashRegisterId: registerId,
    };
    return ordersHook.addOrder(orderWithCash);
  };

  return {
    ...ordersHook,
    addOrder: addOrderWithCashRegister,
    hasActiveSession,
  };
};
```

Y luego en los componentes, cambiar:
```jsx
// ANTES:
import { useOrders } from '@/hooks/use-orders';
const { addOrder } = useOrders();

// DESPUÉS:
import { useOrdersWithCashRegister } from '@/hooks/use-orders-with-cash-register';
const { addOrder, hasActiveSession } = useOrdersWithCashRegister();
```

---

## FASE 5: Modificar el Backend para Aceptar los Nuevos Campos

### Archivo a modificar:
```
food-inventory-saas/src/dto/order.dto.ts
```

### LÍNEA EXACTA DONDE AGREGAR (después de línea 374, antes del cierre de `CreateOrderDto`):

Busca esta línea en la clase `CreateOrderDto`:
```typescript
  @ApiPropertyOptional({ description: "ID de la mesa (si es restaurante)" })
  @IsOptional()
  @IsMongoId()
  tableId?: string;
}
```

Y ANTES del `}` que cierra la clase, agrega:

```typescript

  // ============================================
  // INTEGRACIÓN CON CAJA REGISTRADORA
  // ============================================

  @ApiPropertyOptional({ description: "ID de la sesión de caja activa" })
  @IsOptional()
  @IsMongoId()
  cashSessionId?: string;

  @ApiPropertyOptional({ description: "Nombre/ID de la caja física" })
  @IsOptional()
  @IsString()
  cashRegisterId?: string;
```

### NO necesitas modificar el servicio de órdenes
El servicio ya usa spread operator (`...dto`) así que los nuevos campos se pasarán automáticamente al modelo.

---

## FASE 6: Calcular Totales Automáticos al Cerrar Caja

### Archivo a modificar:
```
/food-inventory-saas/src/modules/cash-register/cash-register.service.ts
```

### Paso 1: Inyectar el modelo de Order

En el constructor del servicio, agrega:

```typescript
import { InjectModel } from '@nestjs/mongoose';
import { Order } from '../../schemas/order.schema';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectModel(CashRegisterSession.name)
    private sessionModel: Model<CashRegisterSession>,
    @InjectModel(CashRegisterClosing.name)
    private closingModel: Model<CashRegisterClosing>,
    // AGREGAR ESTO:
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
  ) {}
```

### Paso 2: Crear método para calcular totales desde órdenes

Agrega este método en el servicio:

```typescript
/**
 * Calcula los totales de ventas para una sesión de caja
 * basándose en las órdenes vinculadas a esa sesión
 */
async calculateSessionTotals(sessionId: string, tenantId: string) {
  // Obtener todas las órdenes de esta sesión
  const orders = await this.orderModel.find({
    cashSessionId: sessionId,
    tenantId,
    status: { $in: ['completed', 'paid', 'delivered'] }, // Solo órdenes completadas
  });

  // Inicializar totales
  const totals = {
    totalOrders: orders.length,
    // Ventas por moneda
    salesUsd: 0,
    salesVes: 0,
    // Ventas por método de pago
    cashUsd: 0,
    cashVes: 0,
    cardUsd: 0,
    cardVes: 0,
    transferUsd: 0,
    transferVes: 0,
    mobilePaymentVes: 0, // Pago móvil solo en VES
    otherUsd: 0,
    otherVes: 0,
  };

  // Calcular totales
  for (const order of orders) {
    const amount = order.total || 0;
    const currency = order.currency || 'USD';
    const paymentMethod = order.paymentMethod || 'cash';

    // Sumar al total general por moneda
    if (currency === 'USD') {
      totals.salesUsd += amount;
    } else {
      totals.salesVes += amount;
    }

    // Sumar por método de pago
    switch (paymentMethod) {
      case 'cash':
      case 'efectivo':
        if (currency === 'USD') totals.cashUsd += amount;
        else totals.cashVes += amount;
        break;
      case 'card':
      case 'tarjeta':
      case 'credit_card':
      case 'debit_card':
        if (currency === 'USD') totals.cardUsd += amount;
        else totals.cardVes += amount;
        break;
      case 'transfer':
      case 'transferencia':
      case 'bank_transfer':
        if (currency === 'USD') totals.transferUsd += amount;
        else totals.transferVes += amount;
        break;
      case 'mobile_payment':
      case 'pago_movil':
        totals.mobilePaymentVes += amount; // Pago móvil siempre en VES
        break;
      default:
        if (currency === 'USD') totals.otherUsd += amount;
        else totals.otherVes += amount;
    }
  }

  return totals;
}
```

### Paso 3: Usar los totales al cerrar la sesión

Busca el método `closeSession` o similar y modifícalo:

```typescript
async closeSession(
  sessionId: string,
  tenantId: string,
  userId: string,
  dto: CloseCashRegisterDto,
) {
  // Obtener la sesión
  const session = await this.sessionModel.findOne({
    _id: sessionId,
    tenantId,
    status: 'open',
  });

  if (!session) {
    throw new NotFoundException('Sesión no encontrada o ya cerrada');
  }

  // NUEVO: Calcular totales desde las órdenes
  const calculatedTotals = await this.calculateSessionTotals(sessionId, tenantId);

  // Calcular efectivo esperado
  // Esperado = Apertura + Ventas en efectivo + Entradas - Salidas
  const cashMovements = session.movements || [];
  const cashIn = cashMovements
    .filter(m => m.type === 'in')
    .reduce((sum, m) => sum + (m.currency === 'USD' ? m.amount : 0), 0);
  const cashOut = cashMovements
    .filter(m => m.type === 'out')
    .reduce((sum, m) => sum + (m.currency === 'USD' ? m.amount : 0), 0);

  const expectedCashUsd =
    (session.openingAmountUsd || 0) +
    calculatedTotals.cashUsd +
    cashIn -
    cashOut;

  const expectedCashVes =
    (session.openingAmountVes || 0) +
    calculatedTotals.cashVes +
    cashMovements.filter(m => m.type === 'in' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0) -
    cashMovements.filter(m => m.type === 'out' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);

  // Calcular diferencias
  const differenceUsd = (dto.closingAmountUsd || 0) - expectedCashUsd;
  const differenceVes = (dto.closingAmountVes || 0) - expectedCashVes;
  const hasDifferences = Math.abs(differenceUsd) > 0.01 || Math.abs(differenceVes) > 1;

  // Crear el cierre
  const closing = new this.closingModel({
    tenantId,
    sessionId,
    closedBy: userId,
    registerName: session.registerName,
    cashierName: session.cashierName,

    // Período
    periodStart: session.openedAt,
    periodEnd: new Date(),

    // Totales calculados automáticamente
    totalOrders: calculatedTotals.totalOrders,
    totalGrossSalesUsd: calculatedTotals.salesUsd,
    totalGrossSalesVes: calculatedTotals.salesVes,

    // Desglose por método de pago
    salesByPaymentMethod: {
      cashUsd: calculatedTotals.cashUsd,
      cashVes: calculatedTotals.cashVes,
      cardUsd: calculatedTotals.cardUsd,
      cardVes: calculatedTotals.cardVes,
      transferUsd: calculatedTotals.transferUsd,
      transferVes: calculatedTotals.transferVes,
      mobilePaymentVes: calculatedTotals.mobilePaymentVes,
    },

    // Arqueo
    openingAmountUsd: session.openingAmountUsd,
    openingAmountVes: session.openingAmountVes,
    expectedCashUsd,
    expectedCashVes,
    actualCashUsd: dto.closingAmountUsd,
    actualCashVes: dto.closingAmountVes,
    differenceUsd,
    differenceVes,
    hasDifferences,

    // Notas
    closingNotes: dto.closingNotes,
    exchangeRate: dto.exchangeRate,

    // Estado
    status: hasDifferences ? 'pending_approval' : 'approved',
    closingType: 'individual',
  });

  await closing.save();

  // Cerrar la sesión
  session.status = 'closed';
  session.closedAt = new Date();
  session.closingId = closing._id;
  await session.save();

  return closing;
}
```

---

## FASE 7: Mostrar Estado de Caja en el Módulo de Ventas

### Crear componente indicador de caja:
```
/food-inventory-admin/src/components/cash-register/CashRegisterIndicator.jsx
```

```jsx
import React from 'react';
import { useCashRegister } from '../../contexts/CashRegisterContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CashRegisterIndicator() {
  const { currentSession, hasActiveSession, loading } = useCashRegister();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        Cargando caja...
      </Badge>
    );
  }

  if (!hasActiveSession) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => navigate('/cash-register')}
        className="gap-2"
      >
        <Lock className="h-4 w-4" />
        Caja Cerrada - Abrir para vender
      </Button>
    );
  }

  return (
    <Badge variant="success" className="gap-2 px-3 py-1">
      <Unlock className="h-4 w-4" />
      {currentSession.registerName} - Abierta
    </Badge>
  );
}
```

### Usar el indicador en la pantalla de ventas/POS:

Busca el componente principal de ventas (probablemente en `/components/orders/` o `/pages/`) y agrega:

```jsx
import { CashRegisterIndicator } from '../cash-register/CashRegisterIndicator';

// En el JSX, en el header o toolbar:
<div className="flex items-center gap-4">
  <h1>Punto de Venta</h1>
  <CashRegisterIndicator />
</div>
```

---

## FASE 7.5: Crear Drawer de Cierre Rápido (Acceso Directo desde POS)

### Objetivo:
Permitir que los cajeros puedan iniciar el cierre de caja directamente desde el módulo de ventas/POS sin tener que navegar al módulo de Cierre de Caja.

### Archivo a CREAR:
```
/food-inventory-admin/src/components/cash-register/CashClosingDrawer.jsx
```

### Contenido EXACTO del archivo:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useCashRegister } from '../../contexts/CashRegisterContext';
import { fetchApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

// UI Components
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

// Icons
import {
  Calculator,
  DollarSign,
  CreditCard,
  Smartphone,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Receipt,
  TrendingUp,
} from 'lucide-react';

export function CashClosingDrawer({ trigger }) {
  const { currentSession, hasActiveSession, refreshSession } = useCashRegister();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState(null);
  const [closingData, setClosingData] = useState({
    closingAmountUsd: '',
    closingAmountVes: '',
    closingNotes: '',
    exchangeRate: '',
  });

  // Cargar totales cuando se abre el drawer
  const fetchTotals = useCallback(async () => {
    if (!currentSession?._id) return;

    try {
      setLoading(true);
      const response = await fetchApi(`/cash-register/sessions/${currentSession._id}/totals`);
      setTotals(response);
    } catch (error) {
      console.error('Error fetching totals:', error);
      toast.error('Error al cargar los totales');
    } finally {
      setLoading(false);
    }
  }, [currentSession?._id]);

  useEffect(() => {
    if (open && hasActiveSession) {
      fetchTotals();
    }
  }, [open, hasActiveSession, fetchTotals]);

  // Calcular diferencias
  const calculateDifference = (actual, expected) => {
    const diff = parseFloat(actual || 0) - parseFloat(expected || 0);
    return diff;
  };

  const expectedCashUsd = (currentSession?.openingAmountUsd || 0) + (totals?.cashUsd || 0);
  const expectedCashVes = (currentSession?.openingAmountVes || 0) + (totals?.cashVes || 0);

  const differenceUsd = calculateDifference(closingData.closingAmountUsd, expectedCashUsd);
  const differenceVes = calculateDifference(closingData.closingAmountVes, expectedCashVes);

  const hasDifferences = Math.abs(differenceUsd) > 0.01 || Math.abs(differenceVes) > 1;

  // Enviar cierre
  const handleClose = async () => {
    if (!closingData.closingAmountUsd && !closingData.closingAmountVes) {
      toast.error('Debe ingresar al menos un monto de cierre');
      return;
    }

    try {
      setLoading(true);

      await fetchApi(`/cash-register/sessions/${currentSession._id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          closingAmountUsd: parseFloat(closingData.closingAmountUsd) || 0,
          closingAmountVes: parseFloat(closingData.closingAmountVes) || 0,
          closingNotes: closingData.closingNotes,
          exchangeRate: parseFloat(closingData.exchangeRate) || undefined,
        }),
      });

      toast.success('Caja cerrada exitosamente');
      refreshSession();
      setOpen(false);

      // Preguntar si desea ver el reporte
      if (window.confirm('¿Desea ver el reporte de cierre?')) {
        navigate('/cash-register');
      }
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error(error.message || 'Error al cerrar la caja');
    } finally {
      setLoading(false);
    }
  };

  // Si no hay sesión activa, mostrar mensaje
  if (!hasActiveSession) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Calculator className="h-4 w-4" />
              Cierre de Caja
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Sin Caja Activa</SheetTitle>
            <SheetDescription>
              No hay una sesión de caja abierta para cerrar.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Debe abrir una caja antes de poder cerrarla.
            </p>
            <Button onClick={() => navigate('/cash-register')}>
              Ir a Gestión de Caja
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="h-4 w-4" />
            Cierre de Caja
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Cierre de Caja
          </SheetTitle>
          <SheetDescription>
            {currentSession?.registerName || 'Caja Principal'} - Sesión iniciada{' '}
            {currentSession?.openedAt
              ? new Date(currentSession.openedAt).toLocaleString()
              : ''}
          </SheetDescription>
        </SheetHeader>

        {loading && !totals ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Resumen de Ventas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Resumen del Turno
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Órdenes</span>
                  <p className="text-xl font-bold">{totals?.totalOrders || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ventas USD</span>
                  <p className="text-xl font-bold text-green-600">
                    ${(totals?.salesUsd || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ventas VES</span>
                  <p className="text-xl font-bold text-blue-600">
                    Bs. {(totals?.salesVes || 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Desglose por Método de Pago */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Desglose por Método</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Efectivo USD
                  </span>
                  <span className="font-medium">${(totals?.cashUsd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Efectivo VES
                  </span>
                  <span className="font-medium">Bs. {(totals?.cashVes || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Tarjetas USD
                  </span>
                  <span className="font-medium">${(totals?.cardUsd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Tarjetas VES
                  </span>
                  <span className="font-medium">Bs. {(totals?.cardVes || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Transferencias USD
                  </span>
                  <span className="font-medium">${(totals?.transferUsd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Pago Móvil
                  </span>
                  <span className="font-medium">Bs. {(totals?.mobilePaymentVes || 0).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Arqueo de Efectivo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Arqueo de Efectivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Efectivo Esperado */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                  <div>
                    <span className="text-xs text-muted-foreground">Esperado USD</span>
                    <p className="text-lg font-bold">${expectedCashUsd.toFixed(2)}</p>
                    <span className="text-xs text-muted-foreground">
                      (Apertura: ${currentSession?.openingAmountUsd || 0} + Ventas: ${totals?.cashUsd?.toFixed(2) || '0.00'})
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Esperado VES</span>
                    <p className="text-lg font-bold">Bs. {expectedCashVes.toFixed(2)}</p>
                    <span className="text-xs text-muted-foreground">
                      (Apertura: Bs. {currentSession?.openingAmountVes || 0} + Ventas: Bs. {totals?.cashVes?.toFixed(2) || '0.00'})
                    </span>
                  </div>
                </div>

                {/* Inputs de Cierre */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="closingUsd">Efectivo Contado (USD)</Label>
                    <Input
                      id="closingUsd"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={closingData.closingAmountUsd}
                      onChange={(e) =>
                        setClosingData((prev) => ({
                          ...prev,
                          closingAmountUsd: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closingVes">Efectivo Contado (VES)</Label>
                    <Input
                      id="closingVes"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={closingData.closingAmountVes}
                      onChange={(e) =>
                        setClosingData((prev) => ({
                          ...prev,
                          closingAmountVes: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Mostrar Diferencias */}
                {(closingData.closingAmountUsd || closingData.closingAmountVes) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        Math.abs(differenceUsd) < 0.01
                          ? 'bg-green-50 border border-green-200'
                          : differenceUsd > 0
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground">Diferencia USD</span>
                      <p
                        className={`text-lg font-bold ${
                          Math.abs(differenceUsd) < 0.01
                            ? 'text-green-600'
                            : differenceUsd > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}
                      >
                        {differenceUsd >= 0 ? '+' : ''}${differenceUsd.toFixed(2)}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        Math.abs(differenceVes) < 1
                          ? 'bg-green-50 border border-green-200'
                          : differenceVes > 0
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground">Diferencia VES</span>
                      <p
                        className={`text-lg font-bold ${
                          Math.abs(differenceVes) < 1
                            ? 'text-green-600'
                            : differenceVes > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}
                      >
                        {differenceVes >= 0 ? '+' : ''}Bs. {differenceVes.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Alerta de Diferencias */}
                {hasDifferences && closingData.closingAmountUsd && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Se detectaron diferencias
                      </p>
                      <p className="text-xs text-yellow-700">
                        El cierre quedará pendiente de aprobación por un supervisor.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notas y Tasa de Cambio */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">Tasa de Cambio (Opcional)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 36.50"
                  value={closingData.exchangeRate}
                  onChange={(e) =>
                    setClosingData((prev) => ({
                      ...prev,
                      exchangeRate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas del Cierre</Label>
                <Textarea
                  id="notes"
                  placeholder="Observaciones, incidencias, etc."
                  value={closingData.closingNotes}
                  onChange={(e) =>
                    setClosingData((prev) => ({
                      ...prev,
                      closingNotes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleClose} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Cerrar Caja
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CashClosingDrawer;
```

### Cómo usar el Drawer en el POS:

En el componente de ventas/POS (por ejemplo `OrdersPOS.jsx`), agregar el botón de cierre:

```jsx
import { CashClosingDrawer } from '../cash-register/CashClosingDrawer';
import { CashRegisterIndicator } from '../cash-register/CashRegisterIndicator';

// En el JSX, en el header o toolbar:
<div className="flex items-center gap-4">
  <h1>Punto de Venta</h1>
  <CashRegisterIndicator />
  <CashClosingDrawer />
</div>
```

### También puedes personalizar el trigger:

```jsx
<CashClosingDrawer
  trigger={
    <Button variant="destructive" size="sm" className="gap-2">
      <XCircle className="h-4 w-4" />
      Cerrar Turno
    </Button>
  }
/>
```

---

## FASE 8: Bloquear Ventas si No Hay Caja Abierta (Opcional pero Recomendado)

### En el componente de crear orden:

```jsx
import { useCashRegister } from '../../contexts/CashRegisterContext';

function CreateOrderComponent() {
  const { hasActiveSession } = useCashRegister();

  const handleCreateOrder = async () => {
    // Verificar antes de crear
    if (!hasActiveSession) {
      toast.error('Debe abrir una caja antes de realizar ventas');
      return;
    }

    // ... continuar con la creación de la orden
  };

  // O mostrar mensaje en el UI
  if (!hasActiveSession) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h2>Caja Cerrada</h2>
        <p>Debe abrir una sesión de caja para realizar ventas</p>
        <Button onClick={() => navigate('/cash-register')}>
          Ir a Caja
        </Button>
      </div>
    );
  }

  return (
    // ... formulario normal de crear orden
  );
}
```

---

## FASE 9: Actualizar el Dashboard de Caja para Mostrar Totales en Tiempo Real

### Modificar:
```
/food-inventory-admin/src/components/cash-register/CashRegisterDashboard.jsx
```

### Agregar endpoint para obtener totales en tiempo real:

En el backend, agregar nuevo endpoint en `cash-register.controller.ts`:

```typescript
@Get('sessions/:sessionId/totals')
@Permissions('cash_register_read')
async getSessionTotals(
  @Param('sessionId') sessionId: string,
  @Request() req: any,
) {
  return this.cashRegisterService.calculateSessionTotals(
    sessionId,
    req.user.tenantId,
  );
}
```

### En el frontend, mostrar los totales:

Agrega un estado y efecto para cargar los totales:

```jsx
const [sessionTotals, setSessionTotals] = useState(null);

const fetchSessionTotals = useCallback(async () => {
  if (!currentSession?._id) return;

  try {
    const response = await fetchApi(`/cash-register/sessions/${currentSession._id}/totals`);
    setSessionTotals(response);
  } catch (error) {
    console.error('Error fetching totals:', error);
  }
}, [currentSession?._id]);

useEffect(() => {
  fetchSessionTotals();
  // Actualizar cada 30 segundos
  const interval = setInterval(fetchSessionTotals, 30000);
  return () => clearInterval(interval);
}, [fetchSessionTotals]);
```

Y mostrar en el UI:

```jsx
{currentSession && sessionTotals && (
  <Card>
    <CardHeader>
      <CardTitle>Ventas del Turno (Tiempo Real)</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Órdenes</p>
          <p className="text-2xl font-bold">{sessionTotals.totalOrders}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ventas USD</p>
          <p className="text-2xl font-bold">${sessionTotals.salesUsd.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ventas VES</p>
          <p className="text-2xl font-bold">Bs. {sessionTotals.salesVes.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Efectivo USD</p>
          <p className="text-2xl font-bold">${sessionTotals.cashUsd.toFixed(2)}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

## FASE 10: Registrar el Módulo Order en CashRegister

### Modificar:
```
/food-inventory-saas/src/modules/cash-register/cash-register.module.ts
```

Agregar el esquema de Order a los imports:

```typescript
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashRegisterSession.name, schema: CashRegisterSessionSchema },
      { name: CashRegisterClosing.name, schema: CashRegisterClosingSchema },
      // AGREGAR ESTO:
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  // ...
})
export class CashRegisterModule {}
```

---

## RESUMEN DE ARCHIVOS A MODIFICAR/CREAR

### BACKEND (food-inventory-saas):
| # | Archivo | Acción | Descripción |
|---|---------|--------|-------------|
| 1 | `src/schemas/order.schema.ts` | MODIFICAR | Agregar campos `cashSessionId` y `cashRegisterId` (línea ~524) |
| 2 | `src/dto/order.dto.ts` | MODIFICAR | Agregar campos al `CreateOrderDto` (línea ~374) |
| 3 | `src/modules/cash-register/cash-register.module.ts` | MODIFICAR | Importar `OrderSchema` en los imports de Mongoose |
| 4 | `src/modules/cash-register/cash-register.service.ts` | MODIFICAR | Agregar método `calculateSessionTotals()` y modificar `closeSession()` |
| 5 | `src/modules/cash-register/cash-register.controller.ts` | MODIFICAR | Agregar endpoint `GET /sessions/:id/totals` |

### FRONTEND (food-inventory-admin):
| # | Archivo | Acción | Descripción |
|---|---------|--------|-------------|
| 1 | `src/contexts/CashRegisterContext.jsx` | **CREAR** | Contexto global para la sesión de caja |
| 2 | `src/App.jsx` | MODIFICAR | Envolver app con `CashRegisterProvider` |
| 3 | `src/hooks/use-orders.js` | MODIFICAR | Agregar parámetro de caja a `addOrder()` |
| 4 | `src/components/cash-register/CashRegisterIndicator.jsx` | **CREAR** | Badge/botón que muestra estado de caja |
| 5 | `src/components/cash-register/CashClosingDrawer.jsx` | **CREAR** | Drawer para cierre rápido desde POS |
| 6 | `src/components/cash-register/CashRegisterDashboard.jsx` | MODIFICAR | Agregar tarjeta de totales en tiempo real |
| 7 | `src/components/orders/v2/NewOrderFormV2.jsx` | MODIFICAR | Usar hook de caja y pasar al crear orden |
| 8 | `src/components/orders/v2/OrdersPOS.jsx` | MODIFICAR | Usar hook de caja, indicador y drawer de cierre |
| 9 | `src/components/orders/v2/PaymentDialogV2.jsx` | VERIFICAR | Puede que cree órdenes aquí |
| 10 | `src/components/orders/v2/OrderSheetForTables.jsx` | VERIFICAR | Puede que cree órdenes aquí |

---

## ORDEN DE IMPLEMENTACIÓN

1. **PRIMERO**: Fase 1 (Schema) + Fase 5 (DTO) + Fase 10 (Module)
2. **SEGUNDO**: Fase 6 (Cálculo de totales en backend)
3. **TERCERO**: Fase 2 (Contexto) + Fase 3 (Provider en App)
4. **CUARTO**: Fase 4 (Modificar creación de órdenes)
5. **QUINTO**: Fase 7 (Indicador) + Fase 8 (Bloqueo opcional)
6. **SEXTO**: Fase 9 (Dashboard con totales en tiempo real)

---

## COMANDOS ÚTILES PARA VERIFICAR

```bash
# Compilar backend
cd food-inventory-saas && npm run build

# Compilar frontend
cd food-inventory-admin && npm run build

# Buscar archivos que crean órdenes
grep -rn "createOrder\|POST.*order" --include="*.jsx" --include="*.tsx" food-inventory-admin/src/

# Buscar dónde está el schema de Order
find . -name "order.schema.ts" -o -name "order.schema.js"

# Buscar dónde está el DTO de Order
find . -name "order.dto.ts" -o -name "order.dto.js"
```

---

## NOTAS IMPORTANTES

1. **NO BORRAR** código existente, solo AGREGAR
2. Los campos nuevos son OPCIONALES para no romper órdenes viejas
3. Si algo falla, revisar los imports
4. El Provider debe ir DESPUÉS de AuthProvider
5. Probar primero el backend con Postman antes del frontend

---

## CHECKLIST SIMPLE PARA SEGUIR PASO A PASO

### ☐ PASO 1: Backend - Schema de Order
- [ ] Abrir `food-inventory-saas/src/schemas/order.schema.ts`
- [ ] Buscar la línea `tenantId: string;` (cerca de línea 527)
- [ ] ANTES de esa línea, pegar los campos `cashSessionId` y `cashRegisterId`
- [ ] Al final del archivo, agregar el índice `OrderSchema.index({ cashSessionId: 1, tenantId: 1 });`
- [ ] Guardar archivo

### ☐ PASO 2: Backend - DTO de Order
- [ ] Abrir `food-inventory-saas/src/dto/order.dto.ts`
- [ ] Buscar la clase `CreateOrderDto` (empieza en línea 213)
- [ ] Buscar el último campo `tableId` (línea 374)
- [ ] DESPUÉS de `tableId`, agregar los campos `cashSessionId` y `cashRegisterId`
- [ ] Guardar archivo

### ☐ PASO 3: Backend - Compilar y verificar
- [ ] Ejecutar `cd food-inventory-saas && npm run build`
- [ ] Si hay errores, corregirlos
- [ ] Si compila OK, continuar

### ☐ PASO 4: Backend - Módulo de Cash Register
- [ ] Abrir `food-inventory-saas/src/modules/cash-register/cash-register.module.ts`
- [ ] Agregar import: `import { Order, OrderSchema } from '../../schemas/order.schema';`
- [ ] En `MongooseModule.forFeature([...])`, agregar: `{ name: Order.name, schema: OrderSchema }`
- [ ] Guardar archivo

### ☐ PASO 5: Backend - Servicio de Cash Register
- [ ] Abrir `food-inventory-saas/src/modules/cash-register/cash-register.service.ts`
- [ ] Agregar import: `import { Order } from '../../schemas/order.schema';`
- [ ] En el constructor, agregar: `@InjectModel(Order.name) private orderModel: Model<Order>`
- [ ] Agregar el método `calculateSessionTotals()` (ver Fase 6 arriba)
- [ ] Modificar el método de cerrar sesión para usar los totales calculados
- [ ] Guardar archivo

### ☐ PASO 6: Backend - Controlador de Cash Register
- [ ] Abrir `food-inventory-saas/src/modules/cash-register/cash-register.controller.ts`
- [ ] Agregar nuevo endpoint `@Get('sessions/:sessionId/totals')`
- [ ] Guardar archivo

### ☐ PASO 7: Backend - Compilar de nuevo
- [ ] Ejecutar `cd food-inventory-saas && npm run build`
- [ ] Si hay errores, corregirlos
- [ ] Si compila OK, el backend está listo

### ☐ PASO 8: Frontend - Crear Contexto
- [ ] Crear archivo `food-inventory-admin/src/contexts/CashRegisterContext.jsx`
- [ ] Copiar el código de la Fase 2 arriba
- [ ] Guardar archivo

### ☐ PASO 9: Frontend - Agregar Provider a App
- [ ] Abrir `food-inventory-admin/src/App.jsx`
- [ ] Agregar import: `import { CashRegisterProvider } from './contexts/CashRegisterContext';`
- [ ] Envolver la app con `<CashRegisterProvider>` (dentro de AuthProvider)
- [ ] Guardar archivo

### ☐ PASO 10: Frontend - Modificar Hook de Orders
- [ ] Abrir `food-inventory-admin/src/hooks/use-orders.js`
- [ ] Modificar la función `addOrder` para aceptar parámetro `cashRegisterInfo`
- [ ] Guardar archivo

### ☐ PASO 11: Frontend - Modificar Componentes de Órdenes
- [ ] Abrir `food-inventory-admin/src/components/orders/v2/NewOrderFormV2.jsx`
- [ ] Agregar import del hook de caja
- [ ] Usar el hook y pasar los datos al crear orden
- [ ] Repetir para los otros componentes de órdenes
- [ ] Guardar archivos

### ☐ PASO 12: Frontend - Crear Indicador de Caja
- [ ] Crear archivo `food-inventory-admin/src/components/cash-register/CashRegisterIndicator.jsx`
- [ ] Copiar el código de la Fase 7 arriba
- [ ] Usarlo en los componentes de ventas
- [ ] Guardar archivo

### ☐ PASO 13: Frontend - Compilar y verificar
- [ ] Ejecutar `cd food-inventory-admin && npm run build`
- [ ] Si hay errores, corregirlos
- [ ] Si compila OK, ¡LISTO!

---

## CÓMO PROBAR QUE FUNCIONA

1. Iniciar el backend: `cd food-inventory-saas && npm run start:dev`
2. Iniciar el frontend: `cd food-inventory-admin && npm run dev`
3. Ir a la página de Cierre de Caja y abrir una sesión
4. Ir a la página de Ventas/POS
5. Crear una orden
6. En MongoDB, verificar que la orden tiene los campos `cashSessionId` y `cashRegisterId`
7. Volver a Cierre de Caja y verificar que los totales se actualizan

---

## SI ALGO SALE MAL

### Error: "Cannot find module"
- Verificar que los imports estén correctos
- Verificar que los archivos existan en las rutas indicadas

### Error: "Property X does not exist on type Y"
- Verificar que agregaste los campos al schema Y al DTO
- Verificar que compilaste el backend después de los cambios

### Error: "useCashRegister must be used within CashRegisterProvider"
- Verificar que agregaste el Provider en App.jsx
- Verificar que el Provider está ENVOLVIENDO los componentes que lo usan

### Las órdenes no tienen los campos de caja
- Verificar que el frontend está enviando los campos
- Verificar que el hook de caja tiene una sesión activa
- Usar console.log para debuggear qué se está enviando

### Los totales no se calculan
- Verificar que el servicio de Cash Register puede acceder al modelo de Order
- Verificar que las órdenes tienen `cashSessionId` (las viejas no lo tendrán)
- Solo se calculan órdenes con status `completed`, `paid`, o `delivered`

---

## FASE FUTURA: Soporte para Terminales Físicos (Opción A)

> **IMPORTANTE**: Esta fase debe implementarse SOLO después de verificar que todas las fases anteriores funcionan correctamente. Esta es una mejora avanzada para negocios con múltiples terminales POS físicos.

### Contexto
Cuando el tenant tenga alianzas con proveedores de hardware (terminales POS físicos), necesitará un sistema más robusto donde cada terminal tenga su propia identidad y sesión de caja.

### Arquitectura de Multi-Terminal

```
┌─────────────────────────────────────────────────────────────────┐
│                         TENANT                                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Terminal 001 │  │ Terminal 002 │  │ Terminal 003 │          │
│  │  (Caja 1)    │  │  (Caja 2)    │  │  (Caja Móvil)│          │
│  │              │  │              │  │              │          │
│  │ DeviceID:    │  │ DeviceID:    │  │ DeviceID:    │          │
│  │ POS-001-ABC  │  │ POS-002-DEF  │  │ MOBILE-001   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Backend    │                              │
│                    │  (NestJS)    │                              │
│                    └──────┬──────┘                              │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │  MongoDB     │                              │
│                    │  Sessions    │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### PASO 1: Crear Schema para Terminales

#### Archivo a CREAR:
```
food-inventory-saas/src/schemas/terminal.schema.ts
```

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TerminalDocument = Terminal & Document;

@Schema({ timestamps: true })
export class Terminal {
  @Prop({ type: String, required: true })
  deviceId: string; // ID único del dispositivo (generado o del hardware)

  @Prop({ type: String, required: true })
  name: string; // "Caja 1", "Terminal Principal", "POS Móvil"

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: ['fixed', 'mobile', 'kiosk', 'virtual'],
    default: 'fixed'
  })
  type: string;

  @Prop({ type: String })
  location?: string; // "Entrada", "Segundo Piso", "Terraza"

  @Prop({ type: Object })
  hardware?: {
    manufacturer?: string;    // "Sunmi", "PAX", "Ingenico"
    model?: string;           // "V2 Pro", "A920"
    serialNumber?: string;
    firmwareVersion?: string;
    printerType?: string;     // "thermal", "impact", "none"
    hasScanner?: boolean;
    hasNfc?: boolean;
  };

  @Prop({ type: Object })
  capabilities?: {
    canPrintReceipts: boolean;
    canScanBarcodes: boolean;
    canProcessCards: boolean;
    canAcceptCash: boolean;
    hasCashDrawer: boolean;
  };

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'retired'],
    default: 'active'
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'CashRegisterSession' })
  currentSessionId?: Types.ObjectId; // Sesión activa en este terminal

  @Prop({ type: Types.ObjectId, ref: 'User' })
  currentUserId?: Types.ObjectId; // Usuario logueado actualmente

  @Prop({ type: Date })
  lastActivityAt?: Date;

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const TerminalSchema = SchemaFactory.createForClass(Terminal);

// Índices
TerminalSchema.index({ deviceId: 1, tenantId: 1 }, { unique: true });
TerminalSchema.index({ status: 1, tenantId: 1 });
TerminalSchema.index({ currentSessionId: 1, tenantId: 1 });
```

### PASO 2: Modificar CashRegisterSession para soportar Terminal

#### Archivo a modificar:
```
food-inventory-saas/src/schemas/cash-register-session.schema.ts
```

#### Campos a AGREGAR:

```typescript
// AGREGAR estos campos al schema existente

@Prop({ type: Types.ObjectId, ref: 'Terminal' })
terminalId?: Types.ObjectId; // Terminal físico asociado

@Prop({ type: String })
terminalDeviceId?: string; // DeviceID desnormalizado para queries rápidos

@Prop({ type: Object })
terminalInfo?: {
  name: string;
  type: string;
  location?: string;
};
```

### PASO 3: Crear Endpoint para Registro de Terminal

#### Archivo a modificar:
```
food-inventory-saas/src/modules/cash-register/cash-register.controller.ts
```

```typescript
// AGREGAR estos endpoints

@Post('terminals/register')
@Permissions('cash_register_admin')
async registerTerminal(
  @Body() dto: RegisterTerminalDto,
  @Request() req: any,
) {
  return this.cashRegisterService.registerTerminal(dto, req.user.tenantId);
}

@Get('terminals')
@Permissions('cash_register_read')
async getTerminals(@Request() req: any) {
  return this.cashRegisterService.getTerminals(req.user.tenantId);
}

@Get('terminals/:deviceId/session')
@Permissions('cash_register_read')
async getTerminalSession(
  @Param('deviceId') deviceId: string,
  @Request() req: any,
) {
  return this.cashRegisterService.getSessionByTerminal(deviceId, req.user.tenantId);
}

@Post('terminals/:deviceId/open')
@Permissions('cash_register_open')
async openSessionOnTerminal(
  @Param('deviceId') deviceId: string,
  @Body() dto: OpenCashRegisterDto,
  @Request() req: any,
) {
  return this.cashRegisterService.openSessionOnTerminal(
    deviceId,
    dto,
    req.user.tenantId,
    req.user._id,
  );
}
```

### PASO 4: Crear DTO para Terminales

#### Archivo a CREAR:
```
food-inventory-saas/src/dto/terminal.dto.ts
```

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';

export class RegisterTerminalDto {
  @ApiProperty({ description: 'ID único del dispositivo' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Nombre del terminal' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['fixed', 'mobile', 'kiosk', 'virtual'] })
  @IsOptional()
  @IsEnum(['fixed', 'mobile', 'kiosk', 'virtual'])
  type?: string;

  @ApiPropertyOptional({ description: 'Ubicación física' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Info del hardware' })
  @IsOptional()
  @IsObject()
  hardware?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    firmwareVersion?: string;
    printerType?: string;
    hasScanner?: boolean;
    hasNfc?: boolean;
  };

  @ApiPropertyOptional({ description: 'Capacidades del terminal' })
  @IsOptional()
  @IsObject()
  capabilities?: {
    canPrintReceipts: boolean;
    canScanBarcodes: boolean;
    canProcessCards: boolean;
    canAcceptCash: boolean;
    hasCashDrawer: boolean;
  };
}
```

### PASO 5: Servicio para Gestión de Terminales

#### Archivo a modificar:
```
food-inventory-saas/src/modules/cash-register/cash-register.service.ts
```

```typescript
// AGREGAR estos métodos al servicio

/**
 * Registra un nuevo terminal en el sistema
 */
async registerTerminal(dto: RegisterTerminalDto, tenantId: string) {
  // Verificar si el terminal ya existe
  const existing = await this.terminalModel.findOne({
    deviceId: dto.deviceId,
    tenantId,
  });

  if (existing) {
    // Actualizar terminal existente
    Object.assign(existing, dto);
    existing.lastActivityAt = new Date();
    return existing.save();
  }

  // Crear nuevo terminal
  const terminal = new this.terminalModel({
    ...dto,
    tenantId,
    status: 'active',
    lastActivityAt: new Date(),
  });

  return terminal.save();
}

/**
 * Obtiene todos los terminales del tenant
 */
async getTerminals(tenantId: string) {
  return this.terminalModel.find({ tenantId })
    .populate('currentSessionId')
    .populate('currentUserId', 'name email')
    .sort({ name: 1 });
}

/**
 * Obtiene la sesión activa de un terminal específico
 */
async getSessionByTerminal(deviceId: string, tenantId: string) {
  const terminal = await this.terminalModel.findOne({
    deviceId,
    tenantId,
    status: 'active',
  });

  if (!terminal) {
    throw new NotFoundException('Terminal no encontrado');
  }

  if (!terminal.currentSessionId) {
    return { session: null, terminal };
  }

  const session = await this.sessionModel.findById(terminal.currentSessionId);
  return { session, terminal };
}

/**
 * Abre una sesión en un terminal específico
 */
async openSessionOnTerminal(
  deviceId: string,
  dto: OpenCashRegisterDto,
  tenantId: string,
  userId: string,
) {
  // Buscar terminal
  const terminal = await this.terminalModel.findOne({
    deviceId,
    tenantId,
    status: 'active',
  });

  if (!terminal) {
    throw new NotFoundException('Terminal no encontrado');
  }

  // Verificar que no tenga sesión activa
  if (terminal.currentSessionId) {
    const existingSession = await this.sessionModel.findById(terminal.currentSessionId);
    if (existingSession && existingSession.status === 'open') {
      throw new ConflictException('Este terminal ya tiene una sesión activa');
    }
  }

  // Crear sesión vinculada al terminal
  const session = new this.sessionModel({
    tenantId,
    openedBy: userId,
    registerName: terminal.name,
    terminalId: terminal._id,
    terminalDeviceId: terminal.deviceId,
    terminalInfo: {
      name: terminal.name,
      type: terminal.type,
      location: terminal.location,
    },
    openingAmountUsd: dto.openingAmountUsd || 0,
    openingAmountVes: dto.openingAmountVes || 0,
    openingNotes: dto.openingNotes,
    status: 'open',
    openedAt: new Date(),
  });

  await session.save();

  // Actualizar terminal
  terminal.currentSessionId = session._id;
  terminal.currentUserId = userId;
  terminal.lastActivityAt = new Date();
  await terminal.save();

  return session;
}
```

### PASO 6: Frontend - Generar DeviceID Único

#### Archivo a CREAR:
```
food-inventory-admin/src/lib/device-fingerprint.js
```

```javascript
/**
 * Genera un fingerprint único para el dispositivo/navegador
 * Usado para identificar terminales POS físicos o virtuales
 */

const DEVICE_ID_KEY = 'smartkubik_device_id';

/**
 * Genera componentes del fingerprint del dispositivo
 */
function getDeviceComponents() {
  const components = [];

  // User Agent
  components.push(navigator.userAgent);

  // Screen resolution
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency (CPU cores)
  components.push(navigator.hardwareConcurrency || 'unknown');

  // Device memory (if available)
  components.push(navigator.deviceMemory || 'unknown');

  return components.join('|');
}

/**
 * Genera un hash simple del string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Obtiene o genera el ID único del dispositivo
 */
export function getDeviceId() {
  // Verificar si ya existe en localStorage
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (deviceId) {
    return deviceId;
  }

  // Generar nuevo ID basado en fingerprint
  const components = getDeviceComponents();
  const hash = simpleHash(components);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);

  // Formato: TERM-{hash}-{timestamp}-{random}
  deviceId = `TERM-${hash}-${timestamp}-${random}`.toUpperCase();

  // Guardar en localStorage
  localStorage.setItem(DEVICE_ID_KEY, deviceId);

  return deviceId;
}

/**
 * Detecta si es un dispositivo móvil
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Obtiene información básica del dispositivo
 */
export function getDeviceInfo() {
  return {
    deviceId: getDeviceId(),
    type: isMobileDevice() ? 'mobile' : 'fixed',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Resetea el ID del dispositivo (para testing/desarrollo)
 */
export function resetDeviceId() {
  localStorage.removeItem(DEVICE_ID_KEY);
  return getDeviceId();
}
```

### PASO 7: Frontend - Modificar Contexto para Multi-Terminal

#### Archivo a modificar:
```
food-inventory-admin/src/contexts/CashRegisterContext.jsx
```

Agregar soporte para terminales:

```jsx
import { getDeviceId, getDeviceInfo } from '../lib/device-fingerprint';

// AGREGAR al state inicial
const [terminal, setTerminal] = useState(null);
const deviceId = getDeviceId();

// AGREGAR función para registrar terminal
const registerTerminal = useCallback(async () => {
  try {
    const deviceInfo = getDeviceInfo();
    const response = await fetchApi('/cash-register/terminals/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        name: `Terminal ${deviceInfo.deviceId.slice(-6)}`,
        type: deviceInfo.type,
        hardware: {
          userAgent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
        },
      }),
    });
    setTerminal(response);
    return response;
  } catch (error) {
    console.error('Error registering terminal:', error);
    throw error;
  }
}, []);

// MODIFICAR fetchCurrentSession para usar deviceId
const fetchCurrentSession = useCallback(async () => {
  try {
    setLoading(true);
    // Primero intentar obtener sesión por terminal
    const response = await fetchApi(`/cash-register/terminals/${deviceId}/session`);
    setCurrentSession(response?.session || null);
    setTerminal(response?.terminal || null);
  } catch (error) {
    // Si el terminal no existe, usar el método anterior
    console.warn('Terminal not registered, using user-based session');
    try {
      const response = await fetchApi('/cash-register/sessions/current');
      setCurrentSession(response?.session || null);
    } catch (innerError) {
      console.error('Error fetching session:', innerError);
      setCurrentSession(null);
    }
  } finally {
    setLoading(false);
  }
}, [deviceId]);

// AGREGAR al value
const value = {
  // ... valores existentes
  terminal,
  deviceId,
  registerTerminal,
  isTerminalRegistered: Boolean(terminal),
};
```

### PASO 8: Componente de Administración de Terminales

#### Archivo a CREAR:
```
food-inventory-admin/src/components/cash-register/TerminalManagement.jsx
```

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Monitor,
  Smartphone,
  Plus,
  Settings,
  Power,
  PowerOff,
  MapPin,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

export function TerminalManagement() {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTerminals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/cash-register/terminals');
      setTerminals(response || []);
    } catch (error) {
      console.error('Error fetching terminals:', error);
      toast.error('Error al cargar terminales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerminals();
  }, [fetchTerminals]);

  const getTerminalIcon = (type) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status, hasSession) => {
    if (hasSession) {
      return <Badge variant="success">En uso</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge variant="outline">Disponible</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactivo</Badge>;
      case 'maintenance':
        return <Badge variant="warning">Mantenimiento</Badge>;
      default:
        return <Badge variant="destructive">Retirado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Gestión de Terminales
        </CardTitle>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Terminal
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Terminal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última Actividad</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminals.map((terminal) => (
              <TableRow key={terminal._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTerminalIcon(terminal.type)}
                    <div>
                      <p className="font-medium">{terminal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {terminal.deviceId}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{terminal.type}</TableCell>
                <TableCell>
                  {terminal.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {terminal.location}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(terminal.status, terminal.currentSessionId)}
                </TableCell>
                <TableCell>
                  {terminal.lastActivityAt
                    ? new Date(terminal.lastActivityAt).toLocaleString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default TerminalManagement;
```

---

### RESUMEN DE LA FASE FUTURA

| # | Archivo | Acción | Descripción |
|---|---------|--------|-------------|
| 1 | `schemas/terminal.schema.ts` | **CREAR** | Schema para terminales físicos |
| 2 | `schemas/cash-register-session.schema.ts` | MODIFICAR | Agregar campos de terminal |
| 3 | `dto/terminal.dto.ts` | **CREAR** | DTOs para gestión de terminales |
| 4 | `cash-register.controller.ts` | MODIFICAR | Endpoints de terminales |
| 5 | `cash-register.service.ts` | MODIFICAR | Lógica de gestión de terminales |
| 6 | `lib/device-fingerprint.js` | **CREAR** | Generador de DeviceID único |
| 7 | `contexts/CashRegisterContext.jsx` | MODIFICAR | Soporte multi-terminal |
| 8 | `components/cash-register/TerminalManagement.jsx` | **CREAR** | UI de administración |

### CONSIDERACIONES PARA HARDWARE

Cuando se establezcan alianzas con proveedores de hardware, considerar:

1. **APIs del Fabricante**: Sunmi, PAX, Ingenico tienen SDKs para obtener info del dispositivo
2. **Serial Number**: Usar el número de serie real del hardware como `deviceId`
3. **Impresión**: Integrar SDK de impresión térmica
4. **Cash Drawer**: Integrar comando para abrir gaveta de dinero
5. **NFC/Contactless**: Integrar lectura de tarjetas sin contacto
6. **Scanner**: Integrar lectura de códigos de barras

### EJEMPLO DE INTEGRACIÓN CON SUNMI (Referencia)

```javascript
// Para terminales Sunmi (Android)
if (window.SunmiInnerPrinter) {
  // Obtener info del dispositivo
  window.SunmiInnerPrinter.getSerialNumber((serial) => {
    deviceId = serial;
  });

  // Abrir gaveta de dinero
  window.SunmiInnerPrinter.openDrawer();

  // Imprimir recibo
  window.SunmiInnerPrinter.printText('Texto del recibo');
}
```

---

## NOTA FINAL

Este plan está diseñado para ser implementado en fases. Las fases 1-10 son **esenciales** y deben implementarse primero. La **Fase Futura** es opcional y debe implementarse solo cuando:

1. ✅ Todas las fases anteriores estén funcionando correctamente
2. ✅ Se hayan establecido alianzas con proveedores de hardware
3. ✅ El tenant tenga la necesidad real de múltiples terminales físicos

Para la mayoría de los casos de uso, las fases 1-10 son suficientes y proporcionan una integración robusta entre el módulo de caja y el módulo de órdenes
