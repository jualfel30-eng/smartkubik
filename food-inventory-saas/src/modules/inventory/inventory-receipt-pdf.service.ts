import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { InventoryMovement, InventoryMovementDocument } from "../../schemas/inventory.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable()
export class InventoryReceiptPdfService {
    private readonly logger = new Logger(InventoryReceiptPdfService.name);

    constructor(
        @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
        @InjectModel(InventoryMovement.name) private movementModel: Model<InventoryMovementDocument>,
    ) { }

    async generateReceipt(movementId: string): Promise<Buffer> {
        // Fetch movement with populated product details
        const movement = await this.movementModel
            .findById(movementId)
            .populate('productId')
            .populate('createdBy', 'name email')
            .lean();

        if (!movement) {
            throw new Error(`Movement ${movementId} not found`);
        }

        // Fetch tenant for logo and company info
        let tenant: TenantDocument | null = null;
        try {
            tenant = await this.tenantModel.findById(movement.tenantId).lean();
        } catch (e) {
            this.logger.error(`Failed to fetch tenant ${movement.tenantId}`, e);
        }

        // Fetch logo if available
        let logoData: string | null = null;
        let logoFormat: string = 'PNG';

        if (tenant?.logo) {
            try {
                const response = await fetch(tenant.logo);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    logoData = buffer.toString('base64');
                    const contentType = response.headers.get('content-type') || 'image/png';
                    logoFormat = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG';
                }
            } catch (e) {
                this.logger.warn(`Failed to fetch logo for tenant ${movement.tenantId}: ${e.message}`);
            }
        }

        return this.generatePdf(movement, tenant, logoData, logoFormat);
    }

    private generatePdf(
        movement: any,
        tenant: any,
        logoData: string | null,
        logoFormat: string,
    ): Buffer {
        const pdf = new jsPDF();
        let y = 20;

        // Logo
        if (logoData) {
            try {
                const props = (pdf as any).getImageProperties(logoData);
                const aspectRatio = props.width / props.height;
                let w = 30;
                let h = 30;

                if (aspectRatio > 1) {
                    h = 30 / aspectRatio;
                } else {
                    h = 30;
                    w = 30 * aspectRatio;
                }

                pdf.addImage(logoData, logoFormat, 14, 10, w, h);
                y = 10 + h + 10;
                if (y < 40) y = 40;
            } catch (e) {
                this.logger.warn('Failed to add logo to PDF', e);
            }
        }

        // Header Info (Company Name)
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text(tenant?.name || "Empresa", 200, 20, { align: "right" });

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        if (tenant?.taxInfo?.businessName) pdf.text(tenant.taxInfo.businessName, 200, 26, { align: "right" });
        if (tenant?.taxInfo?.rif) pdf.text(tenant.taxInfo.rif, 200, 31, { align: "right" });
        if (tenant?.contactInfo?.address?.city) pdf.text(tenant.contactInfo.address.city, 200, 36, { align: "right" });

        // Document Title
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        const title = movement.movementType === 'in' ? "RECIBO DE ENTRADA DE INVENTARIO" :
            movement.movementType === 'out' ? "RECIBO DE SALIDA DE INVENTARIO" :
                "RECIBO DE MOVIMIENTO DE INVENTARIO";
        pdf.text(title, 14, y);
        y += 10;

        // Movement Details
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Número de Movimiento: ${movement._id.toString()}`, 14, y);
        y += 5;
        pdf.text(`Fecha: ${new Date(movement.createdAt).toLocaleString('es-VE')}`, 14, y);
        y += 5;
        pdf.text(`Tipo: ${this.getMovementTypeLabel(movement.movementType)}`, 14, y);
        y += 5;
        if (movement.reason) {
            pdf.text(`Razón: ${movement.reason}`, 14, y);
            y += 5;
        }
        if (movement.reference) {
            pdf.text(`Referencia: ${movement.reference}`, 14, y);
            y += 5;
        }
        y += 5;

        // Reception Info Panel
        if (movement.receivedBy || movement.notes) {
            pdf.setFillColor(245, 245, 245);
            const panelHeight = movement.notes ? 20 : 12;
            pdf.rect(14, y, 182, panelHeight, 'F');

            pdf.setFont("helvetica", "bold");
            pdf.text("INFORMACIÓN DE RECEPCIÓN", 16, y + 6);

            pdf.setFont("helvetica", "normal");
            if (movement.receivedBy) {
                pdf.text(`Recibido por: ${movement.receivedBy}`, 16, y + 11);
            }
            if (movement.notes) {
                const notesLines = pdf.splitTextToSize(`Notas: ${movement.notes}`, 170);
                pdf.text(notesLines, 16, y + (movement.receivedBy ? 16 : 11));
            }

            y += panelHeight + 10;
        }

        // Product Details Table
        const product = movement.productId as any;
        const rows = [[
            movement.productSku || "N/A",
            product?.name || "Producto",
            movement.quantity?.toString() || "0",
            movement.unitCost?.toFixed(2) || "0.00",
            movement.totalCost?.toFixed(2) || "0.00"
        ]];

        autoTable(pdf, {
            startY: y,
            head: [["SKU", "Producto", "Cantidad", "Costo Unit.", "Costo Total"]],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' }
            }
        });

        const finalY = (pdf as any).lastAutoTable.finalY + 10;

        // Balance After Section
        if (movement.balanceAfter) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text("BALANCE DESPUÉS DEL MOVIMIENTO", 14, finalY);

            pdf.setFont("helvetica", "normal");
            let balanceY = finalY + 6;
            pdf.text(`Cantidad Total: ${movement.balanceAfter.totalQuantity}`, 14, balanceY);
            balanceY += 5;
            pdf.text(`Cantidad Disponible: ${movement.balanceAfter.availableQuantity}`, 14, balanceY);
            balanceY += 5;
            pdf.text(`Cantidad Reservada: ${movement.balanceAfter.reservedQuantity}`, 14, balanceY);
            balanceY += 5;
            pdf.text(`Costo Promedio: $${movement.balanceAfter.averageCostPrice?.toFixed(2) || '0.00'}`, 14, balanceY);
        }

        // Total Section
        const totalY = finalY + 40;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("TOTAL:", 130, totalY);
        pdf.text(`$${movement.totalCost?.toFixed(2) || '0.00'}`, 195, totalY, { align: "right" });

        // Signature Section
        const signatureY = totalY + 30;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.line(14, signatureY, 80, signatureY);
        pdf.text("Firma de quien recibe", 14, signatureY + 5);

        pdf.line(120, signatureY, 195, signatureY);
        pdf.text("Firma autorizada", 120, signatureY + 5);

        // Footer
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.text("Generado por SmartKubik", 14, pageHeight - 10);
        pdf.text(new Date().toLocaleString('es-VE'), 195, pageHeight - 10, { align: "right" });

        return Buffer.from(pdf.output("arraybuffer"));
    }

    private getMovementTypeLabel(type: string): string {
        const labels = {
            'in': 'Entrada',
            'out': 'Salida',
            'adjustment': 'Ajuste',
            'transfer': 'Transferencia',
            'reservation': 'Reserva',
            'release': 'Liberación'
        };
        return labels[type] || type;
    }
}
