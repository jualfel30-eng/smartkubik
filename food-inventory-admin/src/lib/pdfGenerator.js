import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

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

// Helper to generate QR data URL
const generateQrDataUrl = async (text) => {
  if (!text) return null;
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 0,
      scale: 3,
    });
  } catch (e) {
    console.error("Error generating QR", e);
    return null;
  }
};

// Build a human-readable summary string for QR when no verification URL is available.
const buildQrFallbackText = (orderData, tenantSettings, documentType) => {
  const parts = [];
  const docTitle = documentType === 'invoice' ? 'Factura' : 'Presupuesto';
  parts.push(`${docTitle} ${orderData?.orderNumber || ''}`);
  if (orderData?.createdAt) {
    parts.push(`Fecha: ${new Date(orderData.createdAt).toLocaleDateString()}`);
  }
  const total = orderData?.totalAmount;
  if (typeof total === "number") {
    parts.push(`Total USD: $${total.toFixed(2)}`);
  }
  const control = orderData?.controlNumber || orderData?.taxInfo?.controlNumber;
  if (control) {
    parts.push(`Control Fiscal: ${control}`);
  }
  if (tenantSettings?.name) {
    parts.push(`Emisor: ${tenantSettings.name}`);
  }
  return parts.join(" | ");
};

export const generateDocumentPDF = async ({ documentType, orderData, customerData, tenantSettings, action = 'download' }) => {
  const invoiceFormat = tenantSettings.settings?.invoiceFormat || 'standard'; // 'standard' o 'thermal'

  // Calcular el tipo de cambio de la orden (USD a Bs)
  const exchangeRate = orderData.totalAmountVes && orderData.totalAmount
    ? orderData.totalAmountVes / orderData.totalAmount
    : 36.5; // Valor por defecto si no hay datos

  if (invoiceFormat === 'thermal') {
    return generateThermalPDF({ documentType, orderData, customerData, tenantSettings, action, exchangeRate });
  }

  const doc = new jsPDF();

  const docTitle = documentType === 'invoice' ? 'Factura' : 'Presupuesto';
  const templates = tenantSettings.settings?.documentTemplates || {};
  const templateSettings = templates[documentType === 'invoice' ? 'invoice' : 'quote'] || {};
  const controlNumber = orderData?.controlNumber || orderData?.taxInfo?.controlNumber;
  const imprentaInfo = orderData?.imprenta || {};
  const fiscalHash =
    orderData?.hash ||
    orderData?.fiscalHash ||
    orderData?.taxInfo?.hash ||
    orderData?.evidenceHash;
  const verificationUrl = orderData?.verificationUrl || orderData?.taxInfo?.verificationUrl;
  const qrData =
    verificationUrl ||
    controlNumber ||
    fiscalHash ||
    buildQrFallbackText(orderData, tenantSettings, documentType);
  const qrImage = await generateQrDataUrl(qrData);

  // 1. Add Logo (proportionally) - top left
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
      console.error("Error adding logo to PDF", e);
    }
  }

  // 2. Add Document Title - top right (where order info was)
  doc.setFontSize(22);
  doc.setTextColor(templateSettings.primaryColor || '#000000');
  doc.text(docTitle, 200, 20, { align: 'right' });

  // 3. Add Company Info - below logo
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
  doc.text(companyInfo.filter(line => line).join('\n'), 15, 35);

  // 4. Add Client Info - top right, below title
  const customerInfo = [
    'Facturar a:',
    customerData?.name || orderData.customerName,
    customerData?.taxId || '',
    customerData?.email || '',
    customerData?.phone || '',
  ];
  doc.text(customerInfo.filter(line => line).join('\n'), 130, 35);

  // 5. Add Order Details - below client info
  const clientInfoHeight = customerInfo.filter(line => line).length * 5; // approx 5 units per line
  const orderInfoY = 35 + clientInfoHeight + 5;
  const orderInfoLines = [
    `Número de Orden: ${orderData.orderNumber || ''}`,
    `Fecha: ${new Date(orderData.createdAt).toLocaleDateString()}`,
  ];
  if (controlNumber) {
    orderInfoLines.push(`Control Fiscal: ${controlNumber}`);
  }
  if (fiscalHash) {
    orderInfoLines.push(`Hash: ${String(fiscalHash).slice(0, 16)}...`);
  }
  const orderInfo = orderInfoLines.join('\n');
  doc.text(orderInfo, 130, orderInfoY);

  // 6. Add Table with Products - starts after company and order info
  const tableStartY = Math.max(35 + companyInfo.filter(line => line).length * 5, orderInfoY + 15);
  const hasDiscounts = orderData.items.some(item => item.discountPercentage > 0);
  const tableColumn = hasDiscounts
    ? ["Producto", "Cantidad", "Precio Unit.", "Desc.", "Total"]
    : ["Producto", "Cantidad", "Precio Unit.", "Total"];
  const tableRows = [];

  orderData.items.forEach(item => {
    const discount = item.discountPercentage || 0;
    const unitPrice = item.unitPrice || 0;
    const quantity = item.quantity || 0;
    const finalUnitPrice = unitPrice * (1 - discount / 100);
    const total = quantity * finalUnitPrice;

    const itemData = hasDiscounts
      ? [
          item.productName,
          quantity,
          `$${unitPrice.toFixed(2)}`,
          discount > 0 ? `-${discount}%` : '-',
          `$${total.toFixed(2)}`
        ]
      : [
          item.productName,
          quantity,
          `$${unitPrice.toFixed(2)}`,
          `$${total.toFixed(2)}`
        ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumn],
    body: tableRows,
    headStyles: {
        fillColor: templateSettings.primaryColor || '#000000'
    },
    styles: {
        halign: 'left'
    },
    columnStyles: hasDiscounts
      ? {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'center' },
          4: { halign: 'right' },
        }
      : {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        }
  });

  // 7. Add Totals with USD and Bs conversion
  const finalY = doc.lastAutoTable.finalY || 150;
  const totalUSD = orderData.totalAmount || 0;
  const totalBs = totalUSD * exchangeRate;
  const generalDiscountAmount = orderData.generalDiscountAmount || 0;

  const totals = [
    `Subtotal: $${(orderData.subtotal || 0).toFixed(2)} / Bs ${((orderData.subtotal || 0) * exchangeRate).toFixed(2)}`,
  ];

  // Add general discount if present
  if (generalDiscountAmount > 0) {
    totals.push(`Descuento General: -$${generalDiscountAmount.toFixed(2)} / Bs ${(generalDiscountAmount * exchangeRate).toFixed(2)}`);
  }

  totals.push(
    `IVA: $${(orderData.ivaTotal || 0).toFixed(2)} / Bs ${((orderData.ivaTotal || 0) * exchangeRate).toFixed(2)}`,
    `IGTF: $${(orderData.igtfTotal || 0).toFixed(2)} / Bs ${((orderData.igtfTotal || 0) * exchangeRate).toFixed(2)}`,
    `Envío: $${(orderData.shippingCost || 0).toFixed(2)} / Bs ${((orderData.shippingCost || 0) * exchangeRate).toFixed(2)}`,
    `Total: $${totalUSD.toFixed(2)} / Bs ${totalBs.toFixed(2)}`
  );
  doc.setFontSize(11);
  doc.text(totals.join('\n'), 200, finalY + 10, { align: 'right' });

  // 8. Add Footer - right below totals, left aligned
  const footerLines = [];
  if (templateSettings.footerText) {
    footerLines.push(templateSettings.footerText);
  }
  // Leyenda fiscal obligatoria y datos de imprenta
  footerLines.push("Documento emitido conforme a SNAT/2024/000102");
  if (imprentaInfo?.providerName || imprentaInfo?.providerRif) {
    const parts = [];
    if (imprentaInfo.providerName) parts.push(imprentaInfo.providerName);
    if (imprentaInfo.providerRif) parts.push(`RIF ${imprentaInfo.providerRif}`);
    footerLines.push(`Imprenta Digital: ${parts.join(" - ")}`);
  }
  if (controlNumber) {
    footerLines.push(`Control Fiscal: ${controlNumber}`);
  }
  if (fiscalHash) {
    footerLines.push(`Hash: ${fiscalHash}`);
  }

  if (footerLines.length > 0) {
    const footerY = finalY + 10 + (totals.length * 5) + 5;
    doc.setFontSize(9);
    doc.setTextColor(150);
    const wrappedFooter = footerLines.flatMap(line => doc.splitTextToSize(line, 180));
    doc.text(wrappedFooter.join('\n'), 15, footerY);

    // QR/Verificación
    const qrY = footerY + wrappedFooter.length * 5 + 5;
    if (qrImage) {
      doc.addImage(qrImage, "PNG", 165, qrY - 10, 30, 30);
    } else if (qrData) {
      const verifyLines = doc.splitTextToSize(`Verificar: ${qrData}`, 180);
      doc.text(verifyLines.join('\n'), 15, qrY);
    }
  }

  // 9. Perform action: print or download
  if (action === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`${docTitle}_${orderData.orderNumber}.pdf`);
  }
};

