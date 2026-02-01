export const generateShippingLabelHTML = (order, tenantName = '') => {
    // Extract data
    const name = order.customerName || '';
    const rif = order.customerRif || '';
    const phone = order.customerPhone || '';

    // Address logic: 
    // State is explicit in shippingAddress.state
    // Agency is not explicit, we use street/city from shippingAddress as per plan
    const state = order.shippingAddress?.state || order.shipping?.address?.state || '';

    // Agency is typically the street address for national shipping in this context
    const agency = order.shippingAddress?.street || order.shipping?.address?.street || '';
    const city = order.shippingAddress?.city || order.shipping?.address?.city || '';

    // Format full agency address
    const fullAgencyParts = [];
    if (agency) fullAgencyParts.push(agency);
    if (city) fullAgencyParts.push(city);
    const fullAgency = fullAgencyParts.join(', ');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Etiqueta de Envío - ${order.orderNumber}</title>
        <style>
            body {
                font-family: 'Times New Roman', Times, serif;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                background: white;
            }
            .label-container {
                width: 100%;
                max-width: 500px;
                padding: 20px;
                /* border: 1px solid #ccc;  Optional border for preview */
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .brand-name {
                font-size: 36px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 0;
                line-height: 1;
            }
            .field-row {
                display: flex;
                align-items: flex-start; /* Changed from flex-end */
                margin-bottom: 20px;
                width: 100%;
            }
            .field-label {
                font-weight: bold;
                font-size: 16px;
                text-transform: uppercase;
                margin-right: 10px;
                white-space: nowrap;
                min-width: 80px; /* Align labels somewhat */
                text-align: right;
                padding-top: 2px; /* Visual alignment for top of text */
            }
            .field-value-container {
                flex-grow: 1;
                /* Removed border-bottom */
                /* Removed position relative */
            }
            .field-value {
                font-size: 18px;
                font-family: Arial, sans-serif; /* Readable font for data */
                /* Removed position absolute */
                display: block; /* Ensure block layout */
                line-height: 1.4; /* Better reading for multi-line */
            }
            
            /* Print specific styles */
            @media print {
                body {
                    padding: 0;
                }
                .label-container {
                    border: none;
                    width: 100%;
                    max-width: 100%;
                }
                @page {
                    margin: 0.5cm;
                    size: auto;
                }
            }
        </style>
    </head>
    <body>
        <div class="label-container">
            <div class="header">
                 ${tenantName ? `<div class="brand-name">${tenantName}</div>` : ''}
            </div>

            <div class="field-row">
                <div class="field-label">NOMBRE:</div>
                <div class="field-value-container">
                    <span class="field-value">${name}</span>
                </div>
            </div>

            <div class="field-row">
                <div class="field-label">CÉDULA:</div>
                <div class="field-value-container">
                    <span class="field-value">${rif}</span>
                </div>
            </div>

            <div class="field-row">
                <div class="field-label">TLF:</div>
                <div class="field-value-container">
                    <span class="field-value">${phone}</span>
                </div>
            </div>

            <div class="field-row">
                <div class="field-label">ESTADO:</div>
                <div class="field-value-container">
                    <span class="field-value">${state}</span>
                </div>
            </div>

            <div class="field-row">
                <div class="field-label">AGENCIA:</div>
                <div class="field-value-container">
                    <span class="field-value">${fullAgency}</span>
                </div>
            </div>
        </div>
        <script>
            window.onload = function() {
                window.print();
                // Optional: window.close() after verify? 
                // Creating a recurring issue if it closes before printing on some browsers.
                // Better to let user close.
            }
        </script>
    </body>
    </html>
    `;
};
