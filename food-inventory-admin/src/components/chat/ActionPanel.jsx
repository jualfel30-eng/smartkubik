import React, { useState, useEffect } from 'react';
import { ShoppingBag, Calendar, CheckCircle2, Settings, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewOrderFormV2 } from '@/components/orders/v2/NewOrderFormV2';
import ReservationForm from '@/components/ReservationForm';
import { OrderProcessingDrawer } from '@/components/orders/OrderProcessingDrawer';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import { fetchApi } from '@/lib/api';

export const ActionPanel = ({
    isOpen,
    onClose,
    activeAction,
    onActionChange,
    activeConversation,
    tenant,
    initialOrderId,
    initialTableId
}) => {
    const [createdOrder, setCreatedOrder] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
    const { rate: exchangeRate } = useExchangeRate();

    // Reset state when action changes or panel closes
    useEffect(() => {
        if (!isOpen) {
            setCreatedOrder(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchOrder = async () => {
            if (isOpen && initialOrderId) {
                try {
                    console.log('Fetching order for ActionPanel:', initialOrderId);
                    const response = await fetchApi(`/orders/${initialOrderId}`);
                    const orderData = response.data || response;
                    console.log('Order loaded:', orderData);
                    setCreatedOrder(orderData);

                    // Determine if we should open in Edit Mode
                    // Allow editing if not cancelled and not fully paid
                    // This is more permissive to allow adding items to processing/served orders (open tabs)
                    if (orderData.status !== 'cancelled' && orderData.paymentStatus !== 'paid') {
                        console.log('Enabling Edit Mode for order:', orderData._id);
                        setIsEditing(true);
                    } else {
                        console.log('Order read-only:', orderData._id);
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

    useEffect(() => {
        if (!initialOrderId) {
            setCreatedOrder(null);
        }
    }, [activeAction, initialOrderId]);

    // Extract customer info from conversation
    const customerInfo = activeConversation ? {
        customerId: activeConversation.customerId,
        name: activeConversation.customerName || activeConversation.customerPhoneNumber,
        phone: activeConversation.customerPhoneNumber,
    } : null;

    const handleOrderCreated = (order, autoWizard = true) => {
        console.log('Order created:', order);
        setCreatedOrder(order);
        setIsEditing(false); // Exit edit mode to show success screen background

        if (autoWizard) {
            setIsProcessingDrawerOpen(true); // Auto-open wizard ONLY if requested
        }

        toast.success("Orden creada exitosamente.");
    };

    const handleNewOrderClick = () => {
        setCreatedOrder(null);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            {/* Hide the ActionPanel content visually when Wizard is open to prevent overlapping drawers */}
            <SheetContent side="right" className={`w-[90vw] sm:max-w-none p-0 flex flex-col pt-10 ${isProcessingDrawerOpen ? 'invisible border-none shadow-none pointer-events-none' : ''}`}>
                <SheetHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {activeAction === 'order' && <ShoppingBag className="h-5 w-5" />}
                            {activeAction === 'reservation' && <Calendar className="h-5 w-5" />}
                            <SheetTitle>
                                {createdOrder ? `Orden #${createdOrder.orderNumber}` : (activeAction === 'order' ? 'Nueva Orden' : 'Nueva Reserva')}
                            </SheetTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {createdOrder && (
                                <Button variant="ghost" size="sm" onClick={handleNewOrderClick}>
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Nueva
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* Tabs / Switcher (Only show if no order created) */}
                    {!createdOrder && (
                        <div className="flex border rounded-md p-1 gap-1 mt-2">
                            <Button
                                variant={activeAction === 'order' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onActionChange('order')}
                            >
                                <ShoppingBag className="mr-2 h-4 w-4" />
                                Orden
                            </Button>
                            <Button
                                variant={activeAction === 'reservation' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onActionChange('reservation')}
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                Reserva
                            </Button>
                        </div>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                    {createdOrder && !isEditing && activeAction === 'order' ? (
                        <div className="flex flex-col items-center justify-center p-8 space-y-6 animate-in fade-in duration-300">
                            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold">¡Orden Creada!</h3>
                                <p className="text-muted-foreground">
                                    La orden #{createdOrder.orderNumber} ha sido generada correctamente.
                                </p>
                                <div className="text-lg font-semibold mt-2">
                                    Total: ${createdOrder.totalAmount?.toFixed(2)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 w-full max-w-sm gap-4 pt-4">
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
                        <>
                            {activeAction === 'order' && (
                                <NewOrderFormV2
                                    isEmbedded={true}
                                    initialCustomer={customerInfo}
                                    onOrderCreated={handleOrderCreated}
                                    initialTableId={initialTableId}
                                    existingOrder={isEditing ? createdOrder : null}
                                    onOrderUpdated={(updatedOrder) => {
                                        setCreatedOrder(updatedOrder);
                                        if (updatedOrder.paymentStatus === 'paid') {
                                            setIsEditing(false);
                                        }
                                        toast.success("Orden actualizada");
                                    }}
                                />
                            )}

                            {activeAction === 'reservation' && (
                                <ReservationForm
                                    isEmbedded={true}
                                    initialCustomer={customerInfo}
                                    onClose={(shouldRefresh) => {
                                        if (shouldRefresh) {
                                            // Handle refresh if needed
                                        }
                                        onClose();
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Order Processing Drawer */}
                {isProcessingDrawerOpen && createdOrder && (
                    <OrderProcessingDrawer
                        isOpen={isProcessingDrawerOpen}
                        onClose={() => {
                            setIsProcessingDrawerOpen(false);
                            // Also close the parent ActionPanel when wizard is closed to complete the flow
                            onClose();
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
            </SheetContent>
        </Sheet>
    );
};
