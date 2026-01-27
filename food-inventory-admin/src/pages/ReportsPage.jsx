import React from 'react';
import PerformanceReport from '../components/PerformanceReport'; // Suponiendo que el componente del reporte estará en /components
import AccountsReceivableReport from '../components/AccountsReceivableReport';
import AccountsPayableReport from '../components/AccountsPayableReport';
import CashFlowStatement from '../components/CashFlowStatement';
import FoodCostWidget from '../components/FoodCostWidget';
import TipsReportWidget from '../components/TipsReportWidget';
import MenuEngineeringWidget from '../components/MenuEngineeringWidget';

import { useVerticalConfig } from '../hooks/useVerticalConfig';

const ReportsPage = () => {
  const verticalConfig = useVerticalConfig();
  const allowedReports = verticalConfig?.availableReports || [];

  // Helper to check if a report is allowed
  const isAllowed = (reportKey) => allowedReports.includes(reportKey);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Reportes</h1>

      <div>

        {/* Cash Flow - Top Priority for all verticals */}
        {isAllowed('cash-flow') && (
          <div className="mb-6">
            <CashFlowStatement />
          </div>
        )}

        {/* Food Cost % - KPI #1 para restaurantes */}
        {isAllowed('food-cost') && (
          <FoodCostWidget />
        )}

        {/* Tips Report - Quick Win #3 */}
        {isAllowed('tips') && (
          <div className="mt-6">
            <TipsReportWidget />
          </div>
        )}

        {/* Menu Engineering - Quick Win #4 */}
        {isAllowed('menu-engineering') && (
          <div className="mt-6">
            <MenuEngineeringWidget />
          </div>
        )}

        {/* Tips Management - Phase 1.2 */}
        {isAllowed('tips-management') && (
          <div className="mt-6">
            <TipsManagementDashboard />
          </div>
        )}

        {/* Performance Report (Sales) */}
        {isAllowed('performance') && (
          <div className="mt-6">
            <PerformanceReport />
          </div>
        )}

        {/* Accounts Receivable */}
        {isAllowed('ar') && (
          <div className="mt-6">
            <AccountsReceivableReport />
          </div>
        )}

        {/* Accounts Payable */}
        {isAllowed('ap') && (
          <div className="mt-6">
            <AccountsPayableReport />
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportsPage;
