/**
 * @file ComprasManagement.jsx
 * Thin orchestrator that wires the useComprasData hook to the presentational
 * sub-components extracted under src/components/compras/.
 */
import PurchaseHistory from './PurchaseHistory.jsx';
import { ErrorState } from '@/components/ui/error-state';
import { useComprasData } from './compras/useComprasData';
import CompraCreateDialog from './compras/CompraCreateDialog.jsx';
import CompraNewProductDialog from './compras/CompraNewProductDialog.jsx';
import CompraVariantSelectionDialog from './compras/CompraVariantSelectionDialog.jsx';
import ComprasAlertCards from './compras/ComprasAlertCards.jsx';

export default function ComprasManagement() {
  const data = useComprasData();

  if (data.loading) return <div>Cargando...</div>;
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

        {/* Variant Selection Dialog (for multi-variant products) */}
        <CompraVariantSelectionDialog
          variantSelection={data.variantSelection}
          closeVariantSelection={data.closeVariantSelection}
          updateVariantSelectionRow={data.updateVariantSelectionRow}
          confirmVariantSelection={data.confirmVariantSelection}
        />
      </div>

      {/* Alert Cards */}
      <ComprasAlertCards
        lowStockProducts={data.lowStockProducts}
        expiringProducts={data.expiringProducts}
        handleCreatePoFromAlert={data.handleCreatePoFromAlert}
      />

      {/* Purchase History */}
      <div className="mt-6">
        <PurchaseHistory />
      </div>
    </div>
  );
}
