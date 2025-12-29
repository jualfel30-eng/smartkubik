import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Calendar, CheckCircle2, DollarSign, FileText, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewOrderFormV2 } from '@/components/orders/v2/NewOrderFormV2';
import ReservationForm from '@/components/ReservationForm';
import { PaymentDialogV2 } from '@/components/orders/v2/PaymentDialogV2';
import BillingDrawer from '@/components/billing/BillingDrawer';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toast } from 'sonner';

export const ActionPanel = ({
    isOpen,
    onClose,
    activeAction,
    onActionChange,
    activeConversation,
    tenant
}) => {
    const [createdOrder, setCreatedOrder] = useState(null);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showBillingDrawer, setShowBillingDrawer] = useState(false);
    const { rate: exchangeRate } = useExchangeRate();

    // Reset state when action changes or panel closes
    useEffect(() => {
        if (!isOpen) {
            setCreatedOrder(null);
        }
    }, [isOpen]);

    useEffect(() => {
        setCreatedOrder(null);
    }, [activeAction]);

    if (!isOpen) return null;

    // Extract customer info from conversation
    const customerInfo = activeConversation ? {
        customerId: activeConversation.customerId,
        name: activeConversation.customerName || activeConversation.customerPhoneNumber,
        phone: activeConversation.customerPhoneNumber,
        // Add other fields if available in conversation object
    } : null;

    const handleOrderCreated = (order) => {
        console.log('Order created:', order);
        setCreatedOrder(order);
        toast.success("Orden creada exitosamente. Ahora puedes registrar el pago.");
    };

    const handleNewOrderClick = () => {
        setCreatedOrder(null);
    };

    return (
        <div className="flex w-full flex-shrink-0 flex-col border-l border-border bg-card md:w-[600px] lg:w-[800px] transition-all duration-300 ease-in-out h-full shadow-xl z-30">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                    {activeAction === 'order' && <ShoppingBag className="h-5 w-5" />}
                    {activeAction === 'reservation' && <Calendar className="h-5 w-5" />}
                    <h2 className="text-lg font-semibold">
                        {createdOrder ? `Orden #${createdOrder.orderNumber}` : (activeAction === 'order' ? 'Nueva Orden' : 'Nueva Reserva')}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {createdOrder && (
                        <Button variant="ghost" size="sm" onClick={handleNewOrderClick}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Nueva
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Tabs / Switcher (Only show if no order created) */}
            {!createdOrder && (
                <div className="flex border-b border-border p-2 gap-2">
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {createdOrder && activeAction === 'order' ? (
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
                                onClick={() => setShowPaymentDialog(true)}
                            >
                                <DollarSign className="h-5 w-5" />
                                Registrar Pago
                            </Button>

                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full gap-2"
                                onClick={() => setShowBillingDrawer(true)}
                            >
                                <FileText className="h-5 w-5" />
                                Emitir Factura
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

            {/* Dialogs */}
            {showPaymentDialog && createdOrder && (
                <PaymentDialogV2
                    isOpen={showPaymentDialog}
                    onClose={() => setShowPaymentDialog(false)}
                    order={createdOrder}
                    exchangeRate={exchangeRate}
                    onPaymentSuccess={() => {
                        toast.success("Pago registrado correctamente");
                        setShowPaymentDialog(false);
                        // Optionally refresh the order data here if needed
                    }}
                />
            )}

            {showBillingDrawer && createdOrder && (
                <BillingDrawer
                    isOpen={showBillingDrawer}
                    onClose={() => setShowBillingDrawer(false)}
                    order={{
                        ...createdOrder,
                        customerPhone: createdOrder.customerPhone || activeConversation?.customerPhoneNumber
                    }}
                    onOrderUpdated={() => {
                        // Refresh if needed
                    }}
                />
            )}
        </div>
    );
};
