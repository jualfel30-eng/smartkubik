import { useState, useEffect } from 'react';
import { UserPlus, Mail, Shield, Trash2, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { listItem, STAGGER } from '@/lib/motion';
import { toast } from 'sonner';
import { getTenantUsers, getRoles, inviteUser, updateUser, deleteUser, resendUserInvite } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import haptics from '@/lib/haptics';
import MobileSettingsLayout from './MobileSettingsLayout';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';
import MobileActionSheet from '../MobileActionSheet';

function getInitials(user) {
  const first = user.firstName || user.name || user.email || '';
  const last = user.lastName || '';
  return (first[0] || '') + (last[0] || '');
}

function getRoleName(roleId, roles) {
  const role = roles.find(r => r._id === roleId);
  return role?.name || 'Sin rol';
}

export default function MobileSettingsUsers({ onBack }) {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '', role: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([getTenantUsers(), getRoles()]);
      setUsers(usersRes?.data || usersRes || []);
      setRoles(rolesRes?.data || rolesRes || []);
    } catch (err) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('El email es requerido');
      return;
    }
    setActionLoading(true);
    try {
      const res = await inviteUser(inviteData);
      if (res?.error) {
        toast.error('Error al invitar', { description: res.error });
        return;
      }
      haptics.success();
      toast.success('Invitacion enviada');
      setShowInvite(false);
      setInviteData({ email: '', firstName: '', lastName: '', role: '' });
      loadData();
    } catch (err) {
      toast.error('Error al enviar invitacion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId, roleId) => {
    setActionLoading(true);
    try {
      const res = await updateUser(userId, { role: roleId });
      if (res?.error) {
        toast.error('Error al actualizar rol');
        return;
      }
      haptics.success();
      toast.success('Rol actualizado');
      setSelectedUser(null);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async (userId) => {
    setActionLoading(true);
    try {
      await resendUserInvite(userId);
      haptics.success();
      toast.success('Invitacion reenviada');
    } catch (err) {
      toast.error('Error al reenviar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    setActionLoading(true);
    try {
      const res = await deleteUser(userId);
      if (res?.error) {
        toast.error('Error al eliminar usuario');
        return;
      }
      haptics.success();
      toast.success('Usuario eliminado');
      setSelectedUser(null);
      loadData();
    } catch (err) {
      toast.error('Error al eliminar');
    } finally {
      setActionLoading(false);
    }
  };

  if (!hasPermission('users_read')) {
    return (
      <MobileSettingsLayout title="Usuarios y permisos" onBack={onBack}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield size={40} className="text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No tienes permisos para ver usuarios</p>
        </div>
      </MobileSettingsLayout>
    );
  }

  if (loading) {
    return (
      <MobileSettingsLayout title="Usuarios y permisos" onBack={onBack}>
        <MobileSettingsSkeleton />
      </MobileSettingsLayout>
    );
  }

  return (
    <MobileSettingsLayout title="Usuarios y permisos" onBack={onBack}>
      <motion.div
        variants={STAGGER(0.05, 0.03)}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        {/* Invite button */}
        <motion.div variants={listItem}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptics.tap(); setShowInvite(true); }}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground
                       font-semibold rounded-xl py-3.5 no-tap-highlight"
          >
            <UserPlus size={18} />
            Invitar usuario
          </motion.button>
        </motion.div>

        {/* User list */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border overflow-hidden divide-y divide-border"
        >
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            users.map(user => {
              const initials = getInitials(user).toUpperCase();
              const roleName = getRoleName(user.role, roles);
              const isPending = user.status === 'pending' || user.status === 'invited';
              return (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => { haptics.tap(); setSelectedUser(user); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left no-tap-highlight
                             active:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{initials || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.firstName || user.name || user.email}
                      {user.lastName ? ` ${user.lastName}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                      {roleName}
                    </span>
                    {isPending && (
                      <span className="text-xs text-amber-500">Pendiente</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </motion.div>
      </motion.div>

      {/* User detail sheet */}
      <MobileActionSheet
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `${selectedUser.firstName || selectedUser.email} ${selectedUser.lastName || ''}`.trim() : ''}
      >
        {selectedUser && (
          <div className="px-4 py-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Rol
              </p>
              <div className="space-y-2">
                {roles.map(role => (
                  <button
                    key={role._id}
                    type="button"
                    onClick={() => handleUpdateRole(selectedUser._id, role._id)}
                    disabled={actionLoading}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium no-tap-highlight transition-colors ${
                      selectedUser.role === role._id
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-muted text-foreground active:bg-muted-foreground/10'
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {(selectedUser.status === 'pending' || selectedUser.status === 'invited') && (
                <button
                  type="button"
                  onClick={() => handleResend(selectedUser._id)}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                             bg-muted text-foreground no-tap-highlight active:bg-muted-foreground/10 transition-colors"
                >
                  <RotateCcw size={16} />
                  Reenviar invitacion
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(selectedUser._id)}
                disabled={actionLoading}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                           bg-red-500/10 text-red-500 no-tap-highlight active:bg-red-500/20 transition-colors"
              >
                <Trash2 size={16} />
                Eliminar usuario
              </button>
            </div>
          </div>
        )}
      </MobileActionSheet>

      {/* Invite sheet */}
      <MobileActionSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invitar usuario"
        footer={
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={actionLoading || !inviteData.email}
            onClick={handleInvite}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground
                       font-semibold rounded-xl py-3.5 disabled:opacity-60 transition-opacity"
          >
            {actionLoading ? 'Enviando...' : 'Enviar invitacion'}
          </motion.button>
        }
      >
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email *</label>
            <input
              type="email"
              value={inviteData.email}
              onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@ejemplo.com"
              className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground
                         border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                         outline-none transition-all placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
              <input
                type="text"
                value={inviteData.firstName}
                onChange={(e) => setInviteData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Nombre"
                className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground
                           border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                           outline-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Apellido</label>
              <input
                type="text"
                value={inviteData.lastName}
                onChange={(e) => setInviteData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Apellido"
                className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground
                           border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                           outline-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rol</label>
            <div className="space-y-2">
              {roles.map(role => (
                <button
                  key={role._id}
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    setInviteData(prev => ({ ...prev, role: role._id }));
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium no-tap-highlight transition-colors ${
                    inviteData.role === role._id
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-muted text-foreground active:bg-muted-foreground/10'
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MobileActionSheet>
    </MobileSettingsLayout>
  );
}
