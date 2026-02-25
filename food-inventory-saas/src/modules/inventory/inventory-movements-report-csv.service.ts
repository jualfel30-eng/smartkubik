import { Injectable, Logger } from "@nestjs/common";

/**
 * Generates CSV exports for inventory movements.
 *
 * Purpose: Tabular CSV export of filtered movements for spreadsheet analysis.
 * Depends on: None (pure data transformation)
 * Used by: InventoryMovementsController.exportMovements
 */
@Injectable()
export class InventoryMovementsReportCsvService {
    private readonly logger = new Logger(
        InventoryMovementsReportCsvService.name,
    );

    /**
     * Generates a CSV string from an array of movement documents.
     *
     * @param movements - Array of movement documents (lean objects)
     * @param filters   - Applied filters for report header comment
     * @returns UTF-8 CSV string with BOM for Excel compatibility
     */
    generateReport(
        movements: any[],
        filters: {
            dateFrom?: string;
            dateTo?: string;
            movementType?: string;
        },
    ): string {
        const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility

        // Header row
        const headers = [
            "Fecha",
            "Tipo",
            "SKU",
            "Producto",
            "Cantidad",
            "Costo Unitario",
            "Costo Total",
            "Razón",
            "Referencia",
            "Notas",
            "Almacén",
        ];

        // Data rows
        const rows = movements.map((m) => {
            const productName =
                typeof m.productId === "object" && m.productId?.name
                    ? m.productId.name
                    : m.productSku || "N/A";

            return [
                new Date(m.createdAt).toLocaleString("es-VE"),
                this.getMovementTypeLabel(m.movementType),
                m.productSku || "N/A",
                productName,
                (m.quantity || 0).toString(),
                (m.unitCost || 0).toFixed(2),
                (m.totalCost || 0).toFixed(2),
                m.reason || "",
                m.reference || "",
                m.notes || "",
                m.warehouseId?.name || m.warehouseId || "",
            ];
        });

        // Build CSV
        const csvLines: string[] = [];
        csvLines.push(headers.map((h) => this.escapeCsv(h)).join(","));

        for (const row of rows) {
            csvLines.push(row.map((cell) => this.escapeCsv(cell)).join(","));
        }

        // Add totals
        let totalEntries = 0;
        let totalExits = 0;
        let totalEntryCost = 0;
        let totalExitCost = 0;

        movements.forEach((m) => {
            if (m.movementType === "IN" || m.movementType === "TRANSFER") {
                totalEntries += m.quantity || 0;
                totalEntryCost += m.totalCost || 0;
            }
            if (m.movementType === "OUT") {
                totalExits += m.quantity || 0;
                totalExitCost += m.totalCost || 0;
            }
            if (m.movementType === "ADJUSTMENT") {
                if ((m.quantity || 0) > 0) {
                    totalEntries += m.quantity || 0;
                    totalEntryCost += m.totalCost || 0;
                } else {
                    totalExits += Math.abs(m.quantity || 0);
                    totalExitCost += Math.abs(m.totalCost || 0);
                }
            }
        });

        csvLines.push(""); // Empty line before totals
        csvLines.push(
            `,,,,Total Entradas:,${totalEntries},${totalEntryCost.toFixed(2)},,,,`,
        );
        csvLines.push(
            `,,,,Total Salidas:,${totalExits},${totalExitCost.toFixed(2)},,,,`,
        );
        csvLines.push(
            `,,,,Movimiento Neto:,${totalEntries - totalExits},${(totalEntryCost - totalExitCost).toFixed(2)},,,,`,
        );

        return BOM + csvLines.join("\n");
    }

    /**
     * Escapes a value for safe CSV output.
     * Wraps the value in quotes if it contains commas, quotes, or newlines.
     * Follows the same pattern as ReportsService.escapeCsv().
     */
    private escapeCsv(value: string): string {
        if (value == null) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    /**
     * Maps movement type codes to human-readable Spanish labels.
     */
    private getMovementTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            IN: "Entrada",
            OUT: "Salida",
            ADJUSTMENT: "Ajuste",
            TRANSFER: "Transferencia",
        };
        return labels[type] || type;
    }
}
