import { useState, useEffect } from 'react';
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PlanForm from './PlanForm';

const PlanManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const plansArray = await getSubscriptionPlans();
      // The API returns a raw array, so we check if it's an array before setting state
      if (Array.isArray(plansArray)) {
        setPlans(plansArray);
      }
    } catch (error) {
      toast.error('Error al cargar los planes', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async (planData) => {
    try {
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan._id, planData);
        toast.success('Plan actualizado exitosamente');
      } else {
        await createSubscriptionPlan(planData);
        toast.success('Plan creado exitosamente');
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
      fetchPlans(); // Refresh the list
    } catch (error) {
      toast.error('Error al guardar el plan', { description: error.message });
    }
  };

  const handleDelete = async (planId) => {
    if (!confirm('¿Estás seguro de que quieres archivar este plan?')) return;

    try {
      await deleteSubscriptionPlan(planId);
      toast.success('Plan archivado exitosamente');
      fetchPlans(); // Refresh the list
    } catch (error) {
      toast.error('Error al archivar el plan', { description: error.message });
    }
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestión de Planes de Suscripción</CardTitle>
              <CardDescription>Crea, edita y gestiona los planes para tus tenants.</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Nuevo Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio (USD)</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Órdenes/Mes</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan="6">Cargando planes...</TableCell></TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan._id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${(plan.price / 100).toFixed(2)}</TableCell>
                    <TableCell>{plan.limits.maxUsers}</TableCell>
                    <TableCell>{plan.limits.maxProducts}</TableCell>
                    <TableCell>{plan.limits.maxOrders}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(plan._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
          </DialogHeader>
          <PlanForm 
            plan={editingPlan} 
            onSave={handleSave} 
            onCancel={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlanManagement;
