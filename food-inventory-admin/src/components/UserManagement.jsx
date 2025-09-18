import { useState, useEffect, useCallback } from 'react';
import { getTenantUsers, inviteUser, updateUser, deleteUser } from '../lib/api';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [newUserData, setNewUserData] = useState({ firstName: '', lastName: '', email: '', role: 'staff' });

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getTenantUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setUserToEdit(prev => ({ ...prev, [name]: value }));
  };


  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await inviteUser(newUserData);
      if (response.success) {
        toast.success('Usuario invitado exitosamente');
        setInviteModalOpen(false);
        fetchUsers();
        setNewUserData({ firstName: '', lastName: '', email: '', role: 'staff' });
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
        fetchUsers();
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
        fetchUsers();
      } else {
        throw new Error(response.message || 'Error al eliminar el usuario');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openUpdateModal = (user) => {
    setUserToEdit(user);
    setUpdateModalOpen(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
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
                  <Input id="role" name="role" value={newUserData.role} onChange={handleInputChange} className="col-span-3" required/>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button type="submit">Invitar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openUpdateModal(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
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
                  <Input id="update-role" name="role" value={userToEdit.role} onChange={handleUpdateInputChange} className="col-span-3" />
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
