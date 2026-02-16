import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { OrderSheetForTables } from '../orders/v2/OrderSheetForTables'; // Sheet para Mesas con layout de 2 columnas
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Plus,
  Users,
  Clock,
  ArrowRightLeft,
  Link2,
  CheckCircle,
  XCircle,
  Sparkles,
  Timer,
  DollarSign
} from 'lucide-react';
import SeatGuestsModal from './SeatGuestsModal';
import TableConfigModal from './TableConfigModal';

export function FloorPlan() {
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [seatGuestsModal, setSeatGuestsModal] = useState(false);
  const [tableConfigModal, setTableConfigModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('all');

  // OrderSheet integration
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [orderSheetOrderId, setOrderSheetOrderId] = useState(null);
  const [orderSheetTableId, setOrderSheetTableId] = useState(null);
  const [orderSheetWaiterId, setOrderSheetWaiterId] = useState(null);

  const fetchFloorPlan = async () => {
    try {
      const data = await fetchApi('/tables/floor-plan');
      setFloorPlan(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching floor plan:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorPlan();
    const interval = setInterval(fetchFloorPlan, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md',
      occupied: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md',
      reserved: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md',
      cleaning: 'bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-md',
      'out-of-service': 'bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-md',
    };
    return colors[status] || 'bg-gray-300';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800 border-green-300',
      occupied: 'bg-red-100 text-red-800 border-red-300',
      reserved: 'bg-blue-100 text-blue-800 border-blue-300',
      cleaning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'out-of-service': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      available: <CheckCircle className="w-4 h-4" />,
      occupied: <Users className="w-4 h-4" />,
      reserved: <Clock className="w-4 h-4" />,
      cleaning: <Sparkles className="w-4 h-4" />,
      'out-of-service': <XCircle className="w-4 h-4" />,
    };
    return icons[status] || null;
  };

  const getSectionColor = (sectionName) => {
    const colors = [
      'border-blue-300 dark:border-gray-700 bg-blue-50 dark:bg-gray-800/40',
      'border-purple-300 dark:border-gray-700 bg-purple-50 dark:bg-gray-800/40',
      'border-pink-300 dark:border-gray-700 bg-pink-50 dark:bg-gray-800/40',
      'border-orange-300 dark:border-gray-700 bg-orange-50 dark:bg-gray-800/40',
      'border-teal-300 dark:border-gray-700 bg-teal-50 dark:bg-gray-800/40',
      'border-indigo-300 dark:border-gray-700 bg-indigo-50 dark:bg-gray-800/40',
    ];
    const hash = sectionName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleSeatGuests = () => {
    setSeatGuestsModal(true);
  };

  const handleClearTable = async () => {
    if (!selectedTable) return;

    try {
      await fetchApi(`/tables/${selectedTable._id}/clear`, {
        method: 'POST',
      });
      await fetchFloorPlan();
      setSelectedTable(null);
    } catch (error) {
      console.error('Error clearing table:', error);
    }
  };

  const handleMarkAvailable = async () => {
    if (!selectedTable) return;
    try {
      await fetchApi(`/tables/${selectedTable._id}/available`, {
        method: 'POST',
      });
      await fetchFloorPlan();
      setSelectedTable(null);
    } catch (error) {
      console.error('Error marking table available:', error);
    }
  };

  const handleCreateTable = () => {
    setSelectedTable(null);
    setTableConfigModal(true);
  };

  const handleEditTable = () => {
    setTableConfigModal(true);
  };

  const handleViewOrder = () => {
    if (!selectedTable) return;

    if (selectedTable.currentOrderId) {
      setOrderSheetOrderId(selectedTable.currentOrderId);
      setOrderSheetTableId(null);
    } else {
      setOrderSheetOrderId(null);
      setOrderSheetTableId(selectedTable._id);
    }
    setIsOrderSheetOpen(true);
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);

    // Auto-open order if occupied and has order
    if (table.status === 'occupied' && table.currentOrderId) {
      // Ensure we handle both string ID and populated object
      const orderId = typeof table.currentOrderId === 'object'
        ? table.currentOrderId._id || table.currentOrderId.toString()
        : table.currentOrderId;

      setOrderSheetOrderId(orderId);
      setOrderSheetTableId(null);
      setIsOrderSheetOpen(true);
    }
  };

  const filteredSections = selectedSection === 'all'
    ? floorPlan?.sections || []
    : floorPlan?.sections?.filter(s => s.section === selectedSection) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando plano del restaurante...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Estadísticas */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Plano del Restaurante</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de mesas en tiempo real</p>
        </div>
        <Button onClick={handleCreateTable} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Mesa
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Mesas</p>
              <p className="text-2xl font-bold dark:text-gray-100">{floorPlan?.totalTables || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponibles</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {floorPlan?.availableTables || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-green-500 dark:bg-green-400 rounded"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ocupadas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {floorPlan?.occupiedTables || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-red-500 dark:bg-red-400 rounded"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de Ocupación</p>
              <p className="text-2xl font-bold dark:text-gray-100">
                {floorPlan?.occupancyRate?.toFixed(0) || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtro por Sección */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedSection === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedSection('all')}
        >
          Todas las Secciones
        </Button>
        {floorPlan?.sections?.map((section) => (
          <Button
            key={section.section}
            variant={selectedSection === section.section ? 'default' : 'outline'}
            onClick={() => setSelectedSection(section.section)}
          >
            {section.section} ({section.tables.length})
          </Button>
        ))}
      </div>

      {/* Layout Principal: Plano + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Plano de Mesas */}
        <div className="lg:col-span-3">
          <Card className="p-6 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-6">
              {filteredSections.map((section) => (
                <div
                  key={section.section}
                  className={`p-4 rounded-lg border-2 ${getSectionColor(section.section)}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold dark:text-gray-100 flex items-center gap-2">
                      {section.section}
                      <Badge variant="outline" className="font-normal">
                        {section.tables.length} mesas
                      </Badge>
                    </h3>
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Disponibles: <span className="font-semibold text-green-600 dark:text-green-400">
                          {section.tables.filter(t => t.status === 'available').length}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {section.tables.map((table) => (
                      <button
                        key={table._id}
                        onClick={() => handleTableClick(table)}
                        className={`
                          ${getStatusColor(table.status)}
                          ${selectedTable?._id === table._id ? 'ring-4 ring-yellow-400 scale-105' : ''}
                          text-white p-4 rounded-xl transition-all duration-200
                          flex flex-col items-center justify-center
                          min-h-[90px] relative transform hover:scale-105
                        `}
                      >
                        <div className="absolute top-2 left-2">
                          {getStatusIcon(table.status)}
                        </div>
                        <span className="text-xl font-bold mb-1">{table.tableNumber}</span>
                        <div className="flex flex-col items-center gap-1">
                          {table.guestCount && (
                            <span className="text-xs flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
                              <Users className="w-3 h-3" />
                              {table.guestCount}/{table.maxCapacity}
                            </span>
                          )}
                          {table.seatedAt && table.status === 'occupied' && (
                            <span className="text-xs flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
                              <Timer className="w-3 h-3" />
                              {Math.floor((Date.now() - new Date(table.seatedAt)) / 60000)}m
                            </span>
                          )}
                        </div>
                        {table.combinesWith && table.combinesWith.length > 0 && (
                          <div className="absolute top-2 right-2 bg-white/30 rounded-full p-1">
                            <Link2 className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredSections.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No hay mesas en esta sección</p>
                <Button onClick={handleCreateTable} className="mt-4">
                  Crear Primera Mesa
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: Detalles de Mesa Seleccionada */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4 shadow-lg">
            {selectedTable ? (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold">Mesa {selectedTable.tableNumber}</h3>
                    <div className={`p-2 rounded-full ${getStatusColor(selectedTable.status).split(' ')[0]}`}>
                      {getStatusIcon(selectedTable.status)}
                    </div>
                  </div>
                  <Badge className={`${getStatusBadgeColor(selectedTable.status)} border`}>
                    {selectedTable.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Sección:</span>
                      <span className="font-bold dark:text-gray-100">{selectedTable.section}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Capacidad:</span>
                      <span className="font-bold dark:text-gray-100">
                        {selectedTable.minCapacity}-{selectedTable.maxCapacity} personas
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Forma:</span>
                      <span className="font-bold dark:text-gray-100 capitalize">{selectedTable.shape}</span>
                    </div>
                  </div>

                  {selectedTable.status === 'occupied' && (
                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="font-semibold text-red-900 dark:text-red-300">Mesa Ocupada</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Comensales:</span>
                          <span className="font-bold text-red-900 dark:text-red-300">{selectedTable.guestCount}</span>
                        </div>
                        {selectedTable.seatedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Tiempo:</span>
                            <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {Math.floor((Date.now() - new Date(selectedTable.seatedAt)) / 60000)} min
                            </span>
                          </div>
                        )}
                        {selectedTable.currentOrderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Orden activa:</span>
                            <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Sí
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTable.assignedServerId && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Mesero Asignado:</span>
                        <span className="font-bold text-blue-900 dark:text-blue-200">
                          {selectedTable.assignedServerId.name || 'Asignado'}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedTable.combinesWith && selectedTable.combinesWith.length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-semibold text-purple-900 dark:text-purple-300">Mesa Combinada</span>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {selectedTable.combinesWith.map((id) => (
                          <Badge key={id} variant="outline" className="text-xs bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700">
                            Mesa {id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  {selectedTable.status === 'available' && (
                    <Button
                      onClick={handleSeatGuests}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Sentar Comensales
                    </Button>
                  )}

                  {selectedTable.status === 'occupied' && (
                    <>
                      <Button
                        onClick={handleClearTable}
                        variant="outline"
                        className="w-full"
                      >
                        Limpiar Mesa
                      </Button>
                      <Button
                        onClick={handleViewOrder}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <DollarSign className="w-4 h-4" />
                        {selectedTable.currentOrderId ? 'Ver / Editar Orden' : 'Crear Orden'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transferir
                      </Button>
                    </>
                  )}

                  {selectedTable.status === 'cleaning' && (
                    <Button
                      onClick={handleMarkAvailable}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Terminar Limpieza
                    </Button>
                  )}

                  <Button
                    onClick={handleEditTable}
                    variant="outline"
                    className="w-full"
                  >
                    Editar Mesa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona una mesa para ver sus detalles
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modales */}
      {seatGuestsModal && (
        <SeatGuestsModal
          table={selectedTable}
          onClose={() => setSeatGuestsModal(false)}
          onSuccess={(updatedTable) => {
            fetchFloorPlan();
            setSeatGuestsModal(false);

            // Auto-open Order Sheet
            // Use the updated table ID or fall back to selectedTable
            const tableId = updatedTable?._id || selectedTable?._id;
            // Extract waiter ID (can be ObjectId or string)
            const waiterId = updatedTable?.assignedServerId?._id || updatedTable?.assignedServerId || null;

            if (tableId) {
              setOrderSheetOrderId(null);
              setOrderSheetTableId(tableId);
              setOrderSheetWaiterId(waiterId);
              setIsOrderSheetOpen(true);
            }
          }}
        />
      )}

      {tableConfigModal && (
        <TableConfigModal
          table={selectedTable}
          sections={floorPlan?.sections?.map(s => s.section) || []}
          onClose={() => setTableConfigModal(false)}
          onSuccess={() => {
            fetchFloorPlan();
            setTableConfigModal(false);
            setSelectedTable(null);
          }}
        />
      )}
      {tableConfigModal && (
        <TableConfigModal
          table={selectedTable}
          sections={floorPlan?.sections?.map(s => s.section) || []}
          onClose={() => setTableConfigModal(false)}
          onSuccess={() => {
            fetchFloorPlan();
            setTableConfigModal(false);
            setSelectedTable(null);
          }}
        />
      )}

      {/* Order Sheet for Tables - Sheet modal con layout de 2 columnas */}
      <OrderSheetForTables
        isOpen={isOrderSheetOpen}
        onClose={() => {
          setIsOrderSheetOpen(false);
          fetchFloorPlan(); // Refresh tables when closing sheet (to see occupancy updates)
        }}
        initialOrderId={orderSheetOrderId}
        initialTableId={orderSheetTableId}
        initialWaiterId={orderSheetWaiterId}
      />
    </div>
  );
}
