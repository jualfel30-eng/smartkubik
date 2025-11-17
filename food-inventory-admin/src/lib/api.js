const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

// Updated fetchApi to handle FormData for file uploads
export const fetchApi = async (url, options = {}) => {
  const token = getAuthToken();

  const headers = { ...options.headers };

  // Let the browser set the Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Aggressive cache prevention
  headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  if (token && !options.isPublic) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://api.smartkubik.com';

  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      const errorText = await response.text();
      console.error("Failed to parse JSON response:", errorText);
      errorData = { message: response.statusText };
    }

    // Ensure errorData is not null
    if (!errorData) {
      errorData = { message: response.statusText || 'Error en la petición a la API' };
    }

    let errorMessage = errorData.message || 'Error en la petición a la API';
    if (Array.isArray(errorMessage)) {
      errorMessage = errorMessage.join(', ');
    }
    if (!errorMessage) {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const fetchJournalEntries = (page = 1, limit = 20) => {
  return fetchApi(`/accounting/journal-entries?page=${page}&limit=${limit}`);
};

export const fetchChartOfAccounts = () => {
  return fetchApi(`/accounting/accounts`);
};

export const createChartOfAccount = (accountData) => {
  return fetchApi('/accounting/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

export const createJournalEntry = (entryData) => {
  return fetchApi('/accounting/journal-entries', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const fetchProfitLossReport = (from, to) => {
  return fetchApi(`/accounting/reports/profit-and-loss?from=${from}&to=${to}`);
};

export const fetchBalanceSheetReport = (asOfDate) => {
  return fetchApi(`/accounting/reports/balance-sheet?asOfDate=${asOfDate}`);
};

export const getTenantSettings = () => {
  return fetchApi('/tenant/settings');
};

export const updateTenantSettings = (settingsData) => {
  return fetchApi('/tenant/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData),
  });
};

// New function to upload the tenant logo
export const uploadTenantLogo = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchApi('/tenant/logo', {
    method: 'POST',
    body: formData,
  });
};

export const listKnowledgeBaseDocuments = () => {
  return fetchApi('/knowledge-base/documents');
};

export const uploadKnowledgeBaseDocument = (file, source) => {
  const formData = new FormData();
  formData.append('file', file);
  if (source) {
    formData.append('source', source);
  }

  return fetchApi('/knowledge-base/upload', {
    method: 'POST',
    body: formData,
  });
};

export const deleteKnowledgeBaseDocument = (source) => {
  return fetchApi(`/knowledge-base/documents/${encodeURIComponent(source)}`, {
    method: 'DELETE',
  });
};

export const getTenantUsers = () => {
  return fetchApi('/tenant/users');
};

export const inviteUser = (userData) => {
  return fetchApi('/tenant/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUser = (userId, userData) => {
  return fetchApi(`/tenant/users/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
};

export const deleteUser = (userId) => {
  return fetchApi(`/tenant/users/${userId}`,
    {
      method: 'DELETE',
    });
};

export const syncTenantMemberships = (tenantId) => {
  return fetchApi(`/super-admin/tenants/${tenantId}/sync-memberships`, {
    method: 'POST',
  });
};

// Payables API
export const getPayables = () => {
  return fetchApi('/payables');
};

export const createPayable = (payableData) => {
  return fetchApi('/payables', {
    method: 'POST',
    body: JSON.stringify(payableData),
  });
};

export const updatePayable = (id, payableData) => {
  return fetchApi(`/payables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payableData),
  });
};

export const switchTenant = (membershipId, options = {}) => {
  return fetchApi('/auth/switch-tenant', {
    method: 'POST',
    body: JSON.stringify({
      membershipId,
      rememberAsDefault: Boolean(options.rememberAsDefault),
    }),
  });
};

export const deletePayable = (id) => {
  return fetchApi(`/payables/${id}`, {
    method: 'DELETE',
  });
};

// Suppliers API
export const createSupplier = (supplierData) => {
  return fetchApi('/suppliers', {
    method: 'POST',
    body: JSON.stringify(supplierData),
  });
};

// Recurring Payables API
export const getRecurringPayables = () => {
  return fetchApi('/recurring-payables');
};

export const createRecurringPayable = (templateData) => {
  return fetchApi('/recurring-payables', {
    method: 'POST',
    body: JSON.stringify(templateData),
  });
};

export const generatePayableFromTemplate = (templateId) => {
  return fetchApi(`/recurring-payables/${templateId}/generate`, {
    method: 'POST',
  });
};

// Payments API
export const getPayments = () => {
  return fetchApi('/payments');
};

export const createPayment = (paymentData) => {
  return fetchApi('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
};

export const getAccountsReceivableReport = (asOfDate) => {
  const url = asOfDate
    ? `/reports/accounts-receivable?asOfDate=${asOfDate}`
    : '/reports/accounts-receivable';
  return fetchApi(url);
};


// Permissions API
export const getPermissions = () => {
  return fetchApi('/permissions');
};

// Roles API
export const getRoles = () => {
  return fetchApi('/roles');
};

export const createRole = (roleData) => {
  return fetchApi('/roles', {
    method: 'POST',
    body: JSON.stringify(roleData),
  });
};

export const updateRole = (id, roleData) => {
  return fetchApi(`/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(roleData),
  });
};

export const deleteRole = (id) => {
  return fetchApi(`/roles/${id}`, {
    method: 'DELETE',
  });
};

// Shifts API
export const getCurrentShift = () => {
  return fetchApi('/shifts/current');
};

export const clockIn = () => {
  return fetchApi('/shifts/clock-in', { method: 'POST' });
};

export const clockOut = () => {
  return fetchApi('/shifts/clock-out', { method: 'POST' });
};

// Analytics API
export const getPerformanceReport = (date) => {
  const isoDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  return fetchApi(`/analytics/performance?date=${isoDate}`);
};

export const getFoodCost = (period = '30d') => {
  return fetchApi(`/analytics/food-cost?period=${period}`);
};

export const getTipsReport = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.employeeId) queryParams.append('employeeId', params.employeeId);

  const queryString = queryParams.toString();
  return fetchApi(`/analytics/tips${queryString ? `?${queryString}` : ''}`);
};

export const getMenuEngineering = (period = '30d') => {
  return fetchApi(`/analytics/menu-engineering?period=${period}`);
};

// Tips Management - Phase 1.2
export const createTipsDistributionRule = (ruleData) => {
  return fetchApi('/tips/distribution-rules', {
    method: 'POST',
    body: JSON.stringify(ruleData),
  });
};

export const getTipsDistributionRules = () => {
  return fetchApi('/tips/distribution-rules');
};

export const getActiveTipsDistributionRule = () => {
  return fetchApi('/tips/distribution-rules/active');
};

export const updateTipsDistributionRule = (id, ruleData) => {
  return fetchApi(`/tips/distribution-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ruleData),
  });
};

export const deleteTipsDistributionRule = (id) => {
  return fetchApi(`/tips/distribution-rules/${id}`, {
    method: 'DELETE',
  });
};

export const registerTipsOnOrder = (orderId, tipsData) => {
  return fetchApi(`/tips/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(tipsData),
  });
};

export const distributeTips = (distributionData) => {
  return fetchApi('/tips/distribute', {
    method: 'POST',
    body: JSON.stringify(distributionData),
  });
};

export const getTipsReportForEmployee = (employeeId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.start) queryParams.append('start', params.start);
  if (params.end) queryParams.append('end', params.end);
  if (params.status) queryParams.append('status', params.status);

  const queryString = queryParams.toString();
  return fetchApi(`/tips/report/${employeeId}${queryString ? `?${queryString}` : ''}`);
};

export const getConsolidatedTipsReport = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.append('period', params.period);
  if (params.start) queryParams.append('start', params.start);
  if (params.end) queryParams.append('end', params.end);

  const queryString = queryParams.toString();
  return fetchApi(`/tips/consolidated${queryString ? `?${queryString}` : ''}`);
};

// Reservations API - Phase 1.3
export const getReservationSettings = () => {
  return fetchApi('/reservations/settings');
};

export const updateReservationSettings = (settingsData) => {
  return fetchApi('/reservations/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData),
  });
};

export const checkReservationAvailability = (availabilityData) => {
  return fetchApi('/reservations/check-availability', {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  });
};

export const createReservation = (reservationData) => {
  return fetchApi('/reservations', {
    method: 'POST',
    body: JSON.stringify(reservationData),
  });
};

export const getReservations = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.date) queryParams.append('date', params.date);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.guestName) queryParams.append('guestName', params.guestName);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  const queryString = queryParams.toString();
  return fetchApi(`/reservations${queryString ? `?${queryString}` : ''}`);
};

export const getReservationCalendar = (month) => {
  return fetchApi(`/reservations/calendar?month=${month}`);
};

export const getReservation = (id) => {
  return fetchApi(`/reservations/${id}`);
};

export const updateReservation = (id, reservationData) => {
  return fetchApi(`/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(reservationData),
  });
};

