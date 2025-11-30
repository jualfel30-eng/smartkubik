import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  ShoppingCart,
  TrendingUp,
  Calendar,
  DollarSign,
  Package,
  Loader2,
  AlertCircle,
  Award
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTierBadge = (tier) => {
  const tierMap = {
    diamante: { label: 'Diamante', icon: '💎', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    oro: { label: 'Oro', icon: '🥇', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    plata: { label: 'Plata', icon: '🥈', className: 'bg-gray-100 text-gray-800 border-gray-300' },
    bronce: { label: 'Bronce', icon: '🥉', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  const tierInfo = tierMap[tier?.toLowerCase()] || {
    label: tier || 'Sin tier',
    icon: '',
    className: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  return (
    <Badge className={`${tierInfo.className} border`}>
      {tierInfo.icon} {tierInfo.label}
    </Badge>
  );
};

export const CustomerDetailDialog = ({ customer, open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCustomerData = useCallback(async () => {
    if (!customer?._id) {
      return;
    }

    setLoading(true);
    setError(null);
      setTransactions([]); // Clear previous data

    try {
      const customerId = customer._id;

      // Cargar transacciones y estadísticas en paralelo
      const [transactionsRes, statsRes] = await Promise.all([
        fetchApi(`/customers/${customerId}/transactions`),
        fetchApi(`/customers/${customerId}/transaction-stats`)
      ]);

      if (transactionsRes.success) {
        const txData = transactionsRes.data || [];
        setTransactions(txData);
      } else {
        console.error('❌ Transactions API call FAILED:', transactionsRes);
        setTransactions([]);
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      } else {
        console.error('❌ Stats API call FAILED:', statsRes);
        setStats(null);
      }
    } catch (err) {
      console.error('❌ EXCEPTION in loadCustomerData:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      setError(err.message || 'Error al cargar datos del cliente');
      toast.error('Error al cargar historial del cliente');
      setTransactions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [customer?._id]);

  useEffect(() => {
    if (open && customer?._id) {
      loadCustomerData();
    } else if (!open) {
      // Reset state when dialog closes
      setTransactions([]);
      setStats(null);
      setError(null);
      setActiveTab('info');
    }
  }, [open, customer?._id, loadCustomerData]);

  const getContactValue = (type) => {
    if (!customer?.contacts || customer.contacts.length === 0) return 'N/A';
    const contact = customer.contacts.find(c => c.type === type && c.isActive);
    return contact?.value || 'N/A';
  };

  const getAddress = () => {
    if (!customer?.addresses || customer.addresses.length === 0) return 'N/A';
    const primary = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
    if (!primary) return 'N/A';
    return `${primary.street}, ${primary.city}, ${primary.state}`;
  };

  // Detectar tipo de negocio basado en los items de las transacciones
  const getBusinessType = () => {
    if (!transactions || transactions.length === 0) return 'general';

    const firstTransaction = transactions[0];
    if (!firstTransaction?.items || firstTransaction.items.length === 0) return 'general';

    // Analizar categorías para determinar el tipo
    const categories = firstTransaction.items.map(item => item.category?.toLowerCase() || '');

    if (categories.some(c => c.includes('habitaci') || c.includes('room'))) return 'hotel';
    if (categories.some(c => c.includes('comida') || c.includes('food') || c.includes('plato'))) return 'restaurant';

    return 'retail'; // Por defecto, productos/retail
  };

  const businessType = getBusinessType();

  const getItemLabel = () => {
    switch (businessType) {
      case 'hotel': return 'Habitación/Servicio';
      case 'restaurant': return 'Platillo/Bebida';
      default: return 'Producto';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {customer?.name || 'Cliente'} {customer?.lastName || ''}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getTierBadge(customer?.tier)}
                  <Badge variant="outline" className="text-xs">
                    {customer?.customerType === 'business' ? 'Empresa' :
                     customer?.customerType === 'supplier' ? 'Proveedor' : 'Individual'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="flex items-center justify-between px-6 border-b">
            <TabsList className="w-auto justify-start rounded-none border-0 bg-transparent">
              <TabsTrigger value="info" className="gap-2">
                <User className="h-4 w-4" />
                Información
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Historial de Compras ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Estadísticas
              </TabsTrigger>
            </TabsList>
            {loading && (
              <div className="py-2 text-xs text-muted-foreground">
                Cargando...
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(90vh-180px)]">
            {/* PESTAÑA 1: INFORMACIÓN DEL CLIENTE */}
            <TabsContent value="info" className="p-6 space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información de Contacto */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      Contacto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm text-muted-foreground">{getContactValue('email')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Teléfono:</span>
                      <span className="text-sm text-muted-foreground">{getContactValue('phone')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">Dirección:</span>
                        <p className="text-sm text-muted-foreground">{getAddress()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Información de Empresa (si aplica) */}
                {customer?.companyName && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        Empresa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">Razón Social:</span>
                        <p className="text-sm text-muted-foreground">{customer.companyName}</p>
                      </div>
                      {customer?.taxInfo?.taxId && (
                        <div>
                          <span className="text-sm font-medium">
                            {customer.taxInfo.taxType || 'RIF'}:
                          </span>
                          <p className="text-sm text-muted-foreground">{customer.taxInfo.taxId}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Métricas Rápidas */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      Resumen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-2" />
                        <p className="text-2xl font-bold">{formatCurrency(customer?.metrics?.totalSpent || 0)}</p>
                        <p className="text-xs text-muted-foreground">Total Gastado</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <ShoppingCart className="h-5 w-5 mx-auto text-blue-600 mb-2" />
                        <p className="text-2xl font-bold">{customer?.metrics?.totalOrders || 0}</p>
                        <p className="text-xs text-muted-foreground">Órdenes</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <TrendingUp className="h-5 w-5 mx-auto text-purple-600 mb-2" />
                        <p className="text-2xl font-bold">
                          {formatCurrency((customer?.metrics?.totalSpent || 0) / (customer?.metrics?.totalOrders || 1))}
                        </p>
                        <p className="text-xs text-muted-foreground">Ticket Promedio</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Calendar className="h-5 w-5 mx-auto text-orange-600 mb-2" />
                        <p className="text-sm font-bold">{formatDate(customer?.metrics?.lastOrderDate)}</p>
                        <p className="text-xs text-muted-foreground">Última Compra</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* PESTAÑA 2: HISTORIAL DE TRANSACCIONES */}
            <TabsContent value="history" className="p-6 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Cargando historial...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-destructive">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  {error}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Este cliente aún no tiene transacciones registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Historial Completo ({transactions.length} transacciones)
                    </h3>
                  </div>

                  {transactions.map((transaction, idx) => (
                    <Card key={transaction._id || idx} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              {transaction.orderNumber}
                              <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {formatDateTime(transaction.orderDate)}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(transaction.totalAmount)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {transaction.paymentMethod || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Productos/Servicios ({transaction.items?.length || 0}):
                          </p>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{getItemLabel()}</TableHead>
                                  <TableHead className="text-center">Cant.</TableHead>
                                  <TableHead className="text-right">Precio Unit.</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transaction.items?.map((item, itemIdx) => (
                                  <TableRow key={itemIdx}>
                                    <TableCell className="font-medium">
                                      {item.productName}
                                      {item.category && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {item.category}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {formatCurrency(item.totalPrice)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PESTAÑA 3: ESTADÍSTICAS */}
            <TabsContent value="stats" className="p-6 space-y-6 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !stats ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay estadísticas disponibles</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Métricas Principales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Gastado
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(stats.totalSpent)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Valor Promedio por Orden
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatCurrency(stats.averageOrderValue)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total de Transacciones
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-purple-600">
                          {stats.totalTransactions}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Fechas Importantes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Actividad</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Primera Compra</p>
                        <p className="text-lg font-semibold mt-1">{formatDate(stats.firstPurchaseDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Última Compra</p>
                        <p className="text-lg font-semibold mt-1">{formatDate(stats.lastPurchaseDate)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top 5 Productos */}
                  {stats.topProducts && stats.topProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Top 5 {getItemLabel()}s Más Comprados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{getItemLabel()}</TableHead>
                                <TableHead className="text-center">Compras</TableHead>
                                <TableHead className="text-center">Cantidad</TableHead>
                                <TableHead className="text-right">Total Gastado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats.topProducts.map((product, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{idx + 1}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{product.productName}</p>
                                      {product.category && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          {product.category}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">{product.purchaseCount}</TableCell>
                                  <TableCell className="text-center">{product.totalQuantity}</TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">
                                    {formatCurrency(product.totalSpent)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
