const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'https://api.smartkubik.com';
  }
  const devHostnames = ['localhost', '127.0.0.1'];
  return devHostnames.includes(window.location.hostname)
    ? 'http://localhost:3000'
    : 'https://api.smartkubik.com';
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

  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
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

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("Failed to parse JSON success response:", text);
    // If it was a success status but invalid JSON, return null or throw?
    // Given the previous crash, returning null/empty is safer to keep the app alive.
    return {};
  }
};

export const fetchJournalEntries = (page = 1, limit = 20, isAutomatic = undefined) => {
  let url = `/accounting/journal-entries?page=${page}&limit=${limit}`;
  if (isAutomatic !== undefined) {
    url += `&isAutomatic=${isAutomatic}`;
  }
  return fetchApi(url);
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

export const resendUserInvite = (userId) => {
  return fetchApi(`/tenant/users/${userId}/resend-invite`, {
    method: 'POST',
  });
};

export const syncTenantMemberships = (tenantId) => {
  return fetchApi(`/super-admin/tenants/${tenantId}/sync-memberships`, {
    method: 'POST',
  });
};

// Payables API
export const getPayables = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.expectedCurrency) params.append('expectedCurrency', filters.expectedCurrency);
  if (filters.status) params.append('status', filters.status);
  if (filters.overdue) params.append('overdue', 'true');
  if (filters.aging) params.append('aging', filters.aging);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const queryString = params.toString();
  return fetchApi(`/payables${queryString ? `?${queryString}` : ''}`);
};

export const getPayablesSummary = () => {
  return fetchApi('/payables/dashboard-summary');
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

// Tables API
export const getTables = () => {
  return fetchApi('/tables');
};

export const getFloorPlan = () => {
  return fetchApi('/tables/floor-plan');
};

export const getAvailableTables = () => {
  return fetchApi('/tables/available');
};

// Wait List API - Phase 2
export const getWaitListEntries = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.date) queryParams.append('date', params.date);
  if (params.activeOnly !== undefined) queryParams.append('activeOnly', params.activeOnly);

  const queryString = queryParams.toString();
  return fetchApi(`/wait-list${queryString ? `?${queryString}` : ''}`);
};

export const createWaitListEntry = (entryData) => {
  return fetchApi('/wait-list', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const updateWaitListEntry = (id, entryData) => {
  return fetchApi(`/wait-list/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(entryData),
  });
};

export const updateWaitListStatus = (id, statusData) => {
  return fetchApi(`/wait-list/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(statusData),
  });
};

export const notifyWaitListCustomer = (notifyData) => {
  return fetchApi('/wait-list/notify', {
    method: 'POST',
    body: JSON.stringify(notifyData),
  });
};

export const seatFromWaitList = (seatData) => {
  return fetchApi('/wait-list/seat', {
    method: 'POST',
    body: JSON.stringify(seatData),
  });
};

export const deleteWaitListEntry = (id) => {
  return fetchApi(`/wait-list/${id}`, {
    method: 'DELETE',
  });
};

export const getWaitListStats = () => {
  return fetchApi('/wait-list/stats/overview');
};

export const estimateWaitTime = (partySize) => {
  return fetchApi(`/wait-list/estimate/${partySize}`);
};

// Waste Management API - Phase 2
export const getWasteEntries = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.productId) queryParams.append('productId', params.productId);
  if (params.category) queryParams.append('category', params.category);
  if (params.reason) queryParams.append('reason', params.reason);
  if (params.location) queryParams.append('location', params.location);
  if (params.isPreventable !== undefined) queryParams.append('isPreventable', params.isPreventable);

  const queryString = queryParams.toString();
  return fetchApi(`/waste${queryString ? `?${queryString}` : ''}`);
};

