import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  Package,
  Minus,
  Calculator,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react'

// Datos de ejemplo para productos disponibles
const availableProducts = [
  { id: 1, sku: 'ARR-001', name: 'Arroz Blanco Diana 1kg', price: 2.50, stock: 5, reserved: 0 },
  { id: 2, sku: 'ACE-001', name: 'Aceite Vegetal Mazeite 1L', price: 4.75, stock: 12, reserved: 0 },
  { id: 3, sku: 'HAR-001', name: 'Harina de Maíz Blanco P.A.N. 1kg', price: 1.85, stock: 45, reserved: 0 },
  { id: 4, sku: 'AZU-001', name: 'Azúcar Blanca Santa Barbara 1kg', price: 1.20, stock: 28, reserved: 0 }
]

// Datos de ejemplo para clientes
const availableCustomers = [
  { id: 1, name: 'María González', email: 'maria.gonzalez@email.com', company: 'Restaurante El Sabor', tier: 'diamante' },
  { id: 3, name: 'Ana Rodríguez', email: 'ana.rodriguez@hotmail.com', company: 'Panadería La Espiga', tier: 'oro' },
  { id: 4, name: 'Luis Martínez', email: 'luis.martinez@empresa.com', company: 'Supermercado Los Andes', tier: 'plata' },
  { id: 5, name: 'Roberto Silva', email: 'roberto.silva@gmail.com', company: 'Bodega Mi Barrio', tier: 'bronce' }
]

// Datos de ejemplo para órdenes
const sampleOrdersData = [
  {
    id: 1234,
    customerId: 1,
    customerName: 'María González',
    customerCompany: 'Restaurante El Sabor',
    customerTier: 'diamante',
    items: [
      { productId: 1, sku: 'ARR-001', name: 'Arroz Blanco Diana 1kg', quantity: 10, unitPrice: 2.50, total: 25.00 },
      { productId: 2, sku: 'ACE-001', name: 'Aceite Vegetal Mazeite 1L', quantity: 5, unitPrice: 4.75, total: 23.75 }
    ],
    subtotal: 48.75,
    iva: 7.80, // 16%
    igtf: 0, // No aplica para VES
    total: 56.55,
    paymentMethod: 'transferencia_ves',
    status: 'completada',
    createdAt: '2024-09-03T10:30:00Z',
    updatedAt: '2024-09-03T11:15:00Z',
    notes: 'Cliente VIP - Entrega prioritaria'
  },
  {
    id: 1235,
    customerId: 4,
    customerName: 'Luis Martínez',
    customerCompany: 'Supermercado Los Andes',
    customerTier: 'plata',
    items: [
      { productId: 3, sku: 'HAR-001', name: 'Harina de Maíz Blanco P.A.N. 1kg', quantity: 20, unitPrice: 1.85, total: 37.00 },
      { productId: 4, sku: 'AZU-001', name: 'Azúcar Blanca Santa Barbara 1kg', quantity: 15, unitPrice: 1.20, total: 18.00 }
    ],
    subtotal: 55.00,
    iva: 8.80, // 16%
    igtf: 1.92, // 3% para USD
    total: 65.72,
    paymentMethod: 'zelle_usd',
    status: 'en_proceso',
    createdAt: '2024-09-04T14:20:00Z',
    updatedAt: '2024-09-04T14:20:00Z',
    notes: 'Pago pendiente de verificación'
  }
]

