import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Star } from 'lucide-react';

export default function RatingModal({ isOpen, onClose, onSubmit, purchaseOrder }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  const isOneStar = rating === 1;
  const isOtherReason = reason === 'Otro';
  const canSubmit = rating > 0 && (!isOneStar || (isOneStar && reason && (!isOtherReason || (isOtherReason && comments))));

  const handleSubmit = () => {
    onSubmit({
      purchaseOrderId: purchaseOrder._id,
      supplierId: purchaseOrder.supplierId,
      rating,
      reason: isOneStar ? reason : undefined,
      comments,
      receivedBy,
    });
    resetState();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const resetState = () => {
    setRating(0);
    setHoverRating(0);
    setReason('');
    setComments('');
    setReceivedBy('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calificar Compra #{purchaseOrder?.poNumber}</DialogTitle>
          <DialogDescription>
            Proveedor: {purchaseOrder?.supplierName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Calificación (1-5 estrellas)</Label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`cursor-pointer h-8 w-8 ${(hoverRating || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>

          {isOneStar && (
            <div className="space-y-2">
              <Label>Motivo del mal puntaje</Label>
              <Select onValueChange={setReason} value={reason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Malos tiempos de entrega">Malos tiempos de entrega</SelectItem>
                  <SelectItem value="No pasó control de calidad">No pasó control de calidad</SelectItem>
                  <SelectItem value="Pedido incompleto">Pedido incompleto</SelectItem>
                  <SelectItem value="Mala comunicación">Mala comunicación</SelectItem>
                  <SelectItem value="Procesos problemáticos">Procesos problemáticos</SelectItem>
                  <SelectItem value="No cumplió con lo acordado">No cumplió con lo acordado</SelectItem>
                  <SelectItem value="Monto a pagar superior a lo acordado">Monto a pagar superior a lo acordado</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Recibido por</Label>
            <Input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Nombre de quien recibe"
            />
          </div>

          <div className="space-y-2">
            <Label>Comentarios {isOneStar && isOtherReason ? '' : '(Opcional)'}</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={isOneStar && isOtherReason ? 'Explica por qué...' : 'Añade comentarios adicionales...'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Enviar Calificación y Recibir Orden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
