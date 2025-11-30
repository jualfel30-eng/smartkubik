import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Plus, Minus, Edit, TrendingUp, TrendingDown, Gift, AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { useCrmContext } from '@/context/CrmContext';
import { fetchApi } from '@/lib/api';

const LoyaltyManager = () => {
  const { toast } = useToast();
  const { crmData: customers } = useCrmContext();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('earn');

  // Search states
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const customerSearchTimeout = useRef(null);

  // Form states
  const [earnForm, setEarnForm] = useState({ amount: '', orderId: '', description: '' });
  const [redeemForm, setRedeemForm] = useState({ points: '', orderId: '', description: '' });
  const [adjustForm, setAdjustForm] = useState({ points: '', reason: '', type: 'bonus' });

  // Convert customers to react-select options
  const customerOptions = useMemo(() => {
    const source = customerSearchResults.length > 0 ? customerSearchResults : customers;
    return source.map((customer) => ({
      value: customer._id,
      label: `${customer.name} - ${customer.taxInfo?.taxId || 'N.A.'}`,
      customer,
    }));
  }, [customers, customerSearchResults]);

  // Trigger customer search with debounce
  const triggerCustomerSearch = (term) => {
    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }
    if (!term || term.length < 2) {
      setCustomerSearchResults([]);
      setIsSearchingCustomers(false);
      return;
    }
    setIsSearchingCustomers(true);
    customerSearchTimeout.current = setTimeout(async () => {
      try {
        const resp = await fetchApi(`/customers?search=${encodeURIComponent(term)}&limit=10`);
        const list = resp?.data || resp?.customers || [];
        setCustomerSearchResults(list);
      } catch (error) {
        console.error('Customer search failed:', error);
        setCustomerSearchResults([]);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 300);
  };

  const handleCustomerNameInputChange = (inputValue) => {
    setCustomerNameInput(inputValue);
    triggerCustomerSearch(inputValue);
  };

  const handleCustomerSelect = (selectedOption) => {
    if (selectedOption) {
      const { customer } = selectedOption;
      setSelectedCustomer(customer._id);
      setSelectedCustomerOption(selectedOption);
      setCustomerNameInput('');
      setCustomerSearchResults([]);
    } else {
      setSelectedCustomer(null);
      setSelectedCustomerOption(null);
      setCustomerBalance(null);
      setTransactions([]);
      setCustomerNameInput('');
      setCustomerSearchResults([]);
    }
  };

  const getCustomerValue = () => {
    if (selectedCustomer && selectedCustomerOption) {
      return selectedCustomerOption;
    }
    return null;
  };

  const fetchCustomerBalance = useCallback(async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const response = await fetchApi(`/loyalty/balance/${selectedCustomer}`);
      setCustomerBalance(response.data);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el balance de puntos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, toast]);

  const fetchTransactions = useCallback(async () => {
    if (!selectedCustomer) return;

    try {
      const response = await fetchApi(`/loyalty/history?customerId=${selectedCustomer}&limit=50`);
      setTransactions(response.data?.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerBalance();
      fetchTransactions();
    }
  }, [selectedCustomer, fetchCustomerBalance, fetchTransactions]);

  const handleEarnPoints = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !earnForm.amount) return;

    try {
      setLoading(true);
      await fetchApi('/loyalty/earn', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer,
          amount: parseFloat(earnForm.amount),
          orderId: earnForm.orderId || undefined,
          description: earnForm.description || undefined,
        }),
      });

      toast({
        title: 'Puntos acumulados',
        description: `Se acumularon puntos exitosamente`,
      });

      setEarnForm({ amount: '', orderId: '', description: '' });
      fetchCustomerBalance();
      fetchTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudieron acumular los puntos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPoints = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !redeemForm.points) return;

    try {
      setLoading(true);
      const response = await fetchApi('/loyalty/redeem', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer,
          points: parseInt(redeemForm.points),
          orderId: redeemForm.orderId || undefined,
          description: redeemForm.description || undefined,
        }),
      });

      toast({
        title: 'Puntos redimidos',
        description: `Descuento aplicado: $${response.data.discountAmount.toFixed(2)}`,
      });

      setRedeemForm({ points: '', orderId: '', description: '' });
      fetchCustomerBalance();
      fetchTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudieron redimir los puntos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !adjustForm.points || !adjustForm.reason) return;

    try {
      setLoading(true);
      await fetchApi('/loyalty/adjust', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer,
          points: parseInt(adjustForm.points),
          reason: adjustForm.reason,
          type: adjustForm.type,
        }),
      });

      toast({
        title: 'Puntos ajustados',
        description: 'El ajuste se realizó exitosamente',
      });

      setAdjustForm({ points: '', reason: '', type: 'bonus' });
      fetchCustomerBalance();
      fetchTransactions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo realizar el ajuste',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earn':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'redeem':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'adjust':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'expire':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const getTransactionBadge = (type) => {
    const variants = {
      earn: 'default',
      redeem: 'destructive',
      adjust: 'secondary',
      expire: 'outline',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Programa de Lealtad
            </CardTitle>
            <CardDescription>Gestiona puntos de tus clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer">Cliente</Label>
                <SearchableSelect
                  options={customerOptions}
                  value={getCustomerValue()}
                  onSelection={handleCustomerSelect}
                  onInputChange={handleCustomerNameInputChange}
                  inputValue={customerNameInput}
                  placeholder="Escriba para buscar cliente..."
                  isCreatable={false}
                  isLoading={isSearchingCustomers}
                />
              </div>

              {selectedCustomer && customerBalance && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Balance actual</span>
                    <span className="text-2xl font-bold">{customerBalance.currentBalance} pts</span>
                  </div>
                  {customerBalance.expiringPoints > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-orange-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Puntos por expirar
                      </span>
                      <span className="font-semibold text-orange-600">{customerBalance.expiringPoints} pts</span>
                    </div>
                  )}
                  {customerBalance.expirationDate && (
                    <div className="text-xs text-muted-foreground">
                      Próxima expiración: {new Date(customerBalance.expirationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {selectedCustomer && customerBalance && (
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tier actual</span>
                  <Badge variant="outline">{customerBalance.tier || 'Ninguno'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total ganado</span>
                  <span className="font-semibold">{customerBalance.totalEarned || 0} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total redimido</span>
                  <span className="font-semibold">{customerBalance.totalRedeemed || 0} pts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="earn" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Acumular
                </TabsTrigger>
                <TabsTrigger value="redeem" className="flex items-center gap-2">
                  <Minus className="w-4 h-4" />
                  Redimir
                </TabsTrigger>
                <TabsTrigger value="adjust" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Ajustar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="earn">
                <form onSubmit={handleEarnPoints} className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Monto de compra ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={earnForm.amount}
                      onChange={(e) => setEarnForm({ ...earnForm, amount: e.target.value })}
                      placeholder="100.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Los puntos se calcularán automáticamente según la configuración
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="earn-order">ID de Orden (opcional)</Label>
                    <Input
                      id="earn-order"
                      value={earnForm.orderId}
                      onChange={(e) => setEarnForm({ ...earnForm, orderId: e.target.value })}
                      placeholder="ORD-12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="earn-desc">Descripción (opcional)</Label>
                    <Textarea
                      id="earn-desc"
                      value={earnForm.description}
                      onChange={(e) => setEarnForm({ ...earnForm, description: e.target.value })}
                      placeholder="Compra en tienda"
                      rows={2}
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    <Gift className="w-4 h-4 mr-2" />
                    Acumular Puntos
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="redeem">
                <form onSubmit={handleRedeemPoints} className="space-y-4">
                  <div>
                    <Label htmlFor="points">Puntos a redimir</Label>
                    <Input
                      id="points"
                      type="number"
                      value={redeemForm.points}
                      onChange={(e) => setRedeemForm({ ...redeemForm, points: e.target.value })}
                      placeholder="100"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Disponible: {customerBalance?.currentBalance || 0} pts
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="redeem-order">ID de Orden (opcional)</Label>
                    <Input
                      id="redeem-order"
                      value={redeemForm.orderId}
                      onChange={(e) => setRedeemForm({ ...redeemForm, orderId: e.target.value })}
                      placeholder="ORD-12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="redeem-desc">Descripción (opcional)</Label>
                    <Textarea
                      id="redeem-desc"
                      value={redeemForm.description}
                      onChange={(e) => setRedeemForm({ ...redeemForm, description: e.target.value })}
                      placeholder="Descuento aplicado"
                      rows={2}
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Redimir Puntos
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="adjust">
                <form onSubmit={handleAdjustPoints} className="space-y-4">
                  <div>
                    <Label htmlFor="adjust-points">Puntos a ajustar</Label>
                    <Input
                      id="adjust-points"
                      type="number"
                      value={adjustForm.points}
                      onChange={(e) => setAdjustForm({ ...adjustForm, points: e.target.value })}
                      placeholder="100 o -100"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa valores positivos para aumentar, negativos para disminuir
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="adjust-type">Tipo de ajuste</Label>
                    <Select
                      value={adjustForm.type}
                      onValueChange={(value) => setAdjustForm({ ...adjustForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_adjustment">Ajuste administrativo</SelectItem>
                        <SelectItem value="correction">Corrección</SelectItem>
                        <SelectItem value="bonus">Bonificación</SelectItem>
                        <SelectItem value="penalty">Penalización</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="adjust-reason">Razón *</Label>
                    <Textarea
                      id="adjust-reason"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      placeholder="Explica el motivo del ajuste"
                      rows={3}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Realizar Ajuste
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      {selectedCustomer && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Transacciones</CardTitle>
            <CardDescription>Últimas 50 transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell className="text-sm">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        {getTransactionBadge(transaction.type)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${
                      transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.points > 0 ? '+' : ''}{transaction.points}
                    </TableCell>
                    <TableCell className="text-right">{transaction.balanceAfter}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoyaltyManager;
