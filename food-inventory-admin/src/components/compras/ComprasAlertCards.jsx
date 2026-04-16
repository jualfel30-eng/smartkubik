/**
 * @file ComprasAlertCards.jsx
 * Low-stock and near-expiration alert cards displayed on the Compras dashboard.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { AlertTriangle, Clock } from 'lucide-react';

export default function ComprasAlertCards({
  lowStockProducts,
  expiringProducts,
  handleCreatePoFromAlert,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Productos con Bajo Stock</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map(item => (
                  <TableRow key={item._id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productSku}</TableCell>
                    <TableCell><Badge variant="destructive">{item.availableQuantity}</Badge></TableCell>
                    <TableCell><Button size="sm" onClick={() => handleCreatePoFromAlert(item)}>Crear OC</Button></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan="4" className="text-center">No hay productos con bajo stock.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span>Productos Próximos a Vencer</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringProducts.length > 0 ? (
                expiringProducts.map(item => (
                  item.lots.map(lot => (
                    <TableRow key={`${item._id}-${lot.lotNumber}`}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{lot.lotNumber}</TableCell>
                      <TableCell><Badge variant="secondary">{new Date(lot.expirationDate).toLocaleDateString()}</Badge></TableCell>
                      <TableCell><Button size="sm" onClick={() => handleCreatePoFromAlert(item)}>Crear OC</Button></TableCell>
                    </TableRow>
                  ))
                ))
              ) : (
                <TableRow><TableCell colSpan="4" className="text-center">No hay productos próximos a vencer.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
