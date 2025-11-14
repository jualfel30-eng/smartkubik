import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, ListTree, ChevronRight, Package } from 'lucide-react';

/**
 * BOMExplosionView
 * Componente para mostrar la explosión multinivel de un BOM
 * - Vista por niveles: Muestra componentes organizados por nivel de profundidad
 * - Vista plana: Muestra el resumen total de materiales necesarios
 */
export function BOMExplosionView({ bomId }) {
  const [quantity, setQuantity] = useState(1);
  const [explosionData, setExplosionData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExplode = async () => {
    if (!bomId || quantity <= 0) {
      alert('Ingrese una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/bill-of-materials/${bomId}/explode?quantity=${quantity}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setExplosionData(result.data);
      } else {
        throw new Error(result.message || 'Error al explotar BOM');
      }
    } catch (error) {
      console.error('Error al explotar BOM:', error);
      alert(error.message || 'Error al explotar BOM');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIndentation = (level) => {
    return '└─ '.repeat(level);
  };

  return (
    <div className="space-y-4">
      {/* Control de cantidad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Explosión de BOM Multinivel
          </CardTitle>
          <CardDescription>
            Calcule todos los materiales necesarios para producir una cantidad específica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium mb-2 block">
                Cantidad a Producir
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Ingrese cantidad"
              />
            </div>
            <Button onClick={handleExplode} disabled={loading}>
              {loading ? 'Calculando...' : 'Explotar BOM'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {explosionData && (
        <Tabs defaultValue="levels" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="levels">
              <ListTree className="h-4 w-4 mr-2" />
              Por Niveles
            </TabsTrigger>
            <TabsTrigger value="flat">
              <Package className="h-4 w-4 mr-2" />
              Vista Consolidada
            </TabsTrigger>
          </TabsList>

          {/* Vista por niveles */}
          <TabsContent value="levels">
            <Card>
              <CardHeader>
                <CardTitle>Explosión por Niveles</CardTitle>
                <CardDescription>
                  Componentes organizados por nivel de profundidad en la estructura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {explosionData.levels && explosionData.levels.length > 0 ? (
                  <div className="space-y-6">
                    {explosionData.levels.map((levelData) => (
                      <div key={levelData.level} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            Nivel {levelData.level}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {levelData.items.length} componente(s)
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead>Unidad</TableHead>
                              <TableHead className="text-right">Scrap %</TableHead>
                              <TableHead>Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {levelData.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-mono text-xs">
                                      {getLevelIndentation(levelData.level)}
                                    </span>
                                    <span className="font-medium">{item.productName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {item.sku}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {item.quantity.toFixed(3)}
                                </TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell className="text-right">
                                  {item.scrapPercentage > 0 ? (
                                    <Badge variant="secondary">
                                      {item.scrapPercentage}%
                                    </Badge>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.isPhantom ? (
                                    <Badge variant="outline" className="bg-blue-50">
                                      <ChevronRight className="h-3 w-3 mr-1" />
                                      Sub-ensamble
                                    </Badge>
                                  ) : (
                                    <Badge variant="default">Material Base</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay datos de explosión disponibles
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vista consolidada */}
          <TabsContent value="flat">
            <Card>
              <CardHeader>
                <CardTitle>Materiales Consolidados</CardTitle>
                <CardDescription>
                  Resumen total de materiales base necesarios (excluyendo sub-ensambles)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {explosionData.flatList && explosionData.flatList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Cantidad Total</TableHead>
                        <TableHead>Unidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {explosionData.flatList.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.sku}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {item.totalQuantity.toFixed(3)}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay materiales consolidados disponibles
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
