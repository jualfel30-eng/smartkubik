import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List } from 'lucide-react';
import ReservationsList from '../components/ReservationsList';
import ReservationCalendar from '../components/ReservationCalendar';

const ReservationsPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedDate, setSelectedDate] = useState('');

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setActiveTab('list');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
        <p className="text-gray-600 mt-2">
          Gestiona las reservas del restaurante desde un solo lugar
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <ReservationsList initialDate={selectedDate} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <ReservationCalendar onDateClick={handleDateClick} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReservationsPage;
