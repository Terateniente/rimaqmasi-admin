import { useLocation } from 'react-router-dom';
import { MENU_ITEMS } from '../components/Sidebar';
import { ModernPageSkeleton } from '../components/ModernPageSkeleton';

export const DashboardPlaceholder = () => {
  const location = useLocation();

  let activeTitle = 'Módulo en Construcción';
  MENU_ITEMS.forEach(group => {
    group.subItems.forEach(sub => {
      if (sub.path === location.pathname) {
        activeTitle = sub.title;
      }
    });
  });

  return (
    <div style={{ 
      padding: '24px 32px', 
      overflowY: 'auto', 
      flex: 1, 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ 
          color: 'var(--color-on-surface)', 
          fontSize: '24px', 
          fontWeight: 700,
          margin: '0 0 6px 0'
        }}>
          {activeTitle}
        </h1>
        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '14px' }}>
          Cargando componentes y datos del módulo…
        </p>
      </div>
      <ModernPageSkeleton cards={4} showHeading={false} />
    </div>
  );
};
