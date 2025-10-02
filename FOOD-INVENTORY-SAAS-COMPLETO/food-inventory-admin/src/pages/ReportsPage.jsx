import React from 'react';
import PerformanceReport from '../components/PerformanceReport'; // Suponiendo que el componente del reporte estará en /components
import AccountsReceivableReport from '../components/AccountsReceivableReport';
import AccountsPayableReport from '../components/AccountsPayableReport';
import CashFlowStatement from '../components/CashFlowStatement';

const ReportsPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Reportes</h1>
      <div>
        {/* Aquí se pueden agregar más reportes en el futuro, quizás con un sistema de pestañas */}
        <PerformanceReport />
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
