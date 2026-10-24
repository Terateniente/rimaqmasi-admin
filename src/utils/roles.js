export const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase().replaceAll(' ', '_');
  if (value === 'super' || value === 'superadmin' || value === 'super_admi') return 'super_admin';
  if (value === 'administrador') return 'admin';
  if (value === 'student') return 'estudiante';
  return value;
};

export const isSuperAdmin = (user) => {
  return normalizeRole(user?.rol) === 'super_admin';
};

export const isAdmin = (user) => {
  return normalizeRole(user?.rol) === 'admin';
};
