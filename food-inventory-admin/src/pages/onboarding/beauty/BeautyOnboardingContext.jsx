import { createContext, useContext, useReducer } from 'react';

const BeautyOnboardingContext = createContext(null);

const initialState = {
  // Screen 1
  painPoints: [],
  // Screen 3
  salonName: '',
  logoFile: null,
  logoPreview: null,
  currency: 'USD',
  whatsappNumber: '',
  // Screen 4
  professionals: [],
  // Screen 5
  services: [],
  // Screen 6
  schedule: {
    weekdays: { start: '08:00', end: '19:00', enabled: true },
    saturday: { start: '09:00', end: '15:00', enabled: true },
    sunday: { start: '', end: '', enabled: false },
  },
  // Screen 7 build results
  buildResults: {},
  // Screen 8
  bookingUrl: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PAIN_POINTS':
      return { ...state, painPoints: action.payload };

    case 'TOGGLE_PAIN_POINT': {
      const key = action.payload;
      const exists = state.painPoints.includes(key);
      return {
        ...state,
        painPoints: exists
          ? state.painPoints.filter((k) => k !== key)
          : [...state.painPoints, key],
      };
    }

    case 'SET_SALON_IDENTITY':
      return { ...state, ...action.payload };

    case 'ADD_PROFESSIONAL':
      return {
        ...state,
        professionals: [...state.professionals, action.payload],
      };

    case 'REMOVE_PROFESSIONAL':
      return {
        ...state,
        professionals: state.professionals.filter((_, i) => i !== action.payload),
      };

    case 'SET_SOLO_PROFESSIONAL':
      return {
        ...state,
        professionals: [action.payload],
      };

    case 'SET_SERVICES':
      return { ...state, services: action.payload };

    case 'TOGGLE_SERVICE': {
      const id = action.payload;
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === id ? { ...s, isSelected: !s.isSelected } : s
        ),
      };
    }

    case 'UPDATE_SERVICE': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      };
    }

    case 'ADD_CUSTOM_SERVICE':
      return {
        ...state,
        services: [...state.services, action.payload],
      };

    case 'SET_SCHEDULE':
      return { ...state, schedule: { ...state.schedule, ...action.payload } };

    case 'SET_BUILD_RESULT':
      return {
        ...state,
        buildResults: { ...state.buildResults, [action.payload.key]: action.payload.status },
      };

    case 'SET_BOOKING_URL':
      return { ...state, bookingUrl: action.payload };

    default:
      return state;
  }
}

export function BeautyOnboardingProvider({ children, initialValues }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    ...initialValues,
  });

  return (
    <BeautyOnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </BeautyOnboardingContext.Provider>
  );
}

export function useBeautyOnboarding() {
  const ctx = useContext(BeautyOnboardingContext);
  if (!ctx) throw new Error('useBeautyOnboarding must be used inside BeautyOnboardingProvider');
  return ctx;
}
