import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Package,
  CreditCard,
  FileText,
  CheckCheck,
  Truck,
  Store,
  Ship,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Printer,
  Mail,
  MessageCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api.js';
import { PaymentDialogV2 } from './v2/PaymentDialogV2';
import BillingDrawer from '../billing/BillingDrawer';
import { useAuth } from '@/hooks/use-auth.jsx';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const STEPS = [
  {
    id: 1,
    name: 'Resumen y Pago',
    description: 'Verificar orden y registrar el pago',
    icon: CreditCard, // Changed icon to represent the main action better
  },
  {
    id: 2,
    name: 'Emitir Factura',
    description: 'Generar documento fiscal',
    icon: FileText,
  },
  {
    id: 3,
    name: 'Confirmación',
    description: 'Finalizar y actualizar inventario',
    icon: CheckCheck,
  },
];

const FULFILLMENT_TYPES = [
  { id: 'store', label: 'Venta en Tienda', icon: Store, description: 'Cliente recoge en el momento' },
  { id: 'pickup', label: 'Retiro Programado', icon: Package, description: 'Cliente recoge después' },
  { id: 'delivery_local', label: 'Delivery Local', icon: Truck, description: 'Entrega en la ciudad' },
  { id: 'delivery_national', label: 'Envío Nacional', icon: Ship, description: 'Entrega nacional' },
];

