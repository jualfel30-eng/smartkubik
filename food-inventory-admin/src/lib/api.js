import { createScopedLogger } from './logger';

const logger = createScopedLogger('api-client');

export const fetchApi = async (url, options = {}) => {
  const { isPublic: _isPublic, ...restOptions } = options;
  const headers = { ...(restOptions.headers || {}) };

  // Let the browser set the Content-Type for FormData
  if (!(restOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Aggressive cache prevention
  headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://api.smartkubik.com';

  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    ...restOptions,
    headers,
    credentials: restOptions.credentials ?? 'include',
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      const errorText = await response.text();
      logger.error('Failed to parse JSON response', { errorText });
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

    if (typeof window !== 'undefined' && (response.status === 401 || response.status === 403)) {
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: {
            status: response.status,
            message: errorMessage,
            payload: errorData,
          },
        }),
      );
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = errorData;
    throw error;
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

export const getTaskQueueStats = () => {
  return fetchApi('/super-admin/queues/stats');
};

export const listTaskQueueJobs = ({ status, limit = 25, skip = 0 } = {}) => {
  const params = new URLSearchParams();
  if (status && status !== 'all') {
    params.set('status', status);
  }
  if (limit) {
    params.set('limit', String(limit));
  }
  if (skip) {
    params.set('skip', String(skip));
  }

  const query = params.toString();
  const suffix = query ? `?${query}` : '';

  return fetchApi(`/super-admin/queues/jobs${suffix}`);
};

export const retryTaskQueueJob = (jobId) => {
  return fetchApi(`/super-admin/queues/jobs/${jobId}/retry`, {
    method: 'POST',
  });
};

export const deleteTaskQueueJob = (jobId) => {
  return fetchApi(`/super-admin/queues/jobs/${jobId}`, {
    method: 'DELETE',
  });
};

export const purgeTaskQueueJobs = ({ status, olderThanMinutes } = {}) => {
  return fetchApi('/super-admin/queues/purge', {
    method: 'POST',
    body: JSON.stringify({ status, olderThanMinutes }),
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

// Auth API
export const changePassword = (passwordData) => {
  return fetchApi('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });
};

export const getCurrentSessions = (options = {}) => {
  const includeRevoked = options.includeRevoked ? 'true' : 'false';
  return fetchApi(`/auth/sessions?includeRevoked=${includeRevoked}`);
};

export const revokeSession = (sessionId) => {
  return fetchApi(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

export const revokeOtherSessions = () => {
  return fetchApi('/auth/sessions/revoke-others', {
    method: 'POST',
  });
};

export const getUserSessions = (userId, options = {}) => {
  const includeRevoked = options.includeRevoked ? 'true' : 'false';
  return fetchApi(
    `/auth/users/${userId}/sessions?includeRevoked=${includeRevoked}`,
  );
};

export const revokeUserSession = (userId, sessionId) => {
  return fetchApi(`/auth/users/${userId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

export const revokeAllUserSessions = (userId) => {
  return fetchApi(`/auth/users/${userId}/sessions/revoke-all`, {
    method: 'POST',
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
