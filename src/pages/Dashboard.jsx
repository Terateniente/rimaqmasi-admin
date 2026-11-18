import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, ChevronRight } from 'lucide-react';
import { Sidebar, findNavTrail } from '../components/Sidebar';
import { ModernPageSkeleton } from '../components/ModernPageSkeleton';

const MOBILE_QUERY = '(max-width: 768px)';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
};

const Topbar = ({ onOpenMenu, isMenuOpen }) => {
  const trail = findNavTrail(useLocation().pathname);
  const showGroup = trail && trail.group.subItems.length > 1;

  return (
    <header className="rq-topbar">
      <button
        type="button"
        className="rq-topbar__menu"
        onClick={onOpenMenu}
        aria-label="Abrir menú de navegación"
        aria-expanded={isMenuOpen}
        aria-controls="admin-sidebar"
      >
        <Menu size={20} />
      </button>
      {trail && (
        <nav aria-label="Ruta de navegación">
          <ol className="rq-breadcrumb">
            {showGroup && (
              <li>
                {trail.group.title}
                <ChevronRight size={14} aria-hidden="true" />
              </li>
            )}
            <li aria-current="page">{showGroup ? trail.sub.title : trail.group.title}</li>
          </ol>
        </nav>
      )}
    </header>
  );
};

export const Dashboard = () => {
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('rq_admin_sidebar_collapsed') === 'true'
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('rq_admin_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobile) setIsMobileMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsMobileMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  return (
    <div className="rq-app-shell">
      <a className="rq-skip-link" href="#admin-main-content">Saltar al contenido</a>
      {isMobileMenuOpen && (
        <button
          type="button"
          className="rq-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Cerrar menú de navegación"
        />
      )}

      <Sidebar
        isCollapsed={isSidebarCollapsed && !isMobile}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main id="admin-main-content" className="rq-main" tabIndex="-1">
        <Topbar onOpenMenu={() => setIsMobileMenuOpen(true)} isMenuOpen={isMobileMenuOpen} />
        <div className="rq-content">
          <Suspense fallback={<div><ModernPageSkeleton cards={4} /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};
