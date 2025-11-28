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
