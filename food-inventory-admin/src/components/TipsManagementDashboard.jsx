import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Edit,
  Trash2,
  ShieldAlert,
  Banknote,
  CreditCard,
} from 'lucide-react';
import {
  getTipsDistributionRules,
  createTipsDistributionRule,
  updateTipsDistributionRule,
  deleteTipsDistributionRule,
  distributeTips,
  getConsolidatedTipsReport,
} from '../lib/api';
import { toast } from 'sonner';
import { useModuleAccess } from '../hooks/useModuleAccess';

export default function TipsManagementDashboard() {
  const hasTipsModule = useModuleAccess('tips');
  const [loading, setLoading] = useState(false);
  const [distributionRules, setDistributionRules] = useState([]);
  const [consolidatedReport, setConsolidatedReport] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last-month');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Form states
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('equal');
  const [includedRoles, setIncludedRoles] = useState(['waiter', 'bartender']);
  const [poolTips, setPoolTips] = useState(true);

  // Distribution form
  const [distStartDate, setDistStartDate] = useState('');
  const [distEndDate, setDistEndDate] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('');

  const fetchDistributionRules = useCallback(async () => {
    try {
      const data = await getTipsDistributionRules();
      setDistributionRules(data);
    } catch (error) {
      toast.error('Error al cargar reglas de distribución', {
        description: error.message,
      });
    }
  }, []);

  const fetchConsolidatedReport = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConsolidatedTipsReport({ period: selectedPeriod });
      setConsolidatedReport(data);
    } catch (error) {
      toast.error('Error al cargar reporte consolidado', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (!hasTipsModule) return;
    fetchDistributionRules();
    fetchConsolidatedReport();
  }, [hasTipsModule, fetchDistributionRules, fetchConsolidatedReport]);

  const handleCreateRule = async () => {
    try {
      const ruleData = {
        name: ruleName,
        type: ruleType,
        rules: {
          includedRoles,
          poolTips,
          hourlyWeight: ruleType === 'by-hours' ? 1 : 0,
          salesWeight: ruleType === 'by-sales' ? 1 : 0,
        },
      };

      if (editingRule) {
        await updateTipsDistributionRule(editingRule._id, ruleData);
        toast.success('Regla actualizada correctamente');
      } else {
        await createTipsDistributionRule(ruleData);
        toast.success('Regla creada correctamente');
      }

      setRuleModalOpen(false);
      resetRuleForm();
      fetchDistributionRules();
    } catch (error) {
      toast.error('Error al guardar regla', {
        description: error.message,
      });
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('¿Estás seguro de eliminar esta regla?')) return;

    try {
      await deleteTipsDistributionRule(ruleId);
      toast.success('Regla eliminada correctamente');
      fetchDistributionRules();
    } catch (error) {
      toast.error('Error al eliminar regla', {
        description: error.message,
      });
    }
  };

  const handleDistribute = async () => {
    if (!selectedRuleId) {
      toast.error('Selecciona una regla de distribución');
      return;
    }

    if (!distStartDate || !distEndDate) {
      toast.error('Selecciona el período de distribución');
      return;
    }

    try {
      const result = await distributeTips({
        startDate: distStartDate,
        endDate: distEndDate,
        distributionRuleId: selectedRuleId,
      });

      toast.success('Propinas distribuidas correctamente', {
        description: `${result.employeesIncluded} empleados recibieron un total de $${result.totalTips.toFixed(2)}`,
      });

      setDistributeModalOpen(false);
      fetchConsolidatedReport();
    } catch (error) {
      toast.error('Error al distribuir propinas', {
        description: error.message,
      });
    }
  };

  const resetRuleForm = () => {
    setRuleName('');
    setRuleType('equal');
    setIncludedRoles(['waiter', 'bartender']);
    setPoolTips(true);
    setEditingRule(null);
  };

  const editRule = (rule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleType(rule.type);
    setIncludedRoles(rule.rules.includedRoles);
    setPoolTips(rule.rules.poolTips);
    setRuleModalOpen(true);
  };

  const getRuleTypeName = (type) => {
    const names = {
      equal: 'Distribución Equitativa',
      'by-hours': 'Por Horas Trabajadas',
      'by-sales': 'Por Ventas Generadas',
      custom: 'Personalizada',
    };
    return names[type] || type;
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!consolidatedReport || !consolidatedReport.byEmployee?.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['Empleado', 'Total Propinas (USD)', 'Órdenes Servidas', 'Promedio por Orden', 'Efectivo', 'Tarjeta', 'Digital'];
    const rows = consolidatedReport.byEmployee.map(emp => [
      emp.name,
      emp.totalTips?.toFixed(2) || '0.00',
      emp.orders || 0,
      emp.orders > 0 ? (emp.totalTips / emp.orders).toFixed(2) : '0.00',
      emp.cashTips?.toFixed(2) || '0.00',
      emp.cardTips?.toFixed(2) || '0.00',
      emp.digitalTips?.toFixed(2) || '0.00',
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['TOTALES',
      consolidatedReport.totalTips?.toFixed(2) || '0.00',
      consolidatedReport.totalOrders || 0,
      consolidatedReport.averageTipPerOrder?.toFixed(2) || '0.00',
      consolidatedReport.byMethod?.cash?.toFixed(2) || '0.00',
      consolidatedReport.byMethod?.card?.toFixed(2) || '0.00',
      consolidatedReport.byMethod?.digital?.toFixed(2) || '0.00',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `propinas_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Reporte exportado exitosamente');
  };

  // Get period label for display
  const getPeriodLabel = () => {
    const labels = {
      'last-week': 'Última Semana',
      'last-month': 'Último Mes',
      'last-3-months': 'Últimos 3 Meses',
    };
    return labels[selectedPeriod] || selectedPeriod;
  };

  if (loading && !consolidatedReport) {
    return <div className="flex justify-center p-8 text-muted-foreground">Cargando dashboard de propinas...</div>;
  }

  if (!hasTipsModule) {
    return (
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Módulo de Propinas no habilitado
          </CardTitle>
          <CardDescription>
            Activa el módulo de propinas para este tenant desde Configuración &gt; Organización o solicita acceso al equipo de soporte.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Propinas</h1>
          <p className="text-muted-foreground">
            Distribuye y reporta propinas del equipo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={!consolidatedReport?.byEmployee?.length}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={distributeModalOpen} onOpenChange={setDistributeModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Distribuir Propinas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Distribuir Propinas</DialogTitle>
                <DialogDescription>
                  Distribuye las propinas de un período según una regla
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Regla de Distribución</Label>
                  <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una regla" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributionRules
                        .filter((r) => r.isActive)
                        .map((rule) => (
                          <SelectItem key={rule._id} value={rule._id}>
                            {rule.name} ({getRuleTypeName(rule.type)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={distStartDate}
                      onChange={(e) => setDistStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Fecha Fin</Label>
                    <Input
                      type="date"
                      value={distEndDate}
                      onChange={(e) => setDistEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDistributeModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleDistribute}>Distribuir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {consolidatedReport && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Propinas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                ${consolidatedReport.totalTips?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {consolidatedReport.totalOrders || 0} órdenes en {getPeriodLabel().toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Orden</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${consolidatedReport.averageTipPerOrder?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {consolidatedReport.tipPercentage?.toFixed(1) || '0'}% sobre ventas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${consolidatedReport.byMethod?.cash?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {consolidatedReport.totalTips > 0
                  ? ((consolidatedReport.byMethod?.cash / consolidatedReport.totalTips) * 100).toFixed(0)
                  : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarjeta/Digital</CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ${((consolidatedReport.byMethod?.card || 0) + (consolidatedReport.byMethod?.digital || 0)).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {consolidatedReport.totalTips > 0
                  ? (((consolidatedReport.byMethod?.card || 0) + (consolidatedReport.byMethod?.digital || 0)) / consolidatedReport.totalTips * 100).toFixed(0)
                  : 0}% del total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="rules">Reglas de Distribución</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* Period Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reporte Consolidado</CardTitle>
                  <CardDescription>Propinas por empleado y período</CardDescription>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-week">Última Semana</SelectItem>
                    <SelectItem value="last-month">Último Mes</SelectItem>
                    <SelectItem value="last-3-months">Últimos 3 Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {consolidatedReport && consolidatedReport.byEmployee.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-right">Propinas Totales</TableHead>
                      <TableHead className="text-right">Órdenes Servidas</TableHead>
                      <TableHead className="text-right">Promedio por Orden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedReport.byEmployee.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${emp.totalTips.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{emp.orders}</TableCell>
                        <TableCell className="text-right">
                          ${(emp.totalTips / emp.orders).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de propinas para este período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Breakdown */}
          {consolidatedReport && consolidatedReport.byDay.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Propinas por Día</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Propinas</TableHead>
                      <TableHead className="text-right">Órdenes</TableHead>
                      <TableHead className="text-right">Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedReport.byDay.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">${day.tips.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{day.orders}</TableCell>
                        <TableCell className="text-right">
                          ${(day.tips / day.orders).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reglas de Distribución</CardTitle>
                  <CardDescription>
                    Configura cómo se distribuyen las propinas
                  </CardDescription>
                </div>
                <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetRuleForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Regla
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingRule ? 'Editar Regla' : 'Crear Nueva Regla'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura cómo se deben distribuir las propinas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Nombre de la Regla</Label>
                        <Input
                          value={ruleName}
                          onChange={(e) => setRuleName(e.target.value)}
                          placeholder="ej. Distribución Mensual"
                        />
                      </div>
                      <div>
                        <Label>Tipo de Distribución</Label>
                        <Select value={ruleType} onValueChange={setRuleType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equal">Equitativa</SelectItem>
                            <SelectItem value="by-hours">Por Horas Trabajadas</SelectItem>
                            <SelectItem value="by-sales">Por Ventas Generadas</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ruleType === 'equal' && 'Divide propinas en partes iguales'}
                          {ruleType === 'by-hours' &&
                            'Distribuye según horas trabajadas en el período'}
                          {ruleType === 'by-sales' &&
                            'Distribuye según las ventas generadas por cada mesero'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="poolTips"
                          checked={poolTips}
                          onChange={(e) => setPoolTips(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="poolTips" className="cursor-pointer">
                          Poolear todas las propinas
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRuleModalOpen(false);
                          resetRuleForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateRule}>
                        {editingRule ? 'Actualizar' : 'Crear'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {distributionRules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributionRules.map((rule) => (
                      <TableRow key={rule._id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{getRuleTypeName(rule.type)}</TableCell>
                        <TableCell>
                          {rule.isActive ? (
                            <Badge className="bg-green-500">Activa</Badge>
                          ) : (
                            <Badge variant="outline">Inactiva</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay reglas de distribución configuradas.
                  <br />
                  Crea una para empezar a distribuir propinas.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
