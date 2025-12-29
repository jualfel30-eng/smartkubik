import React, { useState } from 'react';
import { usePlaybooks } from '../hooks/use-playbooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import {
  Play,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PlaybookDialog } from './PlaybookDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

const TRIGGER_TYPE_LABELS = {
  stage_entry: 'Cambio de Etapa',
  source: 'Fuente de Lead',
  manual: 'Manual',
};

const STEP_TYPE_LABELS = {
  task: 'Tarea',
  email: 'Email',
  whatsapp: 'WhatsApp',
  notification: 'Notificación',
  wait: 'Esperar',
};

export function PlaybooksManagement() {
  const { playbooks, loading, createPlaybook, updatePlaybook, deletePlaybook } = usePlaybooks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playbookToDelete, setPlaybookToDelete] = useState(null);

  const handleCreate = () => {
    setEditingPlaybook(null);
    setDialogOpen(true);
  };

  const handleEdit = (playbook) => {
    setEditingPlaybook(playbook);
    setDialogOpen(true);
  };

  const handleDelete = (playbook) => {
    setPlaybookToDelete(playbook);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (playbookToDelete) {
      await deletePlaybook(playbookToDelete.id);
      setDeleteDialogOpen(false);
      setPlaybookToDelete(null);
    }
  };

  const handleSave = async (data) => {
    if (editingPlaybook) {
      await updatePlaybook(editingPlaybook.id, data);
    } else {
      await createPlaybook(data);
    }
    setDialogOpen(false);
    setEditingPlaybook(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Playbooks de Automatización</CardTitle>
              <CardDescription>
                Secuencias automáticas de tareas y mensajes por etapa o fuente
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Playbook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && playbooks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : playbooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay playbooks configurados</p>
              <p className="text-sm mt-2">
                Crea tu primer playbook para automatizar tareas
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Pasos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playbooks.map((playbook) => (
                  <TableRow key={playbook.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{playbook.name}</p>
                        {playbook.description && (
                          <p className="text-sm text-muted-foreground">
                            {playbook.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {TRIGGER_TYPE_LABELS[playbook.triggerType] || playbook.triggerType}
                        </Badge>
                        {playbook.triggerStage && (
                          <p className="text-xs text-muted-foreground">
                            Etapa: {playbook.triggerStage}
                          </p>
                        )}
                        {playbook.triggerSource && (
                          <p className="text-xs text-muted-foreground">
                            Fuente: {playbook.triggerSource}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {playbook.steps?.length || 0} paso(s)
                        </p>
                        {playbook.steps && playbook.steps.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {playbook.steps.slice(0, 3).map((step, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {STEP_TYPE_LABELS[step.type] || step.type}
                              </Badge>
                            ))}
                            {playbook.steps.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{playbook.steps.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {playbook.active ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(playbook)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(playbook)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlaybookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        playbook={editingPlaybook}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar playbook?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El playbook "{playbookToDelete?.name}"
              será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
