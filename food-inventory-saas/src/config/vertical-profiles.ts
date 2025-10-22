/*
 * Definición de perfiles verticales.
 * Utilizado por distintos módulos para adaptar validaciones,
 * formularios y lógica de negocio según el tipo de tenant.
 */

export const DEFAULT_VERTICAL_KEY = "food-service" as const;

export type VerticalKey =
  | "food-service"
  | "retail-fashion"
  | "retail-footwear"
  | "retail-hardware"
  | "retail-tech"
  | "retail-toys";

export interface AttributeDescriptor {
  key: string;
  label: string;
  type: "string" | "number" | "enum" | "dimension" | "range" | "boolean";
  required?: boolean;
  options?: string[];
  scope: "product" | "variant" | "inventory" | "order";
  ui?: {
    widget?: "text" | "textarea" | "select" | "chip" | "number" | "dimension";
    helperText?: string;
  };
}

export interface InventoryDescriptor {
  supportsLots: boolean;
  supportsAttributeMatrix: boolean;
  requiresSerialTracking: boolean;
  alerts?: Array<"lowStock" | "nearExpiration" | "warranty" | "ageRange">;
}

export interface OrderLineDescriptor {
  requireAttributesOnAdd?: boolean;
  allowCustomPrice?: boolean;
  notesPlaceholder?: string;
}

export interface VerticalProfile {
  key: VerticalKey;
  label: string;
  baseVertical: "FOOD_SERVICE" | "RETAIL" | "SERVICES" | "LOGISTICS";

  allowsWeight: boolean;
  hasSizeMatrix: boolean;
  requiresSerial: boolean;
  supportsVariants: boolean;

  defaultUnits: string[];
  attributeSchema: AttributeDescriptor[];
  inventory: InventoryDescriptor;
  orderLine: OrderLineDescriptor;
}

export const verticalProfiles: Record<VerticalKey, VerticalProfile> = {
  "food-service": {
    key: "food-service",
    label: "Alimentación",
    baseVertical: "FOOD_SERVICE",
    allowsWeight: true,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["kg", "g", "unidad"],
    attributeSchema: [
      {
        key: "origin",
        label: "Origen",
        type: "string",
        scope: "product",
      },
      {
        key: "storageCondition",
        label: "Condición de almacenamiento",
        type: "enum",
        options: ["ambiente", "refrigerado", "congelado"],
        scope: "product",
      },
    ],
    inventory: {
      supportsLots: true,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: ["lowStock", "nearExpiration"],
    },
    orderLine: {
      requireAttributesOnAdd: false,
      allowCustomPrice: true,
      notesPlaceholder: "Notas para preparación o entrega",
    },
  },
  "retail-fashion": {
    key: "retail-fashion",
    label: "Moda / Ropa",
    baseVertical: "RETAIL",
    allowsWeight: false,
    hasSizeMatrix: true,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["unidad"],
    attributeSchema: [
      { key: "size", label: "Talla", type: "enum", options: [], scope: "variant", required: true, ui: { widget: "chip" } },
      { key: "color", label: "Color", type: "string", scope: "variant", ui: { widget: "chip" } },
      { key: "gender", label: "Género", type: "enum", options: ["F", "M", "Unisex"], scope: "product" },
      { key: "season", label: "Temporada", type: "string", scope: "product" },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: true,
      requiresSerialTracking: false,
      alerts: ["lowStock"],
    },
    orderLine: {
      requireAttributesOnAdd: true,
      notesPlaceholder: "Instrucciones de empaque o personalización",
    },
  },
  "retail-footwear": {
    key: "retail-footwear",
    label: "Calzado",
    baseVertical: "RETAIL",
    allowsWeight: false,
    hasSizeMatrix: true,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["par"],
    attributeSchema: [
      { key: "size", label: "Talla", type: "enum", options: [], scope: "variant", required: true },
      { key: "width", label: "Ancho", type: "enum", options: ["Normal", "Ancho"], scope: "variant" },
      { key: "material", label: "Material", type: "string", scope: "product" },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: true,
      requiresSerialTracking: false,
      alerts: ["lowStock"],
    },
    orderLine: {
      requireAttributesOnAdd: true,
    },
  },
  "retail-hardware": {
    key: "retail-hardware",
    label: "Ferretería",
    baseVertical: "RETAIL",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["unidad", "pack"],
    attributeSchema: [
      { key: "dimensions", label: "Dimensiones", type: "dimension", scope: "product" },
      { key: "gauge", label: "Calibre", type: "string", scope: "variant" },
      { key: "compatibility", label: "Compatibilidad", type: "string", scope: "product", ui: { widget: "textarea" } },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: ["lowStock"],
    },
    orderLine: {
      requireAttributesOnAdd: false,
    },
  },
  "retail-tech": {
    key: "retail-tech",
    label: "Tecnología",
    baseVertical: "RETAIL",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: true,
    supportsVariants: true,
    defaultUnits: ["unidad"],
    attributeSchema: [
      { key: "serial", label: "Serial", type: "string", scope: "inventory", required: true },
      { key: "manufacturerSku", label: "SKU Fabricante", type: "string", scope: "product" },
      { key: "warranty", label: "Garantía (meses)", type: "number", scope: "product" },
      { key: "specs", label: "Especificaciones", type: "string", scope: "product", ui: { widget: "textarea" } },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: true,
      alerts: ["lowStock", "warranty"],
    },
    orderLine: {
      requireAttributesOnAdd: true,
      notesPlaceholder: "Registrar notas sobre activación o configuración",
    },
  },
  "retail-toys": {
    key: "retail-toys",
    label: "Juguetería",
    baseVertical: "RETAIL",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["unidad"],
    attributeSchema: [
      { key: "ageRange", label: "Rango de edad", type: "range", scope: "product", required: true },
      { key: "license", label: "Licencia/Franquicia", type: "string", scope: "product" },
      { key: "batteryType", label: "Tipo de batería", type: "enum", options: ["AA", "AAA", "Recargable", "No requiere"], scope: "product" },
      { key: "safetyNotes", label: "Advertencias de seguridad", type: "string", scope: "product", ui: { widget: "textarea" } },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: ["lowStock", "ageRange"],
    },
    orderLine: {
      requireAttributesOnAdd: false,
      notesPlaceholder: "Notas para envoltura o armado",
    },
  },
};

