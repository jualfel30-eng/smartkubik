import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Users, Clock, ArrowRightLeft, Link2 } from 'lucide-react';
import SeatGuestsModal from './SeatGuestsModal';
import TableConfigModal from './TableConfigModal';

export function FloorPlan() {
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [seatGuestsModal, setSeatGuestsModal] = useState(false);
  const [tableConfigModal, setTableConfigModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('all');

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
      available: 'bg-green-500 hover:bg-green-600',
      occupied: 'bg-red-500 hover:bg-red-600',
      reserved: 'bg-blue-500 hover:bg-blue-600',
      cleaning: 'bg-yellow-500 hover:bg-yellow-600',
      'out-of-service': 'bg-gray-500 hover:bg-gray-600',
    };
    return colors[status] || 'bg-gray-300';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      reserved: 'bg-blue-100 text-blue-800',
      cleaning: 'bg-yellow-100 text-yellow-800',
      'out-of-service': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const handleCreateTable = () => {
    setSelectedTable(null);
    setTableConfigModal(true);
  };

  const handleEditTable = () => {
    setTableConfigModal(true);
  };

  const filteredSections = selectedSection === 'all'
    ? floorPlan?.sections || []
    : floorPlan?.sections?.filter(s => s.section === selectedSection) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando plano del restaurante...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Estadísticas */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plano del Restaurante</h1>
          <p className="text-gray-600 mt-1">Gestión de mesas en tiempo real</p>
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
              <p className="text-sm text-gray-600">Total Mesas</p>
              <p className="text-2xl font-bold">{floorPlan?.totalTables || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {floorPlan?.availableTables || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ocupadas</p>
              <p className="text-2xl font-bold text-red-600">
                {floorPlan?.occupiedTables || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa de Ocupación</p>
              <p className="text-2xl font-bold">
                {floorPlan?.occupancyRate?.toFixed(0) || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
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
          <Card className="p-6">
            <div className="space-y-6">
              {filteredSections.map((section) => (
                <div key={section.section}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {section.section}
                    <Badge variant="outline">{section.tables.length} mesas</Badge>
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {section.tables.map((table) => (
                      <button
                        key={table._id}
                        onClick={() => setSelectedTable(table)}
                        className={`
                          ${getStatusColor(table.status)}
                          ${selectedTable?._id === table._id ? 'ring-4 ring-blue-400' : ''}
                          text-white p-4 rounded-lg transition-all duration-200
                          flex flex-col items-center justify-center
                          min-h-[80px] relative
                        `}
                      >
                        <span className="text-lg font-bold">{table.tableNumber}</span>
                        {table.guestCount && (
                          <span className="text-xs mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {table.guestCount}
                          </span>
                        )}
                        {table.combinesWith && table.combinesWith.length > 0 && (
                          <Link2 className="w-3 h-3 absolute top-1 right-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredSections.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay mesas en esta sección</p>
                <Button onClick={handleCreateTable} className="mt-4">
                  Crear Primera Mesa
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: Detalles de Mesa Seleccionada */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4">
            {selectedTable ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">Mesa {selectedTable.tableNumber}</h3>
                  <Badge className={`mt-2 ${getStatusBadgeColor(selectedTable.status)}`}>
                    {selectedTable.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sección:</span>
                    <span className="font-medium">{selectedTable.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacidad:</span>
                    <span className="font-medium">
                      {selectedTable.minCapacity}-{selectedTable.maxCapacity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Forma:</span>
                    <span className="font-medium capitalize">{selectedTable.shape}</span>
                  </div>

                  {selectedTable.guestCount && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Comensales:</span>
                        <span className="font-medium">{selectedTable.guestCount}</span>
                      </div>
                      {selectedTable.seatedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sentados hace:</span>
                          <span className="font-medium">
                            {Math.floor((Date.now() - new Date(selectedTable.seatedAt)) / 60000)} min
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {selectedTable.assignedServerId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mesero:</span>
                      <span className="font-medium">
                        {selectedTable.assignedServerId.name || 'Asignado'}
                      </span>
                    </div>
                  )}

                  {selectedTable.combinesWith && selectedTable.combinesWith.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-600 text-xs">Combinada con:</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {selectedTable.combinesWith.map((id) => (
                          <Badge key={id} variant="outline" className="text-xs">
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
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transferir
                      </Button>
                    </>
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
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
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
          onSuccess={() => {
            fetchFloorPlan();
            setSeatGuestsModal(false);
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
    </div>
  );
}
