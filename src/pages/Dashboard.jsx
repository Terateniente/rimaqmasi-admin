import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { ModernPageSkeleton } from '../components/ModernPageSkeleton';
import { Menu } from 'lucide-react';

export const Dashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('rq_admin_sidebar_collapsed') === 'true'
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('rq_admin_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Cerrar menú móvil al cambiar de tamaño a escritorio
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  return (
    <div className="rq-app-shell" style={{ 
      minHeight: '100dvh', 
      backgroundColor: 'var(--color-surface-container-low)',
      display: 'flex',
      position: 'relative'
    }}>
      <a className="rq-skip-link" href="#admin-main-content">Saltar al contenido</a>
      {/* Overlay para móviles */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className="rq-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Cerrar menú de navegación"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: 0,
            padding: 0,
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Contenido Principal */}
      <main id="admin-main-content" className={`rq-main ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`} tabIndex="-1" style={{ 
        flex: 1, 
        minWidth: 0,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Menu Hamburger Solo Mobile (Flotante) */}
        <button 
          className="hamburger-btn"
          onClick={() => {
            setIsSidebarCollapsed(false);
            setIsMobileMenuOpen(true);
          }}
          aria-label="Abrir menú de navegación"
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-sidebar"
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'var(--color-surface)', 
            border: '1px solid var(--color-surface-variant)', 
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer', 
            display: 'none', // oculto por defecto, visible en CSS para móviles
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-on-surface-variant)',
            zIndex: 10,
            boxShadow: 'var(--shadow-level-1)'
          }}
        >
          <Menu size={24} />
        </button>

        {/* Contenido Dinámico de la Página con Skeleton Loading */}
        <Suspense fallback={
          <div style={{ padding: '24px 32px', width: '100%', boxSizing: 'border-box' }}>
            <ModernPageSkeleton cards={4} />
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
