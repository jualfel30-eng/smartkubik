import { Injectable } from "@nestjs/common";
import { BillingDocumentDocument } from "../../schemas/billing-document.schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable()
export class InvoicePdfService {
    generate(doc: BillingDocumentDocument): Buffer {
        const pdf = new jsPDF();

        // Header
        pdf.setFontSize(18);
        pdf.text("FACTURA", 14, 20);

        pdf.setFontSize(10);
        pdf.text(`Número: ${doc.documentNumber}`, 14, 30);
        if (doc.controlNumber) {
            pdf.text(`Control: ${doc.controlNumber}`, 14, 35);
        }
        pdf.text(`Fecha: ${doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : new Date().toLocaleDateString()}`, 14, 40);

        // Customer
        const customer = doc.customer as any;
        pdf.text("Cliente:", 14, 50);
        pdf.text(customer?.name || "N/A", 14, 55);
        pdf.text(customer?.taxId || "N/A", 14, 60);
        pdf.text(customer?.phone || "", 14, 65);

        // Items
        const items = (doc as any).items || [];
        const rows = items.map((item) => [
            item.code || "",
            item.description || "Producto",
            item.quantity?.toString() || "0",
            item.unitPrice?.toFixed(2) || "0.00",
            ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)
        ]);

        autoTable(pdf, {
            startY: 70,
            head: [["Código", "Descripción", "Cant", "Precio", "Total"]],
            body: rows,
        });

        const finalY = (pdf as any).lastAutoTable.finalY + 10;

        // Totals
        pdf.text(`Subtotal: ${doc.totals?.subtotal?.toFixed(2) || "0.00"}`, 140, finalY);
        let taxY = finalY + 5;
        (doc.totals?.taxes || []).forEach(tax => {
            const taxAmount = typeof tax.amount === 'number' ? tax.amount : 0;
            const taxRate = typeof tax.rate === 'number' ? tax.rate : 0;
            const taxType = tax.type || 'Tax';
            pdf.text(`${taxType} (${taxRate}%): ${taxAmount.toFixed(2)}`, 140, taxY);
            taxY += 5;
        });
        pdf.setFontSize(12);
        pdf.text(`Total: ${doc.totals?.grandTotal?.toFixed(2) || "0.00"} ${doc.totals?.currency || "VES"}`, 140, taxY + 5);

        return Buffer.from(pdf.output("arraybuffer"));
    }
}
