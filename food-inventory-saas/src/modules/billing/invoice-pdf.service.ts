import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingDocumentDocument } from "../../schemas/billing-document.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable()
export class InvoicePdfService {
    private readonly logger = new Logger(InvoicePdfService.name);

    constructor(
        @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    ) { }

    async generate(doc: BillingDocumentDocument): Promise<Buffer> {
        let tenant: TenantDocument | null = null;
        try {
            tenant = await this.tenantModel.findById(doc.tenantId).lean();
        } catch (e) {
            this.logger.error(`Failed to fetch tenant ${doc.tenantId}`, e);
        }

        const settings = tenant?.settings;
        const invoiceFormat = settings?.invoiceFormat || 'standard';

        // --- LOGO FETCHING ---
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
                this.logger.warn(`Failed to fetch logo for tenant ${doc.tenantId}: ${e.message}`);
            }
        }

        if (invoiceFormat === 'thermal') {
            return this.generateThermal(doc, tenant, logoData, logoFormat);
        } else {
            return this.generateStandard(doc, tenant, logoData, logoFormat);
        }
    }

    private generateStandard(doc: BillingDocumentDocument, tenant: any, logoData: string | null, logoFormat: string): Buffer {
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
                    // Landscape: width fixed to 30, height scales
                    h = 30 / aspectRatio;
                } else {
                    // Portrait: height fixed to 30, width scales
                    h = 30;
                    w = 30 * aspectRatio;
                }

                // Add logo at top left with calculated dimensions
                pdf.addImage(logoData, logoFormat, 14, 10, w, h);
                // Adjust Y to not overlap
                y = 10 + h + 10; // Dynamic Y based on logo height
                if (y < 40) y = 40; // Minimum Y
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
        const title = doc.type === 'invoice' ? "FACTURA" :
            doc.type === 'delivery_note' ? "NOTA DE ENTREGA" :
                doc.type === 'credit_note' ? "NOTA DE CRÉDITO" :
                    doc.type.toUpperCase();
        pdf.text(title, 14, y);
        y += 10;

        // Document Details
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Número: ${doc.documentNumber}`, 14, y);
        y += 5;
        if (doc.controlNumber) {
            pdf.text(`Control: ${doc.controlNumber}`, 14, y);
            y += 5;
        }
        pdf.text(`Fecha de Emisión: ${doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : new Date().toLocaleDateString()}`, 14, y);
        y += 10;

        // Customer Info Panel
        pdf.setFillColor(245, 245, 245);
        pdf.rect(14, y, 182, 25, 'F');

        pdf.setFont("helvetica", "bold");
        pdf.text("DATOS DEL CLIENTE", 16, y + 6);

        const customer = doc.customer as any;
        pdf.setFont("helvetica", "normal");
        pdf.text(customer?.name || "Cliente General", 16, y + 12);
        pdf.text(`${customer?.taxId || "N/A"}`, 16, y + 17);
        if (customer?.phone) pdf.text(`Tel: ${customer.phone}`, 100, y + 12);
        if (customer?.email) pdf.text(`Email: ${customer.email}`, 100, y + 17);
        if (customer?.address) pdf.text(`Dir: ${customer.address}`, 16, y + 22);

        y += 35;

        // Items Table
        const items = (doc as any).items || [];
        const rows = items.map((item) => [
            item.code || "",
            item.description || "Producto",
            item.quantity?.toString() || "0",
            item.unitPrice?.toFixed(2) || "0.00",
            ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)
        ]);

        autoTable(pdf, {
            startY: y,
            head: [["Código", "Descripción", "Cant", "Precio", "Total"]],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' }
            }
        });

        const finalY = (pdf as any).lastAutoTable.finalY + 10;

        // Totals Section
        const xTotals = 130;
        const wTotals = 66;

        pdf.setFontSize(10);

        // Subtotal
        pdf.text("Subtotal:", 130, finalY);
        pdf.text(doc.totals?.subtotal?.toFixed(2) || "0.00", 195, finalY, { align: "right" });

        let currentY = finalY + 5;

        // Taxes
        (doc.totals?.taxes || []).forEach(tax => {
            const taxAmount = typeof tax.amount === 'number' ? tax.amount : 0;
            const taxRate = typeof tax.rate === 'number' ? tax.rate : 0;
            const taxType = tax.type || 'Tax';
            pdf.text(`${taxType} (${taxRate}%)`, 130, currentY);
            pdf.text(taxAmount.toFixed(2), 195, currentY, { align: "right" });
            currentY += 5;
        });

        // Grand Total
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("TOTAL:", 130, currentY + 2);
        const currency = doc.totals?.currency || "VES";
        pdf.text(`${doc.totals?.grandTotal?.toFixed(2) || "0.00"} ${currency}`, 195, currentY + 2, { align: "right" });

        // Footer
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.text("Generado por SmartKubik", 14, pageHeight - 10);

        return Buffer.from(pdf.output("arraybuffer"));
    }

    private generateThermal(doc: BillingDocumentDocument, tenant: any, logoData: string | null, logoFormat: string): Buffer {
        // 80mm width paper
        const pdf = new jsPDF({
            unit: 'mm',
            format: [80, 297] // Fixed long height, usually ok for viewing
        });

        let y = 10;
        const margin = 2;
        const centerX = 40;

        // Logo Check
        if (logoData) {
            try {
                const props = (pdf as any).getImageProperties(logoData);
                const aspectRatio = props.width / props.height;
                let w = 30;
                let h = 30;

                if (aspectRatio > 1) {
                    // Landscape
                    h = 30 / aspectRatio;
                } else {
                    // Portrait
                    h = 30;
                    w = 30 * aspectRatio;
                    // Additional check for thermal paper width in portrait
                    if (w > 40) { // Max width for thermal layout
                        w = 40;
                        h = 40 / aspectRatio;
                    }
                }

                // Centering logic could be applied, but sticking to previous layout for now
                // Previous was x=25 (centered on 80mm paper), but 25+30=55. Center is 40.
                // 30mm wide means starting at 40 - 15 = 25.
                // We should center it properly based on calculated width.
                const x = 40 - (w / 2);

                pdf.addImage(logoData, logoFormat, x, y, w, h);
                y += h + 5;
            } catch (e) {
                this.logger.warn("Error adding logo to thermal", e);
            }
        }

        // Header Centered
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(tenant?.name || "Empresa", centerX, y, { align: "center" });
        y += 4;

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        if (tenant?.taxInfo?.rif) {
            pdf.text(tenant.taxInfo.rif, centerX, y, { align: "center" });
            y += 4;
        }
        if (tenant?.contactInfo?.address?.city) {
            pdf.text(tenant.contactInfo.address.city, centerX, y, { align: "center" });
            y += 4;
        }
        y += 2;

        pdf.line(margin, y, 78, y);
        y += 4;

        // Doc Info
        pdf.setFont("helvetica", "bold");
        const docTitle = doc.type === 'invoice' ? "FACTURA" :
            doc.type === 'delivery_note' ? "ENTREGA" : doc.type.toUpperCase();
        pdf.text(`${docTitle} #: ${doc.documentNumber}`, margin, y);
        y += 4;
        if (doc.controlNumber) {
            pdf.text(`Control: ${doc.controlNumber}`, margin, y);
            y += 4;
        }
        pdf.setFont("helvetica", "normal");
        pdf.text(`Fecha: ${doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : new Date().toLocaleDateString()}`, margin, y);
        y += 6;

        // Customer
        const customer = doc.customer as any;
        pdf.text(`Cli: ${customer?.name || "N/A"}`, margin, y);
        y += 4;
        pdf.text(`RIF: ${customer?.taxId || "N/A"}`, margin, y);
        y += 6;

        pdf.line(margin, y, 78, y);
        y += 2;

        // Items
        const items = (doc as any).items || [];
        const rows = items.map(item => [
            item.description?.substring(0, 20) || "Prod",
            item.quantity?.toString() || "0",
            // format 10.00
            ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)
        ]);

        autoTable(pdf, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Desc', 'Cant', 'Total']],
            body: rows,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 20, halign: 'right' }
            },
            headStyles: { fontStyle: 'bold' }
        });

        y = (pdf as any).lastAutoTable.finalY + 4;
        pdf.line(margin, y, 78, y);
        y += 5;

        // Totals
        pdf.setFontSize(9);
        pdf.text(`SUBTOTAL:`, 40, y, { align: "right" });
        pdf.text(`${doc.totals?.subtotal?.toFixed(2)}`, 78, y, { align: "right" });
        y += 4;

        (doc.totals?.taxes || []).forEach(tax => {
            pdf.text(`${tax.type || 'Tax'} (${tax.rate}%)`, 40, y, { align: "right" });
            pdf.text(`${(tax.amount || 0).toFixed(2)}`, 78, y, { align: "right" });
            y += 4;
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`TOTAL ${doc.totals?.currency || "VES"}:`, 40, y, { align: "right" });
        pdf.text(`${doc.totals?.grandTotal?.toFixed(2)}`, 78, y, { align: "right" });
        y += 8;

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.text("Gracias por su compra!", centerX, y, { align: "center" });

        return Buffer.from(pdf.output("arraybuffer"));
    }
}