export const createWasteEntry = (entryData) => {
  return fetchApi('/waste', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const updateWasteEntry = (id, entryData) => {
  return fetchApi(`/waste/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(entryData),
  });
};

export const deleteWasteEntry = (id) => {
  return fetchApi(`/waste/${id}`, {
    method: 'DELETE',
  });
};

export const getWasteAnalytics = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/waste/analytics/overview${queryString ? `?${queryString}` : ''}`);
};

export const getWasteTrends = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/waste/analytics/trends${queryString ? `?${queryString}` : ''}`);
};

// Server Performance API - Phase 2
export const getServerPerformance = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.serverId) queryParams.append('serverId', params.serverId);
  if (params.shiftId) queryParams.append('shiftId', params.shiftId);
  if (params.performanceGrade) queryParams.append('performanceGrade', params.performanceGrade);

  const queryString = queryParams.toString();
  return fetchApi(`/server-performance${queryString ? `?${queryString}` : ''}`);
};

export const createServerPerformance = (data) => {
  return fetchApi('/server-performance', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateServerPerformance = (id, data) => {
  return fetchApi(`/server-performance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteServerPerformance = (id) => {
  return fetchApi(`/server-performance/${id}`, {
    method: 'DELETE',
  });
};

export const calculateServerPerformance = (serverId, date) => {
  const queryParams = new URLSearchParams();
  if (date) queryParams.append('date', date);

  const queryString = queryParams.toString();
  return fetchApi(`/server-performance/calculate/${serverId}${queryString ? `?${queryString}` : ''}`, {
    method: 'POST',
  });
};

export const getServerPerformanceAnalytics = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.serverId) queryParams.append('serverId', params.serverId);

  const queryString = queryParams.toString();
  return fetchApi(`/server-performance/analytics/overview${queryString ? `?${queryString}` : ''}`);
};

export const getServerPerformanceComparison = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/server-performance/analytics/comparison${queryString ? `?${queryString}` : ''}`);
};

export const getServerPerformanceLeaderboard = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/server-performance/analytics/leaderboard${queryString ? `?${queryString}` : ''}`);
};

export const setServerGoals = (data) => {
  return fetchApi('/server-performance/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ==================== Reviews & Feedback API ====================
export const getReviews = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.source) queryParams.append('source', params.source);
  if (params.status) queryParams.append('status', params.status);
  if (params.sentiment) queryParams.append('sentiment', params.sentiment);
  if (params.minRating) queryParams.append('minRating', params.minRating);
  if (params.maxRating) queryParams.append('maxRating', params.maxRating);
  if (params.isResponded !== undefined) queryParams.append('isResponded', params.isResponded);
  if (params.isFlagged !== undefined) queryParams.append('isFlagged', params.isFlagged);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.search) queryParams.append('search', params.search);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  const queryString = queryParams.toString();
  return fetchApi(`/reviews${queryString ? `?${queryString}` : ''}`);
};

export const getReview = (id) => {
  return fetchApi(`/reviews/${id}`);
};

export const createReview = (data) => {
  return fetchApi('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateReview = (id, data) => {
  return fetchApi(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteReview = (id) => {
  return fetchApi(`/reviews/${id}`, {
    method: 'DELETE',
  });
};

export const respondToReview = (id, response) => {
  return fetchApi(`/reviews/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
};

export const flagReview = (id, reason) => {
  return fetchApi(`/reviews/${id}/flag`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const getReviewsAnalytics = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/reviews/analytics${queryString ? `?${queryString}` : ''}`);
};

export const getReviewsComparison = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.currentStart) queryParams.append('currentStart', params.currentStart);
  if (params.currentEnd) queryParams.append('currentEnd', params.currentEnd);
  if (params.previousStart) queryParams.append('previousStart', params.previousStart);
  if (params.previousEnd) queryParams.append('previousEnd', params.previousEnd);

  const queryString = queryParams.toString();
  return fetchApi(`/reviews/comparison${queryString ? `?${queryString}` : ''}`);
};

// ==================== Marketing Campaigns API ====================
export const getMarketingCampaigns = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.channel) queryParams.append('channel', params.channel);
  if (params.type) queryParams.append('type', params.type);
  if (params.status) queryParams.append('status', params.status);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/campaigns${queryString ? `?${queryString}` : ''}`);
};

export const getMarketingCampaign = (id) => {
  return fetchApi(`/marketing/campaigns/${id}`);
};

export const createMarketingCampaign = (data) => {
  return fetchApi('/marketing/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMarketingCampaign = (id, data) => {
  return fetchApi(`/marketing/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteMarketingCampaign = (id) => {
  return fetchApi(`/marketing/campaigns/${id}`, {
    method: 'DELETE',
  });
};

export const launchMarketingCampaign = (id) => {
  return fetchApi(`/marketing/campaigns/${id}/launch`, {
    method: 'POST',
  });
};

export const pauseMarketingCampaign = (id) => {
  return fetchApi(`/marketing/campaigns/${id}/pause`, {
    method: 'POST',
  });
};

export const getMarketingAnalytics = () => {
  return fetchApi('/marketing/campaigns/analytics');
};

