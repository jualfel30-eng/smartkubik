import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Loader2, RefreshCw, Printer, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi, getAuthToken, getApiBaseUrl } from '@/lib/api';
import { format } from 'date-fns';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
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
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [printingDocId, setPrintingDocId] = useState(null);

    const [warehouses, setWarehouses] = useState([]);
    const [inventories, setInventories] = useState([]);
    const [loading, setLoading] = useState(false);

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

            const paramsMovements = new URLSearchParams(params);
            // Default limit for movements for summary calc maxes at 200
            paramsMovements.set('limit', '200');

            const [docRes, movRes] = await Promise.all([
                fetchApi(`/inventory-movements/documents?${params.toString()}`),
                fetchApi(`/inventory-movements?${paramsMovements.toString()}`)
            ]);

            setDocuments(docRes?.data || docRes || []);
            setMovements(movRes?.data || movRes || []);
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
    }, []);

    const handleApplyFilters = () => {
        fetchPreview();
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
                        Visualiza e imprime recibos de inventario agrupados.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchPreview} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Actualizar
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
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Documento / Ref</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead className="text-right">Ítems</TableHead>
                                <TableHead className="text-right">Cant. Total</TableHead>
                                <TableHead className="text-right">Costo Total</TableHead>
                                <TableHead className="text-center w-[120px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No se encontraron documentos agrupados con los filtros aplicados.
                                    </TableCell>
                                </TableRow>
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
