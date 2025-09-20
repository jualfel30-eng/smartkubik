import { useState, useEffect, useCallback } from 'react';
import { getTenantUsers, inviteUser, updateUser, deleteUser, getRoles } from '../lib/api';
import { useAuth } from '../hooks/use-auth.jsx';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [newUserData, setNewUserData] = useState({ firstName: '', lastName: '', email: '', role: '' });
  const { hasPermission } = useAuth();

  const fetchUsersAndRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([getTenantUsers(), getRoles()]);
      
      if (usersResponse.success) {
        setUsers(usersResponse.data);
      } else {
        throw new Error(usersResponse.message || 'Failed to fetch users');
      }

      if (rolesResponse.success) {
        setRoles(rolesResponse.data);
      } else {
        throw new Error(rolesResponse.message || 'Failed to fetch roles');
      }

    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (roleId) => {
    setNewUserData(prev => ({ ...prev, role: roleId }));
  };

  const handleUpdateRoleChange = (roleId) => {
    setUserToEdit(prev => ({ ...prev, role: roleId }));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.role) {
        toast.error("Por favor, seleccione un rol para el nuevo usuario.");
        return;
    }
    try {
      const response = await inviteUser(newUserData);
      if (response.success) {
        toast.success('Usuario invitado exitosamente');
        setInviteModalOpen(false);
        fetchUsersAndRoles();
        setNewUserData({ firstName: '', lastName: '', email: '', role: '' });
      } else {
        throw new Error(response.message || 'Error al invitar al usuario');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!userToEdit) return;

    try {
      const { role } = userToEdit;
      const response = await updateUser(userToEdit._id, { role });
      if (response.success) {
        toast.success('Usuario actualizado exitosamente');
        setUpdateModalOpen(false);
        setUserToEdit(null);
        fetchUsersAndRoles();
      } else {
        throw new Error(response.message || 'Error al actualizar el usuario');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (userId) => {
    try {
      const response = await deleteUser(userId);
      if (response.success) {
        toast.success('Usuario eliminado exitosamente');
        fetchUsersAndRoles();
      } else {
        throw new Error(response.message || 'Error al eliminar el usuario');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openUpdateModal = (user) => {
    setUserToEdit({ ...user, role: user.role?._id || user.role });
    setUpdateModalOpen(true);
  }

  const getRoleName = (roleId) => {
    const role = roles.find(r => r._id === roleId);
    return role ? role.name : 'No asignado';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
        {hasPermission('users_create') && (
            <Dialog open={isInviteModalOpen} onOpenChange={setInviteModalOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Invitar Usuario
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInviteSubmit}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="firstName" className="text-right">Nombre</Label>
                    <Input id="firstName" name="firstName" value={newUserData.firstName} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="lastName" className="text-right">Apellido</Label>
                    <Input id="lastName" name="lastName" value={newUserData.lastName} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" name="email" type="email" value={newUserData.email} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Rol</Label>
                    <Select onValueChange={handleRoleChange} value={newUserData.role}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role._id} value={role._id}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button type="submit">Invitar</Button>
                </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
        )}
      </div>

      {isLoading ? (
        <p>Cargando usuarios...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              {hasPermission('users_update') || hasPermission('users_delete') ? (
                <TableHead className="text-right">Acciones</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role ? (typeof user.role === 'object' ? user.role.name : getRoleName(user.role)) : 'No asignado'}</TableCell>
                <TableCell className="text-right space-x-2">
                    {hasPermission('users_update') && (
                        <Button variant="outline" size="sm" onClick={() => openUpdateModal(user)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                    {hasPermission('users_delete') && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user._id)}>Eliminar</AlertDialogAction>
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

      {userToEdit && (
        <Dialog open={isUpdateModalOpen} onOpenChange={setUpdateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Actualizar Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="update-role" className="text-right">Rol</Label>
                  <Select onValueChange={handleUpdateRoleChange} value={userToEdit.role}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map(role => (
                            <SelectItem key={role._id} value={role._id}>{role.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" onClick={() => setUserToEdit(null)}>Cancelar</Button></DialogClose>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserManagement;