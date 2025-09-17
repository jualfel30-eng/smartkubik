const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

export const fetchApi = async (url, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`http://localhost:3000/api/v1${url}`, {
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

    let errorMessage = errorData.message || 'Error en la petición a la API';
    if (Array.isArray(errorMessage)) {
      errorMessage = errorMessage.join(', ');
    }
    if (!errorMessage) {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
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
