import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, GitBranch } from 'lucide-react';
import { BOMExplosionView } from './BOMExplosionView';
import { BOMTreeView } from './BOMTreeView';

/**
 * BOMExplosionDialog
 * Diálogo que muestra la explosión multinivel y estructura jerárquica de un BOM
 */
export function BOMExplosionDialog({ bom, open, onClose }) {
  if (!bom) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Explosión de BOM: {bom.code} - {bom.product?.name || bom.productId}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="explosion" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="explosion">
              <Layers className="h-4 w-4 mr-2" />
              Explosión Multinivel
            </TabsTrigger>
            <TabsTrigger value="tree">
              <GitBranch className="h-4 w-4 mr-2" />
              Estructura Jerárquica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explosion" className="mt-4">
            <BOMExplosionView bomId={bom._id} />
          </TabsContent>

          <TabsContent value="tree" className="mt-4">
            <BOMTreeView bomId={bom._id} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button variant="secondary">Cerrar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
