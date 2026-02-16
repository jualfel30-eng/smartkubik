/** Column mappings for QuickBooks exports */

export const quickbooksProductPreset: Record<string, string> = {
  "Item Name": "name",
  "Item Type": "productType",
  "SKU": "sku",
  "Description": "description",
  "Sales Price": "variantBasePrice",
  "Cost": "variantCostPrice",
  "Quantity On Hand": "initialStock",
  "Reorder Point": "reorderPoint",
  "Category": "category",
  "UOM": "variantUnit",
  "Barcode": "variantBarcode",
  "Brand": "brand",
};

export const quickbooksCustomerPreset: Record<string, string> = {
  "Customer": "name",
  "Company": "companyName",
  "Email": "email",
  "Phone": "phone",
  "Billing Address": "address",
  "City": "city",
  "State": "state",
  "Tax ID": "taxId",
  "Customer Type": "customerType",
  "Notes": "notes",
};

export const quickbooksSupplierPreset: Record<string, string> = {
  "Vendor": "name",
  "Company": "name",
  "Email": "contactEmail",
  "Phone": "contactPhone",
  "Address": "address",
  "City": "city",
  "State": "state",
  "Tax ID": "rif",
  "Contact": "contactName",
  "Terms": "paymentTerms",
};
