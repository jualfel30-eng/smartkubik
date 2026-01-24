import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle, CheckCircle2, Settings } from 'lucide-react';
import { NewOrderFormV2 } from './NewOrderFormV2';
import { OrderProcessingDrawer } from '../OrderProcessingDrawer';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * OrderSheetForTables
 *
 * Sheet modal específico para el módulo de Mesas que usa el layout de DOS COLUMNAS
 * de NewOrderFormV2 (isEmbedded=false para forzar layout desktop).
 *
 * Este componente es INDEPENDIENTE del ActionPanel usado en WhatsApp.
 */
export const OrderSheetForTables = ({
  isOpen,
  onClose,
  initialTableId,
  initialOrderId
}) => {
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setCreatedOrder(null);
      setIsEditing(false);
    }
  }, [isOpen]);

  // Load existing order if initialOrderId is provided
  useEffect(() => {
    const fetchOrder = async () => {
      if (isOpen && initialOrderId) {
        try {
          console.log('Loading order for table:', initialOrderId);
          const response = await fetchApi(`/orders/${initialOrderId}`);
          const orderData = response.data || response;
          console.log('Order loaded:', orderData);
          setCreatedOrder(orderData);

          // Enable editing if order is not cancelled and not fully paid
          if (orderData.status !== 'cancelled' && orderData.paymentStatus !== 'paid') {
            console.log('Enabling edit mode for order:', orderData._id);
            setIsEditing(true);
          } else {
            console.log('Order is read-only:', orderData._id);
            setIsEditing(false);
          }
        } catch (error) {
          toast.error("Error al cargar la orden");
          console.error('Error fetching order:', error);
        }
      }
    };
    fetchOrder();
  }, [isOpen, initialOrderId]);

  const handleOrderCreated = (order, autoWizard = true) => {
    console.log('Order created from table:', order);
    setCreatedOrder(order);
    setIsEditing(false); // Exit edit mode to show success screen

    if (autoWizard) {
      setIsProcessingDrawerOpen(true);
    }

    toast.success("Orden creada exitosamente");
  };

  const handleOrderUpdated = (updatedOrder) => {
    setCreatedOrder(updatedOrder);
    if (updatedOrder.paymentStatus === 'paid') {
      setIsEditing(false);
    }
    toast.success("Orden actualizada");
  };

  const handleNewOrderClick = () => {
    setCreatedOrder(null);
    setIsEditing(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[90vw] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between pr-8">
              <SheetTitle className="text-xl font-bold">
                {createdOrder
                  ? `Orden #${createdOrder.orderNumber}`
                  : 'Nueva Orden'}
              </SheetTitle>
              {createdOrder && !isEditing && (
                <Button variant="ghost" size="sm" onClick={handleNewOrderClick}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nueva
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6">
            {createdOrder && !isEditing ? (
              /* Success Screen */
              <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in duration-300">
                <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold">¡Orden Creada!</h3>
                  <p className="text-muted-foreground text-lg">
                    La orden #{createdOrder.orderNumber} ha sido generada correctamente.
                  </p>
                  <div className="text-2xl font-semibold mt-4">
                    Total: ${createdOrder.totalAmount?.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-1 w-full max-w-md gap-4 pt-4">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => setIsProcessingDrawerOpen(true)}
                  >
                    <Settings className="h-5 w-5" />
                    Procesar Orden
                  </Button>
                </div>
              </div>
            ) : (
              /* Order Form - IMPORTANT: isEmbedded=false to force 2-column desktop layout */
              <div className="h-full overflow-auto">
                <NewOrderFormV2
                  isEmbedded={false}  // FALSE = Layout de 2 columnas (desktop)
                  initialTableId={initialTableId}
                  onOrderCreated={handleOrderCreated}
                  existingOrder={isEditing ? createdOrder : null}
                  onOrderUpdated={handleOrderUpdated}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Order Processing Drawer */}
      {isProcessingDrawerOpen && createdOrder && (
        <OrderProcessingDrawer
          isOpen={isProcessingDrawerOpen}
          onClose={() => {
            setIsProcessingDrawerOpen(false);
            onClose(); // Close the sheet after processing
          }}
          order={createdOrder}
          onUpdate={async () => {
            try {
              const response = await fetchApi(`/orders/${createdOrder._id}`);
              setCreatedOrder(response.data || response);
            } catch (error) {
              console.error('Error updating order:', error);
            }
          }}
        />
      )}
    </>
  );
};
