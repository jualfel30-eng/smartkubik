import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
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
  AlertTriangle, 
  Calendar,
  Package,
  Truck,
  BarChart3,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'

// Datos de ejemplo para el inventario
const sampleInventoryData = [
  {
    id: 1,
    sku: 'ARR-001',
    name: 'Arroz Blanco Diana 1kg',
    category: 'Granos',
    brand: 'Diana',
    currentStock: 5,
    minStock: 10,
    maxStock: 100,
    unitPrice: 2.50,
    supplier: 'Distribuidora Central',
    location: 'A-01-001',
    expirationDate: '2024-12-15',
    batchNumber: 'ARR240901',
    status: 'critical',
    lastUpdated: '2024-09-05'
  },
  {
    id: 2,
    sku: 'ACE-001',
    name: 'Aceite Vegetal Mazeite 1L',
    category: 'Aceites',
    brand: 'Mazeite',
    currentStock: 12,
    minStock: 15,
    maxStock: 80,
    unitPrice: 4.75,
    supplier: 'Alimentos del Sur',
    location: 'B-02-003',
    expirationDate: '2024-09-08',
    batchNumber: 'ACE240815',
    status: 'expiring',
    lastUpdated: '2024-09-04'
  },
  {
    id: 3,
    sku: 'HAR-001',
    name: 'Harina de Maíz Blanco P.A.N. 1kg',
    category: 'Harinas',
    brand: 'P.A.N.',
    currentStock: 45,
    minStock: 20,
    maxStock: 120,
    unitPrice: 1.85,
    supplier: 'Polar Distribución',
    location: 'A-03-002',
    expirationDate: '2025-03-20',
    batchNumber: 'HAR240820',
    status: 'good',
    lastUpdated: '2024-09-03'
  },
  {
    id: 4,
    sku: 'AZU-001',
    name: 'Azúcar Blanca Santa Barbara 1kg',
    category: 'Endulzantes',
    brand: 'Santa Barbara',
    currentStock: 28,
    minStock: 25,
    maxStock: 100,
    unitPrice: 1.20,
    supplier: 'Central Azucarera',
    location: 'C-01-004',
    expirationDate: '2025-06-10',
    batchNumber: 'AZU240825',
    status: 'good',
    lastUpdated: '2024-09-02'
  }
]