// ==================== Marketing Triggers API (Phase 3) ====================
export const getMarketingTriggers = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.eventType) queryParams.append('eventType', params.eventType);
  if (params.status) queryParams.append('status', params.status);
  if (params.campaignId) queryParams.append('campaignId', params.campaignId);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/triggers${queryString ? `?${queryString}` : ''}`);
};

export const getMarketingTrigger = (id) => {
  return fetchApi(`/marketing/triggers/${id}`);
};

export const createMarketingTrigger = (data) => {
  return fetchApi('/marketing/triggers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMarketingTrigger = (id, data) => {
  return fetchApi(`/marketing/triggers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteMarketingTrigger = (id) => {
  return fetchApi(`/marketing/triggers/${id}`, {
    method: 'DELETE',
  });
};

export const activateMarketingTrigger = (id) => {
  return fetchApi(`/marketing/triggers/${id}/activate`, {
    method: 'PUT',
  });
};

export const pauseMarketingTrigger = (id) => {
  return fetchApi(`/marketing/triggers/${id}/pause`, {
    method: 'PUT',
  });
};

export const getTriggerExecutionLogs = (id, limit = 50) => {
  return fetchApi(`/marketing/triggers/${id}/executions?limit=${limit}`);
};

export const getTriggerAnalytics = () => {
  return fetchApi('/marketing/triggers/analytics');
};

// ==================== Product Campaigns API (Phase 3) ====================
export const getProductCampaigns = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.productId) queryParams.append('productId', params.productId);

  const queryString = queryParams.toString();
  return fetchApi(`/product-campaigns${queryString ? `?${queryString}` : ''}`);
};

export const getProductCampaign = (id) => {
  return fetchApi(`/product-campaigns/${id}`);
};

export const createProductCampaign = (data) => {
  return fetchApi('/product-campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateProductCampaign = (id, data) => {
  return fetchApi(`/product-campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteProductCampaign = (id) => {
  return fetchApi(`/product-campaigns/${id}`, {
    method: 'DELETE',
  });
};

export const launchProductCampaign = (id) => {
  return fetchApi(`/product-campaigns/${id}/launch`, {
    method: 'POST',
  });
};

export const refreshProductCampaignSegment = (id) => {
  return fetchApi(`/product-campaigns/${id}/refresh-segment`, {
    method: 'POST',
  });
};

export const getProductCampaignInsights = (id) => {
  return fetchApi(`/product-campaigns/${id}/insights`);
};

export const getProductCampaignPerformance = (id) => {
  return fetchApi(`/product-campaigns/${id}/performance`);
};

export const testProductCampaignAudience = (data) => {
  return fetchApi('/product-campaigns/test-audience', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const trackProductCampaignPerformance = (id, metrics) => {
  return fetchApi(`/product-campaigns/${id}/track`, {
    method: 'POST',
    body: JSON.stringify(metrics),
  });
};

export const previewProductCampaignSegment = (id) => {
  return fetchApi(`/product-campaigns/${id}/preview-segment`);
};

// ==================== A/B Testing API (Phase 4) ====================
export const createAbTestCampaign = (data) => {
  return fetchApi('/product-campaigns/ab-test', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const addCampaignVariant = (campaignId, variantData) => {
  return fetchApi(`/product-campaigns/${campaignId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variantData),
  });
};

