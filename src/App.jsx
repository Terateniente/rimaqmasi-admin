import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'sonner';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Toaster
          richColors
          position="top-center"
          offset={14}
          gap={8}
          visibleToasts={3}
          duration={3500}
          closeButton
          toastOptions={{
            style: {
              fontSize: '13.5px',
              padding: '11px 14px',
              fontWeight: '600',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-level-2)',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
