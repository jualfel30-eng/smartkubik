const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

// Updated fetchApi to handle FormData for file uploads and standardized responses
export const fetchApi = async (url, options = {}) => {
  const token = getAuthToken();

  const headers = { ...options.headers };

  // Let the browser set the Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://[::1]:3000/api/v1${url}`, {
      ...options,
      headers,
    });

    // Try to parse JSON, but handle cases where response might be empty
    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If parsing fails, it might be a non-JSON response (e.g., 204 No Content)
      if (response.ok) {
        return { data: text, error: null }; // Or handle as you see fit
      }
      // If not ok and not JSON, use status text as error
      return { data: null, error: response.statusText };
    }

    if (!response.ok) {
      let errorMessage = data.message || 'Error en la petición a la API';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', ');
      }
      return { data: null, error: errorMessage };
    }

    return { data, error: null };
  } catch (error) {
    console.error('API call failed:', error);
    return { data: null, error: error.message || 'Ocurrió un error inesperado.' };
  }
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

export const getProfile = () => {
  return fetchApi('/auth/profile');
};
