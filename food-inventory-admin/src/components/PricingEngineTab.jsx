import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowRight, BarChart3, Calculator, DollarSign, Filter, Package, Percent, RefreshCw, Save, ShoppingCart, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchApi } from '@/lib/api';

// Error Boundary
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("PricingEngineTab Crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 text-red-900 border border-red-200 rounded">
                    <h2 className="font-bold flex gap-2"><AlertCircle /> Error en Pricing Orchestrator</h2>
                    <p className="text-sm mt-2">{this.state.error?.toString()}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function PricingOrchestratorContent() {
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [step, setStep] = useState(1); // 1: Scope, 2: Strategy, 3: Review (Implicit in UI flow)

    // --- SCOPE STATES ---
    const [paymentMethod, setPaymentMethod] = useState('all');
    const [stockLevel, setStockLevel] = useState('all');
    const [velocity, setVelocity] = useState('all');
    const [categoryId, setCategoryId] = useState('all');
    const [subCategory, setSubCategory] = useState('all');

    // Dynamic Data
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    // Fetch Categories on Mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetchApi('/products/categories/list');
                if (response.success && Array.isArray(response.data)) {
                    setCategories(response.data);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
                toast.error("Error cargando categorías");
            }
        };
        fetchCategories();
    }, []);

    // Fetch Subcategories when Category changes
    useEffect(() => {
        setSubCategory('all');
        const fetchSubcategories = async () => {
            try {
                let url = '/products/subcategories/list';
                if (categoryId !== 'all') {
                    url += `?category=${encodeURIComponent(categoryId)}`;
                }
                const response = await fetchApi(url);
                if (response.success && Array.isArray(response.data)) {
                    setSubCategories(response.data);
                } else {
                    setSubCategories([]);
                }
            } catch (error) {
                console.error("Error fetching subcategories:", error);
            }
        };
        fetchSubcategories();
    }, [categoryId]);

    // --- STRATEGY STATES ---
    const [strategyType, setStrategyType] = useState('inflation_formula');

    // Strategy: Inflation
    const [parallelRate, setParallelRate] = useState('');
    const [bcvRate, setBcvRate] = useState('');
    const [targetMargin, setTargetMargin] = useState('30');

    // Strategy: Margin Update
    const [marginUpdatePercent, setMarginUpdatePercent] = useState('5');

    // Strategy: Promotion
    const [promoDiscount, setPromoDiscount] = useState('15');
    const [startDate, setStartDate] = useState('');
    const [durationDays, setDurationDays] = useState('7');

    // Strategy: Fixed Price
    const [fixedPriceValue, setFixedPriceValue] = useState('');

    const handlePreview = async () => {
        setLoading(true);
        try {
            // Construct Payload based on Strategy
            let payload = {};
            if (strategyType === 'inflation_formula') {
                if (!parallelRate || !bcvRate) { throw new Error("Ingrese las tasas de cambio."); }
                payload = { parallelRate: parseFloat(parallelRate), bcvRate: parseFloat(bcvRate), targetMargin: parseFloat(targetMargin) / 100 };
            } else if (strategyType === 'margin_update') {
                payload = { percentage: parseFloat(marginUpdatePercent) };
            } else if (strategyType === 'promotion') {
                payload = {
                    discountPercentage: parseFloat(promoDiscount),
                    startDate: startDate ? new Date(startDate) : new Date(),
                    durationDays: parseInt(durationDays)
                };
            }

            // Map frontend strategy to backend operation type
            let backendOperationType = strategyType;
            if (strategyType === 'margin_update') backendOperationType = 'percentage_increase';

            const body = {
                criteria: {
                    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
                    stockLevel: stockLevel === 'all' ? undefined : stockLevel,
                    velocity: velocity === 'all' ? undefined : velocity,
                    category: categoryId === 'all' ? undefined : categoryId,
                    subcategory: subCategory === 'all' ? undefined : subCategory,
                },
                operation: {
                    type: backendOperationType,
                    payload
                }
            };

            const response = await fetchApi('/pricing/bulk/preview', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const results = response.data || [];
            if (strategyType === 'promotion' && results.length > 0) {
                // Enhance preview for promotion to showing the discount explicitly in newPrice
                // The backend 'preview' logic already does this calculation. 
                // But we should verify if we want to show badges here.
                // The Table logic already shows badges based on diffPercentage.
            }

            setPreviewData(results);

            if (results.length === 0) {
                toast.info("Sin resultados", { description: "Ningún producto coincide con los filtros." });
            } else {
                toast.success("Simulación completada", { description: `${results.length} productos analizados.` });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error en simulación", { description: error.message || "Verifique los datos." });
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!confirm("⚠️ ¿Aplicar estos precios/promociones?")) return;
        setLoading(true);
        try {
            // Re-construct payload (same as preview)
            let payload = {};
            if (strategyType === 'inflation_formula') {
                payload = { parallelRate: parseFloat(parallelRate), bcvRate: parseFloat(bcvRate), targetMargin: parseFloat(targetMargin) / 100 };
            } else if (strategyType === 'margin_update') {
                payload = { percentage: parseFloat(marginUpdatePercent) };
            } else if (strategyType === 'promotion') {
                payload = {
                    discountPercentage: parseFloat(promoDiscount),
                    startDate: startDate ? new Date(startDate) : new Date(),
                    durationDays: parseInt(durationDays)
                };
            }

            let backendOperationType = strategyType;
            if (strategyType === 'margin_update') backendOperationType = 'percentage_increase';

            const body = {
                criteria: {
                    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
                    stockLevel: stockLevel === 'all' ? undefined : stockLevel,
                    velocity: velocity === 'all' ? undefined : velocity,
                    category: categoryId === 'all' ? undefined : categoryId,
                    subcategory: subCategory === 'all' ? undefined : subCategory,
                },
                operation: {
                    type: backendOperationType,
                    payload
                }
            };

            const response = await fetchApi('/pricing/bulk/execute', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            toast.success("Actualización Masiva Exitosa", { description: response.message });
            setPreviewData([]);
        } catch (error) {
            console.error(error);
            toast.error("Error al aplicar", { description: "No se pudieron actualizar los precios." });
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary KPIs
    const totalImpact = previewData.reduce((acc, item) => acc + (item.newPrice - item.currentPrice), 0);
    const avgDiff = previewData.length > 0 ? previewData.reduce((acc, item) => acc + item.diffPercentage, 0) / previewData.length : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
            {/* LEFT SIDE: CONFIGURATION NAVIGATOR (Span 4) */}
            <div className="lg:col-span-4 space-y-6">

                {/* 1. SCOPE SECTION */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5 text-blue-600" />
                            1. Alcance (Scope)
                        </CardTitle>
                        <CardDescription>¿A qué productos afectaremos?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Categoría</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {categories.map((c, idx) => (
                                        <SelectItem key={idx} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Subcategoría</Label>
                            <Select value={subCategory} onValueChange={setSubCategory} disabled={subCategories.length === 0}>
                                <SelectTrigger><SelectValue placeholder={subCategories.length === 0 ? "Sin opciones" : "Seleccionar"} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {subCategories.map((sc, idx) => (
                                        <SelectItem key={idx} value={sc}>{sc}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Nivel de Stock</Label>
                            <Select value={stockLevel} onValueChange={setStockLevel}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todo el Inventario</SelectItem>
                                    <SelectItem value="low">Stock Bajo (Low Stock)</SelectItem>
                                    <SelectItem value="overstock">Sobre-Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Velocidad de Ventas</Label>
                            <Select value={velocity} onValueChange={setVelocity}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Cualquier Rotación</SelectItem>
                                    <SelectItem value="high">Alta Rotación (Bestsellers)</SelectItem>
                                    <SelectItem value="low">Baja Rotación (Huesos)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Método de Adquisición</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="zelle">Comprado con Zelle</SelectItem>
                                    <SelectItem value="usd_cash">Comprado con Efectivo</SelectItem>
                                    <SelectItem value="bolivares">Comprado con Bolívares</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. STRATEGY SECTION */}
                <Card className="border-l-4 border-l-violet-500 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-violet-600" />
                            2. Estrategia
                        </CardTitle>
                        <CardDescription>¿Qué acción masiva aplicaremos?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={strategyType} onValueChange={setStrategyType} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="inflation_formula">🇻🇪 Inflación</TabsTrigger>
                                <TabsTrigger value="margin_update">📈 Ajuste</TabsTrigger>
                                <TabsTrigger value="promotion">🏷️ Oferta</TabsTrigger>
                            </TabsList>

                            <TabsContent value="inflation_formula" className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Paralelo (Bs)</Label>
                                        <Input type="number" value={parallelRate} onChange={e => setParallelRate(e.target.value)} placeholder="Ej: 900" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">BCV (Bs)</Label>
                                        <Input type="number" value={bcvRate} onChange={e => setBcvRate(e.target.value)} placeholder="Ej: 300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Margen Objetivo (%)</Label>
                                    <Input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 bg-slate-100 dark:bg-slate-900 p-2 rounded">
                                    Ajusta precios para proteger reposición en divisas.
                                </p>
                            </TabsContent>

                            <TabsContent value="margin_update" className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Variación Porcentual (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" value={marginUpdatePercent} onChange={e => setMarginUpdatePercent(e.target.value)} />
                                        <TrendingUp className="text-green-500 h-4 w-4" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Usa valores negativos (ej: -10) para bajar precios.
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="promotion" className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Descuento a Aplicar (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" value={promoDiscount} onChange={e => setPromoDiscount(e.target.value)} className="text-red-600 font-bold" />
                                        <Percent className="text-red-500 h-4 w-4" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fecha Inicio</Label>
                                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Duración (Días)</Label>
                                        <Input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Activará la etiqueta "OFF" en el sistema.
                                </p>
                            </TabsContent>
                        </Tabs>

                        <Button onClick={handlePreview} disabled={loading} className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800">
                            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                            Simular Impacto
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT SIDE: SIMULATION & RESULTS (Span 8) */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">3. Simulación de Impacto</h2>
                    {previewData.length > 0 && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPreviewData([])}>Limpiar</Button>
                            <Button onClick={handleExecute} className="bg-green-600 hover:bg-green-700 text-white">
                                <Save className="mr-2 h-4 w-4" /> Ejecutar Cambios
                            </Button>
                        </div>
                    )}
                </div>

                {/* KPIS */}
                {previewData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Productos Afectados</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{previewData.length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Var. Promedio Precio</CardTitle></CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${avgDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {avgDiff > 0 ? '+' : ''}{avgDiff.toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Impacto Proyectado (Bs)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    Bs {totalImpact.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="h-32 bg-slate-50 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                        Configura los filtros y la estrategia para ver resultados.
                    </div>
                )}

                {/* DATA TABLE */}
                <div className="bg-white dark:bg-slate-950 rounded-md border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900">
                                <TableHead>Producto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Precio Actual</TableHead>
                                <TableHead className="text-right">Nuevo Precio</TableHead>
                                <TableHead className="text-center">Variación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Sin datos de simulación.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                previewData.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">
                                            {item.productName}
                                            {item.isVariant && <Badge variant="outline" className="ml-2 text-[10px] h-5">Var</Badge>}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {item.currentPrice?.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                                            {item.newPrice?.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={item.diffPercentage > 0 ? 'success' : 'destructive'}
                                                className={`w-16 justify-center ${item.diffPercentage > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.diffPercentage > 0 ? '+' : ''}{(item.diffPercentage || 0).toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div >
    );
}

export default function PricingEngineTab() {
    return (
        <ErrorBoundary>
            <PricingOrchestratorContent />
        </ErrorBoundary>
    );
}
