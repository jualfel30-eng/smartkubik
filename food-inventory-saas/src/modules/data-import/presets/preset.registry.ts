import { Injectable } from "@nestjs/common";
import {
  alegraProductPreset,
  alegraCustomerPreset,
  alegraSupplierPreset,
} from "./alegra.preset";
import {
  quickbooksProductPreset,
  quickbooksCustomerPreset,
  quickbooksSupplierPreset,
} from "./quickbooks.preset";
import {
  sapB1ProductPreset,
  sapB1CustomerPreset,
  sapB1SupplierPreset,
} from "./sap-b1.preset";
import {
  genericProductPreset,
  genericCustomerPreset,
  genericSupplierPreset,
  genericInventoryPreset,
} from "./excel-generico.preset";

export interface PresetInfo {
  key: string;
  name: string;
  description: string;
}

type PresetMap = Record<string, Record<string, Record<string, string>>>;

const PRESETS: PresetMap = {
  products: {
    alegra: alegraProductPreset,
    quickbooks: quickbooksProductPreset,
    sap_b1: sapB1ProductPreset,
    excel_generico: genericProductPreset,
  },
  customers: {
    alegra: alegraCustomerPreset,
    quickbooks: quickbooksCustomerPreset,
    sap_b1: sapB1CustomerPreset,
    excel_generico: genericCustomerPreset,
  },
  suppliers: {
    alegra: alegraSupplierPreset,
    quickbooks: quickbooksSupplierPreset,
    sap_b1: sapB1SupplierPreset,
    excel_generico: genericSupplierPreset,
  },
  inventory: {
    excel_generico: genericInventoryPreset,
  },
  categories: {
    // Categories are simple; no ERP-specific presets needed
  },
};

const PRESET_INFO: Record<string, PresetInfo> = {
  alegra: {
    key: "alegra",
    name: "Alegra",
    description: "Compatible con exportaciones de Alegra ERP",
  },
  quickbooks: {
    key: "quickbooks",
    name: "QuickBooks",
    description: "Compatible con exportaciones de QuickBooks Desktop/Online",
  },
  sap_b1: {
    key: "sap_b1",
    name: "SAP Business One",
    description: "Compatible con exportaciones de SAP Business One",
  },
  excel_generico: {
    key: "excel_generico",
    name: "Excel Genérico",
    description: "Encabezados estándar en español para archivos Excel genéricos",
  },
};

@Injectable()
export class PresetRegistry {
  getPreset(
    entityType: string,
    presetKey: string,
  ): Record<string, string> | undefined {
    return PRESETS[entityType]?.[presetKey];
  }

  getPresetsForEntity(entityType: string): PresetInfo[] {
    const entityPresets = PRESETS[entityType];
    if (!entityPresets) return [];

    return Object.keys(entityPresets).map(
      (key) => PRESET_INFO[key] || { key, name: key, description: "" },
    );
  }

  getAllPresets(): Record<string, PresetInfo[]> {
    const result: Record<string, PresetInfo[]> = {};
    for (const entityType of Object.keys(PRESETS)) {
      result[entityType] = this.getPresetsForEntity(entityType);
    }
    return result;
  }
}
