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
import { Tag, Plus, Edit, Trash2, BarChart3, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchApi } from '@/lib/api';

const CouponManager = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponStats, setCouponStats] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minimumPurchaseAmount: '',
    maxDiscountAmount: '',
    validFrom: '',
    validUntil: '',
    maxUsageCount: '',
    maxUsagePerCustomer: '',
    isActive: true,
  });

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/coupons?limit=100');
      setCoupons(response.data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los cupones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const fetchCouponStats = async (couponId) => {
    try {
      const response = await fetchApi(`/coupons/${couponId}/stats`);
      setCouponStats(response.data);
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
        code: formData.code.toUpperCase().trim(),
        description: formData.description || undefined,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minimumPurchaseAmount: formData.minimumPurchaseAmount
          ? parseFloat(formData.minimumPurchaseAmount)
          : undefined,
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : undefined,
        validFrom: new Date(formData.validFrom),
        validUntil: new Date(formData.validUntil),
        maxUsageCount: formData.maxUsageCount ? parseInt(formData.maxUsageCount) : undefined,
        maxUsagePerCustomer: formData.maxUsagePerCustomer
          ? parseInt(formData.maxUsagePerCustomer)
          : undefined,
        isActive: formData.isActive,
      };

      if (selectedCoupon) {
        await fetchApi(`/coupons/${selectedCoupon._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast({
          title: 'Cupón actualizado',
          description: `El cupón "${payload.code}" ha sido actualizado`,
        });
        setIsEditDialogOpen(false);
      } else {
        await fetchApi('/coupons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast({
          title: 'Cupón creado',
          description: `El cupón "${payload.code}" ha sido creado exitosamente`,
        });
        setIsCreateDialogOpen(false);
      }

      resetForm();
      fetchCoupons();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo guardar el cupón',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId) => {
    if (!confirm('¿Estás seguro de eliminar este cupón?')) return;

    try {
      await fetchApi(`/coupons/${couponId}`, {
        method: 'DELETE',
      });
      toast({
        title: 'Cupón eliminado',
        description: 'El cupón ha sido eliminado exitosamente',
      });
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cupón',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minimumPurchaseAmount: coupon.minimumPurchaseAmount?.toString() || '',
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
      validFrom: new Date(coupon.validFrom).toISOString().split('T')[0],
      validUntil: new Date(coupon.validUntil).toISOString().split('T')[0],
      maxUsageCount: coupon.maxUsageCount?.toString() || '',
      maxUsagePerCustomer: coupon.maxUsagePerCustomer?.toString() || '',
      isActive: coupon.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minimumPurchaseAmount: '',
      maxDiscountAmount: '',
      validFrom: '',
      validUntil: '',
      maxUsageCount: '',
      maxUsagePerCustomer: '',
      isActive: true,
    });
    setSelectedCoupon(null);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copiado',
      description: `Código "${code}" copiado al portapapeles`,
    });
  };

  const getCouponStatus = (coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (!coupon.isActive) return { label: 'Inactivo', variant: 'secondary' };
    if (now < validFrom) return { label: 'Programado', variant: 'outline' };
    if (now > validUntil) return { label: 'Expirado', variant: 'destructive' };
    if (coupon.maxUsageCount && coupon.currentUsageCount >= coupon.maxUsageCount) {
      return { label: 'Agotado', variant: 'destructive' };
    }
    return { label: 'Activo', variant: 'default' };
  };

  const CouponForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="code">Código del cupón *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="SAVE20"
            required
            disabled={!!selectedCoupon}
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

        <div>
          <Label htmlFor="discountType">Tipo de descuento *</Label>
          <Select
            value={formData.discountType}
            onValueChange={(value) => setFormData({ ...formData, discountType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Porcentaje (%)</SelectItem>
              <SelectItem value="fixed_amount">Monto fijo ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="discountValue">
            Valor del descuento * {formData.discountType === 'percentage' ? '(%)' : '($)'}
          </Label>
          <Input
            id="discountValue"
            type="number"
            step="0.01"
            value={formData.discountValue}
            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
            placeholder={formData.discountType === 'percentage' ? '20' : '10.00'}
            required
          />
        </div>

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
          <Label htmlFor="maxDiscount">Descuento máximo ($)</Label>
          <Input
            id="maxDiscount"
            type="number"
            step="0.01"
            value={formData.maxDiscountAmount}
            onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
            placeholder="100.00"
          />
        </div>

        <div>
          <Label htmlFor="validFrom">Válido desde *</Label>
          <Input
            id="validFrom"
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="validUntil">Válido hasta *</Label>
          <Input
            id="validUntil"
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            required
          />
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

        <div className="col-span-2 flex items-center justify-between">
          <Label htmlFor="isActive">Cupón activo</Label>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {selectedCoupon ? 'Actualizar' : 'Crear'} Cupón
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Cupones</h2>
          <p className="text-muted-foreground">Crea y administra códigos de descuento</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cupón
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cupón</DialogTitle>
              <DialogDescription>
                Define los parámetros de tu cupón de descuento
              </DialogDescription>
            </DialogHeader>
            <CouponForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Cupones Activos
          </CardTitle>
          <CardDescription>
            {coupons.length} cupón{coupons.length !== 1 ? 'es' : ''} en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : coupons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay cupones creados. ¡Crea tu primer cupón!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Validez</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold">{coupon.code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(coupon.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground">{coupon.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}%`
                          : `$${coupon.discountValue.toFixed(2)}`}
                        {coupon.minimumPurchaseAmount && (
                          <p className="text-xs text-muted-foreground">
                            Min: ${coupon.minimumPurchaseAmount.toFixed(2)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{new Date(coupon.validFrom).toLocaleDateString()}</div>
                        <div>{new Date(coupon.validUntil).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        {coupon.currentUsageCount} / {coupon.maxUsageCount || '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchCouponStats(coupon._id)}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(coupon._id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cupón</DialogTitle>
            <DialogDescription>
              Modifica los parámetros del cupón
            </DialogDescription>
          </DialogHeader>
          <CouponForm />
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Estadísticas del Cupón</DialogTitle>
            <DialogDescription>
              {couponStats?.code && `Código: ${couponStats.code}`}
            </DialogDescription>
          </DialogHeader>
          {couponStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Usos totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{couponStats.totalUsageCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Descuento otorgado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${couponStats.totalDiscountAmount.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ingresos totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${couponStats.totalOrderAmount.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Clientes únicos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{couponStats.uniqueCustomers}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Promedio</h4>
                <p>Descuento por uso: ${couponStats.averageDiscountAmount.toFixed(2)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponManager;
