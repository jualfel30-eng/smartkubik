import React from 'react';
import PerformanceReport from '../components/PerformanceReport'; // Suponiendo que el componente del reporte estará en /components
import AccountsReceivableReport from '../components/AccountsReceivableReport';
import AccountsPayableReport from '../components/AccountsPayableReport';
import CashFlowStatement from '../components/CashFlowStatement';
import FoodCostWidget from '../components/FoodCostWidget';
import TipsReportWidget from '../components/TipsReportWidget';
import MenuEngineeringWidget from '../components/MenuEngineeringWidget';
import TipsManagementDashboard from '../components/TipsManagementDashboard';

const ReportsPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
      <div>
        {/* Food Cost % - KPI #1 para restaurantes */}
        <FoodCostWidget />

        {/* Tips Report - Quick Win #3 */}
        <div className="mt-6">
          <TipsReportWidget />
        </div>

        {/* Menu Engineering - Quick Win #4 */}
        <div className="mt-6">
          <MenuEngineeringWidget />
        </div>

        {/* Tips Management - Phase 1.2 */}
        <div className="mt-6">
          <TipsManagementDashboard />
        </div>

        {/* Aquí se pueden agregar más reportes en el futuro, quizás con un sistema de pestañas */}
        <div className="mt-6">
          <PerformanceReport />
        </div>
        <div className="mt-6">
          <AccountsReceivableReport />
        </div>
        <div className="mt-6">
          <AccountsPayableReport />
        </div>
        <div className="mt-6">
          <CashFlowStatement />
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