export const confirmReservation = (id) => {
  return fetchApi(`/reservations/${id}/confirm`, {
    method: 'PATCH',
  });
};

export const seatReservation = (id, seatData) => {
  return fetchApi(`/reservations/${id}/seat`, {
    method: 'PATCH',
    body: JSON.stringify(seatData),
  });
};

export const cancelReservation = (id, cancelData) => {
  return fetchApi(`/reservations/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(cancelData),
  });
};

export const markReservationNoShow = (id) => {
  return fetchApi(`/reservations/${id}/no-show`, {
    method: 'PATCH',
  });
};

// Purchase Orders API - Phase 1.4: Approval Workflow & Auto-generation
export const getPurchaseOrders = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.supplierId) queryParams.append('supplierId', params.supplierId);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/purchases${queryString ? `?${queryString}` : ''}`);
};

export const createPurchaseOrder = (poData) => {
  return fetchApi('/purchases', {
    method: 'POST',
    body: JSON.stringify(poData),
  });
};

export const getPurchaseOrder = (id) => {
  return fetchApi(`/purchases/${id}`);
};

export const updatePurchaseOrder = (id, poData) => {
  return fetchApi(`/purchases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(poData),
  });
};

export const receivePurchaseOrder = (id) => {
  return fetchApi(`/purchases/${id}/receive`, {
    method: 'PATCH',
  });
};

export const approvePurchaseOrder = (id, notes) => {
  return fetchApi(`/purchases/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
};

export const rejectPurchaseOrder = (id, reason) => {
  return fetchApi(`/purchases/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};

export const getPendingApprovalPOs = () => {
  return fetchApi('/purchases/pending-approval');
};

export const autoGeneratePurchaseOrders = () => {
  return fetchApi('/purchases/auto-generate', {
    method: 'POST',
  });
};

// Auth API
export const changePassword = (passwordData) => {
  return fetchApi('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });
};

export const getProfile = () => {
  return fetchApi('/auth/profile');
};

// Super Admin - Subscription Plans
export const getSubscriptionPlans = () => {
  return fetchApi('/subscription-plans');
};

export const createSubscriptionPlan = (planData) => {
  return fetchApi('/subscription-plans', {
    method: 'POST',
    body: JSON.stringify(planData),
  });
};

export const updateSubscriptionPlan = (id, planData) => {
  return fetchApi(`/subscription-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(planData),
  });
};

export const deleteSubscriptionPlan = (id) => {
  return fetchApi(`/subscription-plans/${id}`, {
    method: 'DELETE',
  });
};
