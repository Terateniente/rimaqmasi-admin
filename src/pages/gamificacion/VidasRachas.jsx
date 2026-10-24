import React, { useEffect, useState } from 'react';
import { Clock3, Heart, Info, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getConfiguracionVidas, updateConfiguracionVidas } from '../../services/vidasService';
import { ModernPageSkeleton } from '../../components/ModernPageSkeleton';
import './VidasRachas.css';

const durationLabel = (minutes) => {
  const value = Math.max(0, Math.round(minutes));
  const days = Math.floor(value / 1440);
  const hours = Math.floor((value % 1440) / 60);
  const mins = value % 60;
  return [days && `${days} d`, hours && `${hours} h`, mins && `${mins} min`].filter(Boolean).join(' ') || '0 min';
};

const normalize = (data) => {
  const minutes = Number(data.minutos_por_recarga ?? data.horas_por_recarga * 60);
  return {
    vidas_maximas: Number(data.vidas_maximas),
    minutos_por_recarga: minutes,
    horas_por_recarga: Number((minutes / 60).toFixed(2)),
    pierde_vida_por_error: Boolean(data.pierde_vida_por_error),
    activo: Boolean(data.activo),
  };
};

const buildTimelineSteps = (maximum) => {
  if (maximum <= 6) return Array.from({ length: maximum }, (_, index) => index + 1);
  return [1, 2, 3, maximum - 1, maximum];
};

