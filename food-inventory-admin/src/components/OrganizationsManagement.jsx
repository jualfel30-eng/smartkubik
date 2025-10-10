import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';
import { Building2, Users, Plus, Edit, Trash2, UserPlus, UserMinus, Crown, Shield, User as UserIcon } from 'lucide-react';

export default function OrganizationsManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewMembersDialogOpen, setIsViewMembersDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  useEffect(() => {
    loadOrganizations();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const data = await fetchApi('/auth/me');
      setCurrentUserId(data._id);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/organizations');
      setOrganizations(data);
    } catch (err) {
      toast.error('Error al cargar organizaciones', { description: err.message });
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await fetchApi('/organizations', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Organización creada exitosamente');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      loadOrganizations();
    } catch (err) {
      toast.error('Error al crear organización', { description: err.message });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await fetchApi(`/organizations/${selectedOrg._id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      toast.success('Organización actualizada exitosamente');
      setIsEditDialogOpen(false);
      setFormData({ name: '', description: '' });
      setSelectedOrg(null);
      loadOrganizations();
    } catch (err) {
      toast.error('Error al actualizar organización', { description: err.message });
    }
  };

  const handleDelete = async (orgId) => {
    if (!confirm('¿Estás seguro de eliminar esta organización? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await fetchApi(`/organizations/${orgId}`, { method: 'DELETE' });
      toast.success('Organización eliminada exitosamente');
      loadOrganizations();
    } catch (err) {
      toast.error('Error al eliminar organización', { description: err.message });
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      // Primero buscar el usuario por email
      const users = await fetchApi(`/users/search?email=${encodeURIComponent(newMemberEmail)}`);

      if (!users || users.length === 0) {
        toast.error('Usuario no encontrado', { description: 'No existe un usuario con ese email' });
        return;
      }

      const userId = users[0]._id;

      await fetchApi(`/organizations/${selectedOrg._id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role: newMemberRole }),
      });

      toast.success('Miembro agregado exitosamente');
      setIsAddMemberDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      loadOrganizations();
    } catch (err) {
      toast.error('Error al agregar miembro', { description: err.message });
    }
  };

  const handleRemoveMember = async (orgId, userId) => {
    if (!confirm('¿Estás seguro de remover este miembro de la organización?')) {
      return;
    }
    try {
      await fetchApi(`/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      });
      toast.success('Miembro removido exitosamente');
      loadOrganizations();
    } catch (err) {
      toast.error('Error al remover miembro', { description: err.message });
    }
  };

  const openEditDialog = (org) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      description: org.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openViewMembersDialog = (org) => {
    setSelectedOrg(org);
    setIsViewMembersDialogOpen(true);
  };

  const openAddMemberDialog = (org) => {
    setSelectedOrg(org);
    setIsAddMemberDialogOpen(true);
  };

  const isOwner = (org) => {
    return org.owner?._id === currentUserId || org.owner === currentUserId;
  };

  const isAdmin = (org) => {
    if (isOwner(org)) return true;
    return org.members?.some(
      (m) => (m.userId?._id === currentUserId || m.userId === currentUserId) && m.role === 'admin'
    );
  };

  const getRoleIcon = (role, isOwnerId) => {
    if (isOwnerId) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (role === 'admin') return <Shield className="h-4 w-4 text-blue-500" />;
    return <UserIcon className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return <div className="p-6">Cargando organizaciones...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mis Organizaciones</h1>
          <p className="text-muted-foreground">Gestiona tus organizaciones y sus miembros</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Organización
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {org.description || 'Sin descripción'}
                  </CardDescription>
                </div>
                {isOwner(org) && (
                  <Badge variant="default" className="ml-2">
                    <Crown className="h-3 w-3 mr-1" />
                    Owner
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {org.members?.length || 0} miembros
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openViewMembersDialog(org)}
                  >
                    Ver Miembros
                  </Button>
                </div>

                <div className="flex gap-2">
                  {isAdmin(org) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddMemberDialog(org)}
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {isOwner(org) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(org._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {organizations.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes organizaciones</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera organización para comenzar a colaborar
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Organización
            </Button>
          </div>
        )}
      </div>

      {/* Dialog: Crear Organización */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Crea una nueva organización para gestionar equipos y proyectos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mi Organización"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el propósito de esta organización..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Organización</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Organización */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Organización</DialogTitle>
            <DialogDescription>
              Actualiza la información de tu organización
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Nombre *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Miembros */}
      <Dialog open={isViewMembersDialogOpen} onOpenChange={setIsViewMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Miembros de {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Gestiona los miembros de esta organización
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrg?.members?.map((member) => {
                  const user = member.userId;
                  const memberUserId = user?._id || member.userId;
                  const isOrgOwner = selectedOrg.owner?._id === memberUserId || selectedOrg.owner === memberUserId;

                  return (
                    <TableRow key={memberUserId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role, isOrgOwner)}
                          {user?.firstName} {user?.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{user?.email}</TableCell>
                      <TableCell>
                        <Badge variant={isOrgOwner ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'}>
                          {isOrgOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Miembro'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!isOrgOwner && isAdmin(selectedOrg) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(selectedOrg._id, memberUserId)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewMembersDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Agregar Miembro */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Invita a un usuario a {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="member-email">Email del Usuario *</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="member-role">Rol</Label>
                <select
                  id="member-role"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="member">Miembro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Agregar Miembro</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
