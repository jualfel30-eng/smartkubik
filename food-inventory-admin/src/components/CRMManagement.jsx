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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Phone,
  Mail,
  MapPin,
  Building,
  Crown,
  Award,
  Medal,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  UserCheck,
  UserX
} from 'lucide-react'

// Datos de ejemplo para el CRM
const sampleCRMData = [
  {
    id: 1,
    name: 'María González',
    email: 'maria.gonzalez@email.com',
    phone: '+58 412-1234567',
    company: 'Restaurante El Sabor',
    address: 'Av. Libertador, Caracas',
    contactType: 'cliente',
    customerTier: 'diamante',
    totalSpent: 15420.50,
    totalOrders: 45,
    lastOrderDate: '2024-09-03',
    registrationDate: '2023-01-15',
    notes: 'Cliente VIP, siempre paga a tiempo',
    status: 'active'
  },
  {
    id: 2,
    name: 'Carlos Pérez',
    email: 'carlos.perez@distribuidora.com',
    phone: '+58 414-9876543',
    company: 'Distribuidora Central',
    address: 'Zona Industrial, Valencia',
    contactType: 'proveedor',
    customerTier: null,
    totalSpent: 0,
    totalOrders: 0,
    lastOrderDate: null,
    registrationDate: '2023-03-20',
    notes: 'Proveedor principal de granos',
    status: 'active'
  },
  {
    id: 3,
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@hotmail.com',
    phone: '+58 416-5555555',
    company: 'Panadería La Espiga',
    address: 'Centro, Maracay',
    contactType: 'cliente',
    customerTier: 'oro',
    totalSpent: 8750.25,
    totalOrders: 28,
    lastOrderDate: '2024-09-01',
    registrationDate: '2023-06-10',
    notes: 'Compra regularmente harinas y aceites',
    status: 'active'
  },
  {
    id: 4,
    name: 'Luis Martínez',
    email: 'luis.martinez@empresa.com',
    phone: '+58 212-7777777',
    company: 'Supermercado Los Andes',
    address: 'Los Teques, Miranda',
    contactType: 'cliente',
    customerTier: 'plata',
    totalSpent: 4200.75,
    totalOrders: 15,
    lastOrderDate: '2024-08-28',
    registrationDate: '2023-11-05',
    notes: 'Cliente nuevo con potencial',
    status: 'active'
  },
  {
    id: 5,
    name: 'Roberto Silva',
    email: 'roberto.silva@gmail.com',
    phone: '+58 424-3333333',
    company: 'Bodega Mi Barrio',
    address: 'Petare, Caracas',
    contactType: 'cliente',
    customerTier: 'bronce',
    totalSpent: 1850.00,
    totalOrders: 8,
    lastOrderDate: '2024-08-15',
    registrationDate: '2024-02-20',
    notes: 'Cliente ocasional',
    status: 'active'
  },
  {
    id: 6,
    name: 'Elena Vargas',
    email: 'elena.vargas@admin.com',
    phone: '+58 412-8888888',
    company: 'Food Inventory SaaS',
    address: 'Oficina Central',
    contactType: 'administrador',
    customerTier: null,
    totalSpent: 0,
    totalOrders: 0,
    lastOrderDate: null,
    registrationDate: '2023-01-01',
    notes: 'Administrador del sistema',
    status: 'active'
  }
]

