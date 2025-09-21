
import React, { useState, useEffect } from 'react';
import { getRoles, createRole, updateRole, deleteRole, getPermissions } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { translatePermission } from '@/lib/permissionTranslations.js';
import { Button } from '@/components/ui/button';
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RolesManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const { hasPermission } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, permissionsResponse] = await Promise.all([getRoles(), getPermissions()]);

      if (rolesResponse.success) {
        setRoles(rolesResponse.data);
      } else {
        toast.error('Error al cargar los roles', { description: rolesResponse.message });
      }

      if (permissionsResponse.success) {
        setPermissions(permissionsResponse.data);
      } else {
        toast.error('Error al cargar los permisos', { description: permissionsResponse.message });
      }
    } catch (error) {
      toast.error('Error de red', { description: 'No se pudo conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission) => {
    setSelectedPermissions(prev => {
      const newPermissions = new Set(prev);
      if (newPermissions.has(permission)) {
        newPermissions.delete(permission);
      } else {
        newPermissions.add(permission);
      }
      return newPermissions;
    });
  };

  const handleSelectAll = () => {
    setSelectedPermissions(new Set(permissions));
  };

  const handleDeselectAll = () => {
    setSelectedPermissions(new Set());
  };

  const handleAddNewRole = () => {
    setCurrentRole(null);
    setSelectedPermissions(new Set());
    setIsDialogOpen(true);
  };

  const handleEditRole = (role) => {
    setCurrentRole({ ...role, name: role.name });
    setSelectedPermissions(new Set(role.permissions));
    setIsDialogOpen(true);
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const response = await deleteRole(roleId);
      if (response.success) {
        toast.success('Rol eliminado correctamente');
        fetchData();
      } else {
        toast.error('Error al eliminar el rol', { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red', { description: error.message });
    }
  };

  const handleSaveRole = async () => {
    if (!currentRole?.name) {
      toast.warning('El nombre del rol es obligatorio.');
      return;
    }

    setIsSaving(true);
    const roleData = {
      name: currentRole.name,
      permissions: Array.from(selectedPermissions),
    };

    try {
      let response;
      if (currentRole && currentRole._id) {
        response = await updateRole(currentRole._id, roleData);
      } else {
        response = await createRole(roleData);
      }

      if (response.success) {
        toast.success(`Rol ${currentRole?._id ? 'actualizado' : 'creado'} correctamente`);
        setIsDialogOpen(false);
        fetchData();
      } else {
        toast.error(`Error al ${currentRole?._id ? 'actualizar' : 'crear'} el rol`, { description: response.message });
      }
    } catch (error) {
      toast.error('Error de red', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const [group] = permission.split('_');
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(permission);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Roles y Permisos</CardTitle>
        {hasPermission('roles_create') && (
            <Button onClick={handleAddNewRole}>Añadir Rol</Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando roles...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Rol</TableHead>
                {hasPermission('roles_update') || hasPermission('roles_delete') ? (
                    <TableHead className="text-right">Acciones</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role._id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-right">
                    {hasPermission('roles_update') && (
                        <Button variant="outline" size="sm" onClick={() => handleEditRole(role)} className="mr-2">
                            Editar
                        </Button>
                    )}
                    {hasPermission('roles_delete') && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">Eliminar</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el rol.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRole(role._id)}>
                                    Continuar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentRole?._id ? 'Editar Rol' : 'Crear Nuevo Rol'}</DialogTitle>
            <DialogDescription>
              Define un nombre para el rol y asigna los permisos correspondientes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={currentRole?.name || ''}
                onChange={(e) => setCurrentRole({ ...currentRole, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
                <Label>Permisos</Label>
                <div className="flex items-center gap-2 mb-2">
                    <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll}>Marcar Todos</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleDeselectAll}>Limpiar</Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-4 border rounded-md">
                    {Object.entries(groupedPermissions).map(([group, permissions]) => (
                        <div key={group} className="mb-4">
                            <h4 className="font-semibold capitalize mb-2">{translatePermission(group, 'group')}</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {permissions.map((permission) => (
                                    <div key={permission} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={permission}
                                            checked={selectedPermissions.has(permission)}
                                            onCheckedChange={() => handlePermissionChange(permission)}
                                        />
                                        <label
                                            htmlFor={permission}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {translatePermission(permission)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RolesManagement;