function InventoryManagement() {
  const [inventoryData, setInventoryData] = useState(sampleInventoryData)
  const [filteredData, setFilteredData] = useState(sampleInventoryData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    category: '',
    brand: '',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unitPrice: 0,
    supplier: '',
    location: '',
    expirationDate: '',
    batchNumber: ''
  })

  // Filtrar datos basado en búsqueda y filtros
  useEffect(() => {
    let filtered = inventoryData

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus)
    }

    // Filtro por categoría
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory)
    }

    setFilteredData(filtered)
  }, [inventoryData, searchTerm, filterStatus, filterCategory])

  // Obtener categorías únicas
  const categories = [...new Set(inventoryData.map(item => item.category))]

  // Función para obtener el color del badge según el estado
  const getStatusBadge = (status, currentStock, minStock, expirationDate) => {
    if (currentStock <= minStock) {
      return <Badge variant="destructive">Stock Crítico</Badge>
    }
    
    const daysToExpire = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (daysToExpire <= 7) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Próximo a Vencer</Badge>
    }
    
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>
  }

  // Función para agregar nuevo item
  const handleAddItem = () => {
    const id = Math.max(...inventoryData.map(item => item.id)) + 1
    const status = newItem.currentStock <= newItem.minStock ? 'critical' : 'good'
    
    const itemToAdd = {
      ...newItem,
      id,
      status,
      lastUpdated: new Date().toISOString().split('T')[0]
    }
    
    setInventoryData([...inventoryData, itemToAdd])
    setNewItem({
      sku: '',
      name: '',
      category: '',
      brand: '',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      unitPrice: 0,
      supplier: '',
      location: '',
      expirationDate: '',
      batchNumber: ''
    })
    setIsAddDialogOpen(false)
  }

  // Función para editar item
  const handleEditItem = () => {
    const status = selectedItem.currentStock <= selectedItem.minStock ? 'critical' : 'good'
    const updatedItem = {
      ...selectedItem,
      status,
      lastUpdated: new Date().toISOString().split('T')[0]
    }
    
    setInventoryData(inventoryData.map(item => 
      item.id === selectedItem.id ? updatedItem : item
    ))
    setIsEditDialogOpen(false)
    setSelectedItem(null)
  }

  // Función para eliminar item
  const handleDeleteItem = (id) => {
    setInventoryData(inventoryData.filter(item => item.id !== id))
  }

  // Estadísticas del inventario
  const totalItems = inventoryData.length
  const criticalItems = inventoryData.filter(item => item.currentStock <= item.minStock).length
  const expiringItems = inventoryData.filter(item => {
    const daysToExpire = Math.ceil((new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24))
    return daysToExpire <= 7
  }).length
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0)

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Productos en inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalItems}</div>
            <p className="text-xs text-muted-foreground">
              Requieren reposición
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringItems}</div>
            <p className="text-xs text-muted-foreground">
              En los próximos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor del inventario
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles de búsqueda y filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle>Gestión de Inventario</CardTitle>
              <CardDescription>
                Administra los productos en stock, controla fechas de vencimiento y niveles mínimos
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Agregar Nuevo Item al Inventario</DialogTitle>
                    <DialogDescription>
                      Completa la información del producto para agregarlo al inventario
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={newItem.sku}
                        onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                        placeholder="Ej: ARR-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Producto</Label>
                      <Input
                        id="name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        placeholder="Ej: Arroz Blanco Diana 1kg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría</Label>
                      <Input
                        id="category"
                        value={newItem.category}
                        onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                        placeholder="Ej: Granos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Marca</Label>
                      <Input
                        id="brand"
                        value={newItem.brand}
                        onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                        placeholder="Ej: Diana"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentStock">Stock Actual</Label>
                      <Input
                        id="currentStock"
                        type="number"
                        value={newItem.currentStock}
                        onChange={(e) => setNewItem({...newItem, currentStock: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Stock Mínimo</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={newItem.minStock}
                        onChange={(e) => setNewItem({...newItem, minStock: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxStock">Stock Máximo</Label>
                      <Input
                        id="maxStock"
                        type="number"
                        value={newItem.maxStock}
                        onChange={(e) => setNewItem({...newItem, maxStock: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Precio Unitario ($)</Label>
                      <Input
                        id="unitPrice"
                        type="number"
                        step="0.01"
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Proveedor</Label>
                      <Input
                        id="supplier"
                        value={newItem.supplier}
                        onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                        placeholder="Ej: Distribuidora Central"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input
                        id="location"
                        value={newItem.location}
                        onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                        placeholder="Ej: A-01-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expirationDate">Fecha de Vencimiento</Label>
                      <Input
                        id="expirationDate"
                        type="date"
                        value={newItem.expirationDate}
                        onChange={(e) => setNewItem({...newItem, expirationDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batchNumber">Número de Lote</Label>
                      <Input
                        id="batchNumber"
                        value={newItem.batchNumber}
                        onChange={(e) => setNewItem({...newItem, batchNumber: e.target.value})}
                        placeholder="Ej: ARR240901"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddItem}>
                      Agregar Item
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU o marca..."
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
                <SelectItem value="good">Disponible</SelectItem>
                <SelectItem value="critical">Stock crítico</SelectItem>
                <SelectItem value="expiring">Próximo a vencer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de inventario */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.brand}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className={item.currentStock <= item.minStock ? 'text-red-600 font-medium' : ''}>
                          {item.currentStock} unidades
                        </div>
                        <div className="text-muted-foreground">
                          Min: {item.minStock} | Max: {item.maxStock}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(item.expirationDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status, item.currentStock, item.minStock, item.expirationDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Item del Inventario</DialogTitle>
            <DialogDescription>
              Modifica la información del producto
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU</Label>
                <Input
                  id="edit-sku"
                  value={selectedItem.sku}
                  onChange={(e) => setSelectedItem({...selectedItem, sku: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del Producto</Label>
                <Input
                  id="edit-name"
                  value={selectedItem.name}
                  onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currentStock">Stock Actual</Label>
                <Input
                  id="edit-currentStock"
                  type="number"
                  value={selectedItem.currentStock}
                  onChange={(e) => setSelectedItem({...selectedItem, currentStock: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minStock">Stock Mínimo</Label>
                <Input
                  id="edit-minStock"
                  type="number"
                  value={selectedItem.minStock}
                  onChange={(e) => setSelectedItem({...selectedItem, minStock: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unitPrice">Precio Unitario ($)</Label>
                <Input
                  id="edit-unitPrice"
                  type="number"
                  step="0.01"
                  value={selectedItem.unitPrice}
                  onChange={(e) => setSelectedItem({...selectedItem, unitPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expirationDate">Fecha de Vencimiento</Label>
                <Input
                  id="edit-expirationDate"
                  type="date"
                  value={selectedItem.expirationDate}
                  onChange={(e) => setSelectedItem({...selectedItem, expirationDate: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditItem}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InventoryManagement

