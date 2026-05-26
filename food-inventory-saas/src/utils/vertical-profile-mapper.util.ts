/**
 * Mapea el vertical y businessType a la clave correcta de verticalProfile
 *
 * Este helper resuelve el problema donde diferentes businessTypes dentro
 * del mismo vertical necesitan diferentes perfiles (ej: RETAIL puede ser
 * retail-fashion, retail-tech, retail-hardware, etc.)
 */

export type VerticalProfileKey =
  | "food-service"
  | "grocery"
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
    // Barbería / Peluquería / Salón de Belleza / Nail Studio
    if (
      businessTypeLower.includes("barber") ||
      businessTypeLower.includes("peluquer") ||
      businessTypeLower.includes("salón de belleza") ||
      businessTypeLower.includes("salon de belleza") ||
      businessTypeLower.includes("beauty") ||
      businessTypeLower.includes("nail") ||
      businessTypeLower.includes("estilis") ||
      businessTypeLower.includes("hair") ||
      businessTypeLower.includes("belleza") ||
      businessTypeLower.includes("uñas")
    ) {
      return "barbershop-salon";
    }

    // Taller Mecánico
    if (
      businessTypeLower.includes("taller") ||
      businessTypeLower.includes("mecánic") ||
      businessTypeLower.includes("mecanico") ||
      businessTypeLower.includes("automotriz") ||
      businessTypeLower.includes("reparaci")
    ) {
      return "mechanic-shop";
    }

    // Clínica / Spa / Centro Estético
    if (
      businessTypeLower.includes("clínica") ||
      businessTypeLower.includes("clinica") ||
      businessTypeLower.includes("spa") ||
      businessTypeLower.includes("estétic") ||
      businessTypeLower.includes("estetica") ||
      businessTypeLower.includes("fisioterapi") ||
      businessTypeLower.includes("odontolog") ||
      businessTypeLower.includes("médic") ||
      businessTypeLower.includes("medico") ||
      businessTypeLower.includes("consultorio")
    ) {
      return "clinic-spa";
    }

    // Hotelería
    if (
      businessTypeLower.includes("hotel") ||
      businessTypeLower.includes("hotelería") ||
      businessTypeLower.includes("hospitality")
    ) {
      return "hospitality";
    }

    // Por defecto, servicios usa hospitality (backward compatible)
    return "hospitality";
  }

  // MANUFACTURING vertical
  if (verticalUpper === "MANUFACTURING") {
    return "manufacturing";
  }

  // RETAIL vertical - necesita mapeo específico por businessType
  if (verticalUpper === "RETAIL") {
    // Autopartes / Repuestos
    if (
      businessTypeLower.includes("autopart") ||
      businessTypeLower.includes("autoparte") ||
      businessTypeLower.includes("repuesto") ||
      businessTypeLower.includes("auto part")
    ) {
      return "auto-parts";
    }

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

    // Supermercados / Abastos / Abarrotes / Distribuidores de alimentos
    if (
      businessTypeLower.includes("supermercado") ||
      businessTypeLower.includes("abasto") ||
      businessTypeLower.includes("abarrote") ||
      businessTypeLower.includes("aliment") ||
      businessTypeLower.includes("grocery") ||
      businessTypeLower.includes("mayorista") ||
      businessTypeLower.includes("distribuidor") ||
      businessTypeLower.includes("bodega") ||
      businessTypeLower.includes("minimarket") ||
      businessTypeLower.includes("mini market") ||
      businessTypeLower === "retail"
    ) {
      return "grocery";
    }

    // Por defecto, RETAIL sin especificar va a grocery
    // (comercio genérico de alimentos — el caso más común)
    return "grocery";
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
    "grocery",
    "retail-fashion",
    "retail-footwear",
    "retail-hardware",
    "retail-tech",
    "retail-toys",
    "auto-parts",
    "mechanic-shop",
    "barbershop-salon",
    "clinic-spa",
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
    "food-service": "Restaurante / Servicio de comida",
    grocery: "Supermercados / Abastos / Abarrotes",
    "retail-fashion": "Retail - Moda y Ropa",
    "retail-footwear": "Retail - Calzado",
    "retail-hardware": "Retail - Ferretería",
    "retail-tech": "Retail - Tecnología",
    "retail-toys": "Retail - Juguetería",
    "auto-parts": "Retail - Autopartes",
    "mechanic-shop": "Taller Mecánico",
    "barbershop-salon": "Barbería / Peluquería / Salón",
    "clinic-spa": "Clínica / Spa / Centro Estético",
    manufacturing: "Manufactura",
    hospitality: "Hospitalidad / Hotelería",
  };
  return labels[key] || key;
}
