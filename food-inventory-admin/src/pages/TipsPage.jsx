import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Settings } from 'lucide-react';

const TipsPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Propinas</h1>
        <p className="text-gray-600 mt-2">
          Administra y distribuye las propinas del personal
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard">
            <DollarSign className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Users className="h-4 w-4 mr-2" />
            Distribución
          </TabsTrigger>
          <TabsTrigger value="reports">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Propinas del Día</CardTitle>
                <CardDescription>Total de propinas recibidas hoy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-2">
                  +0% desde ayer
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Propinas del Mes</CardTitle>
                <CardDescription>Total acumulado del mes actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-2">
                  +0% desde el mes pasado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pendientes por Distribuir</CardTitle>
                <CardDescription>Propinas sin asignar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-2">
                  0 empleados pendientes
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Historial de Propinas</CardTitle>
              <CardDescription>
                Registro de propinas recibidas y distribuidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                No hay registros de propinas disponibles
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Propinas</CardTitle>
              <CardDescription>
                Configura cómo se distribuyen las propinas entre los empleados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Funcionalidad de distribución en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reportes de Propinas</CardTitle>
              <CardDescription>
                Análisis y reportes detallados de propinas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Reportes en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Propinas</CardTitle>
              <CardDescription>
                Ajusta las reglas y políticas de distribución
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Configuración en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TipsPage;
