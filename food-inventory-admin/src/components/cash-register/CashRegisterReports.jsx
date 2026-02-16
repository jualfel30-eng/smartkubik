import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    TrendingUp,
    Banknote,
    DollarSign,
    AlertTriangle,
    Download,
    Calendar,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';

// Helpers
const formatCurrency = (amount, currency = 'USD') => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
};

export default function CashRegisterReports() {
    const [activeReport, setActiveReport] = useState('change_analysis');
    const [loading, setLoading] = useState(false);
    const [cashiers, setCashiers] = useState([]);

    // Filtros compartidos
    const [filters, setFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        cashierId: 'all',
    });

    // Datos de reportes
    const [changeData, setChangeData] = useState([]);
    const [denominationData, setDenominationData] = useState([]);

    // Cargar cajeros para filtro
    useEffect(() => {
        const fetchCashiers = async () => {
            try {
                const response = await fetchApi('/users?role=cashier'); // Ajustar según API real de usuarios
                // Fallback si no hay endpoint simple de usuarios, o usar hardcoded por ahora si no existe
                if (response && Array.isArray(response.data)) {
                    setCashiers(response.data);
                }
            } catch (error) {
                console.warn('No se pudieron cargar cajeros', error);
            }
        };
        fetchCashiers();
    }, []);

    const fetchChangeAnalysis = useCallback(async () => {
        try {
            setLoading(true);
            const payload = {
                startDate: filters.startDate,
                endDate: filters.endDate,
                includeDetails: true
            };

            if (filters.cashierId !== 'all') {
                payload.cashierIds = [filters.cashierId];
            }

            const response = await fetchApi('/cash-register/reports/change-analysis', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setChangeData(response || []);
        } catch (error) {
            toast.error('Error al cargar análisis de vueltos');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const fetchDenominationReport = useCallback(async () => {
        try {
            setLoading(true);
            const payload = {
                startDate: filters.startDate,
                endDate: filters.endDate,
            };

            if (filters.cashierId !== 'all') {
                payload.cashierIds = [filters.cashierId];
            }

            const response = await fetchApi('/cash-register/reports/denominations', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setDenominationData(response || []);
        } catch (error) {
            toast.error('Error al cargar reporte de denominaciones');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (activeReport === 'change_analysis') {
            fetchChangeAnalysis();
        } else if (activeReport === 'denominations') {
            fetchDenominationReport();
        }
    }, [activeReport, filters, fetchChangeAnalysis, fetchDenominationReport]);

    return (
        <div className="space-y-6">
            {/* Filtros Globales del Reporte */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label>Fecha Inicio</Label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Fecha Fin</Label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Cajero</Label>
                            <Select
                                value={filters.cashierId}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, cashierId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los cajeros" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los cajeros</SelectItem>
                                    {cashiers.map(c => (
                                        <SelectItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={() => activeReport === 'change_analysis' ? fetchChangeAnalysis() : fetchDenominationReport()}
                            disabled={loading}
                        >
                            {loading ? 'Cargando...' : 'Actualizar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeReport} onValueChange={setActiveReport}>
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="change_analysis">Análisis de Vueltos</TabsTrigger>
                    <TabsTrigger value="denominations">Flujo de Billetes</TabsTrigger>
                    <TabsTrigger value="anomalies">Anomalías</TabsTrigger>
                </TabsList>

                <TabsContent value="change_analysis" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium"> Total Vuelto Dado (USD)</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(changeData.reduce((acc, curr) => acc + curr.totalChangeGivenUsd, 0), 'USD')}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium"> Total Vuelto Dado (VES)</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(changeData.reduce((acc, curr) => acc + curr.totalChangeGivenVes, 0), 'VES')}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Promedio Vuelto (USD)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(
                                        changeData.length > 0
                                            ? changeData.reduce((acc, curr) => acc + curr.avgChangeUsd, 0) / changeData.length
                                            : 0,
                                        'USD'
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Transacciones con Vuelto</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {changeData.reduce((acc, curr) => acc + curr.transactionCount, 0)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Desglose por Cajero</CardTitle>
                            <CardDescription>
                                Detalle de vueltos entregados por cada operador
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cajero</TableHead>
                                        <TableHead>Transacciones</TableHead>
                                        <TableHead>Vuelto Total (USD)</TableHead>
                                        <TableHead>Vuelto Total (VES)</TableHead>
                                        <TableHead>Promedio (USD)</TableHead>
                                        <TableHead>Máximo (USD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {changeData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                                No hay datos para el período seleccionado
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        changeData.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{item.cashierName}</TableCell>
                                                <TableCell>{item.transactionCount}</TableCell>
                                                <TableCell className="text-green-600 font-semibold">{formatCurrency(item.totalChangeGivenUsd, 'USD')}</TableCell>
                                                <TableCell className="text-blue-600">{formatCurrency(item.totalChangeGivenVes, 'VES')}</TableCell>
                                                <TableCell>{formatCurrency(item.avgChangeUsd, 'USD')}</TableCell>
                                                <TableCell>{formatCurrency(item.maxChangeUsd, 'USD')}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="denominations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Flujo de Billetes (Denominaciones)</CardTitle>
                            <CardDescription>
                                Conteo total de billetes manejados en los cierres de caja (Arqueo)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {denominationData.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-dashed border-2">
                                    <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No hay datos de denominaciones disponibles.</p>
                                    <p className="text-xs mt-1">Asegúrate de que los cierres de caja incluyan el desglose de billetes.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {denominationData.map(currencyData => (
                                        <div key={currencyData._id} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Badge variant="outline" className="text-base px-3 py-1">
                                                        {currencyData._id}
                                                    </Badge>
                                                </h3>
                                                <div className="text-right">
                                                    <span className="text-sm text-muted-foreground">Valor Total Contado</span>
                                                    <p className="text-xl font-bold text-primary">
                                                        {formatCurrency(currencyData.totalCurrencyValue, currencyData._id)}
                                                    </p>
                                                </div>
                                            </div>

                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Denominación</TableHead>
                                                        <TableHead className="text-right">Cantidad de Billetes</TableHead>
                                                        <TableHead className="text-right">Valor Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {currencyData.denominations.map((denom, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">
                                                                {currencyData._id === 'USD' ? '$' : 'Bs.'} {denom.denomination}
                                                            </TableCell>
                                                            <TableCell className="text-right">{denom.count}</TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {formatCurrency(denom.totalValue, currencyData._id)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="anomalies" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Alertas de Anomalías
                            </CardTitle>
                            <CardDescription>
                                Transacciones o comportamientos que superan los umbrales de riesgo (Promedio &gt; $20, Máximo &gt; $50)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {changeData.filter(d => d.avgChangeUsd > 20 || d.maxChangeUsd > 50).length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                    <p className="font-semibold text-green-700 dark:text-green-400">Todo parece estar en orden</p>
                                    <p className="text-sm">No se detectaron patrones inusuales en los vueltos entregados.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cajero</TableHead>
                                            <TableHead>Alerta</TableHead>
                                            <TableHead>Valor Detectado</TableHead>
                                            <TableHead>Umbral</TableHead>
                                            <TableHead>Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {changeData
                                            .filter(d => d.avgChangeUsd > 20 || d.maxChangeUsd > 50)
                                            .map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{item.cashierName}</TableCell>
                                                    <TableCell>
                                                        {item.avgChangeUsd > 20 && (
                                                            <Badge variant="destructive" className="mr-2">Promedio Alto</Badge>
                                                        )}
                                                        {item.maxChangeUsd > 50 && (
                                                            <Badge variant="warning">Vuelto Único Alto</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.avgChangeUsd > 20 && (
                                                            <div className="text-sm">Promedio: <b>{formatCurrency(item.avgChangeUsd)}</b></div>
                                                        )}
                                                        {item.maxChangeUsd > 50 && (
                                                            <div className="text-sm">Máximo: <b>{formatCurrency(item.maxChangeUsd)}</b></div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.avgChangeUsd > 20 ? '> $20.00 avg' : '> $50.00 max'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="outline" size="sm">Ver Detalles</Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
