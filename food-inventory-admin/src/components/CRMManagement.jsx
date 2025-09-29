import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Phone,
  Mail,
  MapPin,
  Building,
  Crown,
  Award,
  Medal,
  Shield,
  DollarSign,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { useCRM } from '@/hooks/use-crm.js';

const initialNewContactState = {
  name: '',
  customerType: 'business', // Default value
  email: '',
  phone: '',
  companyName: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  taxType: 'V',
  taxId: ''
};

function CRMManagement() {
  const { crmData, loading, error, addCustomer, updateCustomer, deleteCustomer, loadCustomers } = useCRM();
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [editingFormState, setEditingFormState] = useState({});
  const [newContact, setNewContact] = useState(initialNewContactState);

  // --- LÓGICA DE CLASIFICACIÓN Y VISUALIZACIÓN ---
  const getCustomerTierBadge = (tier) => {
    if (!tier) return null;
    const badges = {
      diamante: <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"><Crown className="h-3 w-3 mr-1" />Diamante</Badge>,
      oro: <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"><Award className="h-3 w-3 mr-1" />Oro</Badge>,
      plata: <Badge className="bg-gradient-to-r from-gray-400 to-gray-600 text-white"><Medal className="h-3 w-3 mr-1" />Plata</Badge>,
      bronce: <Badge className="bg-gradient-to-r from-orange-400 to-orange-600 text-white"><Shield className="h-3 w-3 mr-1" />Bronce</Badge>
    };
    return badges[tier];
  };

  const getContactTypeBadge = (type) => {
    const typeMap = {
      admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
      business: { label: 'Cliente', className: 'bg-blue-100 text-blue-800' },
      individual: { label: 'Cliente', className: 'bg-blue-100 text-blue-800' },
      supplier: { label: 'Proveedor', className: 'bg-green-100 text-green-800' },
      employee: { label: 'Empleado', className: 'bg-orange-100 text-orange-800' },
      manager: { label: 'Gestor', className: 'bg-gray-100 text-gray-800' },
    };
    const typeInfo = typeMap[type] || { label: type, className: 'bg-gray-200' };
    return <Badge className={typeInfo.className}>{typeInfo.label}</Badge>;
  };

  // --- FILTRADO DE DATOS ---
  useEffect(() => {
    let filtered = [...crmData];

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.taxInfo?.taxId && c.taxInfo.taxId.includes(searchTerm)) ||
        (c.contacts?.some(ct => ct.value.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.customerType === filterType);
    }
    if (filterTier !== 'all') {
      filtered = filtered.filter(c => c.tier === filterTier);
    }

    setFilteredData(filtered);
  }, [crmData, searchTerm, filterType, filterTier]);

  useEffect(() => {
    console.log('CRM Data received:', crmData);
    crmData.forEach(customer => {
      console.log(`${customer.name}: totalSpent = ${customer.metrics?.totalSpent}`);
    });
  }, [crmData]);

  // --- MANEJO DE OPERACIONES CRUD ---
  const handleOpenEditDialog = (contact) => {
    setSelectedContactId(contact._id);
    setEditingFormState({
      name: contact.name || '',
      customerType: contact.customerType || 'business',
      companyName: contact.companyName || '',
      notes: contact.notes || '',
      email: contact.contacts?.find(c => c.type === 'email')?.value || '',
      phone: contact.contacts?.find(c => c.type === 'phone')?.value || '',
      street: contact.addresses?.[0]?.street || '',
      city: contact.addresses?.[0]?.city || '',
      state: contact.addresses?.[0]?.state || '',
      taxId: contact.taxInfo?.taxId || '',
      taxType: contact.taxInfo?.taxType || 'V',
    });
    setIsEditDialogOpen(true);
  };

  const handleAddContact = async () => {
    const contactsPayload = [];
    if (newContact.email) {
      contactsPayload.push({ type: 'email', value: newContact.email, isPrimary: true });
    }
    if (newContact.phone) {
      contactsPayload.push({ type: 'phone', value: newContact.phone, isPrimary: !newContact.email });
    }

    const payload = {
      name: newContact.name,
      customerType: newContact.customerType,
      companyName: newContact.companyName,
      taxInfo: { taxId: newContact.taxId, taxType: newContact.taxType },
      addresses: [{ type: 'shipping', street: newContact.address, city: newContact.city, state: newContact.state, isDefault: true }],
      contacts: contactsPayload,
      notes: newContact.notes,
    };

    try {
      await addCustomer(payload);
      setNewContact(initialNewContactState);
      setIsAddDialogOpen(false);
    } catch (err) {
      alert(`Error al agregar cliente: ${err.message}`);
    }
  };

  const handleEditContact = async () => {
    if (!selectedContactId) return;

    const originalContact = crmData.find(c => c._id === selectedContactId);
    const changedFields = {};

    // Compara campos simples
    if (editingFormState.name !== originalContact.name) changedFields.name = editingFormState.name;
    if (editingFormState.customerType !== originalContact.customerType) changedFields.customerType = editingFormState.customerType;
    if (editingFormState.companyName !== originalContact.companyName) changedFields.companyName = editingFormState.companyName;
    if (editingFormState.notes !== originalContact.notes) changedFields.notes = editingFormState.notes;

    // Compara y construye el array de contactos solo si hay cambios
    const newEmail = editingFormState.email;
    const newPhone = editingFormState.phone;
    const oldEmail = originalContact.contacts?.find(c => c.type === 'email')?.value || '';
    const oldPhone = originalContact.contacts?.find(c => c.type === 'phone')?.value || '';

    if (newEmail !== oldEmail || newPhone !== oldPhone) {
      changedFields.contacts = [
        { type: 'email', value: newEmail, isPrimary: true },
        { type: 'phone', value: newPhone, isPrimary: false },
      ].filter(c => c.value);
    }

    // Compara y construye el array de direcciones solo si hay cambios
    const newStreet = editingFormState.street;
    const oldStreet = originalContact.addresses?.[0]?.street || '';
    if (newStreet && newStreet !== oldStreet) {
        changedFields.addresses = [{
            type: 'shipping',
            street: editingFormState.street,
            city: editingFormState.city,
            state: editingFormState.state,
            isDefault: true
        }];
    }

    if (Object.keys(changedFields).length === 0) {
      setIsEditDialogOpen(false); // No hay cambios, solo cerrar
      return;
    }

    try {
      await updateCustomer(selectedContactId, changedFields);
      setIsEditDialogOpen(false);
      setSelectedContactId(null);
    } catch (err) {
      alert(`Error al editar cliente: ${err.message}`);
    }
  };

  const handleDeleteContact = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        alert(`Error al eliminar contacto: ${err.message}`);
      }
    }
  };

  // --- RENDERIZADO ---
  if (loading) return <div>Cargando CRM...</div>;
  if (error) return <div className="text-red-500">Error al cargar datos del CRM: {error}</div>;

  return (
    <div className="space-y-6">
      {/* ... (Stats cards remain the same) ... */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-foreground">Gestión de Contactos</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={loadCustomers} disabled={loading} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Agregar Contacto</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Agregar Nuevo Contacto</DialogTitle><DialogDescription>Completa los detalles para registrar un nuevo contacto en el sistema.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Nombre</Label><Input value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Tipo de Contacto</Label><Select value={newContact.customerType} onValueChange={(value) => setNewContact({...newContact, customerType: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="business">Cliente</SelectItem><SelectItem value="supplier">Proveedor</SelectItem><SelectItem value="employee">Empleado</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Gestor</SelectItem><SelectItem value="Repartidor">Repartidor</SelectItem><SelectItem value="Cajero">Cajero</SelectItem><SelectItem value="Mesonero">Mesonero</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Empresa</Label><Input value={newContact.companyName} onChange={(e) => setNewContact({...newContact, companyName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={newContact.email} onChange={(e) => setNewContact({...newContact, email: e.target.value})} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={newContact.phone} onChange={(e) => setNewContact({...newContact, phone: e.target.value})} /></div>
              <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={newContact.address} onChange={(e) => setNewContact({...newContact, address: e.target.value})} /></div>
              <div className="space-y-2"><Label>Ciudad</Label><Input value={newContact.city} onChange={(e) => setNewContact({...newContact, city: e.target.value})} /></div>
              <div className="space-y-2"><Label>Estado</Label><Input value={newContact.state} onChange={(e) => setNewContact({...newContact, state: e.target.value})} /></div>
              <div className="col-span-2 space-y-2"><Label>Identificación Fiscal</Label><div className="flex gap-2"><Select value={newContact.taxType} onValueChange={(value) => setNewContact({...newContact, taxType: value})}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="J">J</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select><Input value={newContact.taxId} onChange={(e) => setNewContact({...newContact, taxId: e.target.value})} /></div></div>
              <div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea value={newContact.notes} onChange={(e) => setNewContact({...newContact, notes: e.target.value})} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button><Button onClick={handleAddContact}>Agregar Contacto</Button></DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <Tabs value={filterType} onValueChange={setFilterType} className="w-full overflow-x-auto sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="business">Clientes</TabsTrigger>
                <TabsTrigger value="supplier">Proveedores</TabsTrigger>
                <TabsTrigger value="employee">Empleados</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Contacto</TableHead><TableHead>Tipo</TableHead><TableHead>Contacto Principal</TableHead><TableHead>Gastos Totales</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredData.map((customer) => {
                  const primaryContact = customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0];
                  return (
                    <TableRow key={customer._id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.companyName}</div>
                      </TableCell>
                      <TableCell>{getContactTypeBadge(customer.customerType)}</TableCell>
                      <TableCell>
                        {primaryContact?.value && <div className="text-sm flex items-center gap-2"><Mail className="h-3 w-3" /> {primaryContact.value}</div>}
                      </TableCell>
                      <TableCell><div className="font-medium">${customer.metrics?.totalSpent?.toFixed(2) || '0.00'}</div></TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(customer)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteContact(customer._id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de edición */}
      {isEditDialogOpen && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Editar Contacto</DialogTitle><DialogDescription>Modifica la información del contacto existente.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>Nombre</Label><Input value={editingFormState.name} onChange={(e) => setEditingFormState({...editingFormState, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Tipo de Contacto</Label><Select value={editingFormState.customerType} onValueChange={(value) => setEditingFormState({...editingFormState, customerType: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="business">Cliente</SelectItem><SelectItem value="supplier">Proveedor</SelectItem><SelectItem value="employee">Empleado</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Gestor</SelectItem><SelectItem value="Repartidor">Repartidor</SelectItem><SelectItem value="Cajero">Cajero</SelectItem><SelectItem value="Mesonero">Mesonero</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Empresa</Label><Input value={editingFormState.companyName} onChange={(e) => setEditingFormState({...editingFormState, companyName: e.target.value})} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={editingFormState.email} onChange={(e) => setEditingFormState({...editingFormState, email: e.target.value})} /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input value={editingFormState.phone} onChange={(e) => setEditingFormState({...editingFormState, phone: e.target.value})} /></div>
                <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={editingFormState.street} onChange={(e) => setEditingFormState({...editingFormState, street: e.target.value})} /></div>
                <div className="space-y-2"><Label>Ciudad</Label><Input value={editingFormState.city} onChange={(e) => setEditingFormState({...editingFormState, city: e.target.value})} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input value={editingFormState.state} onChange={(e) => setEditingFormState({...editingFormState, state: e.target.value})} /></div>
                <div className="col-span-2 space-y-2"><Label>Identificación Fiscal</Label><div className="flex gap-2"><Select value={editingFormState.taxType} onValueChange={(value) => setEditingFormState({...editingFormState, taxType: value})}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="J">J</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select><Input value={editingFormState.taxId} onChange={(e) => setEditingFormState({...editingFormState, taxId: e.target.value})} /></div></div>
                <div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea value={editingFormState.notes} onChange={(e) => setEditingFormState({...editingFormState, notes: e.target.value})} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditContact}>Guardar Cambios</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default CRMManagement;
