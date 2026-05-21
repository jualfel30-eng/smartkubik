import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HRNavigation } from './HRNavigation';
import ShiftRosterView from '@/components/ShiftRosterView';
import PayrollAbsencesManager from './PayrollAbsencesManager';

export default function AsistenciaView() {
  const [tab, setTab] = useState('turnos');

  return (
    <div className="space-y-6">
      <HRNavigation />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="ausencias">Ausencias</TabsTrigger>
        </TabsList>
        <TabsContent value="turnos" className="mt-4">
          <div className="h-[calc(100vh-14rem)]">
            <ShiftRosterView />
          </div>
        </TabsContent>
        <TabsContent value="ausencias" className="mt-4">
          <PayrollAbsencesManager hideNav />
        </TabsContent>
      </Tabs>
    </div>
  );
}