function OrdersManagement() {
  const [ordersData, setOrdersData] = useState(sampleOrdersData)
  const [filteredData, setFilteredData] = useState(sampleOrdersData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false)
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Estado para nueva orden
  const [newOrder, setNewOrder] = useState({
    customerId: '',
    items: [],
    paymentMethod: 'transferencia_ves',
    notes: ''
  })
  
  // Estado para agregar productos
  const [selectedProduct, setSelectedProduct] = useState('')
  const [productQuantity, setProductQuantity] = useState(1)

  // Filtrar datos basado en búsqueda y filtros
  useEffect(() => {
    let filtered = ordersData

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toString().includes(searchTerm) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerCompany.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus)
    }

    setFilteredData(filtered)
  }, [ordersData, searchTerm, filterStatus])

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

  // Función para obtener el badge del estado
  const getStatusBadge = (status) => {
    const badges = {
      en_proceso: <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />En Proceso</Badge>,
      completada: <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completada</Badge>,
      cancelada: <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
    }
    return badges[status] || <Badge variant="secondary">{status}</Badge>
  }

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

  // Función para agregar producto a la orden
  const addProductToOrder = () => {
    if (!selectedProduct || productQuantity <= 0) return
    
    const product = availableProducts.find(p => p.id === parseInt(selectedProduct))
    if (!product) return
    
    // Verificar stock disponible
    const availableStock = product.stock - product.reserved
    if (productQuantity > availableStock) {
      alert(`Stock insuficiente. Disponible: ${availableStock} unidades`)
      return
    }
    
    const existingItemIndex = newOrder.items.findIndex(item => item.productId === product.id)
    
    if (existingItemIndex >= 0) {
      // Actualizar cantidad si el producto ya existe
      const updatedItems = [...newOrder.items]
      updatedItems[existingItemIndex].quantity += productQuantity
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * product.price
      setNewOrder({...newOrder, items: updatedItems})
    } else {
      // Agregar nuevo producto
      const newItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: productQuantity,
        unitPrice: product.price,
        total: productQuantity * product.price
      }
      setNewOrder({...newOrder, items: [...newOrder.items, newItem]})
    }
    
    setSelectedProduct('')
    setProductQuantity(1)
  }

  // Función para remover producto de la orden
  const removeProductFromOrder = (productId) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter(item => item.productId !== productId)
    })
  }

  // Función para crear nueva orden
  const handleCreateOrder = () => {
    if (!newOrder.customerId || newOrder.items.length === 0) {
      alert('Selecciona un cliente y agrega al menos un producto')
      return
    }
    
    const customer = availableCustomers.find(c => c.id === parseInt(newOrder.customerId))
    const subtotal = newOrder.items.reduce((sum, item) => sum + item.total, 0)
    const { iva, igtf, total } = calculatePricing(subtotal, newOrder.paymentMethod)
    
    const orderToAdd = {
      id: Math.max(...ordersData.map(o => o.id)) + 1,
      customerId: customer.id,
      customerName: customer.name,
      customerCompany: customer.company,
      customerTier: customer.tier,
      items: newOrder.items,
      subtotal,
      iva,
      igtf,
      total,
      paymentMethod: newOrder.paymentMethod,
      status: 'en_proceso',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: newOrder.notes
    }
    
    setOrdersData([orderToAdd, ...ordersData])
    
    // Resetear formulario
    setNewOrder({
      customerId: '',
      items: [],
      paymentMethod: 'transferencia_ves',
      notes: ''
    })
    setIsNewOrderDialogOpen(false)
  }

  // Función para cambiar estado de orden
  const handleStatusChange = (orderId, newStatus) => {
    setOrdersData(ordersData.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
        : order
    ))
  }

  // Estadísticas de órdenes
  const totalOrders = ordersData.length
  const ordersToday = ordersData.filter(o => {
    const today = new Date().toISOString().split('T')[0]
    return o.createdAt.split('T')[0] === today
  }).length
  const pendingOrders = ordersData.filter(o => o.status === 'en_proceso').length
  const totalRevenue = ordersData
    .filter(o => o.status === 'completada')
    .reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Órdenes registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{ordersToday}</div>
            <p className="text-xs text-muted-foreground">
              Nuevas hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              En proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Órdenes completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles principales */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle>Gestión de Órdenes</CardTitle>
              <CardDescription>
                Toma pedidos, gestiona reservas de inventario y controla estados de órdenes
              </CardDescription>
            </div>
            <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Orden
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Orden</DialogTitle>
                  <DialogDescription>
                    Selecciona cliente, productos y método de pago para crear una nueva orden
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Selección de cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="customer">Cliente</Label>
                    <Select value={newOrder.customerId} onValueChange={(value) => setNewOrder({...newOrder, customerId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCustomers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name} - {customer.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agregar productos */}
                  <div className="space-y-4">
                    <Label>Productos</Label>
                    <div className="flex space-x-2">
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - ${product.price} (Stock: {product.stock - product.reserved})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                        className="w-20"
                        placeholder="Cant."
                      />
                      <Button onClick={addProductToOrder} disabled={!selectedProduct}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Lista de productos agregados */}
                    {newOrder.items.length > 0 && (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Precio Unit.</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {newOrder.items.map((item) => (
                              <TableRow key={item.productId}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-muted-foreground">{item.sku}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell>${item.total.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeProductFromOrder(item.productId)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Método de pago y cálculos */}
                  {newOrder.items.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Método de Pago</Label>
                        <Select value={newOrder.paymentMethod} onValueChange={(value) => setNewOrder({...newOrder, paymentMethod: value})}>
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
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Resumen de Pago</Label>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                          {(() => {
                            const subtotal = newOrder.items.reduce((sum, item) => sum + item.total, 0)
                            const { iva, igtf, total } = calculatePricing(subtotal, newOrder.paymentMethod)
                            return (
                              <>
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>IVA (16%):</span>
                                  <span>${iva.toFixed(2)}</span>
                                </div>
                                {igtf > 0 && (
                                  <div className="flex justify-between">
                                    <span>IGTF (3%):</span>
                                    <span>${igtf.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold border-t pt-1">
                                  <span>Total:</span>
                                  <span>${total.toFixed(2)}</span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Input
                      id="notes"
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                      placeholder="Información adicional sobre la orden..."
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewOrderDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateOrder} disabled={!newOrder.customerId || newOrder.items.length === 0}>
                    Crear Orden
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, cliente o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de órdenes */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden #</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">{order.customerCompany}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{order.items.length} productos</div>
                        <div className="text-muted-foreground">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${order.total.toFixed(2)}</div>
                      {order.igtf > 0 && (
                        <div className="text-xs text-muted-foreground">Inc. IGTF</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodBadge(order.paymentMethod)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {order.status === 'en_proceso' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'completada')}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsEditOrderDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalles de orden */}
      <Dialog open={isEditOrderDialogOpen} onOpenChange={setIsEditOrderDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalles de Orden #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Información completa de la orden
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <div className="font-medium">{selectedOrder.customerName}</div>
                  <div className="text-sm text-muted-foreground">{selectedOrder.customerCompany}</div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>
              
              <div>
                <Label>Productos</Label>
                <div className="mt-2 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>${item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Método de Pago</Label>
                  <div className="mt-1">{getPaymentMethodBadge(selectedOrder.paymentMethod)}</div>
                </div>
                <div>
                  <Label>Resumen de Pago</Label>
                  <div className="mt-1 bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA (16%):</span>
                      <span>${selectedOrder.iva.toFixed(2)}</span>
                    </div>
                    {selectedOrder.igtf > 0 && (
                      <div className="flex justify-between">
                        <span>IGTF (3%):</span>
                        <span>${selectedOrder.igtf.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total:</span>
                      <span>${selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <Label>Notas</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">{selectedOrder.notes}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOrderDialogOpen(false)}>
              Cerrar
            </Button>
            {selectedOrder?.status === 'en_proceso' && (
              <Button 
                onClick={() => {
                  handleStatusChange(selectedOrder.id, 'completada')
                  setIsEditOrderDialogOpen(false)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Marcar como Completada
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrdersManagement

