import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, FileQuestion, BookType, Trophy, LineChart,
  LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen, X, Moon, Sun,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isSuperAdmin, normalizeRole } from '../utils/roles';
import { ProfileModal } from './ProfileModal';
import { resolveMediaUrl } from '../services/api';
import './Sidebar.css';

export const MENU_ITEMS = [
  {
    id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard,
    subItems: [
      { title: 'Resumen General', path: '/dashboard' },
      { title: 'Actividad Reciente', path: '/dashboard/actividad', requireSuper: true },
    ],
  },
  {
    id: 'usuarios', title: 'Usuarios', icon: Users, requireSuper: true,
    subItems: [{ title: 'Usuarios', path: '/usuarios' }],
  },
  {
    id: 'academica', title: 'Gestión Académica', icon: GraduationCap,
    subItems: [
      { title: 'Idiomas', path: '/academica/idiomas' },
      { title: 'Cursos', path: '/academica/cursos' },
      { title: 'Unidades', path: '/academica/unidads' },
      { title: 'Sesiones', path: '/academica/sesiones' },
      { title: 'Lecciones', path: '/academica/lecciones' },
      { title: 'Matrículas', path: '/academica/matriculas' },
    ],
  },
  {
    id: 'evaluaciones', title: 'Evaluaciones', icon: FileQuestion,
    subItems: [{ title: 'Gestión de Retos', path: '/evaluaciones/retos' }],
  },
  {
    id: 'diccionario', title: 'Diccionario', icon: BookType,
    subItems: [
      { title: 'Categorías', path: '/diccionario/categorias' },
      { title: 'Palabras', path: '/diccionario/palabras' },
      { title: 'Aportes', path: '/diccionario/aportes' },
    ],
  },
  {
    id: 'gamificacion', title: 'Gamificación', icon: Trophy,
    subItems: [
      { title: 'Logros', path: '/gamificacion/logros' },
      { title: 'Vidas y rachas', path: '/gamificacion/rachas', requireSuper: true },
    ],
  },
  {
    id: 'reportes', title: 'Reportes', icon: LineChart,
    subItems: [
      { title: 'Usuarios', path: '/reportes/usuarios' },
      { title: 'Cursos', path: '/reportes/cursos' },
      { title: 'Aprendizaje', path: '/reportes/aprendizaje' },
      { title: 'Matrículas', path: '/reportes/matriculas' },
      { title: 'Diccionario', path: '/reportes/diccionario' },
      { title: 'Exportaciones', path: '/reportes/exportaciones' },
    ],
  },
];

