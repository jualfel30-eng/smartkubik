import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, DollarSign, Banknote, Smartphone } from 'lucide-react'

// Datos de muestra
const availableProducts = [
  { id: 1, sku: 'ARR-001', name: 'Arroz Blanco Diana 1kg', price: 2.50, stock: 50, reserved: 45 },
  { id: 2, sku: 'ACE-001', name: 'Aceite Vegetal Mazeite 1L', price: 4.75, stock: 30, reserved: 18 },
  { id: 3, sku: 'HAR-001', name: 'Harina de Maíz Blanco P.A.N. 1kg', price: 1.85, stock: 75, reserved: 30 },
  { id: 4, sku: 'AZU-001', name: 'Azúcar Blanca Santa Barbara 1kg', price: 1.20, stock: 60, reserved: 32 }
]

const availableCustomers = [
  { id: 1, name: 'María González', company: 'Restaurante El Sabor', tier: 'diamante', totalSpent: 15420.50 },
  { id: 2, name: 'Ana Rodríguez', company: 'Panadería La Espiga', tier: 'oro', totalSpent: 8750.25 },
  { id: 3, name: 'Luis Martínez', company: 'Supermercado Los Andes', tier: 'plata', totalSpent: 4320.80 },
  { id: 4, name: 'Roberto Silva', company: 'Bodega Mi Barrio', tier: 'bronce', totalSpent: 1250.00 }
]

