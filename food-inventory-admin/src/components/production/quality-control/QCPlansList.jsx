import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useQualityControl } from '@/hooks/useQualityControl';
import { QCPlanDialog } from './QCPlanDialog';

export function QCPlansList() {
  const { qcPlans, loading, error, loadQCPlans, createQCPlan, updateQCPlan, deleteQCPlan } =
    useQualityControl();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    loadQCPlans();
  }, [loadQCPlans]);

  const handleCreate = () => {
    setSelectedPlan(null);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleView = (plan) => {
    setSelectedPlan(plan);
    setViewMode(true);
    setDialogOpen(true);
  };

  const handleSave = async (planData) => {
    try {
      if (selectedPlan) {
        await updateQCPlan(selectedPlan._id, planData);
      } else {
        await createQCPlan(planData);
      }
      setDialogOpen(false);
      setSelectedPlan(null);
      setViewMode(false);
    } catch (err) {
      console.error('Error saving QC plan:', err);
      alert('Error al guardar el plan de QC: ' + err.message);
    }
  };

  const handleDelete = async (planId) => {
    if (window.confirm('¿Estás seguro de eliminar este plan de QC?')) {
      try {
        await deleteQCPlan(planId);
      } catch (err) {
        console.error('Error deleting QC plan:', err);
      }
    }
  };

  const getInspectionStagesBadge = (stages) => {
    if (!stages || stages.length === 0) return null;
    const stageLabels = {
      receiving: 'Recepción',
      in_process: 'En Proceso',
      final_inspection: 'Inspección Final'
    };
    return stages.map(stage => stageLabels[stage] || stage).join(', ');
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <CardTitle>Planes de Control de Calidad</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Plan
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
          )}

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Checkpoints</TableHead>
                  <TableHead>Etapas</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay planes de QC
                    </TableCell>
                  </TableRow>
                ) : (
                  qcPlans.map((plan) => (
                    <TableRow key={plan._id}>
                      <TableCell className="font-medium">{plan.planCode}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.name}</div>
                          {plan.description && (
                            <div className="text-sm text-muted-foreground">{plan.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.checkpoints?.length || 0} checkpoints</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{getInspectionStagesBadge(plan.inspectionStages)}</div>
                      </TableCell>
                      <TableCell>
                        {plan.applicableProducts?.length > 0 ? (
                          <Badge variant="outline">{plan.applicableProducts.length} productos</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {plan.isActive ? (
                          <Badge className="bg-green-500">Activo</Badge>
                        ) : (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleView(plan)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(plan._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QCPlanDialog
        open={dialogOpen}
        plan={selectedPlan}
        viewMode={viewMode}
        onClose={() => {
          setDialogOpen(false);
          setSelectedPlan(null);
          setViewMode(false);
        }}
        onSave={handleSave}
      />
    </>
  );
}
