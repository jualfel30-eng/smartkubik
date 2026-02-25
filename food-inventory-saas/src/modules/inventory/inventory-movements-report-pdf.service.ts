import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
    InventoryMovement,
    InventoryMovementDocument,
} from "../../schemas/inventory.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates PDF reports for bulk inventory movements.
 *
 * Purpose: Multi-movement PDF export with company branding, filters summary, and totals.
 * Depends on: jsPDF, jspdf-autotable, Tenant model, InventoryMovement model
 * Used by: InventoryMovementsController.exportMovements
 */
@Injectable()
export class InventoryMovementsReportPdfService {
    private readonly logger = new Logger(
        InventoryMovementsReportPdfService.name,
    );

    constructor(
        @InjectModel(Tenant.name)
        private readonly tenantModel: Model<TenantDocument>,
    ) { }

    /**
     * Generates a PDF report for multiple inventory movements.
     *
     * @param movements - Array of movement documents (lean objects)
     * @param tenantId  - Tenant ID to fetch company info/logo
     * @param filters   - Applied filters for report header
     * @returns Buffer containing the PDF
     */
    async generateReport(
        movements: InventoryMovementDocument[],
        tenantId: string,
        filters: {
            dateFrom?: string;
            dateTo?: string;
            movementType?: string;
            warehouseName?: string;
            productName?: string;
        },
    ): Promise<Buffer> {
        // Fetch tenant for logo and company info
        let tenant: TenantDocument | null = null;
        try {
            tenant = await this.tenantModel.findById(tenantId).lean();
        } catch (e) {
            this.logger.error(`Failed to fetch tenant ${tenantId}`, e);
        }

        // Fetch logo if available
        let logoData: string | null = null;
        let logoFormat = "PNG";

        if (tenant?.logo) {
            try {
                const response = await fetch(tenant.logo, { signal: AbortSignal.timeout(5000) });
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    logoData = buffer.toString("base64");
                    const contentType =
                        response.headers.get("content-type") || "image/png";
                    logoFormat =
                        contentType.includes("jpeg") || contentType.includes("jpg")
                            ? "JPEG"
                            : "PNG";
                }
            } catch (e) {
                this.logger.warn(
                    `Failed to fetch logo for tenant ${tenantId}: ${e.message}`,
                );
            }
        }

