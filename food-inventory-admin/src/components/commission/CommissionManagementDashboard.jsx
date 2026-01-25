import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import {
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Edit,
  Trash2,
  ShieldAlert,
  Target,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  BarChart3,
  Percent,
} from 'lucide-react';
import {
  getCommissionPlans,
  createCommissionPlan,
  updateCommissionPlan,
  deleteCommissionPlan,
  getCommissionRecords,
  approveCommission,
  rejectCommission,
  getCommissionsReport,
  getPendingCommissions,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getBonuses,
  createBonus,
  approveBonus,
  rejectBonus,
  getPendingBonuses,
  getTenantUsers,
} from '../../lib/api';
import { toast } from 'sonner';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { useAuth } from '../../hooks/use-auth';

export default function CommissionManagementDashboard() {
  const hasCommissionsModule = useModuleAccess('commissions');
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [commissionPlans, setCommissionPlans] = useState([]);
  const [commissionRecords, setCommissionRecords] = useState([]);
  const [pendingCommissions, setPendingCommissions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [pendingBonuses, setPendingBonuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState(null);

  // Modal states
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);

  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [statusFilter, setStatusFilter] = useState('all');

  // Commission Plan form states
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    type: 'percentage',
    defaultPercentage: 0,
    fixedAmount: 0,
    minOrderAmount: 0,
    maxCommissionAmount: 0,
    isActive: true,
    tiers: [],
  });

  // Goal form states
  const [goalForm, setGoalForm] = useState({
    name: '',
    description: '',
    type: 'sales_amount',
    targetAmount: 0,
    periodType: 'monthly',
    startDate: '',
    endDate: '',
    employeeId: '',
    bonusAmount: 0,
    autoAwardBonus: true,
  });

  // Bonus form states
  const [bonusForm, setBonusForm] = useState({
    employeeId: '',
    amount: 0,
    type: 'performance',
    reason: '',
  });

  // Fetch functions
  const fetchCommissionPlans = useCallback(async () => {
    try {
      const data = await getCommissionPlans();
      setCommissionPlans(data);
    } catch (error) {
      toast.error('Error al cargar planes de comisiones', { description: error.message });
    }
  }, []);

  const fetchCommissionRecords = useCallback(async () => {
    try {
      const data = await getCommissionRecords({ status: statusFilter !== 'all' ? statusFilter : undefined });
      setCommissionRecords(data.data || data);
    } catch (error) {
      toast.error('Error al cargar registros de comisiones', { description: error.message });
    }
  }, [statusFilter]);

  const fetchPendingCommissions = useCallback(async () => {
    try {
      const data = await getPendingCommissions();
      setPendingCommissions(data);
    } catch (error) {
      console.error('Error fetching pending commissions:', error);
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      const data = await getGoals();
      setGoals(data.data || data);
    } catch (error) {
      toast.error('Error al cargar metas', { description: error.message });
    }
  }, []);

  const fetchBonuses = useCallback(async () => {
    try {
      const data = await getBonuses();
      setBonuses(data.data || data);
    } catch (error) {
      toast.error('Error al cargar bonos', { description: error.message });
    }
  }, []);

  const fetchPendingBonuses = useCallback(async () => {
    try {
      const data = await getPendingBonuses();
      setPendingBonuses(data);
    } catch (error) {
      console.error('Error fetching pending bonuses:', error);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await getTenantUsers();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    try {
      const now = new Date();
      let startDate, endDate;

      if (selectedPeriod === 'current-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      } else if (selectedPeriod === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
        endDate = now.toISOString();
      }

      const data = await getCommissionsReport({ startDate, endDate });
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (!hasCommissionsModule) return;
    setLoading(true);
    Promise.all([
      fetchCommissionPlans(),
      fetchCommissionRecords(),
      fetchPendingCommissions(),
      fetchGoals(),
      fetchBonuses(),
      fetchPendingBonuses(),
      fetchEmployees(),
      fetchReportData(),
    ]).finally(() => setLoading(false));
  }, [
    hasCommissionsModule,
    fetchCommissionPlans,
    fetchCommissionRecords,
    fetchPendingCommissions,
    fetchGoals,
    fetchBonuses,
    fetchPendingBonuses,
    fetchEmployees,
    fetchReportData,
  ]);

  // Handlers
  const handleCreatePlan = async () => {
    try {
      if (editingPlan) {
        await updateCommissionPlan(editingPlan._id, planForm);
        toast.success('Plan de comisiones actualizado');
      } else {
        await createCommissionPlan(planForm);
        toast.success('Plan de comisiones creado');
      }
      setPlanModalOpen(false);
      resetPlanForm();
      fetchCommissionPlans();
    } catch (error) {
      toast.error('Error al guardar plan', { description: error.message });
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return;
    try {
      await deleteCommissionPlan(planId);
      toast.success('Plan eliminado');
      fetchCommissionPlans();
    } catch (error) {
      toast.error('Error al eliminar plan', { description: error.message });
    }
  };

  const handleApproveCommission = async (recordId) => {
    try {
      await approveCommission(recordId);
      toast.success('Comisión aprobada');
      fetchCommissionRecords();
      fetchPendingCommissions();
    } catch (error) {
      toast.error('Error al aprobar comisión', { description: error.message });
    }
  };

  const handleRejectCommission = async (recordId) => {
    const reason = prompt('Razón del rechazo:');
    if (!reason) return;
    try {
      await rejectCommission(recordId, reason);
      toast.success('Comisión rechazada');
      fetchCommissionRecords();
      fetchPendingCommissions();
    } catch (error) {
      toast.error('Error al rechazar comisión', { description: error.message });
    }
  };

  const handleCreateGoal = async () => {
    try {
      if (editingGoal) {
        await updateGoal(editingGoal._id, goalForm);
        toast.success('Meta actualizada');
      } else {
        await createGoal(goalForm);
        toast.success('Meta creada');
      }
      setGoalModalOpen(false);
      resetGoalForm();
      fetchGoals();
    } catch (error) {
      toast.error('Error al guardar meta', { description: error.message });
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('¿Estás seguro de eliminar esta meta?')) return;
    try {
      await deleteGoal(goalId);
      toast.success('Meta eliminada');
      fetchGoals();
    } catch (error) {
      toast.error('Error al eliminar meta', { description: error.message });
    }
  };

  const handleCreateBonus = async () => {
    try {
      await createBonus(bonusForm);
      toast.success('Bono creado');
      setBonusModalOpen(false);
      resetBonusForm();
      fetchBonuses();
      fetchPendingBonuses();
    } catch (error) {
      toast.error('Error al crear bono', { description: error.message });
    }
  };

  const handleApproveBonus = async (bonusId) => {
    try {
      await approveBonus(bonusId);
      toast.success('Bono aprobado');
      fetchBonuses();
      fetchPendingBonuses();
    } catch (error) {
      toast.error('Error al aprobar bono', { description: error.message });
    }
  };

  const handleRejectBonus = async (bonusId) => {
    const reason = prompt('Razón del rechazo:');
    if (!reason) return;
    try {
      await rejectBonus(bonusId, reason);
      toast.success('Bono rechazado');
      fetchBonuses();
      fetchPendingBonuses();
    } catch (error) {
      toast.error('Error al rechazar bono', { description: error.message });
    }
  };

  // Reset functions
  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      type: 'percentage',
      defaultPercentage: 0,
      fixedAmount: 0,
      minOrderAmount: 0,
      maxCommissionAmount: 0,
      isActive: true,
      tiers: [],
    });
    setEditingPlan(null);
  };

  const resetGoalForm = () => {
    setGoalForm({
      name: '',
      description: '',
      type: 'sales_amount',
      targetAmount: 0,
      periodType: 'monthly',
      startDate: '',
      endDate: '',
      employeeId: '',
      bonusAmount: 0,
      autoAwardBonus: true,
    });
    setEditingGoal(null);
  };

  const resetBonusForm = () => {
    setBonusForm({
      employeeId: '',
      amount: 0,
      type: 'performance',
      reason: '',
    });
  };

  const editPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      type: plan.type,
      defaultPercentage: plan.defaultPercentage || 0,
      fixedAmount: plan.fixedAmount || 0,
      minOrderAmount: plan.minOrderAmount || 0,
      maxCommissionAmount: plan.maxCommissionAmount || 0,
      isActive: plan.isActive,
      tiers: plan.tiers || [],
    });
    setPlanModalOpen(true);
  };

  const editGoalHandler = (goal) => {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      description: goal.description || '',
      type: goal.type,
      targetAmount: goal.targetAmount,
      periodType: goal.periodType,
      startDate: goal.startDate?.split('T')[0] || '',
      endDate: goal.endDate?.split('T')[0] || '',
      employeeId: goal.employeeId?._id || goal.employeeId || '',
      bonusAmount: goal.bonusAmount || 0,
      autoAwardBonus: goal.autoAwardBonus !== false,
    });
    setGoalModalOpen(true);
  };

  // Helper functions
  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>,
      approved: <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Aprobada</Badge>,
      rejected: <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rechazada</Badge>,
      paid: <Badge className="bg-blue-500"><DollarSign className="w-3 h-3 mr-1" />Pagada</Badge>,
      active: <Badge className="bg-green-500">Activa</Badge>,
      completed: <Badge className="bg-blue-500">Completada</Badge>,
      cancelled: <Badge variant="outline">Cancelada</Badge>,
    };
    return badges[status] || <Badge variant="outline">{status}</Badge>;
  };

  const getPlanTypeName = (type) => {
    const names = {
      percentage: 'Porcentaje',
      fixed: 'Monto Fijo',
      tiered: 'Por Niveles',
      hybrid: 'Mixto',
    };
    return names[type] || type;
  };

  const getGoalTypeName = (type) => {
    const names = {
      sales_amount: 'Monto de Ventas',
      sales_count: 'Cantidad de Ventas',
      revenue: 'Ingresos',
      units_sold: 'Unidades Vendidas',
      new_customers: 'Nuevos Clientes',
    };
    return names[type] || type;
  };

  const calculateGoalProgress = (goal) => {
    if (!goal.targetAmount) return 0;
    const current = goal.currentAmount || 0;
    return Math.min(100, Math.round((current / goal.targetAmount) * 100));
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e._id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Empleado';
  };

  // Export function
  const exportToCSV = () => {
    if (!commissionRecords.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['Empleado', 'Monto', 'Orden', 'Estado', 'Fecha'];
    const rows = commissionRecords.map(record => [
      getEmployeeName(record.employeeId),
      record.commissionAmount?.toFixed(2) || '0.00',
      record.orderNumber || record.orderId,
      record.status,
      new Date(record.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `comisiones_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Reporte exportado exitosamente');
  };

  if (loading && !commissionPlans.length) {
    return <div className="flex justify-center p-8 text-muted-foreground">Cargando módulo de comisiones...</div>;
  }

  if (!hasCommissionsModule) {
    return (
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Módulo de Comisiones no habilitado
          </CardTitle>
          <CardDescription>
            Activa el módulo de comisiones para este tenant desde Configuración &gt; Organización o solicita acceso al equipo de soporte.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Comisiones</h1>
          <p className="text-muted-foreground">
            Administra planes de comisiones, metas de ventas y bonos del equipo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comisiones</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              ${reportData?.totalCommissions?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissionRecords.filter(r => r.status === 'approved').length} aprobadas este período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingCommissions.length + pendingBonuses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingCommissions.length} comisiones, {pendingBonuses.length} bonos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Activas</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goals.filter(g => g.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {goals.filter(g => g.status === 'completed').length} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes Activos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionPlans.filter(p => p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              de {commissionPlans.length} totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="records">Comisiones</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="bonuses">Bonos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pendientes de Aprobación
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingCommissions.length > 0 || pendingBonuses.length > 0 ? (
                  <div className="space-y-3">
                    {pendingCommissions.slice(0, 5).map((record) => (
                      <div key={record._id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">${record.commissionAmount?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{getEmployeeName(record.employeeId)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleApproveCommission(record._id)}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRejectCommission(record._id)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingBonuses.slice(0, 3).map((bonus) => (
                      <div key={bonus._id} className="flex items-center justify-between p-2 border rounded bg-purple-50 dark:bg-purple-950/20">
                        <div>
                          <p className="font-medium">${bonus.amount?.toFixed(2)} <Badge variant="outline" className="ml-1 text-xs">Bono</Badge></p>
                          <p className="text-xs text-muted-foreground">{getEmployeeName(bonus.employeeId)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleApproveBonus(bonus._id)}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRejectBonus(bonus._id)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No hay items pendientes</p>
                )}
              </CardContent>
            </Card>

            {/* Active Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Progreso de Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goals.filter(g => g.status === 'active').length > 0 ? (
                  <div className="space-y-4">
                    {goals.filter(g => g.status === 'active').slice(0, 5).map((goal) => (
                      <div key={goal._id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-muted-foreground">
                            ${goal.currentAmount?.toFixed(2) || 0} / ${goal.targetAmount?.toFixed(2)}
                          </span>
                        </div>
                        <Progress value={calculateGoalProgress(goal)} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {getEmployeeName(goal.employeeId?._id || goal.employeeId)} - {calculateGoalProgress(goal)}% completado
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No hay metas activas</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planes de Comisiones</CardTitle>
                  <CardDescription>Configura cómo se calculan las comisiones</CardDescription>
                </div>
                <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetPlanForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Plan de Comisiones'}</DialogTitle>
                      <DialogDescription>Define cómo se calculan las comisiones para los vendedores</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Nombre del Plan</Label>
                        <Input
                          value={planForm.name}
                          onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                          placeholder="ej. Comisión Estándar"
                        />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea
                          value={planForm.description}
                          onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                          placeholder="Descripción del plan..."
                        />
                      </div>
                      <div>
                        <Label>Tipo de Comisión</Label>
                        <Select
                          value={planForm.type}
                          onValueChange={(value) => setPlanForm({ ...planForm, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentaje sobre venta</SelectItem>
                            <SelectItem value="fixed">Monto fijo por venta</SelectItem>
                            <SelectItem value="tiered">Por niveles (escalonado)</SelectItem>
                            <SelectItem value="hybrid">Mixto (base + porcentaje)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(planForm.type === 'percentage' || planForm.type === 'hybrid') && (
                        <div>
                          <Label>Porcentaje de Comisión (%)</Label>
                          <Input
                            type="number"
                            value={planForm.defaultPercentage}
                            onChange={(e) => setPlanForm({ ...planForm, defaultPercentage: Number(e.target.value) })}
                          />
                        </div>
                      )}
                      {(planForm.type === 'fixed' || planForm.type === 'hybrid') && (
                        <div>
                          <Label>Monto Fijo ($)</Label>
                          <Input
                            type="number"
                            value={planForm.fixedAmount}
                            onChange={(e) => setPlanForm({ ...planForm, fixedAmount: Number(e.target.value) })}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Monto Mínimo de Orden ($)</Label>
                          <Input
                            type="number"
                            value={planForm.minOrderAmount}
                            onChange={(e) => setPlanForm({ ...planForm, minOrderAmount: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Comisión Máxima ($)</Label>
                          <Input
                            type="number"
                            value={planForm.maxCommissionAmount}
                            onChange={(e) => setPlanForm({ ...planForm, maxCommissionAmount: Number(e.target.value) })}
                            placeholder="0 = sin límite"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={planForm.isActive}
                          onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="isActive" className="cursor-pointer">Plan Activo</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setPlanModalOpen(false); resetPlanForm(); }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreatePlan}>
                        {editingPlan ? 'Actualizar' : 'Crear'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {commissionPlans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Porcentaje/Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionPlans.map((plan) => (
                      <TableRow key={plan._id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{getPlanTypeName(plan.type)}</TableCell>
                        <TableCell>
                          {plan.type === 'percentage' && `${plan.defaultPercentage}%`}
                          {plan.type === 'fixed' && `$${plan.fixedAmount}`}
                          {plan.type === 'hybrid' && `$${plan.fixedAmount} + ${plan.defaultPercentage}%`}
                          {plan.type === 'tiered' && 'Escalonado'}
                        </TableCell>
                        <TableCell>
                          {plan.isActive ? (
                            <Badge className="bg-green-500">Activo</Badge>
                          ) : (
                            <Badge variant="outline">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => editPlan(plan)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan._id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay planes de comisiones configurados.
                  <br />
                  Crea uno para empezar a calcular comisiones.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registros de Comisiones</CardTitle>
                  <CardDescription>Comisiones generadas por ventas</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="approved">Aprobadas</SelectItem>
                    <SelectItem value="rejected">Rechazadas</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {commissionRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Orden</TableHead>
                      <TableHead className="text-right">Monto Venta</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionRecords.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">
                          {record.employeeName || getEmployeeName(record.employeeId)}
                        </TableCell>
                        <TableCell>{record.orderNumber || record.orderId?.substring(0, 8)}</TableCell>
                        <TableCell className="text-right">${record.orderAmount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${record.commissionAmount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {record.status === 'pending' && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => handleApproveCommission(record._id)}>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRejectCommission(record._id)}>
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay registros de comisiones para mostrar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Metas de Ventas</CardTitle>
                  <CardDescription>Define objetivos y bonos por cumplimiento</CardDescription>
                </div>
                <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetGoalForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Meta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingGoal ? 'Editar Meta' : 'Crear Meta de Ventas'}</DialogTitle>
                      <DialogDescription>Define un objetivo con bono por cumplimiento</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Nombre de la Meta</Label>
                        <Input
                          value={goalForm.name}
                          onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                          placeholder="ej. Meta Mensual de Ventas"
                        />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea
                          value={goalForm.description}
                          onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                          placeholder="Descripción de la meta..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Tipo de Meta</Label>
                          <Select
                            value={goalForm.type}
                            onValueChange={(value) => setGoalForm({ ...goalForm, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sales_amount">Monto de Ventas</SelectItem>
                              <SelectItem value="sales_count">Cantidad de Ventas</SelectItem>
                              <SelectItem value="revenue">Ingresos</SelectItem>
                              <SelectItem value="units_sold">Unidades Vendidas</SelectItem>
                              <SelectItem value="new_customers">Nuevos Clientes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Período</Label>
                          <Select
                            value={goalForm.periodType}
                            onValueChange={(value) => setGoalForm({ ...goalForm, periodType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="biweekly">Quincenal</SelectItem>
                              <SelectItem value="monthly">Mensual</SelectItem>
                              <SelectItem value="quarterly">Trimestral</SelectItem>
                              <SelectItem value="annual">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Empleado</Label>
                        <Select
                          value={goalForm.employeeId}
                          onValueChange={(value) => setGoalForm({ ...goalForm, employeeId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un empleado" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp._id} value={emp._id}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Objetivo ($)</Label>
                          <Input
                            type="number"
                            value={goalForm.targetAmount}
                            onChange={(e) => setGoalForm({ ...goalForm, targetAmount: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Bono por Cumplimiento ($)</Label>
                          <Input
                            type="number"
                            value={goalForm.bonusAmount}
                            onChange={(e) => setGoalForm({ ...goalForm, bonusAmount: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Fecha Inicio</Label>
                          <Input
                            type="date"
                            value={goalForm.startDate}
                            onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Fecha Fin</Label>
                          <Input
                            type="date"
                            value={goalForm.endDate}
                            onChange={(e) => setGoalForm({ ...goalForm, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoAwardBonus"
                          checked={goalForm.autoAwardBonus}
                          onChange={(e) => setGoalForm({ ...goalForm, autoAwardBonus: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="autoAwardBonus" className="cursor-pointer">
                          Otorgar bono automáticamente al cumplir meta
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setGoalModalOpen(false); resetGoalForm(); }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateGoal}>
                        {editingGoal ? 'Actualizar' : 'Crear'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meta</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Bono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((goal) => (
                      <TableRow key={goal._id}>
                        <TableCell className="font-medium">{goal.name}</TableCell>
                        <TableCell>{getEmployeeName(goal.employeeId?._id || goal.employeeId)}</TableCell>
                        <TableCell>{getGoalTypeName(goal.type)}</TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={calculateGoalProgress(goal)} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              ${goal.currentAmount?.toFixed(0) || 0} / ${goal.targetAmount?.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          ${goal.bonusAmount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>{getStatusBadge(goal.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => editGoalHandler(goal)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal._id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay metas configuradas.
                  <br />
                  Crea una meta para incentivar al equipo de ventas.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bonuses Tab */}
        <TabsContent value="bonuses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bonos</CardTitle>
                  <CardDescription>Bonos otorgados por desempeño o cumplimiento de metas</CardDescription>
                </div>
                <Dialog open={bonusModalOpen} onOpenChange={setBonusModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetBonusForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Bono
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Bono Manual</DialogTitle>
                      <DialogDescription>Otorga un bono discrecional a un empleado</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Empleado</Label>
                        <Select
                          value={bonusForm.employeeId}
                          onValueChange={(value) => setBonusForm({ ...bonusForm, employeeId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un empleado" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp._id} value={emp._id}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Monto del Bono ($)</Label>
                        <Input
                          type="number"
                          value={bonusForm.amount}
                          onChange={(e) => setBonusForm({ ...bonusForm, amount: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Tipo de Bono</Label>
                        <Select
                          value={bonusForm.type}
                          onValueChange={(value) => setBonusForm({ ...bonusForm, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="performance">Desempeño</SelectItem>
                            <SelectItem value="goal_achievement">Cumplimiento de Meta</SelectItem>
                            <SelectItem value="discretionary">Discrecional</SelectItem>
                            <SelectItem value="referral">Referido</SelectItem>
                            <SelectItem value="retention">Retención</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Razón / Justificación</Label>
                        <Textarea
                          value={bonusForm.reason}
                          onChange={(e) => setBonusForm({ ...bonusForm, reason: e.target.value })}
                          placeholder="Describe la razón del bono..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setBonusModalOpen(false); resetBonusForm(); }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateBonus}>Crear Bono</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {bonuses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonuses.map((bonus) => (
                      <TableRow key={bonus._id}>
                        <TableCell className="font-medium">
                          {bonus.employeeName || getEmployeeName(bonus.employeeId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {bonus.type === 'goal_achievement' && <Award className="w-3 h-3 mr-1" />}
                            {bonus.type === 'performance' && <TrendingUp className="w-3 h-3 mr-1" />}
                            {bonus.type?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-purple-600">
                          ${bonus.amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={bonus.reason}>
                          {bonus.reason || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(bonus.status)}</TableCell>
                        <TableCell>{new Date(bonus.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {bonus.status === 'pending' && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => handleApproveBonus(bonus._id)}>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRejectBonus(bonus._id)}>
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay bonos registrados.
                  <br />
                  Los bonos se generan al cumplir metas o se crean manualmente.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
