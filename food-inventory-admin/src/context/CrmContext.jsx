import { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react';
import { fetchApi, inviteUser, getRoles } from '@/lib/api';

// 1. Crear el Contexto
export const CrmContext = createContext();

// 2. Crear el Proveedor del Contexto
export const CrmProvider = ({ children }) => {
  const [crmData, setCrmData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // New state for payment methods
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const lastQueryRef = useRef({
    page: 1,
    limit: 25,
    filters: {},
  });
  const [employeesData, setEmployeesData] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [employeesPagination, setEmployeesPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const lastEmployeeQueryRef = useRef({
    page: 1,
    limit: 25,
    filters: {},
  });
  const employeeRoleIdRef = useRef(null);
  const employeesRefreshPromiseRef = useRef(null);

  // eslint-disable-next-line no-unused-vars
  const extractCustomers = (payload) => {
    const candidates = [
      payload,
      payload?.data,
      payload?.data?.customers,
      payload?.customers,
      payload?.data?.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  };

  // eslint-disable-next-line no-unused-vars
  const mergeUniqueCustomers = (...lists) => {
    const map = new Map();
    lists.flat().forEach((customer) => {
      if (customer && customer._id) {
        map.set(customer._id, customer);
      }
    });
    return Array.from(map.values());
  };

  const loadCustomers = useCallback(async (page = 1, limit = 25, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.search && filters.search.trim() !== '') {
        params.set('search', filters.search.trim());
      }
      if (filters.customerType && filters.customerType !== 'all') {
        params.set('customerType', filters.customerType);
      }
      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.assignedTo) {
        params.set('assignedTo', filters.assignedTo);
      }

      const response = await fetchApi(`/customers?${params.toString()}`);

      setCrmData(response.data?.customers || response.data || []);
      setTotalCustomers(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 0);
      setCurrentPage(page);
      setPageLimit(limit);
      lastQueryRef.current = {
        page,
        limit,
        filters: { ...filters },
      };
    } catch (err) {
      console.error("Error loading customers:", err.message);
      setCrmData([]);
      setTotalCustomers(0);
      setTotalPages(0);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const loadPaymentMethods = useCallback(async () => {
    try {
      const data = await fetchApi('/orders/__lookup/payment-methods');
      setPaymentMethods(data.data.methods || []);
    } catch (err) {
      console.error("Error loading payment methods:", err.message);
      setPaymentMethods([]);
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const loadEmployees = useCallback(
    async (page = 1, limit = 25, filters = {}) => {
      try {
        setEmployeesLoading(true);
        setEmployeesError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (filters.search && filters.search.trim() !== '') {
          params.set('search', filters.search.trim());
        }
        if (filters.status && filters.status !== 'all') {
          params.set('status', filters.status);
        }
        if (filters.department && filters.department !== 'all') {
          params.set('department', filters.department);
        }
        if (filters.structureId && filters.structureId !== 'all') {
          params.set('structureId', filters.structureId);
        }

        const response = await fetchApi(`/payroll/employees?${params.toString()}`);

        const employeesList = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : response?.employees || [];

        const pagination = response.pagination || response?.data?.pagination || {
          page: page,
          limit: limit,
          total: response?.total || 0,
          totalPages: response?.totalPages || 0,
        };

        setEmployeesData(employeesList);
        setEmployeesPagination({
          page: pagination.page || page,
          limit: pagination.limit || limit,
          total: pagination.total || 0,
          totalPages:
            pagination.totalPages ||
            (pagination.total ? Math.ceil(pagination.total / (pagination.limit || limit)) : 0),
        });

        lastEmployeeQueryRef.current = {
          page,
          limit,
          filters: { ...filters },
        };
      } catch (err) {
        console.error('Error loading employees:', err.message);
        setEmployeesData([]);
        setEmployeesPagination({ page: 1, limit, total: 0, totalPages: 0 });
        setEmployeesError(err.message);
      } finally {
        setEmployeesLoading(false);
      }
    },
    [],
  );

  const loadEmployeeSummary = useCallback(async () => {
    try {
      const response = await fetchApi('/payroll/employees/summary');
      setEmployeeSummary(response.data || response.summary || response);
    } catch (err) {
      console.error('Error loading employee summary:', err.message);
    }
  }, []);

  const refreshEmployeesData = useCallback(() => {
    if (employeesRefreshPromiseRef.current) {
      return employeesRefreshPromiseRef.current;
    }

    const { page, limit, filters } = lastEmployeeQueryRef.current || {};
    const refreshPromise = Promise.all([
      loadEmployees(page ?? 1, limit ?? 25, filters ?? {}),
      loadEmployeeSummary(),
    ]).finally(() => {
      employeesRefreshPromiseRef.current = null;
    });

    employeesRefreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [loadEmployees, loadEmployeeSummary]);

  const ensureEmployeeProfileForCustomer = useCallback(
    async (customerId, payload = {}, options = {}) => {
      if (!customerId) return null;
      const { skipRefresh = false } = options;
      try {
        const response = await fetchApi('/payroll/employees', {
          method: 'POST',
          body: JSON.stringify({
            customerId,
            ...payload,
          }),
        });
        if (!skipRefresh) {
          refreshEmployeesData().catch((err) =>
            console.error('Error refreshing employees after ensure:', err),
          );
        }
        return response.data || response;
      } catch (err) {
        const message = err?.message?.toLowerCase?.() || '';
        if (!message.includes('ya existe')) {
          console.error('Error ensuring employee profile:', err);
        }
        return null;
      }
    },
    [refreshEmployeesData],
  );

  const fetchEmployeeProfile = useCallback(async (employeeId) => {
    if (!employeeId) return null;
    const response = await fetchApi(`/payroll/employees/${employeeId}`);
    return response.data || response;
  }, []);

  const updateEmployeeProfileRecord = useCallback(
    async (employeeId, payload) => {
      if (!employeeId) {
        throw new Error('employeeId es requerido');
      }
      const response = await fetchApi(`/payroll/employees/${employeeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      refreshEmployeesData().catch((err) =>
        console.error('Error refreshing employees after update profile:', err),
      );
      return response.data || response;
    },
    [refreshEmployeesData],
  );

  const listEmployeeContracts = useCallback(async (employeeId, page = 1, limit = 10) => {
    if (!employeeId) {
      return { contracts: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await fetchApi(`/payroll/employees/${employeeId}/contracts?${params.toString()}`);
    const contracts =
      Array.isArray(response.data) ? response.data :
        Array.isArray(response?.data?.data) ? response.data.data :
          Array.isArray(response?.contracts) ? response.contracts : [];
    const rawPagination = response.pagination || response?.data?.pagination || null;
    const pagination = rawPagination
      ? {
          page: rawPagination.page || page,
          limit: rawPagination.limit || limit,
          total: rawPagination.total || contracts.length || 0,
          totalPages:
            rawPagination.totalPages ||
            (rawPagination.total
              ? Math.ceil(rawPagination.total / (rawPagination.limit || limit))
              : Math.ceil((contracts.length || 0) / limit)),
        }
      : {
          page,
          limit,
          total: contracts.length || 0,
          totalPages: contracts.length ? Math.ceil((contracts.length || 0) / limit) : 0,
        };
    return {
      contracts,
      pagination,
    };
  }, []);

  const createEmployeeContract = useCallback(
    async (employeeId, payload) => {
      if (!employeeId) {
        throw new Error('employeeId es requerido');
      }
      const response = await fetchApi(`/payroll/employees/${employeeId}/contracts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      refreshEmployeesData().catch((err) =>
        console.error('Error refreshing employees after create contract:', err),
      );
      return response.data || response;
    },
    [refreshEmployeesData],
  );

  const updateEmployeeContract = useCallback(
    async (employeeId, contractId, payload) => {
      if (!employeeId || !contractId) {
        throw new Error('employeeId y contractId son requeridos');
      }
      const response = await fetchApi(`/payroll/employees/${employeeId}/contracts/${contractId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      refreshEmployeesData().catch((err) =>
        console.error('Error refreshing employees after update contract:', err),
      );
      return response.data || response;
    },
    [refreshEmployeesData],
  );

  const resolveEmployeeRoleId = useCallback(async () => {
    if (employeeRoleIdRef.current) {
      return employeeRoleIdRef.current;
    }
    const response = await getRoles();
    const roles = response.data || response;
    if (!Array.isArray(roles) || roles.length === 0) {
      return null;
    }
    const employeeRole =
      roles.find((role) => /emplead/i.test(role.name)) ||
      roles.find((role) => /employee/i.test(role.name)) ||
      roles[0];
    employeeRoleIdRef.current = employeeRole?._id || null;
    return employeeRoleIdRef.current;
  }, []);

  const bulkReinviteEmployees = useCallback(
    async (employees = []) => {
      const roleId = await resolveEmployeeRoleId();
      if (!roleId) {
        return {
          successCount: 0,
          failureCount: employees.length,
          errors: ['No se encontró un rol para empleados'],
        };
      }

      const validEmployees = employees.filter(
        (employee) => employee?.customer?.email,
      );

      const results = await Promise.allSettled(
        validEmployees.map(async (employee) => {
          const name = employee.customer?.name || employee.customer?.companyName || '';
          const [firstName, ...rest] = name.trim().split(' ');
          const payload = {
            firstName: firstName || name || 'Empleado',
            lastName: rest.join(' ') || employee.customer?.companyName || '',
            email: employee.customer.email,
            role: roleId,
          };
          await inviteUser(payload);
        }),
      );

      const summary = results.reduce(
        (acc, result) => {
          if (result.status === 'fulfilled') {
            acc.successCount += 1;
          } else {
            acc.failureCount += 1;
            acc.errors.push(result.reason?.message || 'Error desconocido');
          }
          return acc;
        },
        { successCount: 0, failureCount: 0, errors: [] },
      );

      if (validEmployees.length < employees.length) {
        summary.errors.push('Algunos contactos no tienen correo registrado');
        summary.failureCount += employees.length - validEmployees.length;
      }

      return summary;
    },
    [resolveEmployeeRoleId],
  );

  const bulkUpdateEmployeeStatus = useCallback(
    async ({ employeeIds, status }) => {
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        throw new Error('Debes seleccionar al menos un empleado');
      }
      if (!status) {
        throw new Error('Debes definir el nuevo estado');
      }
      const response = await fetchApi('/payroll/employees/bulk/status', {
        method: 'PATCH',
        body: JSON.stringify({ employeeIds, status }),
      });
      refreshEmployeesData().catch((err) =>
        console.error('Error refreshing employees after bulk status update:', err),
      );
      return response.data || response;
    },
    [refreshEmployeesData],
  );

  const bulkNotifyEmployees = useCallback(
    async ({ employeeIds, templateId, channels, context = {}, language = 'es' }) => {
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        throw new Error('Debes seleccionar al menos un empleado');
      }
      if (!templateId) {
        throw new Error('Selecciona una plantilla para la notificación');
      }
      if (!Array.isArray(channels) || channels.length === 0) {
        throw new Error('Selecciona al menos un canal de notificación');
      }
      const response = await fetchApi('/payroll/employees/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({ employeeIds, templateId, channels, context, language }),
      });
      return response.data || response;
    },
    [],
  );

  const reconcileEmployeeProfiles = useCallback(async () => {
    const response = await fetchApi('/payroll/employees/maintenance/reconcile', {
      method: 'POST',
    });
    refreshEmployeesData().catch((err) =>
      console.error('Error refreshing employees after reconcile:', err),
    );
    return response.data || response;
  }, [refreshEmployeesData]);

  // REMOVED AUTO-LOAD: Components now call loadCustomers() manually when needed
  // This prevents loading 1000s of customer records on every page load
  // Performance improvement: ~2-3 seconds saved on initial load

  const addCustomer = async (customerData, options = {}) => {
    const {
      ensureEmployeeProfile: shouldEnsureEmployeeProfile = false,
      refreshEmployees: shouldRefreshEmployees = false,
      skipCustomerReload = false,
    } = options;
    try {
      const response = await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
      const createdCustomer = response?.data || response?.customer || response;
      if (shouldEnsureEmployeeProfile && createdCustomer?._id) {
        await ensureEmployeeProfileForCustomer(createdCustomer._id, {}, { skipRefresh: shouldRefreshEmployees });
      }
      if (shouldRefreshEmployees) {
        refreshEmployeesData().catch((err) =>
          console.error('Error refreshing employees after add:', err),
        );
      }
      if (!skipCustomerReload) {
        const { page, limit, filters } = lastQueryRef.current;
        await loadCustomers(page ?? 1, limit ?? 25, filters ?? {});
      }
      return createdCustomer;
    } catch (err) {
      console.error("Error adding customer:", err);
      throw err;
    }
  };

  const updateCustomer = async (customerId, customerData, options = {}) => {
    const {
      ensureEmployeeProfile: shouldEnsureEmployeeProfile = false,
      refreshEmployees: shouldRefreshEmployees = false,
      skipCustomerReload = false,
    } = options;
    try {
      const response = await fetchApi(`/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(customerData),
      });
      const updatedCustomer = response?.data || response?.customer || response;
      if (shouldEnsureEmployeeProfile) {
        await ensureEmployeeProfileForCustomer(updatedCustomer?._id || customerId, {}, { skipRefresh: shouldRefreshEmployees });
      }
      if (shouldRefreshEmployees) {
        refreshEmployeesData().catch((err) =>
          console.error('Error refreshing employees after update:', err),
        );
      }
      if (!skipCustomerReload) {
        const { page, limit, filters } = lastQueryRef.current;
        await loadCustomers(page ?? 1, limit ?? 25, filters ?? {});
      }
      return updatedCustomer;
    } catch (err) {
      console.error("Error updating customer:", err);
      throw err;
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await fetchApi(`/customers/${customerId}`, { method: 'DELETE' });
      const { page, limit, filters } = lastQueryRef.current;
      await loadCustomers(page ?? 1, limit ?? 25, filters ?? {}); // Recargar
    } catch (err) {
      console.error("Error deleting customer:", err);
      throw err;
    }
  };

  const value = {
    crmData,
    paymentMethods, // Export payment methods
    paymentMethodsLoading,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loadCustomers,
    currentPage,
    pageLimit,
    totalCustomers,
    totalPages,
    setCurrentPage,
    setPageLimit,
    employeesData,
    employeesLoading,
    employeesError,
    employeesPagination,
    employeeSummary,
    loadEmployees,
    loadEmployeeSummary,
    refreshEmployeesData,
    ensureEmployeeProfileForCustomer,
    fetchEmployeeProfile,
    updateEmployeeProfile: updateEmployeeProfileRecord,
    listEmployeeContracts,
    createEmployeeContract,
    updateEmployeeContract,
    bulkReinviteEmployees,
    bulkUpdateEmployeeStatus,
    bulkNotifyEmployees,
    reconcileEmployeeProfiles,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
};

// 3. Crear un hook personalizado para usar el contexto
export const useCrmContext = () => {
  const context = useContext(CrmContext);
  if (context === undefined) {
    throw new Error('useCrmContext must be used within a CrmProvider');
  }
  return context;
};
