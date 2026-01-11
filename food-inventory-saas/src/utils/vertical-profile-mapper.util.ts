/**
 * Mapea el vertical y businessType a la clave correcta de verticalProfile
 *
 * Este helper resuelve el problema donde diferentes businessTypes dentro
 * del mismo vertical necesitan diferentes perfiles (ej: RETAIL puede ser
 * retail-fashion, retail-tech, retail-hardware, etc.)
 */

export type VerticalProfileKey =
  | "food-service"
  | "retail-fashion"
  | "retail-footwear"
  | "retail-hardware"
  | "retail-tech"
  | "retail-toys"
  | "manufacturing"
  | "hospitality";

/**
 * Mapea el vertical + businessType al verticalProfile.key correcto
 */
export function getVerticalProfileKey(
  vertical: string,
  businessType: string,
): VerticalProfileKey {
  const verticalUpper = vertical?.toUpperCase() || "FOOD_SERVICE";
  const businessTypeLower = businessType?.toLowerCase() || "";

  // SERVICES vertical
  if (verticalUpper === "SERVICES") {
    if (
      businessTypeLower.includes("hotel") ||
      businessTypeLower.includes("hotelería") ||
      businessTypeLower.includes("hospitality")
    ) {
      return "hospitality";
    }
    // Por defecto, servicios usa hospitality
    return "hospitality";
  }

  // MANUFACTURING vertical
  if (verticalUpper === "MANUFACTURING") {
    return "manufacturing";
  }

  // RETAIL vertical - necesita mapeo específico por businessType
  if (verticalUpper === "RETAIL") {
    // Moda / Ropa
    if (
      businessTypeLower.includes("moda") ||
      businessTypeLower.includes("ropa") ||
      businessTypeLower.includes("fashion") ||
      businessTypeLower.includes("clothing") ||
      businessTypeLower.includes("apparel")
    ) {
      return "retail-fashion";
    }

    // Calzado
    if (
      businessTypeLower.includes("calzado") ||
      businessTypeLower.includes("zapato") ||
      businessTypeLower.includes("footwear") ||
      businessTypeLower.includes("shoes")
    ) {
      return "retail-footwear";
    }

    // Ferretería
    if (
      businessTypeLower.includes("ferretería") ||
      businessTypeLower.includes("ferreteria") ||
      businessTypeLower.includes("hardware") ||
      businessTypeLower.includes("herramienta")
    ) {
      return "retail-hardware";
    }

    // Tecnología
    if (
      businessTypeLower.includes("tecnología") ||
      businessTypeLower.includes("tecnologia") ||
      businessTypeLower.includes("tech") ||
      businessTypeLower.includes("electronic") ||
      businessTypeLower.includes("electrónica")
    ) {
      return "retail-tech";
    }

    // Juguetería
    if (
      businessTypeLower.includes("juguete") ||
      businessTypeLower.includes("toy") ||
      businessTypeLower.includes("juguetería")
    ) {
      return "retail-toys";
    }

    // Por defecto, RETAIL sin especificar usa food-service
    // (esto maneja casos de retail de alimentos)
    return "food-service";
  }

  // FOOD_SERVICE vertical (default)
  return "food-service";
}

/**
 * Valida que la clave del perfil vertical sea válida
 */
export function isValidVerticalProfileKey(
  key: string,
): key is VerticalProfileKey {
  const validKeys: VerticalProfileKey[] = [
    "food-service",
    "retail-fashion",
    "retail-footwear",
    "retail-hardware",
    "retail-tech",
    "retail-toys",
    "manufacturing",
    "hospitality",
  ];
  return validKeys.includes(key as VerticalProfileKey);
}

/**
 * Obtiene una descripción legible del perfil vertical
 */
export function getVerticalProfileLabel(key: VerticalProfileKey): string {
  const labels: Record<VerticalProfileKey, string> = {
    "food-service": "Alimentación / Restaurantes",
    "retail-fashion": "Retail - Moda y Ropa",
    "retail-footwear": "Retail - Calzado",
    "retail-hardware": "Retail - Ferretería",
    "retail-tech": "Retail - Tecnología",
    "retail-toys": "Retail - Juguetería",
    manufacturing: "Manufactura",
    hospitality: "Hospitalidad / Hotelería",
  };
  return labels[key] || key;
}