export const updateCampaignVariant = (campaignId, variantName, data) => {
  return fetchApi(`/product-campaigns/${campaignId}/variants/${variantName}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const removeCampaignVariant = (campaignId, variantName) => {
  return fetchApi(`/product-campaigns/${campaignId}/variants/${variantName}`, {
    method: 'DELETE',
  });
};

export const launchAbTestCampaign = (id) => {
  return fetchApi(`/product-campaigns/${id}/launch-ab-test`, {
    method: 'POST',
  });
};

export const trackVariantPerformance = (campaignId, variantName, metrics) => {
  return fetchApi(`/product-campaigns/${campaignId}/variants/${variantName}/track`, {
    method: 'POST',
    body: JSON.stringify(metrics),
  });
};

export const selectAbTestWinner = (campaignId, variantName) => {
  return fetchApi(`/product-campaigns/${campaignId}/select-winner/${variantName}`, {
    method: 'POST',
  });
};

export const getAbTestResults = (campaignId) => {
  return fetchApi(`/product-campaigns/${campaignId}/ab-test-results`);
};

// ==================== Campaign Analytics API (Phase 5) ====================
export const getCampaignAnalytics = (campaignId) => {
  return fetchApi(`/product-campaigns/${campaignId}/analytics`);
};

export const refreshCampaignAnalytics = (campaignId) => {
  return fetchApi(`/product-campaigns/${campaignId}/analytics/refresh`, {
    method: 'POST',
  });
};

export const getAllCampaignAnalytics = (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters.limit) queryParams.append('limit', filters.limit.toString());

  const queryString = queryParams.toString();
  return fetchApi(`/product-campaigns/analytics/all${queryString ? `?${queryString}` : ''}`);
};

export const getTopPerformingCampaigns = (metric = 'roi', limit = 10) => {
  return fetchApi(`/product-campaigns/analytics/top-performers?metric=${metric}&limit=${limit}`);
};

export const exportCampaignAnalytics = (campaignId, format = 'json') => {
  return fetchApi(`/product-campaigns/${campaignId}/analytics/export?format=${format}`);
};

export const refreshAllCampaignAnalytics = () => {
  return fetchApi('/product-campaigns/analytics/refresh-all', {
    method: 'POST',
  });
};

// ==================== Marketing Analytics API (Phase 4) ====================
export const getCampaignPerformanceOverTime = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.channel) queryParams.append('channel', params.channel);
  if (params.granularity) queryParams.append('granularity', params.granularity);
  if (params.campaignIds && params.campaignIds.length > 0) {
    params.campaignIds.forEach(id => queryParams.append('campaignIds[]', id));
  }

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/campaigns/analytics/performance-over-time${queryString ? `?${queryString}` : ''}`);
};

export const getConversionFunnel = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.campaignId) queryParams.append('campaignId', params.campaignId);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/campaigns/analytics/conversion-funnel${queryString ? `?${queryString}` : ''}`);
};

export const getCohortAnalysis = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.segmentBy) queryParams.append('segmentBy', params.segmentBy);
  if (params.metric) queryParams.append('metric', params.metric);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/campaigns/analytics/cohort-analysis${queryString ? `?${queryString}` : ''}`);
};

export const getRevenueAttribution = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.attributionModel) queryParams.append('attributionModel', params.attributionModel);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/campaigns/analytics/revenue-attribution${queryString ? `?${queryString}` : ''}`);
};

export const comparePerformancePeriods = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.currentStart) queryParams.append('currentStart', params.currentStart);
  if (params.currentEnd) queryParams.append('currentEnd', params.currentEnd);
  if (params.previousStart) queryParams.append('previousStart', params.previousStart);
  if (params.previousEnd) queryParams.append('previousEnd', params.previousEnd);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/campaigns/analytics/compare-periods${queryString ? `?${queryString}` : ''}`);
};

// A/B Testing API - Phase 5
export const createABTest = (campaignId, testData) => {
  return fetchApi(`/marketing/campaigns/${campaignId}/ab-test`, {
    method: 'POST',
    body: JSON.stringify(testData),
  });
};

export const getCampaignVariants = (campaignId) => {
  return fetchApi(`/marketing/campaigns/${campaignId}/variants`);
};

export const getVariant = (variantId) => {
  return fetchApi(`/marketing/variants/${variantId}`);
};

export const updateVariant = (variantId, variantData) => {
  return fetchApi(`/marketing/variants/${variantId}`, {
    method: 'PUT',
    body: JSON.stringify(variantData),
  });
};

export const deleteVariant = (variantId) => {
  return fetchApi(`/marketing/variants/${variantId}`, {
    method: 'DELETE',
  });
};

export const getABTestResults = (campaignId) => {
  return fetchApi(`/marketing/campaigns/${campaignId}/ab-results`);
};

export const declareWinner = (campaignId, winnerId, reason) => {
  return fetchApi(`/marketing/campaigns/${campaignId}/declare-winner`, {
    method: 'POST',
    body: JSON.stringify({ variantId: winnerId, reason }),
  });
};

export const autoSelectWinner = (campaignId) => {
  return fetchApi(`/marketing/campaigns/${campaignId}/auto-select-winner`, {
    method: 'POST',
  });
};

// Campaign Scheduling API - Phase 6
export const createSchedule = (scheduleData) => {
  return fetchApi('/marketing/schedules', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  });
};

