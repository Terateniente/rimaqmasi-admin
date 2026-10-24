export const WizardProgress = ({ steps, currentStep }) => {
  const activeStep = steps[currentStep - 1] || steps[0];
  const remainingSteps = Math.max(steps.length - currentStep, 0);
  const progress = `${Math.min((currentStep / steps.length) * 100, 100)}%`;

  return (
    <div style={{ marginBottom: '24px' }} aria-label={`Paso ${currentStep} de ${steps.length}`}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '8px', color: 'var(--color-on-surface-variant)', fontSize: '11px', fontWeight: 600 }}>
          <span>Paso {currentStep} de {steps.length}</span>
          <span>{remainingSteps === 0 ? 'Último paso' : `${remainingSteps} ${remainingSteps === 1 ? 'paso restante' : 'pasos restantes'}`}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={currentStep}
          style={{ height: '6px', width: '100%', overflow: 'hidden', borderRadius: '99px', backgroundColor: 'var(--color-surface-container-high)' }}
        >
          <div style={{ height: '100%', width: progress, borderRadius: 'inherit', backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 5px color-mix(in srgb, var(--color-primary) 30%, transparent)', transition: 'width .3s ease' }} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 6px', color: 'var(--color-on-surface)', fontSize: '18px', fontWeight: 800 }}>{activeStep.label}</h3>
        {activeStep.description && <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '13px', lineHeight: 1.45 }}>{activeStep.description}</p>}
      </div>
    </div>
  );
};
