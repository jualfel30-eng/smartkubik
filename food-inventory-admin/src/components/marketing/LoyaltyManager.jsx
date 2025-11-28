import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Plus, Minus, Edit, TrendingUp, TrendingDown, Gift, AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LoyaltyManager = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('earn');

  // Form states
  const [earnForm, setEarnForm] = useState({ amount: '', orderId: '', description: '' });
  const [redeemForm, setRedeemForm] = useState({ points: '', orderId: '', description: '' });
  const [adjustForm, setAdjustForm] = useState({ points: '', reason: '', type: 'bonus' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerBalance();
      fetchTransactions();
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive',
      });
    }
  };

  const fetchCustomerBalance = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/loyalty/balance/${selectedCustomer}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomerBalance(response.data.data);
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
  };

  const fetchTransactions = async () => {
    if (!selectedCustomer) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/loyalty/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { customerId: selectedCustomer, limit: 50 },
      });
      setTransactions(response.data.data?.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleEarnPoints = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !earnForm.amount) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/loyalty/earn`,
        {
          customerId: selectedCustomer,
          amount: parseFloat(earnForm.amount),
          orderId: earnForm.orderId || undefined,
          description: earnForm.description || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/loyalty/redeem`,
        {
          customerId: selectedCustomer,
          points: parseInt(redeemForm.points),
          orderId: redeemForm.orderId || undefined,
          description: redeemForm.description || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Puntos redimidos',
        description: `Descuento aplicado: $${response.data.data.discountAmount.toFixed(2)}`,
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
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/loyalty/adjust`,
        {
          customerId: selectedCustomer,
          points: parseInt(adjustForm.points),
          reason: adjustForm.reason,
          type: adjustForm.type,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
                <Select value={selectedCustomer || ''} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} - {customer.email || customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
