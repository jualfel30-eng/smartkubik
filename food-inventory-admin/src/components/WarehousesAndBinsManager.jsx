import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import WarehouseManagement from '@/components/WarehouseManagement.jsx';
import BinLocationsPanel from '@/components/BinLocationsPanel.jsx';
import InventoryStockSummary from '@/components/InventoryStockSummary.jsx';

export default function WarehousesAndBinsManager() {
  const [warehouses, setWarehouses] = useState([]);

  const loadWarehouses = async () => {
    try {
      const response = await fetchApi('/warehouses');
      setWarehouses(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      console.error('Error loading warehouses', err);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  // Callback para cuando WarehouseManagement actualiza los almacenes
  const handleWarehousesChange = () => {
    loadWarehouses();
  };

  return (
    <div className="space-y-6">
      <WarehouseManagement onWarehousesChange={handleWarehousesChange} />
      {warehouses.length > 0 && <BinLocationsPanel warehouses={warehouses} />}
      <InventoryStockSummary />
    </div>
  );
}
