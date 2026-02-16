/** Column mappings for Alegra ERP exports (popular in LatAm) */

export const alegraProductPreset: Record<string, string> = {
  "Referencia": "sku",
  "Nombre": "name",
  "Categoria": "category",
  "Precio de venta": "variantBasePrice",
  "Costo": "variantCostPrice",
  "Precio de venta 2": "variantWholesalePrice",
  "Unidad de medida": "variantUnit",
  "Impuesto": "taxCategory",
  "Descripcion": "description",
  "Marca": "brand",
  "Codigo de barras": "variantBarcode",
  "Inventario": "initialStock",
};

export const alegraCustomerPreset: Record<string, string> = {
  "Identificacion": "taxId",
  "Tipo de identificacion": "taxType",
  "Nombre o razon social": "name",
  "Correo electronico": "email",
  "Telefono": "phone",
  "Direccion": "address",
  "Ciudad": "city",
  "Departamento": "state",
  "Tipo de cliente": "customerType",
};

export const alegraSupplierPreset: Record<string, string> = {
  "Identificacion": "rif",
  "Nombre o razon social": "name",
  "Correo electronico": "contactEmail",
  "Telefono": "contactPhone",
  "Direccion": "address",
  "Ciudad": "city",
  "Departamento": "state",
  "Persona de contacto": "contactName",
};
