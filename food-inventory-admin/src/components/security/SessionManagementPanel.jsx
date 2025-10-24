import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  getCurrentSessions,
  revokeSession,
  revokeOtherSessions,
  getUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
} from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { Loader2, RefreshCcw, ShieldAlert, LogOut } from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const summarizeUserAgent = (userAgent) => {
  if (!userAgent) {
    return 'Dispositivo desconocido';
  }

  const ua = userAgent.toLowerCase();
  let platform = 'Otro';
  if (ua.includes('windows')) platform = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macintosh')) platform = 'macOS';
  else if (ua.includes('iphone') || ua.includes('ios')) platform = 'iOS';
  else if (ua.includes('android')) platform = 'Android';
  else if (ua.includes('linux')) platform = 'Linux';

  let browser = 'Navegador';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';

  return `${browser} · ${platform}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch (error) {
    return '—';
  }
};

const buildSessionLabel = (session) => {
  const parts = [summarizeUserAgent(session.userAgent)];
  if (session.userAgent) {
    parts.push(session.userAgent);
  }
  return parts;
};

export function SessionManagementPanel({ userId: overrideUserId, userName, isSelf: isSelfOverride }) {
  const { user } = useAuth();
  const resolvedUserId = overrideUserId || user?.id || null;
  const isSelf = typeof isSelfOverride === 'boolean'
    ? isSelfOverride
    : !overrideUserId || (resolvedUserId && resolvedUserId === user?.id);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [revokingIds, setRevokingIds] = useState({});

  const fetchSessions = useCallback(async () => {
    if (!resolvedUserId) return;
    setLoading(true);
    try {
      const response = isSelf
        ? await getCurrentSessions({ includeRevoked })
        : await getUserSessions(resolvedUserId, { includeRevoked });

      if (response?.data?.sessions) {
        setSessions(response.data.sessions);
      } else if (response?.sessions) {
        setSessions(response.sessions);
      } else {
        setSessions([]);
      }
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar las sesiones activas');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [includeRevoked, isSelf, resolvedUserId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      const aDate = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bDate = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [sessions]);

  const handleRevoke = async (sessionId) => {
    if (!resolvedUserId) return;
    setRevokingIds((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const response = isSelf
        ? await revokeSession(sessionId)
        : await revokeUserSession(resolvedUserId, sessionId);

      if (response?.data) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId ? response.data : session,
          ),
        );
      }

      if (isSelf && response?.data?.current && !response?.alreadyRevoked) {
        toast.success('Se cerró la sesión actual. Serás redirigido.');
      } else {
        toast.success('Sesión revocada correctamente.');
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo revocar la sesión');
    } finally {
      setRevokingIds((prev) => {
        const clone = { ...prev };
        delete clone[sessionId];
        return clone;
      });
    }
  };

  const handleBulkRevoke = async () => {
    if (!resolvedUserId) return;
    setBulkLoading(true);
    try {
      const response = isSelf
        ? await revokeOtherSessions()
        : await revokeAllUserSessions(resolvedUserId);

      const count = response?.revokedCount ?? 0;
      toast.success(
        count
          ? `Se revocaron ${count} sesión(es).`
          : 'No había sesiones adicionales por cerrar.',
      );
      await fetchSessions();
    } catch (error) {
      toast.error(error.message || 'No se pudo completar la revocación masiva');
    } finally {
      setBulkLoading(false);
    }
  };

  const headerTitle = isSelf ? 'Sesiones activas' : `Sesiones de ${userName || 'usuario'}`;
  const headerDescription = isSelf
    ? 'Revisa y cierra sesiones abiertas en otros dispositivos.'
    : 'Controla las sesiones activas del usuario seleccionado.';

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{headerTitle}</CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Switch
              id="include-revoked"
              checked={includeRevoked}
              onCheckedChange={setIncludeRevoked}
              disabled={loading}
            />
            <label htmlFor="include-revoked" className="cursor-pointer select-none">
              Mostrar sesiones cerradas
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBulkRevoke}
            disabled={bulkLoading || loading || !sessions.length}
          >
            {bulkLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSelf ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="ml-2 hidden md:inline">
              {isSelf ? 'Cerrar otras sesiones' : 'Cerrar todas las sesiones'}
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !sessions.length ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : sortedSessions.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSessions.map((session) => {
                  const label = buildSessionLabel(session);
                  const isRevoked = Boolean(session.revoked);
                  const isProcessing = Boolean(revokingIds[session.id]);

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{label[0]}</span>
                          {label[1] && (
                            <span className="break-all text-xs text-muted-foreground">
                              {label[1]}
                            </span>
                          )}
                          <div className="mt-1 flex flex-wrap gap-2">
                            {session.current && <Badge variant="default">Sesión actual</Badge>}
                            {session.impersonation && (
                              <Badge variant="outline">Impersonación</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{session.ipAddress || '—'}</TableCell>
                      <TableCell>{formatDate(session.lastUsedAt)}</TableCell>
                      <TableCell>{formatDate(session.expiresAt)}</TableCell>
                      <TableCell>
                        <Badge variant={isRevoked ? 'secondary' : 'default'}>
                          {isRevoked ? 'Revocada' : 'Activa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isRevoked ? 'outline' : 'destructive'}
                          disabled={isProcessing || isRevoked}
                          onClick={() => handleRevoke(session.id)}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span>{isRevoked ? 'Cerrada' : 'Cerrar'}</span>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {includeRevoked
              ? 'No hay sesiones registradas para mostrar.'
              : 'No hay sesiones activas en este momento.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SessionManagementPanel;
