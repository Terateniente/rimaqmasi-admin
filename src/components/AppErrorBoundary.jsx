import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class AppErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error de interfaz no controlado', error, info);

    const message = String(error?.message || error || '');
    const isStaleModuleError = /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk/i.test(message);

    if (isStaleModuleError) {
      const recoveryKey = 'rq_admin_module_recovery_at';
      const lastRecovery = Number(sessionStorage.getItem(recoveryKey) || 0);

      if (Date.now() - lastRecovery > 30_000) {
        sessionStorage.setItem(recoveryKey, String(Date.now()));
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="rq-fatal-error">
        <section role="alert" aria-labelledby="fatal-error-title">
          <span className="rq-fatal-error__icon" aria-hidden="true"><AlertTriangle size={28} /></span>
          <p className="rq-fatal-error__eyebrow">Panel de administración</p>
          <h1 id="fatal-error-title">No pudimos mostrar esta pantalla</h1>
          <p>Tu sesión sigue protegida. Recarga el panel para intentarlo nuevamente.</p>
          <button type="button" onClick={this.handleRetry}>
            <RefreshCw size={18} aria-hidden="true" />
            Recargar panel
          </button>
        </section>
      </main>
    );
  }
}
