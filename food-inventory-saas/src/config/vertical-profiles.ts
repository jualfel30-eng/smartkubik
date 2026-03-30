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
  | "retail-toys"
  | "auto-parts"
  | "mechanic-shop"
  | "barbershop-salon"
  | "clinic-spa"
  | "manufacturing"
  | "hospitality";

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
  baseVertical:
  | "FOOD_SERVICE"
  | "RETAIL"
  | "SERVICES"
  | "LOGISTICS"
  | "MANUFACTURING";

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
    defaultUnits: ["kg", "g", "unidad", "saco"],
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
      {
        key: "size",
        label: "Talla",
        type: "enum",
        options: [],
        scope: "variant",
        required: true,
        ui: { widget: "chip" },
      },
      {
        key: "color",
        label: "Color",
        type: "string",
        scope: "variant",
        ui: { widget: "chip" },
      },
      {
        key: "gender",
        label: "Género",
        type: "enum",
        options: ["F", "M", "Unisex"],
        scope: "product",
      },
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
      {
        key: "size",
        label: "Talla",
        type: "enum",
        options: [],
        scope: "variant",
        required: true,
      },
      {
        key: "width",
        label: "Ancho",
        type: "enum",
        options: ["Normal", "Ancho"],
        scope: "variant",
      },
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
      {
        key: "dimensions",
        label: "Dimensiones",
        type: "dimension",
        scope: "product",
      },
      { key: "gauge", label: "Calibre", type: "string", scope: "variant" },
      {
        key: "compatibility",
        label: "Compatibilidad",
        type: "string",
        scope: "product",
        ui: { widget: "textarea" },
      },
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
      {
        key: "serial",
        label: "Serial",
        type: "string",
        scope: "inventory",
        required: true,
      },
      {
        key: "manufacturerSku",
        label: "SKU Fabricante",
        type: "string",
        scope: "product",
      },
      {
        key: "warranty",
        label: "Garantía (meses)",
        type: "number",
        scope: "product",
      },
      {
        key: "specs",
        label: "Especificaciones",
        type: "string",
        scope: "product",
        ui: { widget: "textarea" },
      },
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
      {
        key: "ageRange",
        label: "Rango de edad",
        type: "range",
        scope: "product",
        required: true,
      },
      {
        key: "license",
        label: "Licencia/Franquicia",
        type: "string",
        scope: "product",
      },
      {
        key: "batteryType",
        label: "Tipo de batería",
        type: "enum",
        options: ["AA", "AAA", "Recargable", "No requiere"],
        scope: "product",
      },
      {
        key: "safetyNotes",
        label: "Advertencias de seguridad",
        type: "string",
        scope: "product",
        ui: { widget: "textarea" },
      },
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
  manufacturing: {
    key: "manufacturing",
    label: "Manufactura",
    baseVertical: "MANUFACTURING",
    allowsWeight: true,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["kg", "unidad", "litro", "batch", "m²", "m³", "saco"],
    attributeSchema: [
      {
        key: "productionBatch",
        label: "Lote de Producción",
        type: "string",
        scope: "inventory",
        required: true,
      },
      {
        key: "manufacturingDate",
        label: "Fecha de Fabricación",
        type: "string",
        scope: "inventory",
      },
      {
        key: "expirationDate",
        label: "Fecha de Vencimiento",
        type: "string",
        scope: "inventory",
      },
      {
        key: "certifications",
        label: "Certificaciones",
        type: "string",
        scope: "product",
        ui: { widget: "textarea", helperText: "ISO, FDA, INVIMA, etc." },
      },
      {
        key: "formula",
        label: "Fórmula/Composición",
        type: "string",
        scope: "product",
        ui: { widget: "textarea" },
      },
      {
        key: "productionTime",
        label: "Tiempo de Producción (horas)",
        type: "number",
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
      notesPlaceholder: "Especificaciones técnicas o requerimientos especiales",
    },
  },
  hospitality: {
    key: "hospitality",
    label: "Hospitality / Hotelería",
    baseVertical: "SERVICES",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["noche", "habitación", "servicio"],
    attributeSchema: [
      {
        key: "roomType",
        label: "Tipo de Habitación",
        type: "enum",
        options: ["Standard", "Deluxe", "Suite", "Presidential"],
        scope: "product",
      },
      {
        key: "maxOccupancy",
        label: "Ocupación Máxima",
        type: "number",
        scope: "product",
      },
      {
        key: "amenities",
        label: "Amenidades",
        type: "string",
        scope: "product",
        ui: { widget: "textarea" },
      },
      {
        key: "checkInTime",
        label: "Hora de Check-in",
        type: "string",
        scope: "product",
      },
      {
        key: "checkOutTime",
        label: "Hora de Check-out",
        type: "string",
        scope: "product",
      },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: [],
    },
    orderLine: {
      requireAttributesOnAdd: true,
      notesPlaceholder: "Notas de reserva (huespedes, peticiones especiales)",
      allowCustomPrice: true,
    },
  },

  // ── Niche Profiles ─────────────────────────────────────────

  "barbershop-salon": {
    key: "barbershop-salon",
    label: "Barbería / Peluquería / Salón de Belleza",
    baseVertical: "SERVICES",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: false,
    defaultUnits: ["servicio", "sesión"],
    attributeSchema: [
      {
        key: "duration",
        label: "Duración (minutos)",
        type: "number",
        scope: "product",
        required: true,
        ui: { helperText: "Duración estimada del servicio" },
      },
      {
        key: "serviceCategory",
        label: "Tipo de servicio",
        type: "enum",
        options: [
          "Corte",
          "Barba",
          "Coloración",
          "Tratamiento",
          "Alisado",
          "Manicure/Pedicure",
          "Maquillaje",
          "Combo",
        ],
        scope: "product",
      },
      {
        key: "requiredLevel",
        label: "Nivel requerido",
        type: "enum",
        options: ["Junior", "Senior", "Master"],
        scope: "product",
      },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: ["lowStock"],
    },
    orderLine: {
      requireAttributesOnAdd: false,
      allowCustomPrice: false,
      notesPlaceholder: "Preferencias del cliente o instrucciones especiales",
    },
  },

  "auto-parts": {
    key: "auto-parts",
    label: "Autopartes",
    baseVertical: "RETAIL",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: true,
    defaultUnits: ["unidad", "juego", "par", "kit"],
    attributeSchema: [
      {
        key: "brand",
        label: "Marca",
        type: "string",
        scope: "product",
        required: true,
      },
      {
        key: "partNumber",
        label: "Número de parte (OEM)",
        type: "string",
        scope: "product",
        ui: { helperText: "Referencia del fabricante original" },
      },
      {
        key: "compatibleVehicles",
        label: "Vehículos compatibles",
        type: "string",
        scope: "product",
        ui: {
          widget: "textarea",
          helperText: "Ej: Hilux 2015-2022, Corolla 2018-2024",
        },
      },
      {
        key: "condition",
        label: "Condición",
        type: "enum",
        options: ["Nuevo", "Usado", "Remanufacturado"],
        scope: "variant",
      },
      {
        key: "origin",
        label: "Origen",
        type: "enum",
        options: ["OEM (Original)", "Aftermarket (Genérico)", "Importado"],
        scope: "product",
      },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: ["lowStock"],
    },
    orderLine: {
      requireAttributesOnAdd: false,
      allowCustomPrice: true,
      notesPlaceholder: "Notas sobre compatibilidad o instalación",
    },
  },

  "mechanic-shop": {
    key: "mechanic-shop",
    label: "Taller Mecánico",
    baseVertical: "SERVICES",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: false,
    defaultUnits: ["servicio", "hora", "unidad"],
    attributeSchema: [
      {
        key: "serviceType",
        label: "Tipo de servicio",
        type: "enum",
        options: [
          "Mantenimiento",
          "Reparación",
          "Diagnóstico",
          "Instalación",
          "Latonería/Pintura",
        ],
        scope: "product",
      },
      {
        key: "estimatedTime",
        label: "Tiempo estimado (horas)",
        type: "number",
        scope: "product",
      },
      {
        key: "vehicleType",
        label: "Tipo de vehículo",
        type: "enum",
        options: ["Sedán", "SUV/Camioneta", "Camión", "Moto", "Universal"],
        scope: "product",
      },
      {
        key: "vehiclePlate",
        label: "Placa del vehículo",
        type: "string",
        scope: "order",
        ui: { helperText: "Ej: AB123CD" },
      },
      {
        key: "vehicleInfo",
        label: "Vehículo (Marca/Modelo/Año)",
        type: "string",
        scope: "order",
        ui: { helperText: "Ej: Toyota Hilux 2020" },
      },
    ],
    inventory: {
      supportsLots: false,
      supportsAttributeMatrix: false,
      requiresSerialTracking: false,
      alerts: ["lowStock"],
    },
    orderLine: {
      requireAttributesOnAdd: false,
      allowCustomPrice: true,
      notesPlaceholder: "Diagnóstico, observaciones o repuestos necesarios",
    },
  },

  "clinic-spa": {
    key: "clinic-spa",
    label: "Clínica / Spa / Centro Estético",
    baseVertical: "SERVICES",
    allowsWeight: false,
    hasSizeMatrix: false,
    requiresSerial: false,
    supportsVariants: false,
    defaultUnits: ["sesión", "consulta", "tratamiento"],
    attributeSchema: [
      {
        key: "duration",
        label: "Duración (minutos)",
        type: "number",
        scope: "product",
        required: true,
        ui: { helperText: "Duración estimada de la sesión" },
      },
      {
        key: "specialty",
        label: "Especialidad",
        type: "enum",
        options: [
          "Estética facial",
          "Corporal",
          "Depilación",
          "Masajes",
          "Medicina estética",
          "Odontología",
          "Fisioterapia",
        ],
        scope: "product",
      },
      {
        key: "requiresConsent",
        label: "Requiere consentimiento informado",
        type: "boolean",
        scope: "product",
      },
      {
        key: "contraindications",
        label: "Contraindicaciones",
        type: "string",
        scope: "product",
        ui: { widget: "textarea", helperText: "Embarazo, alergias, etc." },
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
      notesPlaceholder:
        "Notas clínicas, zona de tratamiento o indicaciones especiales",
    },
  },
};

// Placeholder export para validar en tests si es necesario durante Fase 0
export const verticalProfileKeys = Object.keys(
  verticalProfiles,
) as VerticalKey[];

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