// Thermal printer format (80mm width)
const generateThermalPDF = async ({ documentType, orderData, customerData, tenantSettings, action, exchangeRate }) => {
  // 80mm = 226.77 pixels at 72 DPI, use 80mm x auto height
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 297], // 80mm width, A4 height (will be cut to content)
  });

  const docTitle = documentType === 'invoice' ? 'Factura' : 'Presupuesto';
  const templates = tenantSettings.settings?.documentTemplates || {};
  const templateSettings = templates[documentType === 'invoice' ? 'invoice' : 'quote'] || {};
  const controlNumber = orderData?.controlNumber || orderData?.taxInfo?.controlNumber;
  const imprentaInfo = orderData?.imprenta || {};
  const fiscalHash =
    orderData?.hash ||
    orderData?.fiscalHash ||
    orderData?.taxInfo?.hash ||
    orderData?.evidenceHash;
  const verificationUrl = orderData?.verificationUrl || orderData?.taxInfo?.verificationUrl;
  const qrData =
    verificationUrl ||
    controlNumber ||
    fiscalHash ||
    buildQrFallbackText(orderData, tenantSettings, documentType);
  const qrImage = await generateQrDataUrl(qrData);

  let currentY = 5;

  // Use a monospaced font to better emulate thermal printer legibility
  doc.setFont('courier', 'normal');

  // Logo centered
  if (tenantSettings.logo) {
    try {
      const logoImg = await loadImage(tenantSettings.logo);
      const maxLogoWidth = 30;
      const maxLogoHeight = 15;
      const aspectRatio = logoImg.width / logoImg.height;

      let logoWidth = maxLogoWidth;
      let logoHeight = logoWidth / aspectRatio;

      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = logoHeight * aspectRatio;
      }

      const logoX = (80 - logoWidth) / 2;
      doc.addImage(logoImg, 'PNG', logoX, currentY, logoWidth, logoHeight);
      currentY += logoHeight + 3;
    } catch (e) {
      console.error("Error adding logo to PDF", e);
    }
  }

  // Company name centered
  doc.setFontSize(13); // Slightly larger for better legibility on thermal
  doc.setFont(undefined, 'bold');
  doc.text(tenantSettings.name || '', 40, currentY, { align: 'center' });
  currentY += 5;

  // Company info centered
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const companyLines = [
    tenantSettings.taxInfo?.rif || '',
    tenantSettings.contactInfo?.address?.street || '',
    tenantSettings.contactInfo?.phone || '',
  ].filter(line => line);

  companyLines.forEach(line => {
    doc.text(line, 40, currentY, { align: 'center' });
    currentY += 4;
  });

  // Divider
  currentY += 2;
  doc.setLineWidth(0.1);
  doc.line(5, currentY, 75, currentY);
  currentY += 4;

  // Document title centered
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(docTitle, 40, currentY, { align: 'center' });
  currentY += 6;

  // Order info
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Orden: ${orderData.orderNumber || ''}`, 5, currentY);
  currentY += 4;
  doc.text(`Fecha: ${new Date(orderData.createdAt).toLocaleDateString()}`, 5, currentY);
  currentY += 4;
  if (controlNumber) {
    doc.text(`Control Fiscal: ${controlNumber}`, 5, currentY);
    currentY += 4;
  }
  if (fiscalHash) {
    doc.text(`Hash: ${String(fiscalHash).slice(0, 24)}...`, 5, currentY);
    currentY += 4;
  }

  // Customer info
  doc.text(`Cliente: ${customerData?.name || orderData.customerName}`, 5, currentY);
  currentY += 4;
  if (customerData?.taxId) {
    doc.text(`RIF: ${customerData.taxId}`, 5, currentY);
    currentY += 4;
  }

  // Divider
  currentY += 2;
  doc.line(5, currentY, 75, currentY);
  currentY += 4;

  // Products table
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('Producto', 5, currentY);
  doc.text('Cant', 50, currentY);
  doc.text('Total', 70, currentY, { align: 'right' });
  currentY += 4;
  doc.line(5, currentY, 75, currentY);
  currentY += 4;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(12);
  orderData.items.forEach(item => {
    const productName = item.productName;
    const lines = doc.splitTextToSize(productName, 40);
    const discount = item.discountPercentage || 0;
    const unitPrice = item.unitPrice || 0;
    const quantity = item.quantity || 0;
    const finalUnitPrice = unitPrice * (1 - discount / 100);
    const total = quantity * finalUnitPrice;

    lines.forEach((line, idx) => {
      doc.text(line, 5, currentY);
      if (idx === 0) {
        doc.text(String(quantity), 50, currentY);
        doc.text(`$${total.toFixed(2)}`, 75, currentY, { align: 'right' });
      }
      currentY += 4;
    });

    // Price per unit in smaller font
    doc.setFontSize(11);
    if (discount > 0) {
      doc.text(`@ $${unitPrice.toFixed(2)} c/u (-${discount}%)`, 5, currentY);
    } else {
      doc.text(`@ $${unitPrice.toFixed(2)} c/u`, 5, currentY);
    }
    currentY += 4;
    doc.setFontSize(8);
  });

  // Divider
  doc.line(5, currentY, 75, currentY);
  currentY += 4;

  // Totals
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  const totalUSD = orderData.totalAmount || 0;
  const totalBs = totalUSD * exchangeRate;
  const generalDiscountAmount = orderData.generalDiscountAmount || 0;

  if (orderData.subtotal) {
    doc.text('Subtotal:', 5, currentY); // labels left-aligned
    doc.text(`$${orderData.subtotal.toFixed(2)}`, 75, currentY, { align: 'right' });
    currentY += 4;
  }
  if (generalDiscountAmount > 0) {
    doc.text('Desc. General:', 5, currentY);
    doc.text(`-$${generalDiscountAmount.toFixed(2)}`, 75, currentY, { align: 'right' });
    currentY += 4;
  }
  if (orderData.ivaTotal) {
    doc.text('IVA:', 5, currentY);
    doc.text(`$${orderData.ivaTotal.toFixed(2)}`, 75, currentY, { align: 'right' });
    currentY += 4;
  }
  if (orderData.igtfTotal) {
    doc.text('IGTF:', 5, currentY);
    doc.text(`$${orderData.igtfTotal.toFixed(2)}`, 75, currentY, { align: 'right' });
    currentY += 4;
  }
  if (orderData.shippingCost) {
    doc.text('Envío:', 5, currentY);
    doc.text(`$${orderData.shippingCost.toFixed(2)}`, 75, currentY, { align: 'right' });
    currentY += 4;
  }

  doc.setFontSize(12);
  doc.text('TOTAL USD:', 5, currentY);
  doc.text(`$${totalUSD.toFixed(2)}`, 75, currentY, { align: 'right' });
  currentY += 5;

  doc.text('TOTAL Bs:', 5, currentY);
  doc.text(`Bs ${totalBs.toFixed(2)}`, 75, currentY, { align: 'right' });
  currentY += 6;

  // Footer
  const footerLines = [];
  if (templateSettings.footerText) {
    footerLines.push(...doc.splitTextToSize(templateSettings.footerText, 70));
  }
  footerLines.push("Documento emitido conforme a SNAT/2024/000102");
  if (imprentaInfo?.providerName || imprentaInfo?.providerRif) {
    const parts = [];
    if (imprentaInfo.providerName) parts.push(imprentaInfo.providerName);
    if (imprentaInfo.providerRif) parts.push(`RIF ${imprentaInfo.providerRif}`);
    footerLines.push(`Imprenta Digital: ${parts.join(" - ")}`);
  }
  if (controlNumber) {
    footerLines.push(`Control Fiscal: ${controlNumber}`);
  }
  if (fiscalHash) {
    footerLines.push(`Hash: ${fiscalHash}`);
  }

  if (footerLines.length) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    footerLines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, 70);
      wrapped.forEach(wrappedLine => {
        doc.text(wrappedLine, 40, currentY, { align: 'center' });
        currentY += 3;
      });
    });
    if (qrImage) {
      doc.addImage(qrImage, "PNG", 30, currentY, 20, 20);
      currentY += 22;
    } else if (qrData) {
      const verifyText = `Verificar: ${qrData}`;
      const lines = doc.splitTextToSize(verifyText, 70);
      lines.forEach(line => {
        doc.text(line, 40, currentY, { align: 'center' });
        currentY += 3;
      });
    }
  }

  // Perform action
  if (action === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`${docTitle}_${orderData.orderNumber}.pdf`);
  }
};
