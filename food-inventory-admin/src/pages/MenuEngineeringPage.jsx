import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, BarChart3, Star, TrendingUp, Settings } from 'lucide-react';

const MenuEngineeringPage = () => {
  const [activeTab, setActiveTab] = useState('analysis');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ingeniería de Menú</h1>
        <p className="text-gray-600 mt-2">
          Analiza el rendimiento de los productos de tu menú y optimiza la rentabilidad
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="analysis">
            <Target className="h-4 w-4 mr-2" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <BarChart3 className="h-4 w-4 mr-2" />
            Matriz
          </TabsTrigger>
          <TabsTrigger value="stars">
            <Star className="h-4 w-4 mr-2" />
            Productos Estrella
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Productos Estrella</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alta popularidad y rentabilidad
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Caballos de Trabajo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alta popularidad, baja rentabilidad
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Rompecabezas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Baja popularidad, alta rentabilidad
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Perros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Baja popularidad y rentabilidad
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Análisis de Productos del Menú</CardTitle>
              <CardDescription>
                Clasificación de productos según popularidad y rentabilidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay suficientes datos para generar el análisis</p>
                <p className="text-sm mt-2">
                  El análisis estará disponible cuando tengas órdenes registradas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Ingeniería de Menú</CardTitle>
              <CardDescription>
                Visualización gráfica del rendimiento de productos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Matriz en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stars" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Productos Estrella</CardTitle>
              <CardDescription>
                Tus productos con mejor desempeño
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se han identificado productos estrella aún</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Análisis</CardTitle>
              <CardDescription>
                Ajusta los parámetros para el análisis del menú
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

export default MenuEngineeringPage;