/** Grupo y sub-ítem que corresponden a la ruta actual (incluye rutas hijas como /diccionario/palabras/:id). */
export const findNavTrail = (pathname) => {
  for (const group of MENU_ITEMS) {
    const sub = group.subItems.find((s) => pathname === s.path)
      || group.subItems.find((s) => s.path !== '/dashboard' && pathname.startsWith(`${s.path}/`));
    if (sub) return { group, sub };
  }
  return null;
};

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', estudiante: 'Estudiante', cajero: 'Cajero' };

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, logoutAuth } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isSuper = isSuperAdmin(user);
  const [expandedMenu, setExpandedMenu] = useState(() => findNavTrail(pathname)?.group.id ?? 'dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('rq_admin_theme') !== 'light');

  const menu = MENU_ITEMS.filter((item) => !item.requireSuper || isSuper)
    .map((item) => ({ ...item, subItems: item.subItems.filter((sub) => !sub.requireSuper || isSuper) }));
  const activeGroupId = findNavTrail(pathname)?.group.id;
  const avatarUrl = resolveMediaUrl(user?.url_foto_perfil);
  const fullName = `${user?.nombres || ''} ${user?.apellidos || ''}`.trim() || 'Administrador';
  const role = normalizeRole(user?.rol);
  const closeMobile = () => setIsMobileMenuOpen(false);

  useEffect(() => { if (activeGroupId) setExpandedMenu(activeGroupId); }, [activeGroupId]);
  useEffect(() => setAvatarLoadFailed(false), [avatarUrl]);
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rq_admin_theme', theme);
  }, [isDarkMode]);

  const leafClass = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`;

  return (
    <>
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
      <aside
        id="admin-sidebar"
        className={`rq-sidebar${isCollapsed ? ' collapsed' : ''}${isMobileMenuOpen ? ' open' : ''}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-header">
          <Link
            to="/dashboard"
            className="sidebar-brand"
            onClick={closeMobile}
            aria-label={isCollapsed ? 'RimaqMasi Panel administrativo, ir al inicio' : undefined}
            title="Ir al inicio"
          >
            <img src="/favicon.svg" alt="" className="sidebar-brand-mark" />
            <span className="sidebar-brand-text">
              <strong>RimaqMasi</strong>
              <small>Panel administrativo</small>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-icon-btn sidebar-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          {isMobileMenuOpen && (
            <button type="button" className="sidebar-icon-btn" onClick={closeMobile} aria-label="Cerrar menú de navegación">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav no-scrollbar">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActiveGroup = item.id === activeGroupId;

            // Grupo de un solo destino: enlace directo, sin acordeón.
            if (item.subItems.length === 1) {
              return (
                <NavLink
                  key={item.id}
                  to={item.subItems[0].path}
                  end
                  className={({ isActive }) => `sidebar-nav-item${isActive || isActiveGroup ? ' active' : ''}`}
                  onClick={closeMobile}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon size={19} />
                  <span className="sidebar-nav-label">{item.title}</span>
                </NavLink>
              );
            }

            const isExpanded = !isCollapsed && expandedMenu === item.id;
            return (
              <div key={item.id} className="sidebar-nav-group">
                <button
                  type="button"
                  className={`sidebar-nav-item${isActiveGroup ? ' is-current' : ''}${isCollapsed && isActiveGroup ? ' active' : ''}`}
                  onClick={() => (isCollapsed
                    ? navigate(item.subItems[0].path)
                    : setExpandedMenu(isExpanded ? null : item.id))}
                  title={isCollapsed ? item.title : undefined}
                  aria-expanded={isCollapsed ? undefined : isExpanded}
                  aria-controls={isCollapsed ? undefined : `sidebar-group-${item.id}`}
                >
                  <Icon size={19} />
                  <span className="sidebar-nav-label">{item.title}</span>
                  <ChevronDown size={16} className={`sidebar-nav-chevron${isExpanded ? ' is-expanded' : ''}`} aria-hidden="true" />
                </button>
                {isExpanded && (
                  <div id={`sidebar-group-${item.id}`} className="sidebar-submenu">
                    {item.subItems.map((sub) => (
                      <NavLink key={sub.path} to={sub.path} end={sub.path === '/dashboard'} className={leafClass} onClick={closeMobile}>
                        {sub.title}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-profile"
            onClick={() => setIsProfileModalOpen(true)}
            title={`${fullName} · Abrir mi perfil`}
            aria-label={isCollapsed ? `Abrir mi perfil (${fullName})` : undefined}
          >
            <span className="sidebar-avatar" aria-hidden="true">
              {avatarUrl && !avatarLoadFailed
                ? <img src={avatarUrl} alt="" crossOrigin="anonymous" onError={() => setAvatarLoadFailed(true)} />
                : (user?.nombres || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="sidebar-profile-text">
              <strong>{fullName}</strong>
              <small>{ROLE_LABELS[role] || user?.rol || 'Rol'}</small>
            </span>
          </button>
          <div className="sidebar-footer-actions">
            <button
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              className="sidebar-icon-btn"
              onClick={() => setIsDarkMode((v) => !v)}
              aria-label="Modo oscuro"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button type="button" className="sidebar-icon-btn sidebar-logout" onClick={logoutAuth} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