// Placeholder export para validar en tests si es necesario durante Fase 0
export const verticalProfileKeys = Object.keys(verticalProfiles) as VerticalKey[];

const cloneProfile = (profile: VerticalProfile): VerticalProfile => ({
  ...profile,
  defaultUnits: [...profile.defaultUnits],
  attributeSchema: [...profile.attributeSchema],
  inventory: { ...profile.inventory },
  orderLine: { ...profile.orderLine },
});

const mergeProfile = (
  base: VerticalProfile,
  overrides?: Record<string, any>,
): VerticalProfile => {
  const baseClone = cloneProfile(base);
  if (!overrides || typeof overrides !== "object") {
    return baseClone;
  }

  const merged: VerticalProfile = {
    ...baseClone,
    ...overrides,
    key: base.key,
    label: base.label,
    baseVertical: base.baseVertical,
    defaultUnits: Array.isArray(overrides.defaultUnits)
      ? [...overrides.defaultUnits]
      : baseClone.defaultUnits,
    attributeSchema: Array.isArray(overrides.attributeSchema)
      ? [...overrides.attributeSchema]
      : baseClone.attributeSchema,
    inventory: {
      ...baseClone.inventory,
      ...(overrides.inventory || {}),
    },
    orderLine: {
      ...baseClone.orderLine,
      ...(overrides.orderLine || {}),
    },
  };

  return merged;
};

export const getVerticalProfile = (
  key?: VerticalKey | string,
  overrides?: Record<string, any>,
): VerticalProfile => {
  const resolvedKey = (key as VerticalKey) || DEFAULT_VERTICAL_KEY;
  const baseProfile =
    verticalProfiles[resolvedKey] ?? verticalProfiles[DEFAULT_VERTICAL_KEY];
  return mergeProfile(baseProfile, overrides);
};

export const listVerticalProfiles = (): VerticalProfile[] =>
  Object.values(verticalProfiles).map((profile) => cloneProfile(profile));