        return this.buildPdf(movements, tenant, logoData, logoFormat, filters);
    }

    /**
     * Builds the PDF document from movement data.
     */
    private buildPdf(
        movements: any[],
        tenant: any,
        logoData: string | null,
        logoFormat: string,
        filters: {
            dateFrom?: string;
            dateTo?: string;
            movementType?: string;
            warehouseName?: string;
            productName?: string;
        },
    ): Buffer {
        const pdf = new jsPDF({ orientation: "landscape" });
        let y = 20;

        // ── Logo ──
        if (logoData) {
            try {
                const props = (pdf as any).getImageProperties(logoData);
                const aspectRatio = props.width / props.height;
                let w = 25;
                let h = 25;
                if (aspectRatio > 1) {
                    h = 25 / aspectRatio;
                } else {
                    w = 25 * aspectRatio;
                }
                pdf.addImage(logoData, logoFormat, 14, 10, w, h);
                y = 10 + h + 5;
                if (y < 35) y = 35;
            } catch (e) {
                this.logger.warn("Failed to add logo to PDF", e);
            }
        }

        // ── Company header (right-aligned) ──
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(tenant?.name || "Empresa", 280, 18, { align: "right" });

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        if (tenant?.taxInfo?.businessName) {
            pdf.text(tenant.taxInfo.businessName, 280, 24, { align: "right" });
        }
        if (tenant?.taxInfo?.rif) {
            pdf.text(tenant.taxInfo.rif, 280, 29, { align: "right" });
        }

        // ── Document title ──
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("REPORTE DE MOVIMIENTOS DE INVENTARIO", 14, y);
        y += 7;

        // ── Filters summary ──
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");

        const filterParts: string[] = [];
        if (filters.dateFrom) {
            filterParts.push(
                `Desde: ${new Date(filters.dateFrom).toLocaleDateString("es-VE")}`,
            );
        }
        if (filters.dateTo) {
            filterParts.push(
                `Hasta: ${new Date(filters.dateTo).toLocaleDateString("es-VE")}`,
            );
        }
        if (filters.movementType) {
            filterParts.push(`Tipo: ${this.getMovementTypeLabel(filters.movementType)}`);
        }
        if (filters.warehouseName) {
            filterParts.push(`Almacén: ${filters.warehouseName}`);
        }
        if (filters.productName) {
            filterParts.push(`Producto: ${filters.productName}`);
        }

        if (filterParts.length > 0) {
            pdf.text(`Filtros: ${filterParts.join(" | ")}`, 14, y);
            y += 5;
        }

        pdf.text(
            `Total de movimientos: ${movements.length}`,
            14,
            y,
        );
        y += 8;

        // ── Calculate totals ──
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

        // ── Movement table ──
        const tableHeaders = [
            [
                "Fecha",
                "Tipo",
                "SKU",
                "Producto",
                "Cantidad",
                "Costo Unit.",
                "Costo Total",
                "Razón",
                "Referencia",
            ],
        ];

        const tableRows = movements.map((m) => {
            const productName =
                typeof m.productId === "object" && m.productId?.name
                    ? m.productId.name
                    : m.productSku || "N/A";
            return [
                new Date(m.createdAt).toLocaleDateString("es-VE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                this.getMovementTypeLabel(m.movementType),
                m.productSku || "N/A",
                productName,
                (m.quantity || 0).toString(),
                `$${(m.unitCost || 0).toFixed(2)}`,
                `$${(m.totalCost || 0).toFixed(2)}`,
                (m.reason || "").substring(0, 30),
                (m.reference || "").substring(0, 20),
            ];
        });

        autoTable(pdf, {
            startY: y,
            head: tableHeaders,
            body: tableRows,
            theme: "striped",
            headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 32 }, // Fecha
                1: { cellWidth: 25 }, // Tipo
                2: { cellWidth: 25 }, // SKU
                3: { cellWidth: "auto" }, // Producto
                4: { cellWidth: 20, halign: "center" }, // Cantidad
                5: { cellWidth: 22, halign: "right" }, // Costo Unit
                6: { cellWidth: 22, halign: "right" }, // Costo Total
                7: { cellWidth: 40 }, // Razón
                8: { cellWidth: 28 }, // Referencia
            },
            didDrawPage: (data) => {
                // Footer on every page
                const pageHeight = pdf.internal.pageSize.height;
                pdf.setFontSize(7);
                pdf.setFont("helvetica", "italic");
                pdf.text("Generado por SmartKubik", 14, pageHeight - 8);
                pdf.text(
                    new Date().toLocaleString("es-VE"),
                    280,
                    pageHeight - 8,
                    { align: "right" },
                );
                pdf.text(
                    `Página ${data.pageNumber}`,
                    148,
                    pageHeight - 8,
                    { align: "center" },
                );
            },
        });

        // ── Totals section after table ──
        const finalY = (pdf as any).lastAutoTable.finalY + 10;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("RESUMEN", 14, finalY);

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        let summaryY = finalY + 6;

        pdf.text(
            `Total Entradas: ${totalEntries} unidades  |  Costo: $${totalEntryCost.toFixed(2)}`,
            14,
            summaryY,
        );
        summaryY += 5;
        pdf.text(
            `Total Salidas: ${totalExits} unidades  |  Costo: $${totalExitCost.toFixed(2)}`,
            14,
            summaryY,
        );
        summaryY += 5;

        const netMovement = totalEntries - totalExits;
        const netCost = totalEntryCost - totalExitCost;
        pdf.setFont("helvetica", "bold");
        pdf.text(
            `Movimiento Neto: ${netMovement >= 0 ? "+" : ""}${netMovement} unidades  |  $${netCost.toFixed(2)}`,
            14,
            summaryY,
        );

        return Buffer.from(pdf.output("arraybuffer"));
    }

    /**
     * Generates a "Nota de Entrega" / "Comprobante" PDF for a specific grouped document.
     */
    async generateDocumentReport(
        document: any,
        tenantId: string,
    ): Promise<Buffer> {
        let tenant: TenantDocument | null = null;
        try {
            tenant = await this.tenantModel.findById(tenantId).lean();
        } catch (e) {
            this.logger.error(`Failed to fetch tenant ${tenantId}`, e);
        }

        let logoData: string | null = null;
        let logoFormat = "PNG";

        if (tenant?.logo) {
            try {
                const response = await fetch(tenant.logo, { signal: AbortSignal.timeout(5000) });
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    logoData = buffer.toString("base64");
                    const contentType = response.headers.get("content-type") || "image/png";
                    logoFormat = contentType.includes("jpeg") || contentType.includes("jpg") ? "JPEG" : "PNG";
                }
            } catch (e) {
                this.logger.warn(`Failed to fetch logo for tenant ${tenantId}: ${e.message}`);
            }
        }

        return this.buildDocumentPdf(document, tenant, logoData, logoFormat);
    }

    /**
     * Builds the Nota de Entrega PDF layout.
     */
    private buildDocumentPdf(
        document: any,
        tenant: any,
        logoData: string | null,
        logoFormat: string,
    ): Buffer {
        // Use portrait for a ticket/delivery note style
        const pdf = new jsPDF({ orientation: "portrait" });
        let y = 20;

        // ── Logo ──
        if (logoData) {
            try {
                const props = (pdf as any).getImageProperties(logoData);
                const aspectRatio = props.width / props.height;
                let w = 30;
                let h = 30;
                if (aspectRatio > 1) {
                    h = 30 / aspectRatio;
                } else {
                    w = 30 * aspectRatio;
                }
                pdf.addImage(logoData, logoFormat, 14, 10, w, h);
                y = 10 + h + 5;
                if (y < 40) y = 40;
            } catch (e) {
                this.logger.warn("Failed to add logo to PDF", e);
            }
        }

        // ── Company header (right-aligned) ──
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(tenant?.name || "Empresa", 196, 18, { align: "right" });

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        if (tenant?.taxInfo?.businessName) {
            pdf.text(tenant.taxInfo.businessName, 196, 24, { align: "right" });
        }
        if (tenant?.taxInfo?.rif) {
            pdf.text(tenant.taxInfo.rif, 196, 29, { align: "right" });
        }

        // ── Document title ──
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("RECIBO DE INVENTARIO", 14, y);
        y += 8;

        // ── Document Details ──
        pdf.setFontSize(10);

        pdf.setFont("helvetica", "bold");
        pdf.text("Documento / Ref:", 14, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(document.documentReference || document.reference || "N/A", 50, y);
        y += 6;

        pdf.setFont("helvetica", "bold");
        pdf.text("Tipo de Op.:", 14, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(this.getMovementTypeLabel(document.type), 50, y);
        y += 6;

        pdf.setFont("helvetica", "bold");
        pdf.text("Fecha:", 14, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(new Date(document.date).toLocaleString("es-VE"), 50, y);
        y += 6;

        if (document.supplierName) {
            pdf.setFont("helvetica", "bold");
            pdf.text("Proveedor:", 14, y);
            pdf.setFont("helvetica", "normal");
            pdf.text(document.supplierName, 50, y);
            y += 6;
        }

        if (document.creatorName) {
            pdf.setFont("helvetica", "bold");
            pdf.text("Registrado por:", 14, y);
            pdf.setFont("helvetica", "normal");
            pdf.text(document.creatorName, 50, y);
            y += 6;
        }

        if (document.receivedBy) {
            pdf.setFont("helvetica", "bold");
            pdf.text("Recibido por:", 14, y);
            pdf.setFont("helvetica", "normal");
            pdf.text(document.receivedBy, 50, y);
            y += 6;
        }

        if (document.notes) {
            pdf.setFont("helvetica", "bold");
            pdf.text("Notas/Observaciones:", 14, y);
            pdf.setFont("helvetica", "normal");
            const splitNotes = pdf.splitTextToSize(document.notes, 140);
            pdf.text(splitNotes, 50, y);
            y += (splitNotes.length * 5) + 2;
        }

        y += 6;

        // ── Movement items table ──
        const tableHeaders = [
            ["SKU", "Producto", "Cant.", "Costo", "Total"]
        ];

        const tableRows = (document.movements || []).map((m: any) => {
            const productName = (m.productId && typeof m.productId === 'object' && m.productId.name)
                ? m.productId.name
                : m.productSku || 'N/A';
            return [
                m.productSku || "N/A",
                productName,
                (m.quantity || 0).toString(),
                `$${(m.unitCost || 0).toFixed(2)}`,
                `$${(m.totalCost || 0).toFixed(2)}`,
            ];
        });

        autoTable(pdf, {
            startY: y,
            head: tableHeaders,
            body: tableRows,
            theme: "striped",
            headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 30 }, // SKU
                1: { cellWidth: 'auto' }, // Producto
                2: { cellWidth: 20, halign: "center" }, // Cantidad
                3: { cellWidth: 25, halign: "right" }, // Costo
                4: { cellWidth: 25, halign: "right" }, // Total
            },
        });

        const finalY = (pdf as any).lastAutoTable.finalY + 10;

        // ── Totals ──
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Total Ítems: ${(document.movements || []).length}`, 14, finalY);
        pdf.text(`Suma Cantidades: ${document.totalQuantity || 0}`, 70, finalY);
        pdf.text(`Costo Total: $${(document.totalCost || 0).toFixed(2)}`, 140, finalY);

        // Footer
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.text("Generado por SmartKubik", 14, pdf.internal.pageSize.height - 10);
        pdf.text(new Date().toLocaleString("es-VE"), 196, pdf.internal.pageSize.height - 10, { align: "right" });

        return Buffer.from(pdf.output("arraybuffer"));
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
            in: "Entrada",
            out: "Salida",
            adjustment: "Ajuste",
            transfer: "Transferencia",
        };
        return labels[type] || type;
    }
}