function OrdersDemo() {
  const [selectedCustomer, setSelectedCustomer] = useState('1')
  const [selectedProduct, setSelectedProduct] = useState('2')
  const [quantity, setQuantity] = useState(5)
  const [paymentMethod, setPaymentMethod] = useState('transferencia_ves')

  // Función para calcular precios con impuestos venezolanos
  const calculatePricing = (subtotal, paymentMethod) => {
    const iva = subtotal * 0.16 // IVA 16%
    let igtf = 0
    
    // IGTF 3% solo para divisas (USD)
    if (paymentMethod.includes('usd') || paymentMethod === 'zelle_usd' || paymentMethod === 'efectivo_usd') {
      igtf = subtotal * 0.03
    }
    
    const total = subtotal + iva + igtf
    
    return { iva, igtf, total }
  }

  // Obtener datos seleccionados
  const customer = availableCustomers.find(c => c.id === parseInt(selectedCustomer))
  const product = availableProducts.find(p => p.id === parseInt(selectedProduct))
  
  // Calcular precios
  const subtotal = product ? product.price * quantity : 0
  const { iva, igtf, total } = calculatePricing(subtotal, paymentMethod)

  // Función para obtener el badge del método de pago
  const getPaymentMethodBadge = (method) => {
    const badges = {
      transferencia_ves: <Badge className="bg-blue-100 text-blue-800"><Banknote className="h-3 w-3 mr-1" />Transferencia VES</Badge>,
      zelle_usd: <Badge className="bg-green-100 text-green-800"><DollarSign className="h-3 w-3 mr-1" />Zelle USD</Badge>,
      efectivo_ves: <Badge className="bg-gray-100 text-gray-800"><Banknote className="h-3 w-3 mr-1" />Efectivo VES</Badge>,
      efectivo_usd: <Badge className="bg-green-100 text-green-800"><DollarSign className="h-3 w-3 mr-1" />Efectivo USD</Badge>,
      pago_movil: <Badge className="bg-purple-100 text-purple-800"><Smartphone className="h-3 w-3 mr-1" />Pago Móvil</Badge>
    }
    return badges[method] || <Badge variant="secondary">{method}</Badge>
  }

  // Función para obtener el badge del tier del cliente
  const getTierBadge = (tier) => {
    const badges = {
      diamante: <Badge className="bg-blue-100 text-blue-800">💎 Diamante</Badge>,
      oro: <Badge className="bg-yellow-100 text-yellow-800">🥇 Oro</Badge>,
      plata: <Badge className="bg-gray-100 text-gray-800">🥈 Plata</Badge>,
      bronce: <Badge className="bg-orange-100 text-orange-800">🥉 Bronce</Badge>
    }
    return badges[tier] || <Badge variant="secondary">{tier}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold">🚀 Motor de Precios Dinámicos - Demo Funcional</h2>
        <p className="text-muted-foreground">Sistema de cálculos fiscales venezolanos en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Orden</CardTitle>
            <CardDescription>Selecciona cliente, producto y método de pago</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selección de cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} - {customer.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customer && (
                <div className="flex items-center gap-2 text-sm">
                  {getTierBadge(customer.tier)}
                  <span className="text-muted-foreground">Total gastado: ${customer.totalSpent.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Selección de producto */}
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} - ${product.price} (Stock: {product.stock - product.reserved})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                max={product ? product.stock - product.reserved : 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              {product && (
                <p className="text-sm text-muted-foreground">
                  Stock disponible: {product.stock - product.reserved} unidades
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia_ves">Transferencia VES</SelectItem>
                  <SelectItem value="zelle_usd">Zelle USD</SelectItem>
                  <SelectItem value="efectivo_ves">Efectivo VES</SelectItem>
                  <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                  <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                </SelectContent>
              </Select>
              <div>{getPaymentMethodBadge(paymentMethod)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Cálculos */}
        <Card>
          <CardHeader>
            <CardTitle>💰 Cálculos Automáticos</CardTitle>
            <CardDescription>Precios con impuestos venezolanos aplicados</CardDescription>
          </CardHeader>
          <CardContent>
            {product && (
              <div className="space-y-4">
                {/* Detalles del producto */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  <p className="text-sm">Precio unitario: ${product.price.toFixed(2)}</p>
                  <p className="text-sm">Cantidad: {quantity} unidades</p>
                </div>

                {/* Cálculos detallados */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>IVA (16%):</span>
                    <span className="font-medium text-blue-600">${iva.toFixed(2)}</span>
                  </div>
                  
                  {igtf > 0 && (
                    <div className="flex justify-between items-center">
                      <span>IGTF (3% - Divisas):</span>
                      <span className="font-medium text-orange-600">${igtf.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total a Pagar:</span>
                      <span className="text-lg font-bold text-green-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <h5 className="font-medium text-blue-800 mb-2">ℹ️ Información Fiscal</h5>
                  <ul className="space-y-1 text-blue-700">
                    <li>• IVA 16% aplicado automáticamente</li>
                    {igtf > 0 ? (
                      <li>• IGTF 3% aplicado por pago en divisas (USD)</li>
                    ) : (
                      <li>• Sin IGTF - Pago en bolívares (VES)</li>
                    )}
                    <li>• Precios actualizados en tiempo real</li>
                  </ul>
                </div>

                {/* Botón de acción */}
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar a Orden - ${total.toFixed(2)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de comparación de métodos de pago */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Comparación de Métodos de Pago</CardTitle>
          <CardDescription>Cómo afecta cada método de pago al precio final</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método de Pago</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>IVA (16%)</TableHead>
                <TableHead>IGTF (3%)</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                'transferencia_ves',
                'pago_movil', 
                'efectivo_ves',
                'zelle_usd',
                'efectivo_usd'
              ].map((method) => {
                const calc = calculatePricing(subtotal, method)
                const difference = calc.total - calculatePricing(subtotal, 'transferencia_ves').total
                return (
                  <TableRow key={method} className={method === paymentMethod ? 'bg-blue-50' : ''}>
                    <TableCell>{getPaymentMethodBadge(method)}</TableCell>
                    <TableCell>${subtotal.toFixed(2)}</TableCell>
                    <TableCell>${calc.iva.toFixed(2)}</TableCell>
                    <TableCell>{calc.igtf > 0 ? `$${calc.igtf.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="font-bold">${calc.total.toFixed(2)}</TableCell>
                    <TableCell className={difference > 0 ? 'text-red-600' : 'text-green-600'}>
                      {difference > 0 ? `+$${difference.toFixed(2)}` : difference < 0 ? `$${difference.toFixed(2)}` : '$0.00'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrdersDemo

