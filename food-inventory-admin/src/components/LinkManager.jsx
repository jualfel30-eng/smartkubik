import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Mail,
  BookOpen,
  FileText,
  ShoppingBag,
  ExternalLink,
  Link2,
  Play,
} from 'lucide-react';

const ICON_MAP = {
  link: Link2,
  globe: Globe,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
  tiktok: Play,
  mail: Mail,
  book: BookOpen,
  'file-text': FileText,
  'shopping-bag': ShoppingBag,
  'external-link': ExternalLink,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

function IconRenderer({ iconKey, className = 'h-4 w-4' }) {
  const Icon = ICON_MAP[iconKey] || Link2;
  return <Icon className={className} />;
}

const emptyLink = {
  label: '',
  url: '',
  icon: 'link',
  highlight: false,
  active: true,
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
};

export default function LinkManager({ mode = 'super-admin' }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [form, setForm] = useState({ ...emptyLink });

  const apiBase = mode === 'super-admin' ? '/super-admin/social-links' : '/social-links';
  const manageEndpoint = mode === 'super-admin' ? apiBase : `${apiBase}/manage`;

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi(manageEndpoint);
      setLinks(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      toast.error('Error al cargar links', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [manageEndpoint]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const openCreate = () => {
    setEditingLink(null);
    setForm({ ...emptyLink });
    setDialogOpen(true);
  };

  const openEdit = (link) => {
    setEditingLink(link);
    setForm({
      label: link.label || '',
      url: link.url || '',
      icon: link.icon || 'link',
      highlight: link.highlight || false,
      active: link.active !== false,
      utmSource: link.utmSource || '',
      utmMedium: link.utmMedium || '',
      utmCampaign: link.utmCampaign || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label || !form.url) {
      toast.error('Label y URL son requeridos');
      return;
    }

    try {
      if (editingLink) {
        await fetchApi(`${apiBase}/${editingLink._id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Link actualizado');
      } else {
        await fetchApi(apiBase, {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Link creado');
      }
      setDialogOpen(false);
      loadLinks();
    } catch (err) {
      toast.error('Error', { description: err.message });
    }
  };

  const handleDelete = async (linkId) => {
    if (!confirm('¿Eliminar este link?')) return;
    try {
      await fetchApi(`${apiBase}/${linkId}`, { method: 'DELETE' });
      toast.success('Link eliminado');
      loadLinks();
    } catch (err) {
      toast.error('Error', { description: err.message });
    }
  };

  const handleToggleActive = async (link) => {
    try {
      await fetchApi(`${apiBase}/${link._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !link.active }),
      });
      loadLinks();
    } catch (err) {
      toast.error('Error', { description: err.message });
    }
  };

  const handleMove = async (index, direction) => {
    const newLinks = [...links];
    const target = index + direction;
    if (target < 0 || target >= newLinks.length) return;
    [newLinks[index], newLinks[target]] = [newLinks[target], newLinks[index]];
    setLinks(newLinks);

    const reorderEndpoint = mode === 'super-admin'
      ? `${apiBase}/reorder`
      : '/social-links/reorder/bulk';

    try {
      await fetchApi(reorderEndpoint, {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds: newLinks.map((l) => l._id) }),
      });
    } catch (err) {
      toast.error('Error al reordenar', { description: err.message });
      loadLinks();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {mode === 'super-admin' ? 'Bio Links Globales' : 'Bio Links'}
            </CardTitle>
            <CardDescription>
              {mode === 'super-admin'
                ? 'Administra los links de la página /links de SmartKubik'
                : 'Administra los links de tu página Bio Link'}
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Agregar Link
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : links.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay links configurados. Haz clic en &quot;Agregar Link&quot; para crear uno.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Orden</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-16">Icono</TableHead>
                <TableHead className="w-20">Destacar</TableHead>
                <TableHead className="w-20">Activo</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link, i) => (
                <TableRow key={link._id} className={!link.active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMove(i, -1)}
                        disabled={i === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMove(i, 1)}
                        disabled={i === links.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{link.label}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {link.url}
                  </TableCell>
                  <TableCell>
                    <IconRenderer iconKey={link.icon} />
                  </TableCell>
                  <TableCell>
                    {link.highlight && <Badge variant="outline" className="text-cyan-600 border-cyan-300">Sí</Badge>}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={link.active}
                      onCheckedChange={() => handleToggleActive(link)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(link)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(link._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Editar Link' : 'Nuevo Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Label *</label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ej: Síguenos en Instagram"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL *</label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Icono</label>
                <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((key) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <IconRenderer iconKey={key} className="h-3.5 w-3.5" />
                          {key}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3 justify-end">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.highlight}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, highlight: v }))}
                  />
                  Destacar
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  />
                  Activo
                </label>
              </div>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                UTM Parameters (opcional)
              </summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Input
                  value={form.utmSource}
                  onChange={(e) => setForm((f) => ({ ...f, utmSource: e.target.value }))}
                  placeholder="utm_source"
                />
                <Input
                  value={form.utmMedium}
                  onChange={(e) => setForm((f) => ({ ...f, utmMedium: e.target.value }))}
                  placeholder="utm_medium"
                />
                <Input
                  value={form.utmCampaign}
                  onChange={(e) => setForm((f) => ({ ...f, utmCampaign: e.target.value }))}
                  placeholder="utm_campaign"
                />
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingLink ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