function CRMManagement() {
  const [crmData, setCrmData] = useState(sampleCRMData)
  const [filteredData, setFilteredData] = useState(sampleCRMData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    contactType: 'cliente',
    notes: ''
  })

  // Filtrar datos basado en búsqueda y filtros
  useEffect(() => {
    let filtered = crmData

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm)
      )
    }

    // Filtro por tipo de contacto
    if (filterType !== 'all') {
      filtered = filtered.filter(contact => contact.contactType === filterType)
    }

    // Filtro por tier de cliente
    if (filterTier !== 'all') {
      filtered = filtered.filter(contact => contact.customerTier === filterTier)
    }

    setFilteredData(filtered)
  }, [crmData, searchTerm, filterType, filterTier])

  // Función para calcular el tier del cliente basado en gastos totales
  const calculateCustomerTier = (totalSpent) => {
    if (totalSpent >= 10000) return 'diamante'
    if (totalSpent >= 5000) return 'oro'
    if (totalSpent >= 2000) return 'plata'
    return 'bronce'
  }

  // Función para obtener el badge del tipo de contacto
  const getContactTypeBadge = (type) => {
    const badges = {
      administrador: <Badge className="bg-purple-100 text-purple-800">Administrador</Badge>,
      cliente: <Badge className="bg-blue-100 text-blue-800">Cliente</Badge>,
      proveedor: <Badge className="bg-green-100 text-green-800">Proveedor</Badge>,
      empleado: <Badge className="bg-orange-100 text-orange-800">Empleado</Badge>,
      gestor: <Badge className="bg-gray-100 text-gray-800">Gestor</Badge>
    }
    return badges[type] || <Badge variant="secondary">{type}</Badge>
  }

  // Función para obtener el badge del tier del cliente
  const getCustomerTierBadge = (tier) => {
    if (!tier) return null
    
    const badges = {
      diamante: (
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <Crown className="h-3 w-3 mr-1" />
          Diamante
        </Badge>
      ),
      oro: (
        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
          <Award className="h-3 w-3 mr-1" />
          Oro
        </Badge>
      ),
      plata: (
        <Badge className="bg-gradient-to-r from-gray-400 to-gray-600 text-white">
          <Medal className="h-3 w-3 mr-1" />
          Plata
        </Badge>
      ),
      bronce: (
        <Badge className="bg-gradient-to-r from-orange-400 to-orange-600 text-white">
          <Shield className="h-3 w-3 mr-1" />
          Bronce
        </Badge>
      )
    }
    return badges[tier]
  }

  // Función para agregar nuevo contacto
  const handleAddContact = () => {
    const id = Math.max(...crmData.map(contact => contact.id)) + 1
    let customerTier = null
    
    // Si es cliente, asignar tier inicial como bronce
    if (newContact.contactType === 'cliente') {
      customerTier = 'bronce'
    }
    
    const contactToAdd = {
      ...newContact,
      id,
      customerTier,
      totalSpent: 0,
      totalOrders: 0,
      lastOrderDate: null,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'active'
    }
    
    setCrmData([...crmData, contactToAdd])
    setNewContact({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      contactType: 'cliente',
      notes: ''
    })
    setIsAddDialogOpen(false)
  }

  // Función para editar contacto
  const handleEditContact = () => {
    // Recalcular tier si es cliente y cambió el gasto total
    let updatedContact = { ...selectedContact }
    if (selectedContact.contactType === 'cliente' && selectedContact.totalSpent > 0) {
      updatedContact.customerTier = calculateCustomerTier(selectedContact.totalSpent)
    }
    
    setCrmData(crmData.map(contact => 
      contact.id === selectedContact.id ? updatedContact : contact
    ))
    setIsEditDialogOpen(false)
    setSelectedContact(null)
  }

  // Función para eliminar contacto
  const handleDeleteContact = (id) => {
    setCrmData(crmData.filter(contact => contact.id !== id))
  }

  // Estadísticas del CRM
  const totalContacts = crmData.length
  const totalClients = crmData.filter(c => c.contactType === 'cliente').length
  const totalSuppliers = crmData.filter(c => c.contactType === 'proveedor').length
  const diamondClients = crmData.filter(c => c.customerTier === 'diamante').length
  const totalRevenue = crmData.reduce((sum, contact) => sum + (contact.totalSpent || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
            <p className="text-xs text-muted-foreground">
              En el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Clientes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Proveedores registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{diamondClients}</div>
            <p className="text-xs text-muted-foreground">
              Tier Diamante
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              De todos los clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles principales */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle>CRM - Gestión de Contactos</CardTitle>
              <CardDescription>
                Administra clientes, proveedores y empleados con clasificación automática por nivel de gastos
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Contacto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Contacto</DialogTitle>
                  <DialogDescription>
                    Completa la información del contacto para agregarlo al CRM
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      placeholder="Ej: María González"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      placeholder="Ej: maria@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                      placeholder="Ej: +58 412-1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={newContact.company}
                      onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                      placeholder="Ej: Restaurante El Sabor"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={newContact.address}
                      onChange={(e) => setNewContact({...newContact, address: e.target.value})}
                      placeholder="Ej: Av. Libertador, Caracas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactType">Tipo de Contacto</Label>
                    <Select value={newContact.contactType} onValueChange={(value) => setNewContact({...newContact, contactType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="proveedor">Proveedor</SelectItem>
                        <SelectItem value="empleado">Empleado</SelectItem>
                        <SelectItem value="administrador">Administrador</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={newContact.notes}
                      onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                      placeholder="Información adicional sobre el contacto..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddContact}>
                    Agregar Contacto
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
                  placeholder="Buscar por nombre, email, empresa o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="cliente">Clientes</SelectItem>
                <SelectItem value="proveedor">Proveedores</SelectItem>
                <SelectItem value="empleado">Empleados</SelectItem>
                <SelectItem value="administrador">Administradores</SelectItem>
                <SelectItem value="gestor">Gestores</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tiers</SelectItem>
                <SelectItem value="diamante">Diamante</SelectItem>
                <SelectItem value="oro">Oro</SelectItem>
                <SelectItem value="plata">Plata</SelectItem>
                <SelectItem value="bronce">Bronce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de contactos */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tier Cliente</TableHead>
                  <TableHead>Gastos Totales</TableHead>
                  <TableHead>Última Orden</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{contact.company}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {contact.address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getContactTypeBadge(contact.contactType)}
                    </TableCell>
                    <TableCell>
                      {getCustomerTierBadge(contact.customerTier)}
                    </TableCell>
                    <TableCell>
                      {contact.contactType === 'cliente' ? (
                        <div className="text-sm">
                          <div className="font-medium">${contact.totalSpent?.toFixed(2) || '0.00'}</div>
                          <div className="text-muted-foreground">
                            {contact.totalOrders || 0} órdenes
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.lastOrderDate ? (
                        <div className="text-sm">
                          {new Date(contact.lastOrderDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin órdenes</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContact(contact)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
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
            <DialogTitle>Editar Contacto</DialogTitle>
            <DialogDescription>
              Modifica la información del contacto
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre Completo</Label>
                <Input
                  id="edit-name"
                  value={selectedContact.name}
                  onChange={(e) => setSelectedContact({...selectedContact, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedContact.email}
                  onChange={(e) => setSelectedContact({...selectedContact, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={selectedContact.phone}
                  onChange={(e) => setSelectedContact({...selectedContact, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">Empresa</Label>
                <Input
                  id="edit-company"
                  value={selectedContact.company}
                  onChange={(e) => setSelectedContact({...selectedContact, company: e.target.value})}
                />
              </div>
              {selectedContact.contactType === 'cliente' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-totalSpent">Gastos Totales ($)</Label>
                  <Input
                    id="edit-totalSpent"
                    type="number"
                    step="0.01"
                    value={selectedContact.totalSpent || 0}
                    onChange={(e) => setSelectedContact({...selectedContact, totalSpent: parseFloat(e.target.value) || 0})}
                  />
                </div>
              )}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea
                  id="edit-notes"
                  value={selectedContact.notes}
                  onChange={(e) => setSelectedContact({...selectedContact, notes: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditContact}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CRMManagement

