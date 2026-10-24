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
          position="top-right" 
          toastOptions={{
            style: { fontSize: '15px', padding: '14px 18px', fontWeight: '600' }
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
