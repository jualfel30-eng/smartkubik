import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';

export function EventDialog({ event, open, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      // Formatear las fechas para los inputs de tipo datetime-local
      const formatDateTimeLocal = (date) => {
        if (!date) return '';
        const d = new Date(date);
        // Ajustar por la zona horaria local para la visualización
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      };
      setStart(formatDateTimeLocal(event.start));
      setEnd(formatDateTimeLocal(event.end || event.start));
      setAllDay(event.allDay || false);
      setDescription(event.description || '');
    } else {
      // Resetear el formulario si no hay evento (para creación)
      setTitle('');
      setStart('');
      setEnd('');
      setAllDay(false);
      setDescription('');
    }
  }, [event]);

  const handleSave = () => {
    const payload = {
      title,
      start: new Date(start).toISOString(),
      end: allDay ? null : new Date(end).toISOString(),
      allDay,
      description,
    };
    onSave(payload);
  };

  const handleDelete = () => {
    if (event && event.id) {
      onDelete(event.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? 'Editar Evento' : 'Crear Nuevo Evento'}</DialogTitle>
          <DialogDescription>
            {event?.id ? 'Modifica los detalles de tu evento.' : 'Añade un nuevo evento a tu calendario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start" className="text-right">Inicio</Label>
            <Input id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end" className="text-right">Fin</Label>
            <Input id="end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="col-span-3" disabled={allDay} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="allDay" className="text-right">Todo el día</Label>
            <Checkbox id="allDay" checked={allDay} onCheckedChange={setAllDay} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descripción</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
            <div>
                {event?.id && (
                    <Button type="button" variant="destructive" onClick={handleDelete}>Eliminar</Button>
                )}
            </div>
            <div>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button type="button" onClick={handleSave} className="ml-2">Guardar</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
