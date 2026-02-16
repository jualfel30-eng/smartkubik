import ModuleAccessDenied from '../components/ModuleAccessDenied';
import { useModuleAccess } from '../hooks/useModuleAccess';
import CommissionManagementDashboard from '../components/commission/CommissionManagementDashboard';

const CommissionsPage = () => {
  const hasAccess = useModuleAccess('commissions');

  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="commissions" />;
  }

  return <CommissionManagementDashboard />;
};

export default CommissionsPage;
