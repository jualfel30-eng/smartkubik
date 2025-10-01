import React from 'react';
import { createPortal } from 'react-dom';
import Joyride from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';

export default function Tutorial() {
  const { run, steps, stepIndex, handleJoyrideCallback } = useTutorial();

  return createPortal(
    <Joyride
      run={run}
      steps={steps}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      styles={{
        options: {
          primaryColor: '#007bff',
          zIndex: 100000,
        }
      }}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar'
      }}
    />,
    document.body
  );
}