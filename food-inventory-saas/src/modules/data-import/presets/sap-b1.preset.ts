/** Column mappings for SAP Business One exports */

export const sapB1ProductPreset: Record<string, string> = {
  "ItemCode": "sku",
  "ItemName": "name",
  "ItemGroup": "category",
  "SalesUnitPrice": "variantBasePrice",
  "AvgCost": "variantCostPrice",
  "OnHand": "initialStock",
  "MinLevel": "minimumStock",
  "OrderPoint": "reorderPoint",
  "BarCode": "variantBarcode",
  "SalesUnit": "variantUnit",
  "Manufacturer": "brand",
  "TaxGroup": "taxCategory",
  "UserText": "description",
};

export const sapB1CustomerPreset: Record<string, string> = {
  "CardCode": "taxId",
  "CardName": "name",
  "CardType": "customerType",
  "E_Mail": "email",
  "Phone1": "phone",
  "Address": "address",
  "City": "city",
  "State": "state",
  "LicTradNum": "taxId",
  "Notes": "notes",
  "GroupName": "customerType",
};

export const sapB1SupplierPreset: Record<string, string> = {
  "CardCode": "rif",
  "CardName": "name",
  "E_Mail": "contactEmail",
  "Phone1": "contactPhone",
  "Address": "address",
  "City": "city",
  "State": "state",
  "LicTradNum": "rif",
  "CntctPrsn": "contactName",
  "PymntTerms": "paymentTerms",
};
