import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createScopedLogger } from '@/lib/logger';

const logger = createScopedLogger('tutorial-context');

const TutorialContext = createContext();
export const useTutorial = () => useContext(TutorialContext);

export const TutorialProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();

  const steps = [
    // Paso 1: Navegación principal (Usa selector "ends-with")
    {
      target: '[id$="-trigger-inventory-management"]',
      content: 'Para empezar, haz clic en "Inventario" en el menú principal.',
      disableBeacon: true,
      spotlightClicks: true,
    },
    // Paso 2: Botón Agregar Producto (Usa ID estático + disableOverlay)
    {
      target: '#add-product-button',
      content: 'Ahora, haz clic aquí para agregar un nuevo producto a tu catálogo.',
      disableBeacon: true,
      spotlightClicks: true,
      disableOverlay: true, // CRÍTICO: Asegura que el clic no sea bloqueado.
    },
    // Paso 3: Formulario de Producto
    {
      target: '[role="dialog"]',
      content: 'Completa el formulario y guarda el producto. El tutorial avanzará solo.',
      disableBeacon: true,
      isFormStep: true,
      formType: 'product',
    },
    // Paso 4: Pestaña de Inventario (Usa selector "ends-with")
    {
      target: '[id$="-trigger-inventory"]',
      content: '¡Perfecto! Ahora ve a la pestaña de "Inventario" para añadir el stock.',
      disableBeacon: true,
      spotlightClicks: true,
    },
    // Paso 5: Botón Agregar Inventario (Asume mismo patrón que Paso 2)
    {
      target: '#add-inventory-button',
      content: 'Haz clic aquí para registrar el stock inicial de tu producto.',
      disableBeacon: true,
      spotlightClicks: true,
      disableOverlay: true, // CRÍTICO: Se asume necesario, igual que en el paso 2.
    },
    // Paso 6: Formulario de Inventario
    {
      target: '[role="dialog"]',
      content: 'Selecciona el producto, la cantidad y guarda. Con esto finaliza el tutorial.',
      disableBeacon: true,
      isFormStep: true,
      formType: 'inventory',
    },
  ];

  const waitForElement = (selector, maxWaitTime = 5000, interval = 100) => {
    return new Promise((resolve, reject) => {
      let totalWaitTime = 0;
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          resolve(element);
          return;
        }
        totalWaitTime += interval;
        if (totalWaitTime >= maxWaitTime) {
          reject(new Error(`Element ${selector} not found or not visible within ${maxWaitTime}ms`));
          return;
        }
        setTimeout(checkElement, interval);
      };
      checkElement();
    });
  };

  // This effect listens for form success events
  useEffect(() => {
    const currentStep = steps[stepIndex];
    if (!run || !currentStep?.isFormStep) return;

    const handleFormSuccess = () => {
      logger.debug('Form success event received, advancing tutorial', {
        formType: currentStep.formType,
      });
      setStepIndex(prev => prev + 1);
    };

    document.addEventListener(`${currentStep.formType}-form-success`, handleFormSuccess);

    return () => {
      document.removeEventListener(`${currentStep.formType}-form-success`, handleFormSuccess);
    };
  }, [stepIndex, run]);


  const startTutorial = () => {
    setStepIndex(0);
    setRun(true);
  };

  const handleJoyrideCallback = async (data) => {
    const { action, index, status, type } = data;

    if (status === 'finished' || status === 'skipped') {
      setRun(false);
      setStepIndex(0);
      return;
    }

    if (type === 'error:target_not_found') {
        setRun(false);
        setStepIndex(0);
        alert(`No se pudo encontrar el elemento del tutorial. Abortando.`);
        return;
    }

    if (type === 'step:after' && (action === 'next' || action === 'click')) {
      const currentStep = steps[index];
      
      if (currentStep?.isFormStep) {
        return;
      }

      if (index + 1 < steps.length) {
        setStepIndex(index + 1);
      }
    } 
    else if (type === 'step:after' && action === 'prev') {
      if (index > 0) {
        setStepIndex(index - 1);
      }
    }
  };

  return (
    <TutorialContext.Provider value={{
      run,
      steps,
      stepIndex,
      startTutorial,
      handleJoyrideCallback,
      setRun
    }}>
      {children}
    </TutorialContext.Provider>
  );
};