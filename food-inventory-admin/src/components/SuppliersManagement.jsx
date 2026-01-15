import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Plus, Search, Edit, Trash2, Phone, Mail, FileText } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge.jsx';
import SupplierDetailDialog from './suppliers/SupplierDetailDialog.jsx';

export default function SuppliersManagement() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    const loadSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const query = search ? `?search=${encodeURIComponent(search)}` : '';
            const response = await fetchApi(`/suppliers${query}`);
            setSuppliers(Array.isArray(response) ? response : (response.data || []));
        } catch (error) {
            console.error('Error loading suppliers:', error);
            toast.error('Error al cargar proveedores');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        loadSuppliers();
    }, [loadSuppliers]);

    const handleCreate = () => {
        setSelectedSupplier(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (supplier) => {
        setSelectedSupplier(supplier);
        setIsDialogOpen(true);
    };

    const handleSaveSuccess = async () => {
        setIsDialogOpen(false);
        // Wait briefly to ensure backend consistency (similar to Employee flow)
        await new Promise(resolve => setTimeout(resolve, 500));
        loadSuppliers();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight">Proveedores</h3>
                    <p className="text-muted-foreground">Gestione su base de datos de proveedores y condiciones comerciales.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, RIF..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre / Empresa</TableHead>
                                <TableHead>RIF</TableHead>
                                <TableHead>Contacto Principal</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Cargando proveedores...</TableCell>
                                </TableRow>
                            ) : suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">No se encontraron proveedores.</TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow key={supplier._id}>
                                        <TableCell>
                                            <div className="font-medium">{supplier.name}</div>
                                            {supplier.tradeName && supplier.tradeName !== supplier.name && (
                                                <div className="text-xs text-muted-foreground">{supplier.tradeName}</div>
                                            )}
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{supplier.supplierNumber}</div>
                                        </TableCell>
                                        <TableCell>{supplier.taxInfo?.rif || supplier.taxInfo?.taxId || '-'}</TableCell>
                                        <TableCell>
                                            {supplier.contacts?.[0] ? (
                                                <div className="space-y-1">
                                                    <div className="text-sm font-medium">{supplier.contacts[0].name}</div>
                                                    {supplier.contacts[0].phone && (
                                                        <div className="text-xs text-muted-foreground flex items-center">
                                                            <Phone className="h-3 w-3 mr-1" /> {supplier.contacts[0].phone}
                                                        </div>
                                                    )}
                                                    {supplier.contacts[0].email && (
                                                        <div className="text-xs text-muted-foreground flex items-center">
                                                            <Mail className="h-3 w-3 mr-1" /> {supplier.contacts[0].email}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {supplier.address ? (
                                                <div className="text-sm max-w-[200px] truncate" title={`${supplier.address.street || ''} ${supplier.address.city || ''}`}>
                                                    {supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ''}
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                                                {supplier.status === 'active' ? 'Activo' : supplier.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <SupplierDetailDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                supplier={selectedSupplier}
                onSuccess={handleSaveSuccess}
            />
        </div>
    );
}
