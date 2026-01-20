import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Users, UserCircle } from 'lucide-react';

export default function SeatGuestsModal({ table, onClose, onSuccess }) {
  const [guestCount, setGuestCount] = useState('');
  const [serverId, setServerId] = useState('');
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      // Fetch users with role 'waiter' or 'server'
      const response = await fetchApi('/users?role=waiter');
      setServers(response);
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const guests = parseInt(guestCount);

    // Validaciones
    if (!guests || guests < 1) {
      setError('Ingresa un número válido de comensales');
      return;
    }

    if (guests < table.minCapacity) {
      setError(`Esta mesa requiere mínimo ${table.minCapacity} comensales`);
      return;
    }

    if (guests > table.maxCapacity) {
      setError(`Esta mesa tiene capacidad máxima de ${table.maxCapacity} comensales`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetchApi('/tables/seat-guests', {
        method: 'POST',
        body: JSON.stringify({
          tableId: table._id,
          guestCount: guests,
          serverId: serverId || undefined,
        }),
      });

      onSuccess(response);
    } catch (err) {
      setError(err.message || 'Error al sentar comensales');
      setLoading(false);
    }
  };

  const quickSelectGuests = (count) => {
    setGuestCount(count.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Sentar Comensales
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Mesa {table.tableNumber} - {table.section}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Capacidad: {table.minCapacity}-{table.maxCapacity} personas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Número de Comensales */}
          <div>
            <Label htmlFor="guestCount">Número de Comensales *</Label>
            <Input
              id="guestCount"
              type="number"
              min={table.minCapacity}
              max={table.maxCapacity}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder={`Entre ${table.minCapacity} y ${table.maxCapacity}`}
              className="mt-2"
              required
            />

            {/* Botones de Selección Rápida */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {Array.from(
                { length: table.maxCapacity - table.minCapacity + 1 },
                (_, i) => table.minCapacity + i
              )
                .filter((count) => count <= 6) // Solo mostrar hasta 6 para no saturar
                .map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={guestCount === count.toString() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => quickSelectGuests(count)}
                  >
                    {count}
                  </Button>
                ))}
            </div>
          </div>

          {/* Asignar Mesero */}
          <div>
            <Label htmlFor="serverId" className="dark:text-gray-200">
              Asignar Mesero <span className="text-gray-400 dark:text-gray-500">(Opcional)</span>
            </Label>
            <select
              id="serverId"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Sin asignar</option>
              {servers.map((server) => (
                <option key={server._id} value={server._id}>
                  {server.name} {server.lastName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Puedes asignar un mesero ahora o dejarlo para después
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Sentando...' : 'Sentar Comensales'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