export const getSchedules = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.campaignId) queryParams.append('campaignId', params.campaignId);
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);
  if (params.enabled !== undefined) queryParams.append('enabled', params.enabled);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/schedules${queryString ? `?${queryString}` : ''}`);
};

export const getSchedule = (scheduleId) => {
  return fetchApi(`/marketing/schedules/${scheduleId}`);
};

export const updateSchedule = (scheduleId, scheduleData) => {
  return fetchApi(`/marketing/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(scheduleData),
  });
};

export const deleteSchedule = (scheduleId) => {
  return fetchApi(`/marketing/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
};

export const pauseSchedule = (scheduleId) => {
  return fetchApi(`/marketing/schedules/${scheduleId}/pause`, {
    method: 'POST',
  });
};

export const resumeSchedule = (scheduleId) => {
  return fetchApi(`/marketing/schedules/${scheduleId}/resume`, {
    method: 'POST',
  });
};

// Marketing Workflows API - Phase 6
export const createWorkflow = (workflowData) => {
  return fetchApi('/marketing/workflows', {
    method: 'POST',
    body: JSON.stringify(workflowData),
  });
};

export const getWorkflows = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.triggerType) queryParams.append('triggerType', params.triggerType);

  const queryString = queryParams.toString();
  return fetchApi(`/marketing/workflows${queryString ? `?${queryString}` : ''}`);
};

export const getWorkflow = (workflowId) => {
  return fetchApi(`/marketing/workflows/${workflowId}`);
};

export const updateWorkflow = (workflowId, workflowData) => {
  return fetchApi(`/marketing/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify(workflowData),
  });
};

export const deleteWorkflow = (workflowId) => {
  return fetchApi(`/marketing/workflows/${workflowId}`, {
    method: 'DELETE',
  });
};

export const activateWorkflow = (workflowId) => {
  return fetchApi(`/marketing/workflows/${workflowId}/activate`, {
    method: 'POST',
  });
};

export const pauseWorkflow = (workflowId) => {
  return fetchApi(`/marketing/workflows/${workflowId}/pause`, {
    method: 'POST',
  });
};

