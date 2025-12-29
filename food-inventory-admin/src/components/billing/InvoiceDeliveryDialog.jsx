import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Printer, Mail, MessageSquare, Download, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { generateDocumentPDF } from '../../lib/pdfGenerator';
import { useAuth } from '../../hooks/use-auth';

const InvoiceDeliveryDialog = ({ isOpen, onClose, invoice, customerEmail, customerPhone }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(customerEmail || '');
    const [phone, setPhone] = useState(customerPhone || '');
    const [sent, setSent] = useState({
        print: false,
        email: false,
        whatsapp: false,
        download: false
    });
    const { tenant } = useAuth();

    const handlePrint = async () => {
        try {
            setLoading(true);

            // Debug: Log invoice data
            console.log('Invoice data received:', invoice);

            // Build tenant settings object
            const tenantSettings = {
                name: tenant?.name || '',
                logo: tenant?.logo || '',
                taxInfo: tenant?.taxInfo || {},
                contactInfo: tenant?.contactInfo || {},
                settings: tenant?.settings || {}
            };

            console.log('Tenant from auth:', tenant);
            console.log('Tenant settings:', tenantSettings);
            console.log('Invoice format:', tenantSettings.settings?.invoiceFormat);

            // Build customer data from invoice
            const customerData = {
                name: invoice.customerData?.name || invoice.customer?.name || invoice.customerName || '',
                email: invoice.customerData?.email || invoice.customer?.email || '',
                phone: invoice.customerData?.phone || invoice.customer?.phone || '',
                taxId: invoice.customerData?.taxId || invoice.customer?.taxId || ''
            };

            // Map billing document to order format expected by PDF generator
            const orderData = {
                ...invoice,
                orderNumber: invoice.documentNumber, // Map documentNumber to orderNumber
                customerName: invoice.customerData?.name || invoice.customer?.name || '',
                customerEmail: invoice.customerData?.email || invoice.customer?.email || '',
                customerPhone: invoice.customerData?.phone || invoice.customer?.phone || '',
                controlNumber: invoice.fiscalData?.controlNumber || '',
                fiscalHash: invoice.fiscalData?.hash || '',
                verificationUrl: invoice.fiscalData?.verificationUrl || '',
                imprenta: invoice.fiscalData?.imprenta || {},
                // Map items to expected format
                items: (invoice.items || []).map(item => ({
                    productName: item.description || item.productName || item.name || 'Producto',
                    productId: item.product,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercentage: item.discount?.value || 0,
                    totalPrice: (item.quantity * item.unitPrice * (1 - (item.discount?.value || 0) / 100))
                })),
                // Map totals
                subtotal: invoice.totals?.subtotal || 0,
                ivaTotal: invoice.totals?.taxes?.find(t => t.type === 'IVA')?.amount || 0,
                igtfTotal: invoice.totals?.taxes?.find(t => t.type === 'IGTF')?.amount || 0,
                shippingCost: 0, // Not used in billing documents
                totalAmount: invoice.totals?.grandTotal || 0,
                totalAmountVes: (invoice.totals?.grandTotal || 0) * (invoice.exchangeRate || 1),
                generalDiscountAmount: invoice.totals?.discounts || 0,
                createdAt: invoice.issueDate || invoice.createdAt
            };

            console.log('Mapped orderData for PDF:', orderData);
            console.log('Items:', orderData.items);
            console.log('Totals:', { subtotal: orderData.subtotal, iva: orderData.ivaTotal, total: orderData.totalAmount });

            // Generate and print PDF using client-side generator
            await generateDocumentPDF({
                documentType: 'invoice',
                orderData,
                customerData,
                tenantSettings,
                action: 'print'
            });

            setSent({ ...sent, print: true });
            toast.success('Ventana de impresión abierta');
        } catch (error) {
            console.error('Error printing invoice:', error);
            toast.error('Error al imprimir la factura');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSend = async () => {
        if (!email) {
            toast.error('Por favor ingresa un email');
            return;
        }

        try {
            setLoading(true);
            await api.post(`/billing/documents/${invoice._id}/send-email`, { email });
            setSent({ ...sent, email: true });
            toast.success(`Factura enviada a ${email}`);
        } catch (error) {
            console.error('Error sending email:', error);
            toast.error('Error al enviar el email');
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppSend = async () => {
        if (!phone) {
            toast.error('Por favor ingresa un número de WhatsApp');
            return;
        }

        try {
            setLoading(true);
            // Use ad-hoc endpoint to support sending non-persisted orders/invoices
            await api.post(`/billing/documents/send-adhoc-whatsapp`, {
                invoiceData: invoice,
                phone
            });
            setSent({ ...sent, whatsapp: true });
            toast.success(`Factura enviada por WhatsApp a ${phone}`);
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            toast.error('Error al enviar por WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            setLoading(true);

            // Build tenant settings object
            const tenantSettings = {
                name: tenant?.name || '',
                logo: tenant?.logo || '',
                taxInfo: tenant?.taxInfo || {},
                contactInfo: tenant?.contactInfo || {},
                settings: tenant?.settings || {}
            };

            // Build customer data from invoice
            const customerData = {
                name: invoice.customer?.name || invoice.customerName || '',
                email: invoice.customer?.email || '',
                phone: invoice.customer?.phone || '',
                taxId: invoice.customer?.taxId || ''
            };

            // Map billing document to order format expected by PDF generator
            const orderData = {
                ...invoice,
                orderNumber: invoice.documentNumber, // Map documentNumber to orderNumber
                customerName: invoice.customerData?.name || invoice.customer?.name || '',
                customerEmail: invoice.customerData?.email || invoice.customer?.email || '',
                customerPhone: invoice.customerData?.phone || invoice.customer?.phone || '',
                controlNumber: invoice.fiscalData?.controlNumber || '',
                fiscalHash: invoice.fiscalData?.hash || '',
                verificationUrl: invoice.fiscalData?.verificationUrl || '',
                imprenta: invoice.fiscalData?.imprenta || {},
                // Map items to expected format
                items: (invoice.items || []).map(item => ({
                    productName: item.description,
                    productId: item.product,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercentage: item.discount?.value || 0,
                    totalPrice: (item.quantity * item.unitPrice * (1 - (item.discount?.value || 0) / 100))
                })),
                // Map totals
                subtotal: invoice.totals?.subtotal || 0,
                ivaTotal: invoice.totals?.taxes?.find(t => t.type === 'IVA')?.amount || 0,
                igtfTotal: invoice.totals?.taxes?.find(t => t.type === 'IGTF')?.amount || 0,
                shippingCost: 0, // Not used in billing documents
                totalAmount: invoice.totals?.grandTotal || 0,
                totalAmountVes: (invoice.totals?.grandTotal || 0) * (invoice.exchangeRate || 1),
                generalDiscountAmount: invoice.totals?.discounts || 0,
                createdAt: invoice.issueDate || invoice.createdAt
            };

            console.log('Mapped orderData for PDF:', orderData);
            console.log('Items:', orderData.items);
            console.log('Totals:', { subtotal: orderData.subtotal, iva: orderData.ivaTotal, total: orderData.totalAmount });

            // Generate and download PDF using client-side generator
            await generateDocumentPDF({
                documentType: 'invoice',
                orderData,
                customerData,
                tenantSettings,
                action: 'download'
            });

            setSent({ ...sent, download: true });
            toast.success('Factura descargada');
        } catch (error) {
            console.error('Error downloading invoice:', error);
            toast.error('Error al descargar la factura');
        } finally {
            setLoading(false);
        }
    };

    if (!invoice) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        Factura Emitida Exitosamente
                    </DialogTitle>
                    <DialogDescription>
                        Factura #{invoice.documentNumber} - ¿Cómo deseas entregarla?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Imprimir */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Printer className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Imprimir Factura</p>
                                <p className="text-xs text-muted-foreground">Abre ventana de impresión</p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePrint}
                            disabled={loading}
                            variant={sent.print ? "outline" : "default"}
                            size="sm"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                sent.print ? <Check className="h-4 w-4" /> : 'Imprimir'}
                        </Button>
                    </div>

                    {/* Email */}
                    <div className="space-y-2 p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <p className="font-medium">Enviar por Email</p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleEmailSend}
                                disabled={loading || !email}
                                variant={sent.email ? "outline" : "default"}
                                size="sm"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                    sent.email ? <Check className="h-4 w-4" /> : 'Enviar'}
                            </Button>
                        </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2 p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                            <p className="font-medium">Enviar por WhatsApp</p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="tel"
                                placeholder="+58 412 1234567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleWhatsAppSend}
                                disabled={loading || !phone}
                                variant={sent.whatsapp ? "outline" : "default"}
                                size="sm"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                    sent.whatsapp ? <Check className="h-4 w-4" /> : 'Enviar'}
                            </Button>
                        </div>
                    </div>

                    {/* Descargar */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Download className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Descargar PDF</p>
                                <p className="text-xs text-muted-foreground">Guardar en tu dispositivo</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleDownload}
                            disabled={loading}
                            variant={sent.download ? "outline" : "default"}
                            size="sm"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                sent.download ? <Check className="h-4 w-4" /> : 'Descargar'}
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InvoiceDeliveryDialog;
