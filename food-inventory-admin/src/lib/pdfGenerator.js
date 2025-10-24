import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createScopedLogger } from "./logger";

const logger = createScopedLogger("pdf-generator");

// Helper function to load an image and get its dimensions
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Recommended for CORS
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

export const generateDocumentPDF = async ({ documentType, orderData, customerData, tenantSettings, action = 'download' }) => {
  const doc = new jsPDF();

  const docTitle = documentType === 'invoice' ? 'Factura' : 'Presupuesto';
  const templates = tenantSettings.settings?.documentTemplates || {};
  const templateSettings = templates[documentType === 'invoice' ? 'invoice' : 'quote'] || {};

  // 1. Add Logo (proportionally)
  if (tenantSettings.logo) {
    try {
      const logoImg = await loadImage(tenantSettings.logo);
      const maxLogoWidth = 40;
      const maxLogoHeight = 20;
      const aspectRatio = logoImg.width / logoImg.height;

      let logoWidth = maxLogoWidth;
      let logoHeight = logoWidth / aspectRatio;

      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = logoHeight * aspectRatio;
      }
      
      doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight);
    } catch (e) {
      logger.error("Failed to add logo to PDF", { error: e?.message ?? e });
    }
  }

  // 2. Add Header
  doc.setFontSize(22);
  doc.setTextColor(templateSettings.primaryColor || '#000000');
  doc.text(docTitle, 15, 40);

  // 3. Add Company & Client Info
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  const companyInfo = [
    tenantSettings.name || '',
    tenantSettings.taxInfo?.rif || '',
    tenantSettings.contactInfo?.address?.street || '',
    `${tenantSettings.contactInfo?.address?.city || ''} ${tenantSettings.contactInfo?.address?.state || ''}`,
    tenantSettings.contactInfo?.email || '',
    tenantSettings.contactInfo?.phone || '',
  ];
  doc.text(companyInfo.filter(line => line).join('\n'), 15, 50);

  const customerInfo = [
    'Facturar a:',
    customerData?.name || orderData.customerName,
    customerData?.taxId || '',
    customerData?.email || '',
    customerData?.phone || '',
  ];
  doc.text(customerInfo.filter(line => line).join('\n'), 130, 50);

  // 4. Add Order Details
  const orderInfo = `Número de Orden: ${orderData.orderNumber || ''}\nFecha: ${new Date(orderData.createdAt).toLocaleDateString()}`;
  doc.text(orderInfo, 15, 85);

  // 5. Add Table with Products
  const tableColumn = ["Producto", "Cantidad", "Precio Unit.", "Total"];
  const tableRows = [];

  orderData.items.forEach(item => {
    const itemData = [
      item.productName,
      item.quantity,
      `$${(item.unitPrice || 0).toFixed(2)}`,
      `$${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}`
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    startY: 95,
    head: [tableColumn],
    body: tableRows,
    headStyles: {
        fillColor: templateSettings.primaryColor || '#000000'
    },
    styles: {
        halign: 'left'
    },
    columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
    }
  });

  // 6. Add Totals
  const finalY = doc.lastAutoTable.finalY || 150;
  const totals = [
    `Subtotal: $${(orderData.subtotal || 0).toFixed(2)}`,
    `IVA: $${(orderData.ivaTotal || 0).toFixed(2)}`,
    `IGTF: $${(orderData.igtfTotal || 0).toFixed(2)}`,
    `Envío: $${(orderData.shippingCost || 0).toFixed(2)}`,
    `Total: $${(orderData.totalAmount || 0).toFixed(2)}`
  ];
  doc.setFontSize(12);
  doc.text(totals.join('\n'), 145, finalY + 10, { align: 'right' });

  // 7. Add Footer
  if (templateSettings.footerText) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(templateSettings.footerText, 15, doc.internal.pageSize.getHeight() - 15);
  }

  // 8. Perform action: print or download
  if (action === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`${docTitle}_${orderData.orderNumber}.pdf`);
  }
};