export const enrollCustomerInWorkflow = (workflowId, customerId, contextData = {}) => {
  return fetchApi('/marketing/workflows/enroll', {
    method: 'POST',
    body: JSON.stringify({ workflowId, customerId, contextData }),
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

// Tax Settings
export const fetchTaxSettings = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  return fetchApi(`/accounting/tax-settings${queryString ? `?${queryString}` : ''}`);
};

export const createTaxSettings = (taxData) => {
  return fetchApi('/accounting/tax-settings', {
    method: 'POST',
    body: JSON.stringify(taxData),
  });
};

export const updateTaxSettings = (id, taxData) => {
  return fetchApi(`/accounting/tax-settings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(taxData),
  });
};

export const deleteTaxSettings = (id) => {
  return fetchApi(`/accounting/tax-settings/${id}`, {
    method: 'DELETE',
  });
};

export const seedDefaultTaxes = () => {
  return fetchApi('/accounting/tax-settings/seed', {
    method: 'POST',
  });
};

// IVA Withholding
export const fetchIvaWithholdings = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  return fetchApi(`/accounting/iva-withholding${queryString ? `?${queryString}` : ''}`);
};

export const createIvaWithholding = (withholdingData) => {
  return fetchApi('/accounting/iva-withholding', {
    method: 'POST',
    body: JSON.stringify(withholdingData),
  });
};

export const updateIvaWithholding = (id, withholdingData) => {
  return fetchApi(`/accounting/iva-withholding/${id}`, {
    method: 'PUT',
    body: JSON.stringify(withholdingData),
  });
};

export const postIvaWithholding = (id) => {
  return fetchApi(`/accounting/iva-withholding/${id}/post`, {
    method: 'PUT',
  });
};

export const annulIvaWithholding = (id, data) => {
  return fetchApi(`/accounting/iva-withholding/${id}/annul`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteIvaWithholding = (id) => {
  return fetchApi(`/accounting/iva-withholding/${id}`, {
    method: 'DELETE',
  });
};

export const exportIvaWithholdingsToARC = async (month, year) => {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();

  const response = await fetch(
    `${baseUrl}/api/v1/accounting/iva-withholding/export/arc/${month}/${year}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al exportar ARC');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ARC-IVA-${month}-${year}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ============ IVA PURCHASE BOOK (Libro de Compras) ============

export const fetchPurchaseBook = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  return fetchApi(`/accounting/iva-books/purchases${queryString ? `?${queryString}` : ''}`);
};

export const fetchPurchaseBookByPeriod = (month, year) => {
  return fetchApi(`/accounting/iva-books/purchases/period/${month}/${year}`);
};

export const validatePurchaseBook = (month, year) => {
  return fetchApi(`/accounting/iva-books/purchases/validate/${month}/${year}`);
};

export const getPurchaseBookSummary = (month, year) => {
  return fetchApi(`/accounting/iva-books/purchases/summary/${month}/${year}`);
};

export const deletePurchaseBookEntry = (id) => {
  return fetchApi(`/accounting/iva-books/purchases/${id}`, {
    method: 'DELETE',
  });
};

export const exportPurchaseBookToTXT = async (month, year) => {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();

  const response = await fetch(
    `${baseUrl}/api/v1/accounting/iva-books/purchases/export/${month}/${year}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al exportar libro de compras');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Libro-Compras-${month}-${year}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ============ IVA SALES BOOK (Libro de Ventas) ============

export const fetchSalesBook = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  return fetchApi(`/accounting/iva-books/sales${queryString ? `?${queryString}` : ''}`);
};

export const fetchSalesBookByPeriod = (month, year) => {
  return fetchApi(`/accounting/iva-books/sales/period/${month}/${year}`);
};

export const validateSalesBook = (month, year) => {
  return fetchApi(`/accounting/iva-books/sales/validate/${month}/${year}`);
};

export const getSalesBookSummary = (month, year) => {
  return fetchApi(`/accounting/iva-books/sales/summary/${month}/${year}`);
};

export const annulSalesBookEntry = (id, data) => {
  return fetchApi(`/accounting/iva-books/sales/${id}/annul`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteSalesBookEntry = (id) => {
  return fetchApi(`/accounting/iva-books/sales/${id}`, {
    method: 'DELETE',
  });
};

export const exportSalesBookToTXT = async (month, year) => {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();

  const response = await fetch(
    `${baseUrl}/api/v1/accounting/iva-books/sales/export/${month}/${year}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al exportar libro de ventas');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Libro-Ventas-${month}-${year}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ============ IVA DECLARATION (Declaración IVA) ============

export const fetchIvaDeclarations = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  return fetchApi(`/accounting/iva-declaration${queryString ? `?${queryString}` : ''}`);
};

export const fetchIvaDeclarationById = (id) => {
  return fetchApi(`/accounting/iva-declaration/${id}`);
};

export const fetchIvaDeclarationByPeriod = (month, year) => {
  return fetchApi(`/accounting/iva-declaration/period/${month}/${year}`);
};

export const calculateIvaDeclaration = (data) => {
  return fetchApi('/accounting/iva-declaration/calculate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateIvaDeclaration = (id, data) => {
  return fetchApi(`/accounting/iva-declaration/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const fileIvaDeclaration = (id, data) => {
  return fetchApi(`/accounting/iva-declaration/${id}/file`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// ============ BILL OF MATERIALS (RECIPES) API ============

export const getBillOfMaterials = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.productId) queryParams.append('productId', params.productId);
  if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);

  const queryString = queryParams.toString();
  return fetchApi(`/bill-of-materials${queryString ? `?${queryString}` : ''}`);
};

export const getBillOfMaterialsById = (id) => {
  return fetchApi(`/bill-of-materials/${id}`);
};

export const getBillOfMaterialsByProduct = (productId) => {
  return fetchApi(`/bill-of-materials/by-product/${productId}`);
};

export const createBillOfMaterials = (data) => {
  return fetchApi('/bill-of-materials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateBillOfMaterials = (id, data) => {
  return fetchApi(`/bill-of-materials/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteBillOfMaterials = (id) => {
  return fetchApi(`/bill-of-materials/${id}`, {
    method: 'DELETE',
  });
};

export const calculateBillOfMaterialsCost = (id) => {
  return fetchApi(`/bill-of-materials/${id}/cost`);
};

export const checkBillOfMaterialsAvailability = (id, quantity) => {
  return fetchApi(`/bill-of-materials/${id}/check-availability`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
};

export const explodeBillOfMaterials = (id, quantity = 1) => {
  return fetchApi(`/bill-of-materials/${id}/explode?quantity=${quantity}`);
};

export const getBillOfMaterialsStructure = (id) => {
  return fetchApi(`/bill-of-materials/${id}/structure`);
};


export const recordIvaDeclarationPayment = (id, data) => {
  return fetchApi(`/accounting/iva-declaration/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteIvaDeclaration = (id) => {
  return fetchApi(`/accounting/iva-declaration/${id}`, {
    method: 'DELETE',
  });
};

export const downloadIvaDeclarationXML = async (id) => {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();

  const response = await fetch(
    `${baseUrl}/api/v1/accounting/iva-declaration/${id}/xml`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al descargar XML');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Declaracion-IVA-${id}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ========== SENIAT Electronic Invoicing API ==========

// Validate document for SENIAT
export const validateDocumentForSENIAT = (documentId) =>
  fetchApi(`/billing/documents/${documentId}/validate-seniat`, {
    method: 'POST',
  });

// Generate SENIAT XML
export const generateSeniatXML = (documentId) =>
  fetchApi(`/billing/documents/${documentId}/generate-xml`, {
    method: 'POST',
  });

// Download SENIAT XML
export const downloadSeniatXML = async (documentId) => {
  const token = getAuthToken();
  const baseUrl = getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/v1/billing/documents/${documentId}/seniat-xml`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al descargar XML SENIAT');
  }

  return response.blob();
};

// Get electronic invoice statistics
export const getElectronicInvoiceStats = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.status) params.append('status', filters.status);
  if (filters.documentType) params.append('documentType', filters.documentType);

  return fetchApi(`/billing/stats/electronic-invoices?${params.toString()}`, {
    method: 'GET',
  });
};

// ==================== ISLR Withholding Functions ====================

// Get all ISLR withholdings with filters
export const fetchIslrWithholdings = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.beneficiaryType) params.append('beneficiaryType', filters.beneficiaryType);
  if (filters.operationType) params.append('operationType', filters.operationType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.beneficiaryRif) params.append('beneficiaryRif', filters.beneficiaryRif);
  if (filters.exportedToARC) params.append('exportedToARC', filters.exportedToARC);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  return fetchApi(`/accounting/islr-withholding?${params.toString()}`, {
    method: 'GET',
  });
};

// Create a new ISLR withholding
export const createIslrWithholding = (data) => {
  return fetchApi('/accounting/islr-withholding', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Update an ISLR withholding (only draft)
export const updateIslrWithholding = (id, data) => {
  return fetchApi(`/accounting/islr-withholding/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Post (contabilizar) an ISLR withholding
export const postIslrWithholding = (id) => {
  return fetchApi(`/accounting/islr-withholding/${id}/post`, {
    method: 'PUT',
  });
};

// Annul an ISLR withholding
export const annulIslrWithholding = (id, data) => {
  return fetchApi(`/accounting/islr-withholding/${id}/annul`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Delete an ISLR withholding (only draft)
export const deleteIslrWithholding = (id) => {
  return fetchApi(`/accounting/islr-withholding/${id}`, {
    method: 'DELETE',
  });
};

// Get ISLR withholdings by period
export const getIslrByPeriod = (month, year) => {
  return fetchApi(`/accounting/islr-withholding/period/${month}/${year}`, {
    method: 'GET',
  });
};

// Get ISLR withholding summary for a period
export const getIslrSummary = (month, year) => {
  return fetchApi(`/accounting/islr-withholding/summary/${month}/${year}`, {
    method: 'GET',
  });
};

// Export ISLR withholdings to ARC format (SENIAT)
export const exportIslrToARC = async (month, year) => {
  const token = getToken();
  if (!token) {
    throw new Error('No autorizado');
  }

  const baseUrl = getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/v1/accounting/islr-withholding/export/arc/${month}/${year}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al exportar ARC ISLR');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ARC-ISLR-${String(month).padStart(2, '0')}-${year}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// ==================== PHASE 2: Advanced Accounting Reports ====================

// Trial Balance (Balance de Comprobación)
export const fetchTrialBalance = (params = {}) => {
  const { startDate, endDate, accountType, includeZeroBalances } = params;
  const queryParams = new URLSearchParams();

  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (accountType) queryParams.append('accountType', accountType);
  if (includeZeroBalances !== undefined) {
    queryParams.append('includeZeroBalances', includeZeroBalances.toString());
  }

  const queryString = queryParams.toString();
  const url = `/accounting/reports/trial-balance${queryString ? `?${queryString}` : ''}`;

  return fetchApi(url);
};

// General Ledger (Libro Mayor)
export const fetchGeneralLedger = (params = {}) => {
  const { accountCode, startDate, endDate, page = 1, limit = 100 } = params;

  if (!accountCode) {
    throw new Error('Se requiere el código de cuenta para el libro mayor');
  }

  const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });

  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  return fetchApi(`/accounting/reports/general-ledger/${accountCode}?${queryParams.toString()}`);
};

// Accounting Periods API
export const fetchAccountingPeriods = (filters = {}) => {
  const queryParams = new URLSearchParams();

  if (filters.status) queryParams.append('status', filters.status);
  if (filters.fiscalYear) queryParams.append('fiscalYear', filters.fiscalYear.toString());

  const queryString = queryParams.toString();
  return fetchApi(`/accounting/periods${queryString ? `?${queryString}` : ''}`);
};

export const fetchAccountingPeriod = (id) => {
  return fetchApi(`/accounting/periods/${id}`);
};

export const fetchCurrentPeriod = () => {
  return fetchApi('/accounting/periods/current');
};

export const fetchFiscalYears = () => {
  return fetchApi('/accounting/periods/fiscal-years');
};

export const createAccountingPeriod = (data) => {
  return fetchApi('/accounting/periods', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAccountingPeriod = (id, data) => {
  return fetchApi(`/accounting/periods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const closeAccountingPeriod = (periodId, closingNotes = '') => {
  return fetchApi('/accounting/periods/close', {
    method: 'POST',
    body: JSON.stringify({ periodId, closingNotes }),
  });
};

export const reopenAccountingPeriod = (id) => {
  return fetchApi(`/accounting/periods/${id}/reopen`, {
    method: 'PUT',
  });
};

export const lockAccountingPeriod = (id) => {
  return fetchApi(`/accounting/periods/${id}/lock`, {
    method: 'PUT',
  });
};

export const unlockAccountingPeriod = (id) => {
  return fetchApi(`/accounting/periods/${id}/unlock`, {
    method: 'PUT',
  });
};

export const deleteAccountingPeriod = (id) => {
  return fetchApi(`/accounting/periods/${id}`, {
    method: 'DELETE',
  });
};

export const getPeriodForDate = (date) => {
  return fetchApi(`/accounting/periods/date/${date}`);
};

// Recurring Entries API
export const fetchRecurringEntries = (filters = {}) => {
  const queryParams = new URLSearchParams();

  if (filters.isActive !== undefined) {
    queryParams.append('isActive', filters.isActive.toString());
  }
  if (filters.frequency) queryParams.append('frequency', filters.frequency);

  const queryString = queryParams.toString();
  return fetchApi(`/accounting/recurring-entries${queryString ? `?${queryString}` : ''}`);
};

export const fetchRecurringEntry = (id) => {
  return fetchApi(`/accounting/recurring-entries/${id}`);
};

export const fetchUpcomingRecurringEntries = (daysAhead = 30) => {
  return fetchApi(`/accounting/recurring-entries/upcoming?daysAhead=${daysAhead}`);
};

export const createRecurringEntry = (data) => {
  return fetchApi('/accounting/recurring-entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateRecurringEntry = (id, data) => {
  return fetchApi(`/accounting/recurring-entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const toggleRecurringEntryActive = (id) => {
  return fetchApi(`/accounting/recurring-entries/${id}/toggle-active`, {
    method: 'PUT',
  });
};

export const executeRecurringEntry = (id, executionDate = null) => {
  return fetchApi(`/accounting/recurring-entries/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ executionDate: executionDate || new Date().toISOString() }),
  });
};

export const executeAllPendingRecurringEntries = (executionDate = null, recurringEntryId = null) => {
  return fetchApi('/accounting/recurring-entries/execute-pending', {
    method: 'POST',
    body: JSON.stringify({
      executionDate: executionDate || new Date().toISOString(),
      recurringEntryId,
    }),
  });
};

export const deleteRecurringEntry = (id) => {
  return fetchApi(`/accounting/recurring-entries/${id}`, {
    method: 'DELETE',
  });
};

// Generic API client for axios-like usage
export const api = {
  get: (url, config = {}) => fetchApi(url, { ...config, method: 'GET' }),
  post: (url, data, config = {}) => fetchApi(url, {
    ...config,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data)
  }),
  put: (url, data, config = {}) => fetchApi(url, {
    ...config,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data)
  }),
  patch: (url, data, config = {}) => fetchApi(url, {
    ...config,
    method: 'PATCH',
    body: data instanceof FormData ? data : JSON.stringify(data)
  }),
  delete: (url, config = {}) => fetchApi(url, { ...config, method: 'DELETE' }),
};
