import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Percent, Plus, Edit, Trash2, BarChart3, TrendingUp, Gift, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchApi } from '@/lib/api';

const PROMOTION_TYPES = [
  { value: 'percentage_discount', label: '% Descuento', icon: Percent },
  { value: 'fixed_amount_discount', label: 'Monto Fijo', icon: TrendingUp },
  { value: 'buy_x_get_y', label: 'Compra X Lleva Y', icon: Gift },
  { value: 'tiered_pricing', label: 'Precios Escalonados', icon: TrendingUp },
  { value: 'bundle_discount', label: 'Paquete con Descuento', icon: Package },
];

const PromotionsManager = () => {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [promotionStats, setPromotionStats] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage_discount',
    status: 'active',
    startDate: '',
    endDate: '',
    priority: '0',
    discountValue: '',
    maxDiscountAmount: '',
    minimumPurchaseAmount: '',
    minimumQuantity: '',
    buyQuantity: '',
    getQuantity: '',
    getDiscountPercentage: '100',
    autoApply: true,
    showInStorefront: true,
    maxUsageCount: '',
    maxUsagePerCustomer: '',
  });

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/promotions?limit=100');
      setPromotions(response.data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las promociones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const fetchPromotionStats = async (promotionId) => {
    try {
      const response = await fetchApi(`/promotions/${promotionId}/stats`);
      setPromotionStats(response.data);
      setIsStatsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        status: formData.status,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        priority: parseInt(formData.priority) || 0,
        autoApply: formData.autoApply,
        showInStorefront: formData.showInStorefront,
        maxUsageCount: formData.maxUsageCount ? parseInt(formData.maxUsageCount) : undefined,
        maxUsagePerCustomer: formData.maxUsagePerCustomer
          ? parseInt(formData.maxUsagePerCustomer)
          : undefined,
        minimumPurchaseAmount: formData.minimumPurchaseAmount
          ? parseFloat(formData.minimumPurchaseAmount)
          : undefined,
        minimumQuantity: formData.minimumQuantity ? parseInt(formData.minimumQuantity) : undefined,
      };

      // Add type-specific fields
      switch (formData.type) {
        case 'percentage_discount':
        case 'fixed_amount_discount':
          payload.discountValue = parseFloat(formData.discountValue);
          if (formData.maxDiscountAmount) {
            payload.maxDiscountAmount = parseFloat(formData.maxDiscountAmount);
          }
          break;

        case 'buy_x_get_y':
          payload.buyQuantity = parseInt(formData.buyQuantity);
          payload.getQuantity = parseInt(formData.getQuantity);
          payload.getDiscountPercentage = parseFloat(formData.getDiscountPercentage);
          break;

        case 'tiered_pricing':
          // For now, simplified - in real app would have tier builder
          payload.tiers = [
            { minQuantity: 2, maxQuantity: 4, discountPercentage: 5 },
            { minQuantity: 5, maxQuantity: 9, discountPercentage: 10 },
            { minQuantity: 10, discountPercentage: 15 },
          ];
          break;

        case 'bundle_discount':
          // For now, simplified - in real app would have bundle builder
          payload.bundleDiscountPercentage = parseFloat(formData.discountValue);
          break;
      }

      if (selectedPromotion) {
        await fetchApi(`/promotions/${selectedPromotion._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast({
          title: 'Promoción actualizada',
          description: `La promoción "${payload.name}" ha sido actualizada`,
        });
        setIsEditDialogOpen(false);
      } else {
        await fetchApi('/promotions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast({
          title: 'Promoción creada',
          description: `La promoción "${payload.name}" ha sido creada exitosamente`,
        });
        setIsCreateDialogOpen(false);
      }

      resetForm();
      fetchPromotions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo guardar la promoción',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promotionId) => {
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;

    try {
      await fetchApi(`/promotions/${promotionId}`, {
        method: 'DELETE',
      });
      toast({
        title: 'Promoción eliminada',
        description: 'La promoción ha sido eliminada exitosamente',
      });
      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la promoción',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (promotion) => {
    setSelectedPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      status: promotion.status,
      startDate: new Date(promotion.startDate).toISOString().split('T')[0],
      endDate: new Date(promotion.endDate).toISOString().split('T')[0],
      priority: promotion.priority?.toString() || '0',
      discountValue: promotion.discountValue?.toString() || '',
      maxDiscountAmount: promotion.maxDiscountAmount?.toString() || '',
      minimumPurchaseAmount: promotion.minimumPurchaseAmount?.toString() || '',
      minimumQuantity: promotion.minimumQuantity?.toString() || '',
      buyQuantity: promotion.buyQuantity?.toString() || '',
      getQuantity: promotion.getQuantity?.toString() || '',
      getDiscountPercentage: promotion.getDiscountPercentage?.toString() || '100',
      autoApply: promotion.autoApply,
      showInStorefront: promotion.showInStorefront,
      maxUsageCount: promotion.maxUsageCount?.toString() || '',
      maxUsagePerCustomer: promotion.maxUsagePerCustomer?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage_discount',
      status: 'active',
      startDate: '',
      endDate: '',
      priority: '0',
      discountValue: '',
      maxDiscountAmount: '',
      minimumPurchaseAmount: '',
      minimumQuantity: '',
      buyQuantity: '',
      getQuantity: '',
      getDiscountPercentage: '100',
      autoApply: true,
      showInStorefront: true,
      maxUsageCount: '',
      maxUsagePerCustomer: '',
    });
    setSelectedPromotion(null);
  };

  const getPromotionStatus = (promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    if (promotion.status === 'inactive') return { label: 'Inactivo', variant: 'secondary' };
    if (now < startDate) return { label: 'Programado', variant: 'outline' };
    if (now > endDate) return { label: 'Expirado', variant: 'destructive' };
    if (promotion.maxUsageCount && promotion.currentUsageCount >= promotion.maxUsageCount) {
      return { label: 'Agotado', variant: 'destructive' };
    }
    return { label: 'Activo', variant: 'default' };
  };

  const getTypeLabel = (type) => {
    const found = PROMOTION_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'percentage_discount':
        return (
          <>
            <div>
              <Label htmlFor="discountValue">Porcentaje de descuento (%) *</Label>
              <Input
                id="discountValue"
                type="number"
                step="0.01"
                max="100"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder="20"
                required
              />
            </div>
            <div>
              <Label htmlFor="maxDiscountAmount">Descuento máximo ($)</Label>
              <Input
                id="maxDiscountAmount"
                type="number"
                step="0.01"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                placeholder="100.00"
              />
            </div>
          </>
        );

      case 'fixed_amount_discount':
        return (
          <div className="col-span-2">
            <Label htmlFor="discountValue">Monto de descuento ($) *</Label>
            <Input
              id="discountValue"
              type="number"
              step="0.01"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
              placeholder="10.00"
              required
            />
          </div>
        );

      case 'buy_x_get_y':
        return (
          <>
            <div>
              <Label htmlFor="buyQuantity">Cantidad a comprar (X) *</Label>
              <Input
                id="buyQuantity"
                type="number"
                value={formData.buyQuantity}
                onChange={(e) => setFormData({ ...formData, buyQuantity: e.target.value })}
                placeholder="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="getQuantity">Cantidad gratis (Y) *</Label>
              <Input
                id="getQuantity"
                type="number"
                value={formData.getQuantity}
                onChange={(e) => setFormData({ ...formData, getQuantity: e.target.value })}
                placeholder="1"
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="getDiscountPercentage">Descuento en Y (%) *</Label>
              <Input
                id="getDiscountPercentage"
                type="number"
                step="1"
                max="100"
                value={formData.getDiscountPercentage}
                onChange={(e) => setFormData({ ...formData, getDiscountPercentage: e.target.value })}
                placeholder="100"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                100% = gratis, 50% = mitad de precio
              </p>
            </div>
          </>
        );

      case 'tiered_pricing':
        return (
          <div className="col-span-2">
            <Label>Niveles de descuento</Label>
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p>• 2-4 unidades: 5% descuento</p>
              <p>• 5-9 unidades: 10% descuento</p>
              <p>• 10+ unidades: 15% descuento</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Los niveles están predefinidos. En una versión futura podrás personalizarlos.
            </p>
          </div>
        );

      case 'bundle_discount':
        return (
          <div className="col-span-2">
            <Label htmlFor="discountValue">Descuento en paquete (%) *</Label>
            <Input
              id="discountValue"
              type="number"
              step="0.01"
              max="100"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
              placeholder="15"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Descuento aplicado cuando se compran todos los productos del paquete
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const PromotionForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Nombre de la promoción *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Descuento de Verano 2024"
            required
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="20% de descuento en toda la tienda"
            rows={2}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="type">Tipo de promoción *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            disabled={!!selectedPromotion}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMOTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPromotion && (
            <p className="text-xs text-muted-foreground mt-1">
              El tipo no puede modificarse después de crear la promoción
            </p>
          )}
        </div>

        {renderTypeSpecificFields()}

        <div>
          <Label htmlFor="minimumPurchase">Compra mínima ($)</Label>
          <Input
            id="minimumPurchase"
            type="number"
            step="0.01"
            value={formData.minimumPurchaseAmount}
            onChange={(e) => setFormData({ ...formData, minimumPurchaseAmount: e.target.value })}
            placeholder="50.00"
          />
        </div>

        <div>
          <Label htmlFor="minimumQuantity">Cantidad mínima</Label>
          <Input
            id="minimumQuantity"
            type="number"
            value={formData.minimumQuantity}
            onChange={(e) => setFormData({ ...formData, minimumQuantity: e.target.value })}
            placeholder="1"
          />
        </div>

        <div>
          <Label htmlFor="startDate">Fecha de inicio *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="endDate">Fecha de fin *</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="priority">Prioridad</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Mayor número = mayor prioridad
          </p>
        </div>

        <div>
          <Label htmlFor="status">Estado</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
              <SelectItem value="scheduled">Programado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="maxUsage">Usos totales máximos</Label>
          <Input
            id="maxUsage"
            type="number"
            value={formData.maxUsageCount}
            onChange={(e) => setFormData({ ...formData, maxUsageCount: e.target.value })}
            placeholder="Ilimitado"
          />
        </div>

        <div>
          <Label htmlFor="maxUsagePerCustomer">Usos por cliente</Label>
          <Input
            id="maxUsagePerCustomer"
            type="number"
            value={formData.maxUsagePerCustomer}
            onChange={(e) => setFormData({ ...formData, maxUsagePerCustomer: e.target.value })}
            placeholder="Ilimitado"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="autoApply">Auto-aplicar</Label>
          <Switch
            id="autoApply"
            checked={formData.autoApply}
            onCheckedChange={(checked) => setFormData({ ...formData, autoApply: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showInStorefront">Mostrar en tienda</Label>
          <Switch
            id="showInStorefront"
            checked={formData.showInStorefront}
            onCheckedChange={(checked) => setFormData({ ...formData, showInStorefront: checked })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {selectedPromotion ? 'Actualizar' : 'Crear'} Promoción
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Promociones</h2>
          <p className="text-muted-foreground">Crea y administra promociones automáticas</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Promoción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Promoción</DialogTitle>
              <DialogDescription>
                Define los parámetros de tu promoción
              </DialogDescription>
            </DialogHeader>
            <PromotionForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Promociones
          </CardTitle>
          <CardDescription>
            {promotions.length} promoción{promotions.length !== 1 ? 'es' : ''} en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : promotions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay promociones creadas. ¡Crea tu primera promoción!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promotion) => {
                  const status = getPromotionStatus(promotion);
                  return (
                    <TableRow key={promotion._id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{promotion.name}</div>
                          {promotion.description && (
                            <p className="text-xs text-muted-foreground">{promotion.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(promotion.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {promotion.discountValue && (
                          <span>
                            {promotion.type === 'percentage_discount'
                              ? `${promotion.discountValue}%`
                              : `$${promotion.discountValue.toFixed(2)}`}
                          </span>
                        )}
                        {promotion.buyQuantity && promotion.getQuantity && (
                          <span>
                            {promotion.buyQuantity}+{promotion.getQuantity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{new Date(promotion.startDate).toLocaleDateString()}</div>
                        <div>{new Date(promotion.endDate).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        {promotion.currentUsageCount || 0} / {promotion.maxUsageCount || '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchPromotionStats(promotion._id)}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(promotion)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(promotion._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Promoción</DialogTitle>
            <DialogDescription>
              Modifica los parámetros de la promoción
            </DialogDescription>
          </DialogHeader>
          <PromotionForm />
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Estadísticas de la Promoción</DialogTitle>
            <DialogDescription>
              {promotionStats?.name}
            </DialogDescription>
          </DialogHeader>
          {promotionStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Usos totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{promotionStats.totalUsageCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Descuento otorgado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${promotionStats.totalDiscountGiven.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ingresos generados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${promotionStats.totalRevenue.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Órdenes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{promotionStats.totalOrders}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Promedio por orden</h4>
                  <p>${promotionStats.averageOrderValue.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Descuento promedio</h4>
                  <p>${promotionStats.averageDiscountPerOrder.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionsManager;