export const VidasRachas = () => {
  const [form, setForm] = useState({ vidas_maximas: 5, horas_por_recarga: 5, minutos_por_recarga: 300, pierde_vida_por_error: true, activo: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getConfiguracionVidas()
      .then(data => { if (active) setForm(normalize(data)); })
      .catch(error => { if (active) toast.error(error.response?.data?.message || 'No se pudo cargar la configuración'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateMinutes = (minutes) => setForm(current => ({
    ...current,
    minutos_por_recarga: minutes,
    horas_por_recarga: Number((minutes / 60).toFixed(2)),
  }));

  const updateHours = (hours) => setForm(current => ({
    ...current,
    horas_por_recarga: hours,
    minutos_por_recarga: Math.max(1, Math.round(hours * 60)),
  }));

  const save = async (event) => {
    event.preventDefault();
    if (!Number.isFinite(form.vidas_maximas) || form.vidas_maximas < 1 || form.vidas_maximas > 99) {
      toast.error('La cantidad de vidas debe estar entre 1 y 99');
      return;
    }
    if (!Number.isFinite(form.minutos_por_recarga) || form.minutos_por_recarga < 1 || form.minutos_por_recarga > 10080) {
      toast.error('El tiempo de recuperación debe estar entre 1 minuto y 7 días');
      return;
    }
    setSaving(true);
    try {
      setForm(normalize(await updateConfiguracionVidas(form)));
      toast.success('Configuración de vidas actualizada');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="lives-page lives-page--loading"><ModernPageSkeleton cards={3} /></div>;
  }

  const totalRecovery = form.minutos_por_recarga * form.vidas_maximas;
  const timelineSteps = buildTimelineSteps(form.vidas_maximas);
  const metrics = [
    { icon: Heart, tone: 'danger', value: form.vidas_maximas, label: 'Vidas máximas', detail: 'Disponibles por estudiante' },
    { icon: Clock3, tone: 'warning', value: durationLabel(form.minutos_por_recarga), label: 'Recarga por vida', detail: 'Intervalo automático' },
    { icon: RefreshCw, tone: 'info', value: durationLabel(totalRecovery), label: 'Recuperación completa', detail: 'Partiendo desde cero vidas' },
  ];

  return (
    <main className="lives-page">
      <header className="lives-header">
        <div className="rq-page-heading">
          <div className="rq-page-heading__accent" />
          <h1 className="rq-page-heading__title">Vidas y rachas</h1>
        </div>
        <p>Configura las reglas globales de pérdida y recuperación de vidas.</p>
      </header>

      <section className="lives-metrics" aria-label="Resumen de la configuración">
        {metrics.map(({ icon: Icon, tone, value, label, detail }) => (
          <article className="lives-metric" key={label}>
            <span className={`lives-metric__icon lives-metric__icon--${tone}`}><Icon size={23} /></span>
            <div className="lives-metric__content">
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="lives-layout">
        <form className="lives-panel lives-form" onSubmit={save}>
          <div className="lives-panel__header">
            <div>
              <span className="lives-eyebrow">Reglas generales</span>
              <h2>Configuración de vidas</h2>
              <p>Estos cambios se aplicarán a todos los estudiantes.</p>
            </div>
            <span className={`lives-status ${form.activo ? 'lives-status--active' : 'lives-status--inactive'}`}>
              <span />{form.activo ? 'Recuperación activa' : 'Recuperación pausada'}
            </span>
          </div>

          <div className="lives-fields">
            <label className="lives-field lives-field--wide">
              <span>Cantidad máxima de vidas</span>
              <div className="lives-input-wrap">
                <Heart size={17} />
                <input type="number" min="1" max="99" value={form.vidas_maximas} onChange={event => setForm(current => ({ ...current, vidas_maximas: Number(event.target.value) }))} />
                <small>vidas</small>
              </div>
              <em>Define el límite disponible para cada estudiante.</em>
            </label>

            <div className="lives-field-group lives-field--wide">
              <div className="lives-field-group__title">
                <div><strong>Tiempo de recuperación</strong><span>Ambos valores permanecen sincronizados.</span></div>
                <Clock3 size={18} />
              </div>
              <div className="lives-fields lives-fields--nested">
                <label className="lives-field">
                  <span>Horas por vida</span>
                  <div className="lives-input-wrap">
                    <input type="number" min="0.02" max="168" step="0.01" value={form.horas_por_recarga} onChange={event => updateHours(Number(event.target.value))} />
                    <small>horas</small>
                  </div>
                </label>
                <label className="lives-field">
                  <span>Minutos por vida</span>
                  <div className="lives-input-wrap">
                    <input type="number" min="1" max="10080" step="1" value={form.minutos_por_recarga} onChange={event => updateMinutes(Number(event.target.value))} />
                    <small>min</small>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="lives-rules">
            <ToggleRule
              icon={ShieldCheck}
              title="Pérdida de vida por fallo"
              description="Descuenta una vida cuando no se aprueba una lección."
              checked={form.pierde_vida_por_error}
              onChange={checked => setForm(current => ({ ...current, pierde_vida_por_error: checked }))}
            />
            <ToggleRule
              icon={RefreshCw}
              title="Recuperación automática"
              description="Recupera vidas de acuerdo con el intervalo configurado."
              checked={form.activo}
              onChange={checked => setForm(current => ({ ...current, activo: checked }))}
            />
          </div>

          <div className="lives-info">
            <Info size={19} />
            <p>Se recuperará <strong>1 vida cada {durationLabel(form.minutos_por_recarga)}</strong>. Desde cero, completar las {form.vidas_maximas} vidas tomará <strong>{durationLabel(totalRecovery)}</strong>.</p>
          </div>

          <div className="lives-form__footer">
            <span>Verifica los valores antes de guardar los cambios.</span>
            <button className="lives-save" disabled={saving} type="submit">
              {saving ? <RefreshCw className="spinning" size={18} /> : <Save size={18} />}
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </form>

        <aside className="lives-panel lives-recovery">
          <div className="lives-panel__header">
            <div>
              <span className="lives-eyebrow">Vista previa</span>
              <h2>Recuperación de vidas</h2>
              <p>Así avanzará un estudiante desde cero vidas.</p>
            </div>
          </div>

          <div className="lives-timeline">
            <TimelineItem marker="0" title="Sin vidas" subtitle="Punto de inicio" variant="start" />
            {timelineSteps.map((step, index) => {
              const previous = timelineSteps[index - 1];
              const hasGap = previous && step - previous > 1;
              const isLast = step === form.vidas_maximas;
              return (
                <React.Fragment key={step}>
                  {hasGap && <div className="lives-timeline__gap"><span>•••</span><small>{step - previous - 1} etapas intermedias</small></div>}
                  <TimelineItem
                    icon={isLast ? Heart : Clock3}
                    title={isLast ? 'Vidas completas' : `+${step} ${step === 1 ? 'vida' : 'vidas'}`}
                    subtitle={`En ${durationLabel(form.minutos_por_recarga * step)}`}
                    variant={isLast ? 'complete' : 'step'}
                  />
                </React.Fragment>
              );
            })}
          </div>

          <div className={`lives-recovery__footer ${form.activo ? 'is-active' : 'is-inactive'}`}>
            {form.activo ? <ShieldCheck size={18} /> : <Clock3 size={18} />}
            <div><strong>{form.activo ? 'Recuperación automática activada' : 'Recuperación automática pausada'}</strong><span>{form.activo ? `Una vida cada ${durationLabel(form.minutos_por_recarga)}` : 'Las vidas no se recuperarán por tiempo'}</span></div>
          </div>
        </aside>
      </section>
    </main>
  );
};

const ToggleRule = ({ icon: Icon, title, description, checked, onChange }) => (
  <label className="lives-rule">
    <span className="lives-rule__icon"><Icon size={19} /></span>
    <span className="lives-rule__copy"><strong>{title}</strong><small>{description}</small></span>
    <input className="lives-switch-input" type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span className="lives-switch" aria-hidden="true"><span /></span>
  </label>
);

const TimelineItem = ({ icon: Icon, marker, title, subtitle, variant }) => (
  <div className={`lives-timeline__item lives-timeline__item--${variant}`}>
    <span className="lives-timeline__marker">{Icon ? <Icon size={18} fill={variant === 'complete' ? 'currentColor' : 'none'} /> : marker}</span>
    <div><strong>{title}</strong><span>{subtitle}</span></div>
  </div>
);
