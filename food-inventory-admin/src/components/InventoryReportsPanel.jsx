import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Loader2, RefreshCw, Download, FileText, Printer, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi, getAuthToken, getApiBaseUrl } from '@/lib/api';
import { format } from 'date-fns';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";

const MOVEMENT_TYPES = [
    { value: 'all', label: 'Todos' },
    { value: 'IN', label: 'Entradas' },
    { value: 'OUT', label: 'Salidas' },
    { value: 'ADJUSTMENT', label: 'Ajustes' },
    { value: 'TRANSFER', label: 'Transferencias' },
];

const PRESETS = [
    { value: 'today', label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: 'this_week', label: 'Esta semana' },
    { value: 'last_week', label: 'Sem. Pasada' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_month', label: 'Mes pasado' },
    { value: 'custom', label: 'Personalizado' },
];

export default function InventoryReportsPanel() {
    const { flags } = useFeatureFlags();
    const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;

    const [movements, setMovements] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'grouped'
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [printingDocId, setPrintingDocId] = useState(null);

    const [warehouses, setWarehouses] = useState([]);
    const [inventories, setInventories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exportingCsv, setExportingCsv] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Filters state
    const [filters, setFilters] = useState({
        preset: 'today',
        dateFrom: '',
        dateTo: '',
        movementType: 'all',
        warehouseId: 'all',
        productId: 'all',
    });

    const hasMountedRef = useRef(false);

    // Generate product options for the select filter
    const productOptions = useMemo(() => {
        const map = new Map();
        inventories.forEach((inv) => {
            const pid = inv.productId || inv.product?._id;
            if (!pid) return;
            const pidStr = typeof pid === 'string' ? pid : (pid._id || pid).toString();
            if (!map.has(pidStr)) {
                map.set(pidStr, {
                    id: pidStr,
                    name: inv.productName || inv.product?.name || inv.productSku,
                    sku: inv.productSku || '',
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [inventories]);

    const fetchAuxData = async () => {
        try {
            const [invRes, whResPromise] = await Promise.all([
                fetchApi('/inventory?limit=500'),
                multiWarehouseEnabled ? fetchApi('/warehouses') : Promise.resolve([]),
            ]);
            const whRes = await whResPromise;
            setInventories(invRes?.data || invRes || []);
            setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
        } catch (err) {
            console.error('Error fetching aux data for reports', err);
        }
    };

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('limit', '100'); // Preview only

            if (filters.preset !== 'custom') {
                params.append('datePreset', filters.preset);
            } else {
                if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
                if (filters.dateTo) params.append('dateTo', filters.dateTo);
            }

            if (filters.movementType !== 'all') params.append('movementType', filters.movementType);
            if (filters.warehouseId !== 'all') params.append('warehouseId', filters.warehouseId);
            if (filters.productId !== 'all') params.append('productId', filters.productId);

            if (viewMode === 'detailed') {
                const response = await fetchApi(`/inventory-movements?${params.toString()}`);
                setMovements(response?.data || response || []);
                setDocuments([]);
            } else {
                const response = await fetchApi(`/inventory-movements/documents?${params.toString()}`);
                setDocuments(response?.data || response || []);
                setMovements([]);
            }
        } catch (err) {
            console.error('Error fetching report preview', err);
            toast.error('Error al cargar la vista previa');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            fetchAuxData();
            fetchPreview();
        } else {
            fetchPreview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);

    const handleApplyFilters = () => {
        fetchPreview();
    };

    const handleExport = async (format) => {
        if (format === 'csv') setExportingCsv(true);
        if (format === 'pdf') setExportingPdf(true);

        try {
            const params = new URLSearchParams();
            params.append('format', format);

            if (filters.preset !== 'custom') {
                params.append('datePreset', filters.preset);
            } else {
                if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
                if (filters.dateTo) params.append('dateTo', filters.dateTo);
            }

            if (filters.movementType !== 'all') params.append('movementType', filters.movementType);
            if (filters.warehouseId !== 'all') params.append('warehouseId', filters.warehouseId);
            if (filters.productId !== 'all') params.append('productId', filters.productId);

            const token = getAuthToken();
            let baseUrl = getApiBaseUrl();
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            const apiPath = baseUrl.endsWith('/api/v1') ? '' : '/api/v1';

            const url = `${baseUrl}${apiPath}/inventory-movements/export?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Falló la exportación');

            const disposition = response.headers.get('Content-Disposition');
            let filename = `reporte-movimientos.${format}`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Reporte exportado exitosamente');

        } catch (error) {
            console.error('Export error:', error);
            toast.error('Ocurrió un error al exportar el reporte');
        } finally {
            setExportingCsv(false);
            setExportingPdf(false);
        }
    };

    const handlePrintDocument = async (doc) => {
        setPrintingDocId(doc.batchId);
        try {
            const token = getAuthToken();
            let baseUrl = getApiBaseUrl();
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            const apiPath = baseUrl.endsWith('/api/v1') ? '' : '/api/v1';

            const url = `${baseUrl}${apiPath}/inventory-movements/documents/export`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(doc)
            });

            if (!response.ok) throw new Error('Falló la impresión del documento');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            window.open(downloadUrl, '_blank'); // Open PDF in new tab
            window.URL.revokeObjectURL(downloadUrl);
            toast.success('Recibo de inventario generado', { id: `print-${doc.batchId}` });
        } catch (error) {
            console.error('Print doc error:', error);
            toast.error('Ocurrió un error al imprimir el documento', { id: `print-${doc.batchId}` });
        } finally {
            setPrintingDocId(null);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const netMovement = useMemo(() => {
        let entries = 0;
        let exits = 0;
        let entriesCost = 0;
        let exitsCost = 0;

        movements.forEach(m => {
            const q = m.quantity || 0;
            const c = m.totalCost || 0;

            if (m.movementType === 'IN' || m.movementType === 'TRANSFER') {
                entries += q;
                entriesCost += c;
            }
            if (m.movementType === 'OUT') {
                exits += q;
                exitsCost += c;
            }
            if (m.movementType === 'ADJUSTMENT') {
                if (q > 0) {
                    entries += q;
                    entriesCost += c;
                } else {
                    exits += Math.abs(q);
                    exitsCost += Math.abs(c);
                }
            }
        });
        return {
            entries, exits, net: entries - exits,
            entriesCost, exitsCost, netCost: entriesCost - exitsCost
        };
    }, [movements]);

    return (
        <Card className="print:shadow-none print:border-none">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <div>
                    <CardTitle>Reportes de Inventario</CardTitle>
                    <p className="text-sm text-muted-foreground mb-4">
                        Genera y exporta reportes detallados de movimientos de inventario.
                    </p>
                    <Tabs value={viewMode} onValueChange={setViewMode} className="w-full max-w-[400px]">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="detailed">Vista Detallada</TabsTrigger>
                            <TabsTrigger value="grouped">Recibos de Inventario</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchPreview} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Actualizar
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleExport('csv')}
                        disabled={exportingCsv || movements.length === 0}
                    >
                        {exportingCsv ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                        Exportar Excel
                    </Button>
                    <Button
                        onClick={() => handleExport('pdf')}
                        disabled={exportingPdf || movements.length === 0}
                        title={viewMode === 'grouped' ? "La exportación global usa la vista detallada" : ""}
                    >
                        {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        Exportar PDF
                    </Button>
                    <Button variant="outline" onClick={handlePrint} disabled={movements.length === 0}>
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Filters Section */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 print:hidden p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="space-y-1">
                        <Label>Período</Label>
                        <Select
                            value={filters.preset}
                            onValueChange={(v) => setFilters((prev) => ({ ...prev, preset: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRESETS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {filters.preset === 'custom' && (
                        <>
                            <div className="space-y-1">
                                <Label>Desde</Label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Hasta</Label>
                                <Input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-1">
                        <Label>Tipo de Movimiento</Label>
                        <Select
                            value={filters.movementType}
                            onValueChange={(v) => setFilters((prev) => ({ ...prev, movementType: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MOVEMENT_TYPES.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {multiWarehouseEnabled && (
                        <div className="space-y-1">
                            <Label>Almacén</Label>
                            <Select
                                value={filters.warehouseId}
                                onValueChange={(v) => setFilters((prev) => ({ ...prev, warehouseId: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {warehouses.map((wh) => (
                                        <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                                            {wh.code} · {wh.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1 md:col-span-2">
                        <Label>Producto</Label>
                        <Select
                            value={filters.productId}
                            onValueChange={(v) => setFilters((prev) => ({ ...prev, productId: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los productos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los productos</SelectItem>
                                {productOptions.map((prod) => (
                                    <SelectItem key={prod.id} value={prod.id}>
                                        {prod.sku ? `${prod.sku} - ` : ''}{prod.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end justify-end md:col-span-full mt-2">
                        <Button onClick={handleApplyFilters} disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Aplicar Filtros
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Entradas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                                {netMovement.entries.toLocaleString()} <span className="text-xs font-normal">unds</span>
                            </div>
                            <p className="text-xs text-blue-600/80 mt-1">${netMovement.entriesCost.toFixed(2)}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-50/50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-300">Salidas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                                {netMovement.exits.toLocaleString()} <span className="text-xs font-normal">unds</span>
                            </div>
                            <p className="text-xs text-orange-600/80 mt-1">${netMovement.exitsCost.toFixed(2)}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Movimiento Neto (Cant)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className={`text-2xl font-bold ${netMovement.net >= 0 ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-600'}`}>
                                {netMovement.net > 0 ? '+' : ''}{netMovement.net.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-violet-50/50 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-violet-800 dark:text-violet-300">Movimiento Neto (Valor)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className={`text-2xl font-bold ${netMovement.netCost >= 0 ? 'text-violet-900 dark:text-violet-200' : 'text-red-600'}`}>
                                {netMovement.netCost > 0 ? '+' : ''}${netMovement.netCost.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Table */}
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            {viewMode === 'detailed' ? (
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo Total</TableHead>
                                    {multiWarehouseEnabled && <TableHead>Almacén</TableHead>}
                                </TableRow>
                            ) : (
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Documento / Ref</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead className="text-right">Ítems</TableHead>
                                    <TableHead className="text-right">Cant. Total</TableHead>
                                    <TableHead className="text-right">Costo Total</TableHead>
                                    <TableHead className="text-center w-[120px]">Acciones</TableHead>
                                </TableRow>
                            )}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : viewMode === 'detailed' && movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No se encontraron movimientos con los filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            ) : viewMode === 'grouped' && documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No se encontraron documentos agrupados con los filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            ) : viewMode === 'detailed' ? (
                                movements.map((mov, idx) => {
                                    const productName = typeof mov.productId === 'object' && mov.productId?.name
                                        ? mov.productId.name
                                        : mov.productName || mov.productSku || '—';

                                    return (
                                        <TableRow key={`${mov._id || mov.id || 'mov'}-${idx}`}>
                                            <TableCell className="whitespace-nowrap">
                                                {mov.createdAt ? format(new Date(mov.createdAt), 'dd/MM/yyyy HH:mm') : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                                    ${mov.movementType === 'IN' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                        mov.movementType === 'OUT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                            mov.movementType === 'TRANSFER' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}
                                                >
                                                    {mov.movementType}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium truncate max-w-[200px]">{productName}</div>
                                                {mov.productSku && <div className="text-xs text-muted-foreground">{mov.productSku}</div>}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {mov.movementType === 'OUT' ? '-' : ''}{mov.quantity}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ${(mov.totalCost || 0).toFixed(2)}
                                            </TableCell>
                                            {multiWarehouseEnabled && (
                                                <TableCell className="truncate max-w-[150px]">
                                                    {warehouses.find((w) => (w._id || w.id) === (mov.warehouseId || mov.warehouse))?.name || '—'}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                documents.map((doc, idx) => (
                                    <TableRow key={`${doc.batchId || doc._id || 'doc'}-${idx}`}>
                                        <TableCell className="whitespace-nowrap">
                                            {doc.date ? format(new Date(doc.date), 'dd/MM/yyyy HH:mm') : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{doc.documentReference || doc.reference || '—'}</div>
                                            <div className="text-xs text-muted-foreground">{doc.type}</div>
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate">
                                            {doc.supplierName || '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {doc.itemsCount} <span className="text-xs font-normal text-muted-foreground">ítems</span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {doc.type === 'OUT' ? '-' : ''}{doc.totalQuantity}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            ${(doc.totalCost || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => setSelectedDocument(doc)} title="Ver detalles">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    onClick={() => handlePrintDocument(doc)}
                                                    disabled={printingDocId === doc.batchId}
                                                    title="Imprimir Recibo de Inventario"
                                                >
                                                    {printingDocId === doc.batchId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {movements.length === 100 && (
                        <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 border-t">
                            Mostrando los últimos 100 movimientos. Usa los filtros o exporta el reporte para ver todos.
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Document Details Dialog */}
            <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Detalles del Documento</DialogTitle>
                    </DialogHeader>
                    {selectedDocument && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-md">
                                <div>
                                    <span className="font-semibold text-muted-foreground block">Referencia</span>
                                    {selectedDocument.documentReference || selectedDocument.reference || '—'}
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground block">Fecha</span>
                                    {selectedDocument.date ? format(new Date(selectedDocument.date), 'dd/MM/yyyy HH:mm') : '—'}
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground block">Proveedor</span>
                                    {selectedDocument.supplierName || '—'}
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground block">Registrado por</span>
                                    {selectedDocument.creatorName || '—'}
                                </div>
                                {selectedDocument.receivedBy && (
                                    <div>
                                        <span className="font-semibold text-muted-foreground block">Recibido por</span>
                                        {selectedDocument.receivedBy}
                                    </div>
                                )}
                                {selectedDocument.notes && (
                                    <div className="col-span-2">
                                        <span className="font-semibold text-muted-foreground block">Notas/Observaciones</span>
                                        {selectedDocument.notes}
                                    </div>
                                )}
                            </div>

                            <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0">
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">Cant.</TableHead>
                                            <TableHead className="text-right">Costo Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedDocument.movements || []).map((m, i) => {
                                            const productName = typeof m.productId === 'object' && m.productId?.name
                                                ? m.productId.name
                                                : m.productName || m.productSku || '—';
                                            return (
                                                <TableRow key={`det-${i}`}>
                                                    <TableCell className="font-medium max-w-[200px] truncate">{productName}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{m.productSku || '—'}</TableCell>
                                                    <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                                                    <TableCell className="text-right">${(m.totalCost || 0).toFixed(2)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
