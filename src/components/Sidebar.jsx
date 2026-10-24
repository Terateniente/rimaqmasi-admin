import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSuperAdmin, normalizeRole } from '../utils/roles';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileQuestion, 
  BookType, 
  Trophy, 
  LineChart, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProfileModal } from './ProfileModal';
import './Sidebar.css';

export const MENU_ITEMS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    subItems: [
      { title: 'Resumen General', path: '/dashboard' },
      { title: 'Actividad Reciente', path: '/dashboard/actividad', requireSuper: true },
    ]
  },
  {
    id: 'usuarios',
    title: 'Gestión de Usuarios',
    icon: Users,
    requireSuper: true,
    subItems: [
      { title: 'Usuarios', path: '/usuarios' },
    ]
  },
  {
    id: 'academica',
    title: 'Gestión Académica',
    icon: GraduationCap,
    subItems: [
      { title: 'Idiomas', path: '/academica/idiomas' },
      { title: 'Cursos', path: '/academica/cursos' },
      { title: 'Unidades', path: '/academica/unidads' },
      { title: 'Sesiones', path: '/academica/sesiones' },
      { title: 'Lecciones', path: '/academica/lecciones' },
      { title: 'Matrículas', path: '/academica/matriculas' },
    ]
  },
  {
    id: 'evaluaciones',
    title: 'Evaluaciones',
    icon: FileQuestion,
    subItems: [
      { title: 'Gestión de Retos', path: '/evaluaciones/retos' },
    ]
  },
  {
    id: 'diccionario',
    title: 'Diccionario',
    icon: BookType,
    subItems: [
      { title: 'Categorías', path: '/diccionario/categorias' },
      { title: 'Palabras', path: '/diccionario/palabras' },
      { title: 'Aportes', path: '/diccionario/aportes' },
    ]
  },
  {
    id: 'gamificacion',
    title: 'Gamificación',
    icon: Trophy,
    subItems: [
      { title: 'Logros', path: '/gamificacion/logros' },
      { title: 'Vidas y rachas', path: '/gamificacion/rachas', requireSuper: true },
    ]
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: LineChart,
    subItems: [
      { title: 'Usuarios', path: '/reportes/usuarios' },
      { title: 'Cursos', path: '/reportes/cursos' },
      { title: 'Aprendizaje', path: '/reportes/aprendizaje' },
      { title: 'Matrículas', path: '/reportes/matriculas' },
      { title: 'Diccionario', path: '/reportes/diccionario' },
      { title: 'Exportaciones', path: '/reportes/exportaciones' },
    ]
  }
];

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, logoutAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('rq_admin_theme') === 'dark');
  const isSuper = isSuperAdmin(user);

  const filteredMenuItems = MENU_ITEMS.filter(item => !item.requireSuper || isSuper)
    .map(item => ({
      ...item,
      subItems: item.subItems.filter(sub => !sub.requireSuper || isSuper)
    }));

  const toggleMenu = (menuId) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  const navigateFromMenu = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const isItemActive = (path) => {
    return location.pathname === path;
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const baseUrl = API_URL.replace('/api/v1', '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${baseUrl}${cleanPath}` : `${baseUrl}/public${cleanPath}`;
  };

  const roleLabels = {
    super_admin: { label: 'Super Admin', color: 'var(--color-primary)' },
    admin: { label: 'Admin', color: 'var(--color-secondary)' },
    profesor: { label: 'Profesor', color: 'var(--color-tertiary)' },
    estudiante: { label: 'Estudiante', color: 'var(--color-outline)' },
    cajero: { label: 'Cajero', color: 'var(--color-tertiary)' }
  };

  const roleInfo = roleLabels[user?.rol] || { label: user?.rol || 'Rol', color: 'var(--color-primary)' };

  useEffect(() => {
    const activeGroup = filteredMenuItems.find((item) =>
      item.subItems.some((sub) => sub.path === location.pathname)
    );
    if (activeGroup) setExpandedMenu(activeGroup.id);
  }, [location.pathname, isSuper]);

  const normalizedRole = normalizeRole(user?.rol);
  const normalizedRoleInfo = roleLabels[normalizedRole] || roleInfo;
  const avatarUrl = getImageUrl(user?.url_foto_perfil);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rq_admin_theme', theme);
  }, [isDarkMode]);

  return (
    <>
    {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    <aside 
      id="admin-sidebar"
      className={`rq-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'open' : ''}`}
      aria-label="Navegación principal"
    >
      {/* Botón de Colapsar / Expandir */}
      <button 
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="sidebar-toggle-btn"
        aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        aria-expanded={!isCollapsed}
      >
        <ChevronRight size={16} className={isCollapsed ? '' : 'is-expanded'} />
      </button>

      {/* Perfil del administrador */}
      <button
        type="button"
        className={`sidebar-profile-card ${isCollapsed ? 'collapsed' : ''}`}
        onClick={() => setIsProfileModalOpen(true)}
        aria-label="Abrir mi perfil"
        title={isCollapsed ? 'Mi perfil' : ''}
      >
        <div className="sidebar-avatar-ring">
          <div className="sidebar-avatar-inner">
            {avatarUrl && !avatarLoadFailed ? (
              <img src={avatarUrl} alt={`Foto de ${user?.nombres || 'usuario'}`} className="sidebar-avatar-img" crossOrigin="anonymous" onError={() => setAvatarLoadFailed(true)} />
            ) : (
              <span className="sidebar-avatar-fallback">
                {(user?.nombres || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="sidebar-avatar-status" aria-hidden="true" />
        </div>
        
        <div className={`sidebar-profile-info ${isCollapsed ? 'collapsed' : ''}`}>
          <h2 className="sidebar-user-name">
            {`${user?.nombres || ''} ${user?.apellidos || ''}`.trim() || 'Administrador'}
          </h2>
          <p className="sidebar-user-email">{user?.correo || 'Cuenta administrativa'}</p>
          <div className="sidebar-user-role" style={{ color: normalizedRoleInfo.color }}>
            <ShieldCheck size={12} strokeWidth={2.5} />
            {normalizedRoleInfo.label}
          </div>
        </div>
      </button>

      {/* Navegación */}
      <nav className="sidebar-nav no-scrollbar">
        <p className="sidebar-section-label">Navegación</p>
        {filteredMenuItems.map((item) => {
          const isExpanded = expandedMenu === item.id;
          const isActiveGroup = item.subItems.some(sub => isItemActive(sub.path)) || (isCollapsed ? false : false);

          return (
            <div key={item.id} className="sidebar-nav-group">
              
              {/* Item Principal */}
              <button 
                type="button"
                onClick={() => toggleMenu(item.id)}
                title={isCollapsed ? item.title : ""}
                className={`sidebar-nav-item ${isCollapsed ? 'collapsed' : ''} ${isActiveGroup ? 'active' : ''}`}
                aria-label={isCollapsed ? item.title : undefined}
                aria-expanded={!isCollapsed ? isExpanded : undefined}
                aria-controls={!isCollapsed ? `sidebar-group-${item.id}` : undefined}
              >
                <div className="sidebar-nav-item-icon-wrapper">
                  <item.icon size={20} strokeWidth={isActiveGroup ? 2.5 : 2} />
                  <span className="sidebar-nav-item-text">{item.title}</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`sidebar-nav-chevron ${isExpanded ? 'is-expanded' : ''}`}
                />
              </button>

              {/* Sub-Items */}
              {!isCollapsed && isExpanded && (
                <div id={`sidebar-group-${item.id}`} className="sidebar-submenu">
                  {item.subItems.map((sub, idx) => {
                    const active = isItemActive(sub.path);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => navigateFromMenu(sub.path)}
                        className={`sidebar-subitem ${active ? 'active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                      >
                        {sub.title}
                      </button>
                    )
                  })}
                </div>
              )}

            </div>
          )
        })}
      </nav>

      {/* Apariencia, perfil y sesión */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-footer-action sidebar-theme-action"
          onClick={() => setIsDarkMode((current) => !current)}
          title={isCollapsed ? (isDarkMode ? 'Usar modo claro' : 'Usar modo oscuro') : ''}
          aria-label={isDarkMode ? 'Usar modo claro' : 'Usar modo oscuro'}
          aria-pressed={isDarkMode}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span className="sidebar-footer-text">{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
          <span className={`sidebar-switch ${isDarkMode ? 'is-on' : ''}`} aria-hidden="true"><i /></span>
        </button>

        <button 
          type="button"
          onClick={logoutAuth}
          title={isCollapsed ? 'Cerrar Sesión' : ''}
          aria-label="Cerrar sesión"
          className="sidebar-footer-action sidebar-logout-action"
        >
          <LogOut size={20} />
          <span className="sidebar-footer-text">Cerrar sesión</span>
        </button>
      </div>

    </aside>
    </>
  );
};
