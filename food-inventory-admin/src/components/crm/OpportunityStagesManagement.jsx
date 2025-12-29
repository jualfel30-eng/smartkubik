import React, { useState, useEffect } from 'react';
import { useCrmContext } from '@/context/CrmContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";

export default function OpportunityStagesManagement() {
    const { stageDefinitions, loadOpportunityStages, createOpportunityStage, updateOpportunityStage, deleteOpportunityStage } = useCrmContext();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    const [formData, setFormData] = useState({ name: '', probability: 10 });

    useEffect(() => {
        loadOpportunityStages();
    }, [loadOpportunityStages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStage) {
                await updateOpportunityStage(editingStage._id, formData);
                toast.success("Etapa actualizada", { description: "Los cambios se guardaron correctamente." });
            } else {
                await createOpportunityStage(formData);
                toast.success("Etapa creada", { description: "La nueva etapa se ha añadido al embudo." });
            }
            setIsDialogOpen(false);
            setEditingStage(null);
            setFormData({ name: '', probability: 10 });
        } catch (error) {
            toast.error("Error", {
                description: error.message || "No se pudo guardar la etapa.",
            });
        }
    };

    const handleEdit = (stage) => {
        setEditingStage(stage);
        setFormData({ name: stage.name, probability: stage.probability, order: stage.order });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteOpportunityStage(id);
            toast.success("Etapa eliminada", { description: "La etapa ha sido removida." });
        } catch (error) {
            toast.error("Error", {
                description: error.message || "No se pudo eliminar la etapa.",
            });
        }
    };

    const openNewDialog = () => {
        setEditingStage(null);
        setFormData({ name: '', probability: 10 });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Etapas del Embudo</h2>
                    <p className="text-sm text-gray-500">Define las etapas y probabilidades de cierre para tus oportunidades.</p>
                </div>
                <Button onClick={openNewDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Etapa
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Probabilidad</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stageDefinitions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                    No hay etapas personalizadas. Se usarán las predeterminadas del sistema.
                                </TableCell>
                            </TableRow>
                        ) : (
                            stageDefinitions.map((stage) => (
                                <TableRow key={stage._id}>
                                    <TableCell className="font-medium">{stage.name}</TableCell>
                                    <TableCell>{stage.probability}%</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción eliminará la etapa "{stage.name}". Las oportunidades en esta etapa deberán moverse manualmente.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-red-500" onClick={() => handleDelete(stage._id)}>
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nueva Etapa'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la etapa</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Negociación"
                                required
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label htmlFor="probability">Probabilidad de cierre</Label>
                                <span className="text-sm text-gray-500">{formData.probability}%</span>
                            </div>
                            <Slider
                                id="probability"
                                min={0}
                                max={100}
                                step={5}
                                value={[formData.probability]}
                                onValueChange={(val) => setFormData({ ...formData, probability: val[0] })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
