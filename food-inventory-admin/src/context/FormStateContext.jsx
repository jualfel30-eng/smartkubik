import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const FormStateContext = createContext();

export function FormStateProvider({ children }) {
  const [formState, setFormState] = useState({});

  const updateFormState = useCallback((formId, data) => {
    setFormState(prevState => ({
      ...prevState,
      [formId]: data,
    }));
  }, []);

  const value = useMemo(() => ({
    formState,
    updateFormState
  }), [formState, updateFormState]);

  return (
    <FormStateContext.Provider value={value}>
      {children}
    </FormStateContext.Provider>
  );
}

export function useFormState() {
  const context = useContext(FormStateContext);
  if (context === undefined) {
    throw new Error('useFormState must be used within a FormStateProvider');
  }
  return context;
}