export function OrderProcessingDrawer({ isOpen, onClose, order, onUpdate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState(order?.fulfillmentType || 'store');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderData, setOrderData] = useState(order);

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Billing drawer state
  const [showBillingDrawer, setShowBillingDrawer] = useState(false);

  // Document type pre-selection (delivery_note = sin IVA/IGTF)
  const [selectedDocumentType, setSelectedDocumentType] = useState('invoice');

  // Effective totals adjusted for document type (delivery_note removes IVA/IGTF)
  const effectiveTotals = React.useMemo(() => {
    if (!orderData) return { totalAmount: 0, ivaTotal: 0, igtfTotal: 0, totalAmountVes: 0 };
    if (selectedDocumentType === 'delivery_note') {
      const subtotal = orderData.subtotal || 0;
      const shipping = orderData.shippingCost || 0;
      const total = subtotal + shipping;
      const rate = orderData.totalAmount > 0 && orderData.totalAmountVes > 0
        ? orderData.totalAmountVes / orderData.totalAmount
        : 0;
      return {
        totalAmount: total,
        ivaTotal: 0,
        igtfTotal: 0,
        totalAmountVes: total * rate,
      };
    }
    return {
      totalAmount: orderData.totalAmount || 0,
      ivaTotal: orderData.ivaTotal || 0,
      igtfTotal: orderData.igtfTotal || 0,
      totalAmountVes: orderData.totalAmountVes || 0,
    };
  }, [orderData, selectedDocumentType]);

  // Refresh order data
  const refreshOrder = async () => {
    // Use orderData._id as fallback if prop is missing during closure
    const idToFetch = order?._id || orderData?._id;
    if (!idToFetch) return null;

    try {
      const response = await fetchApi(`/orders/${idToFetch}`);
      const updated = response.data || response;

      if (!updated || !updated._id) {
        // More descriptive error for debugging
        console.error('Invalid order data received:', updated);
        throw new Error("Received invalid order data");
      }
      // Create a completely new object to force React re-render
      setOrderData({ ...updated });
      if (onUpdate) onUpdate();
      return updated;
    } catch (error) {
      console.error('Error refreshing order:', error);
      // Do NOT set empty object if error occurs, keep previous data
      return null;
    }
  };

  // Initialize orderData only once when order ID changes
  useEffect(() => {
    if (order?._id) {
      setOrderData({ ...order });
      setFulfillmentType(order.fulfillmentType || 'store');
      determineInitialStep(order);
    }
  }, [order?._id]);

  // Update orderData when critical properties change, but protect local state from stale props
  useEffect(() => {
    if (order && orderData?._id === order._id) {
      // PROACTIVELY PREVENT REVERTING 'paid' STATUS TO 'pending'
      const isLocalPaid = orderData?.paymentStatus === 'paid';
      const isPropPending = order.paymentStatus === 'pending' || order.paymentStatus === 'partial';

      // PROACTIVELY PREVENT REVERTING 'billed' STATUS to 'unbilled'
      const isLocalBilled = orderData?.billingDocumentId && orderData?.billingDocumentType !== 'none';
      const isPropUnbilled = !order.billingDocumentId || order.billingDocumentType === 'none';

      if ((isLocalPaid && isPropPending) || (isLocalBilled && isPropUnbilled)) {
        console.log('OrderProcessingDrawer: Ignoring stale prop update', { local: orderData, prop: order });
        return;
      }

      // Only update if the relevant properties have actually changed
      if (orderData?.paymentStatus !== order.paymentStatus ||
        orderData?.billingDocumentId !== order.billingDocumentId ||
        orderData?.billingDocumentType !== order.billingDocumentType) {
        setOrderData({ ...order });
      }
    }
  }, [order?.paymentStatus, order?.billingDocumentId, order?.billingDocumentType]);


  const determineInitialStep = (ord) => {
    // Determine which step to start on based on order state
    if (!ord.fulfillmentType || ord.fulfillmentType === 'store' || ord.paymentStatus === 'pending' || ord.paymentStatus === 'partial') {
      setCurrentStep(1); // Review & Payment
    } else if (ord.paymentStatus === 'paid' && !ord.billingDocumentId) {
      setCurrentStep(2); // Paid but not invoiced
    } else if (ord.billingDocumentId && ord.billingDocumentType !== 'none') {
      setCurrentStep(3); // Invoiced, ready to confirm
    } else {
      setCurrentStep(1); // Default
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // Helper: check if effectively paid (delivery notes may show 'partial' in backend
  // because backend includes IVA in totalAmount, but the actual amount to pay is lower)
  const isEffectivelyPaid = React.useCallback((ord) => {
    if (!ord) return false;
    if (ord.paymentStatus === 'paid') return true;
    // For delivery notes: backend marks as 'partial' because paidAmount < totalAmount (with IVA)
    // but if paidAmount covers the effective total (without IVA/IGTF), it's effectively paid
    if (selectedDocumentType === 'delivery_note' && ord.paidAmount > 0) {
      return ord.paidAmount >= effectiveTotals.totalAmount - 0.01; // tolerance for float
    }
    return false;
  }, [selectedDocumentType, effectiveTotals.totalAmount]);

  // Recalculate these values whenever orderData changes
  const isPaid = React.useMemo(() => isEffectivelyPaid(orderData), [orderData, isEffectivelyPaid]);
  const isPartiallyPaid = React.useMemo(() => !isPaid && orderData?.paymentStatus === 'partial', [orderData?.paymentStatus, isPaid]);
  const hasInvoice = React.useMemo(() =>
    orderData?.billingDocumentId && orderData?.billingDocumentType !== 'none',
    [orderData?.billingDocumentId, orderData?.billingDocumentType]
  );
  const balance = React.useMemo(() =>
    (effectiveTotals.totalAmount || 0) - (orderData?.paidAmount || 0),
    [effectiveTotals.totalAmount, orderData?.paidAmount]
  );

  // Step validation - recalculates on every render to ensure button state is always current
  const canProceedToStep = (stepId) => {
    if (stepId === 1) return true;
    if (stepId === 2) {
      // PROCEED TO INVOICE: Needs fulfillment type selected AND fully paid
      // For delivery notes, isPaid uses effective total (without IVA/IGTF)
      return fulfillmentType !== null && isPaid;
    }
    if (stepId === 3) {
      // PROCEED TO CONFIRMATION: Needs invoice
      return orderData?.billingDocumentId && orderData?.billingDocumentType !== 'none';
    }
    return false;
  };

  const handleFulfillmentTypeChange = async (type) => {
    setFulfillmentType(type);
    try {
      await fetchApi(`/orders/${orderData._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fulfillmentType: type }),
      });
      await refreshOrder();
      toast.success('Tipo de entrega actualizado');
    } catch (error) {
      console.error('Error updating fulfillment type:', error);
      toast.error('Error al actualizar tipo de entrega');
    }
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePaymentSuccess = async (paymentResponseOrder) => {
    setShowPaymentDialog(false);
    toast.success('Pago registrado exitosamente');

    let updatedOrder = paymentResponseOrder;

    // Phase 1: Direct Update from Response (Fastest & Most Reliable)
    if (updatedOrder) {
      console.log('OrderProcessingDrawer: Used direct response order', updatedOrder);
      setOrderData({ ...updatedOrder });
    } else {
      // Phase 2: Fallback Retry Fetch (If no response passed)
      for (let i = 0; i < 3; i++) {
        updatedOrder = await refreshOrder();
        if (isEffectivelyPaid(updatedOrder)) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Force update parent
    if (onUpdate) await onUpdate();

    // Auto-advance — use isEffectivelyPaid to handle delivery notes
    // (backend may say 'partial' because IVA is still in totalAmount)
    if (isEffectivelyPaid(updatedOrder)) {
      setCurrentStep(2); // Auto-advance to Invoice step (Step 2)
    } else {
      if (!paymentResponseOrder) {
        toast.message('El estado del pago se está actualizando...');
      }
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      // Mark order as completed and update inventory
      await fetchApi(`/orders/${orderData._id}/complete`, {
        method: 'POST',
      });
      await refreshOrder();
      toast.success('Orden completada e inventario actualizado');
      onClose();
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Error al completar la orden', { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewInvoice = async (docId) => {
    if (!docId) return;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';
      // Retrieve token from local storage manually to ensure we have it for the fetch
      // even if useAuth hook isn't fully exposed in this scope context yet
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${baseUrl}/billing/documents/${docId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('Factura no encontrada (404)');
        if (response.status === 401) throw new Error('No autorizado (401)');
        throw new Error('Error al descargar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Setup cleanup
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al visualizar factura:', { description: error.message });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1SummaryAndPayment
          order={orderData}
          fulfillmentType={fulfillmentType}
          onFulfillmentTypeChange={handleFulfillmentTypeChange}
          isPaid={isPaid}
          isPartiallyPaid={isPartiallyPaid}
          balance={balance}
          onOpenPaymentDialog={() => setShowPaymentDialog(true)}
          selectedDocumentType={selectedDocumentType}
          onDocumentTypeChange={setSelectedDocumentType}
          effectiveTotals={effectiveTotals}
        />;
      case 2:
        return <Step3Billing
          order={orderData}
          hasInvoice={hasInvoice}
          onOpenBillingDrawer={() => setShowBillingDrawer(true)}
          onViewInvoice={handleViewInvoice}
        />;
      case 3:
        return <Step4Confirmation
          order={orderData}
          onComplete={handleComplete}
          isProcessing={isProcessing}
          onViewInvoice={handleViewInvoice}
        />;
      default:
        return null;
    }
  };

  if (!orderData) return null;

  return (
    <>
      {/* Payment Dialog */}
      {showPaymentDialog && (
        <PaymentDialogV2
          isOpen={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          order={orderData}
          onPaymentSuccess={handlePaymentSuccess}
          overrideTotalAmount={selectedDocumentType === 'delivery_note' ? effectiveTotals.totalAmount : undefined}
          overrideTotalAmountVes={selectedDocumentType === 'delivery_note' ? effectiveTotals.totalAmountVes : undefined}
          isDeliveryNote={selectedDocumentType === 'delivery_note'}
        />
      )}

      {/* Billing Drawer - Handles invoice delivery internally */}
      {showBillingDrawer && orderData?._id && (
        <BillingDrawer
          isOpen={showBillingDrawer}
          initialDocumentType={selectedDocumentType}
          onClose={async (createdInvoice) => {
            setShowBillingDrawer(false);

            // 1. Immediate override if we have the invoice object from the child
            if (createdInvoice?._id) {
              console.log('OrderProcessingDrawer: Direct update from created invoice', createdInvoice);

              // Force update local state immediately
              const orderWithInvoice = {
                ...orderData,
                billingDocumentId: createdInvoice._id,
                billingDocumentNumber: createdInvoice.documentNumber,
                billingDocumentType: createdInvoice.type,
              };
              setOrderData(orderWithInvoice);

              toast.success('Factura verificada. Avanzando...');
              setCurrentStep(3);
              return; // Skip the refresh check
            }

            // 2. Fallback: Database check (if no direct object passed or legacy flow)
            toast.info('Verificando emisión de factura...');

            // Delay to ensure DB propagation
            await new Promise(resolve => setTimeout(resolve, 800));

            const updated = await refreshOrder();
            console.log('OrderProcessingDrawer: Invoice check after close', updated);

            // If invoice was created, auto-advance to next step
            if (updated?.billingDocumentId && updated?.billingDocumentType !== 'none') {
              toast.success('Factura verificada. Avanzando...');
              setCurrentStep(3);
            } else {
              // Retry once more
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retry = await refreshOrder();
              if (retry?.billingDocumentId) {
                toast.success('Factura verificada. Avanzando...');
                setCurrentStep(3);
              }
            }
          }}
          order={orderData}
          onOrderUpdated={async () => {
            try {
              const updated = await fetchApi(`/orders/${orderData._id}`);
              setOrderData({ ...updated });
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error('Error refreshing order:', error);
            }
          }}
        />
      )}

      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-x-hidden">
          <div className="h-full overflow-y-auto px-8 py-6">
            <SheetHeader>
              <SheetTitle>Procesar Orden #{orderData.orderNumber}</SheetTitle>
              <SheetDescription>
                Cliente: <strong>{orderData.customerName}</strong>
              </SheetDescription>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline">{orderData.status}</Badge>
                <Badge>{orderData.paymentStatus}</Badge>
                {hasInvoice && <Badge variant="success">Facturado</Badge>}
              </div>
            </SheetHeader>

            {/* Progress Bar */}
            <div className="mt-6 mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Paso {currentStep} de {STEPS.length}: {STEPS[currentStep - 1].name}
              </p>
            </div>

            {/* Steps Navigation */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const isAccessible = canProceedToStep(step.id);

                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1">
                      <button
                        onClick={() => isAccessible && setCurrentStep(step.id)}
                        disabled={!isAccessible}
                        className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200
                        ${isActive ? 'bg-primary text-primary-foreground scale-110' : ''}
                        ${isCompleted ? 'bg-green-600 text-white' : ''}
                        ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                        ${isAccessible && !isActive ? 'hover:bg-primary/20 cursor-pointer' : ''}
                        ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </button>
                      <span className={`text-xs mt-1 text-center ${isActive ? 'font-semibold' : ''}`}>
                        {step.name.split(' ')[0]}
                      </span>
                      {index < STEPS.length - 1 && (
                        <div className="hidden sm:block absolute h-0.5 bg-muted w-full top-5 left-1/2 -z-10" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Step Content */}
            <div className="py-4">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <Button
                onClick={handleNextStep}
                disabled={!canProceedToStep(currentStep + 1) || currentStep === STEPS.length}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ==================== STEP COMPONENTS ====================

function Step1SummaryAndPayment({ order, fulfillmentType, onFulfillmentTypeChange, isPaid, isPartiallyPaid, balance, onOpenPaymentDialog, selectedDocumentType, onDocumentTypeChange, effectiveTotals }) {
  const isDeliveryNote = selectedDocumentType === 'delivery_note';

  // Use effective totals (adjusted for document type)
  const displayTotal = effectiveTotals?.totalAmount || order.totalAmount || 0;
  const displayIva = effectiveTotals?.ivaTotal ?? order.ivaTotal ?? 0;
  const displayIgtf = effectiveTotals?.igtfTotal ?? order.igtfTotal ?? 0;
  const displayTotalVes = effectiveTotals?.totalAmountVes || order.totalAmountVes || 0;
  const impliedRate = order.totalAmount > 0 && order.totalAmountVes > 0
    ? (order.totalAmountVes / order.totalAmount)
    : 0;

  return (
    <div className="space-y-6">
      {/* Document Type Selector */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Tipo de Documento Fiscal</Label>
        <Select value={selectedDocumentType} onValueChange={onDocumentTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invoice">Factura</SelectItem>
            <SelectItem value="delivery_note">Nota de Entrega</SelectItem>
          </SelectContent>
        </Select>
        {isDeliveryNote && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Nota de Entrega: No aplica IVA ni IGTF. El monto a cobrar se ajusta automáticamente.</span>
          </div>
        )}
      </div>

      {/* Products Section */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Productos</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[250px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[200px]">{item.productName}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delivery Type Section - Compact */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Tipo de Entrega</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FULFILLMENT_TYPES.map((type) => {
            const TypeIcon = type.icon;
            const isSelected = fulfillmentType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => onFulfillmentTypeChange(type.id)}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all h-20
                  ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-primary/50 text-muted-foreground'}
                `}
              >
                <TypeIcon className={`h-5 w-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium leading-tight">
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Totals Section */}
      <div className="bg-muted/30 p-4 rounded-lg border">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className={`text-muted-foreground ${isDeliveryNote ? 'line-through' : ''}`}>
              {isDeliveryNote ? 'IVA:' : 'IVA (16%):'}
            </span>
            <span className={isDeliveryNote ? 'line-through text-muted-foreground' : ''}>
              {formatCurrency(displayIva)}
            </span>
          </div>
          {(order.igtfTotal > 0 || displayIgtf > 0) && !isDeliveryNote && (
            <div className="flex justify-between text-orange-600">
              <span>IGTF (3%):</span>
              <span>{formatCurrency(displayIgtf)}</span>
            </div>
          )}
          {isDeliveryNote && order.igtfTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span className="line-through">IGTF (3%):</span>
              <span className="line-through">{formatCurrency(0)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Envío:</span>
            <span>{formatCurrency(order.shippingCost)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>Total:</span>
            <span>{formatCurrency(displayTotal)}</span>
          </div>

          {/* BCV Conversion Display */}
          {displayTotalVes > 0 && (
            <>
              {impliedRate > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Tasa BCV:</span>
                  <span>Bs. {impliedRate.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                <span>Total en Bs.:</span>
                <span>Bs. {displayTotalVes.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Pago</h3>
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Pendiente:</span>
            <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>

        {isPaid ? (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Orden Pagada</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mini Payment History (only if there are partial payments) */}
            {order.paymentRecords && order.paymentRecords.length > 0 && (
              <div className="space-y-1 mb-2">
                {order.paymentRecords.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-xs bg-muted/50 p-1.5 rounded">
                    <span>{p.method}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={onOpenPaymentDialog}
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isPartiallyPaid ? `Pagar Restante (${formatCurrency(balance)})` : 'Registrar Pago Completo'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}



function Step3Billing({ order, hasInvoice, onOpenBillingDrawer, onViewInvoice }) {
  return (
    <div className="space-y-6">
      {hasInvoice ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Factura Emitida</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-500 mb-2">
              Documento fiscal generado exitosamente.
            </p>
            <div className="text-sm">
              <p><strong>Tipo:</strong> {order.billingDocumentType === 'invoice' ? 'Factura' : 'Nota de Entrega'}</p>
              <p><strong>Número:</strong> {order.billingDocumentNumber}</p>
            </div>
          </div>

          <Button
            onClick={() => onViewInvoice(order.billingDocumentId)}
            variant="outline"
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Visualizar Factura Original
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">Emitir Documento Fiscal</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-500 mb-3">
              La orden está completamente pagada. Procede a emitir la factura o nota de entrega.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <h4 className="font-semibold mb-2">Información del Cliente</h4>
            <div className="text-sm space-y-1">
              <p><strong>Nombre:</strong> {order.customerName}</p>
              <p><strong>Email:</strong> {order.customerEmail || 'N/A'}</p>
              <p><strong>Teléfono:</strong> {order.customerPhone || 'N/A'}</p>
            </div>
          </div>

          <Button onClick={onOpenBillingDrawer} className="w-full" size="lg">
            <FileText className="h-4 w-4 mr-2" />
            Emitir Factura
          </Button>
        </div>
      )}
    </div>
  );
}

function Step4Confirmation({ order, onComplete, isProcessing, onViewInvoice }) {
  const handlePrint = () => {
    if (order.billingDocumentId) {
      onViewInvoice(order.billingDocumentId);
    }
  };

  const handleEmail = async () => {
    if (!order.billingDocumentId) return;
    toast.promise(
      fetchApi(`/billing/invoices/${order.billingDocumentId}/email`, { method: 'POST' }),
      {
        loading: 'Enviando correo...',
        success: 'Factura enviada por correo',
        error: 'Error al enviar correo'
      }
    );
  };

  const handleWhatsApp = () => {
    if (!order.billingDocumentId) return;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';
    // Note: This link might still require auth if opened in a browser that doesn't share session
    const pdfUrl = `${baseUrl}/billing/documents/${order.billingDocumentId}/pdf`;
    const message = `Hola ${order.customerName}, aquí tienes tu factura: ${pdfUrl}`;
    window.open(`https://wa.me/${order.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- Automation Logic ---
  const { tenant } = useAuth();
  const preferences = tenant?.settings?.billingPreferences || {
    defaultDeliveryMethod: 'none',
    autoPrintCopies: 1,
    enabledMethods: ['print', 'email', 'whatsapp']
  };

  React.useEffect(() => {
    if (!order.billingDocumentId) return;

    // Check if we should auto-trigger
    const { defaultDeliveryMethod } = preferences;

    if (defaultDeliveryMethod === 'print') {
      // Small delay to ensure UI is ready
      setTimeout(() => handlePrint(), 500);
      // Note: Auto-printing multiple copies would require backend support or a specialized print driver
    } else if (defaultDeliveryMethod === 'email' && order.customerEmail) {
      handleEmail(); // This shows a toast
    } else if (defaultDeliveryMethod === 'whatsapp' && order.customerPhone) {
      // We usually don't auto-open WhatsApp as it might be blocked by popup blockers or annoying
      // But if configured, we do it.
      setTimeout(() => handleWhatsApp(), 500);
    }
  }, [order.billingDocumentId]); // Run once when doc ID is confirmed

  const isMethodEnabled = (method) => {
    // If undefined (legacy tenants), default to true for all
    if (!preferences.enabledMethods) return true;
    return preferences.enabledMethods.includes(method);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
          <CheckCheck className="h-5 w-5" />
          <span className="font-semibold">Proceso Completado</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-500">
          Factura emitida exitosamente. Puedes compartirla ahora o finalizar la orden.
        </p>
      </div>

      {/* Invoice Actions Bar - UX Improvement */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {isMethodEnabled('print') && (
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-auto py-2 flex-col gap-1">
            <Printer className="h-5 w-5" />
            <span className="text-xs">Imprimir</span>
          </Button>
        )}
        {isMethodEnabled('email') && (
          <Button variant="outline" size="sm" onClick={handleEmail} disabled={!order.customerEmail} className="h-auto py-2 flex-col gap-1">
            <Mail className="h-5 w-5" />
            <span className="text-xs">Email</span>
          </Button>
        )}
        {isMethodEnabled('whatsapp') && (
          <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={!order.customerPhone} className="h-auto py-2 flex-col gap-1">
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs">WhatsApp</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-auto py-2 flex-col gap-1">
          <Download className="h-5 w-5" />
          <span className="text-xs">Descargar</span>
        </Button>

      </div>
      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Método de entrega seleccionado</span>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Pago registrado y validado</span>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Documento fiscal emitido</span>
        </div>
      </div>

      <Separator />

      <div className="p-4 rounded-lg bg-muted">
        <h4 className="font-semibold mb-2">Resumen de la Orden</h4>
        <div className="text-sm space-y-1">
          <p><strong>Número de Orden:</strong> {order.orderNumber}</p>
          <p><strong>Cliente:</strong> {order.customerName}</p>
          <p><strong>Tipo de Entrega:</strong> {FULFILLMENT_TYPES.find(t => t.id === order.fulfillmentType)?.label || order.fulfillmentType}</p>
          <p><strong>Monto Total:</strong> {formatCurrency(order.totalAmount)}</p>
          <p><strong>Factura:</strong> {order.billingDocumentNumber}</p>
        </div>
      </div>

      <Button
        onClick={onComplete}
        className="w-full"
        size="lg"
        disabled={isProcessing}
      >
        {isProcessing ? 'Procesando...' : 'Finalizar Orden y Actualizar Inventario'}
      </Button>
    </div>
  );
}
