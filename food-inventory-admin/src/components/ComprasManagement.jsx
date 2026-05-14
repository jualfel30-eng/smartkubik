/**
 * @file ComprasManagement.jsx
 * Thin orchestrator that wires the useComprasData hook to the presentational
 * sub-components extracted under src/components/compras/.
 */
import { useState } from 'react';
import PurchaseHistory from './PurchaseHistory.jsx';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { Info } from 'lucide-react';
import { useComprasData } from './compras/useComprasData';
import CompraCreateDialog from './compras/CompraCreateDialog.jsx';
import CompraNewProductDialog from './compras/CompraNewProductDialog.jsx';
import ComprasAlertCards from './compras/ComprasAlertCards.jsx';
import RatingModal from './RatingModal.jsx';

export default function ComprasManagement() {
  const data = useComprasData();
  const [advancedMode, setAdvancedMode] = useState(() => {
    try { return localStorage.getItem('smartkubik_advanced_receive_mode') === 'true'; }
    catch { return false; }
  });

  const toggleAdvancedMode = (checked) => {
    setAdvancedMode(checked);
    try { localStorage.setItem('smartkubik_advanced_receive_mode', String(checked)); }
    catch { /* ignore */ }
  };

  if (data.loading) return (
    <div className="space-y-6 p-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48 rounded" />
        <Skeleton className="h-10 w-48 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-10 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
  if (data.error) return <ErrorState message={data.error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-start items-center gap-4">
        {/* "Anadir Inventario" — New Purchase Order Dialog */}
        <CompraCreateDialog
          isOpen={data.isNewPurchaseDialogOpen}
          onOpenChange={(isOpen) => {
            data.setIsNewPurchaseDialogOpen(isOpen);
            if (!isOpen) {
              data.setPo(data.initialPoState);
            }
          }}
          po={data.po}
          setPo={data.setPo}
          poLoading={data.poLoading}
          poTotals={data.poTotals}
          supplierNameInput={data.supplierNameInput}
          supplierRifInput={data.supplierRifInput}
          rifDropdownOpen={data.rifDropdownOpen}
          setRifDropdownOpen={data.setRifDropdownOpen}
          purchaseDateOpen={data.purchaseDateOpen}
          setPurchaseDateOpen={data.setPurchaseDateOpen}
          paymentDueDateOpen={data.paymentDueDateOpen}
          setPaymentDueDateOpen={data.setPaymentDueDateOpen}
          rifInputRef={data.rifInputRef}
          rifDropdownRef={data.rifDropdownRef}
          rifSuggestions={data.rifSuggestions}
          handleSupplierSelection={data.handleSupplierSelection}
          handleSupplierNameInputChange={data.handleSupplierNameInputChange}
          handleFieldChange={data.handleFieldChange}
          handleProductSelection={data.handleProductSelection}
          updateItemField={data.updateItemField}
          handleRemoveItemFromPo={data.handleRemoveItemFromPo}
          handlePoSubmit={data.handlePoSubmit}
          handleRifDropdownSelect={data.handleRifDropdownSelect}
          formatRifInput={data.formatRifInput}
          loadSupplierOptions={data.loadSupplierOptions}
          loadProductOptions={data.loadProductOptions}
          isScanning={data.isScanning}
          scanResult={data.scanResult}
          invoiceFileRef={data.invoiceFileRef}
          handleScanInvoice={data.handleScanInvoice}
          handleClearScan={data.handleClearScan}
          initialPoState={data.initialPoState}
          variantSelection={data.variantSelection}
          closeVariantSelection={data.closeVariantSelection}
          updateVariantSelectionRow={data.updateVariantSelectionRow}
          confirmVariantSelection={data.confirmVariantSelection}
        />

        {/* "Compra de Producto Nuevo" Dialog */}
        <CompraNewProductDialog
          isOpen={data.isNewProductDialogOpen}
          onOpenChange={data.setIsNewProductDialogOpen}
          newProduct={data.newProduct}
          setNewProduct={data.setNewProduct}
          selectedImageIndex={data.selectedImageIndex}
          setSelectedImageIndex={data.setSelectedImageIndex}
          additionalVariants={data.additionalVariants}
          newProductTotals={data.newProductTotals}
          handleDragStart={data.handleDragStart}
          handleDragOver={data.handleDragOver}
          handleDrop={data.handleDrop}
          addAdditionalVariant={data.addAdditionalVariant}
          removeAdditionalVariant={data.removeAdditionalVariant}
          updateAdditionalVariantField={data.updateAdditionalVariantField}
          handleSupplierSelectionForNewProduct={data.handleSupplierSelectionForNewProduct}
          handleAddProduct={data.handleAddProduct}
          handleImageUpload={data.handleImageUpload}
          handleRemoveImage={data.handleRemoveImage}
          formatRifInput={data.formatRifInput}
          supplierOptions={data.supplierOptions}
          isScanning={data.isScanning}
          scanResult={data.scanResult}
          invoiceFileRef2={data.invoiceFileRef2}
          handleScanInvoice={data.handleScanInvoice}
          handleClearScan={data.handleClearScan}
          getPlaceholder={data.getPlaceholder}
          unitOptions={data.unitOptions}
          supportsVariants={data.supportsVariants}
          allowsWeight={data.allowsWeight}
          isNonFoodRetailVertical={data.isNonFoodRetailVertical}
          ingredientLabel={data.ingredientLabel}
          variantSectionDescription={data.variantSectionDescription}
          showLotFields={data.showLotFields}
          showExpirationFields={data.showExpirationFields}
        />
      </div>

      {/* Alert Cards */}
      <ComprasAlertCards
        lowStockProducts={data.lowStockProducts}
        expiringProducts={data.expiringProducts}
        handleCreatePoFromAlert={data.handleCreatePoFromAlert}
        handleCreatePoFromAlertBatch={data.handleCreatePoFromAlertBatch}
      />

      {/* Receive workflow preference (subtle, contextual) */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              <p className="font-medium mb-1">Modo de recepcion</p>
              <p>
                <strong>Simple</strong> (recomendado para PYMES): al guardar la compra, abre directamente el dialogo para registrar la recepcion y calificar al proveedor.
              </p>
              <p className="mt-1">
                <strong>Avanzado</strong>: la recepcion se hace despues desde el Historial de Compras. Util cuando el departamento de almacen verifica la mercancia por separado.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Label htmlFor="advanced-receive-mode" className="cursor-pointer">
          Recepcion en paso separado
        </Label>
        <Switch
          id="advanced-receive-mode"
          checked={advancedMode}
          onCheckedChange={toggleAdvancedMode}
        />
      </div>

      {/* Purchase History */}
      <div className="mt-6">
        <PurchaseHistory />
      </div>

      {/* Auto-receive + rate dialog opened after a PO is created (simple mode) */}
      {data.poForReceiveRate && (
        <RatingModal
          isOpen={data.isReceiveRateOpen}
          onClose={data.handleSkipReceive}
          onSubmit={data.handleReceiveAndRate}
          purchaseOrder={data.poForReceiveRate}
          mode="post-creation"
        />
      )}
    </div>
  );
}
