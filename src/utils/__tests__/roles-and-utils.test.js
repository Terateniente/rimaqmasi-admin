import { describe, it, expect } from 'vitest';
import { normalizeRole, isSuperAdmin, isAdmin, isAllowedInAdminPanel } from '../roles';
import { COLOR_FAMILIES, PREDEFINED_COLORS, getColorFamilyTones, getColorByOrder } from '../colorPalette';
import { matchesSearch } from '../searchUtils';

describe('roles utils', () => {
  it('normaliza variantes de roles administrativos y estudiantiles', () => {
    expect(normalizeRole('SUPER')).toBe('super_admin');
    expect(normalizeRole('superadmin')).toBe('super_admin');
    expect(normalizeRole('Super Admi')).toBe('super_admin');
    expect(normalizeRole('Administrador')).toBe('admin');
    expect(normalizeRole('alumno')).toBe('estudiante');
    expect(normalizeRole('student')).toBe('estudiante');
    expect(normalizeRole('')).toBe('');
  });

  it('determina permisos del panel administrativo correctamente', () => {
    expect(isSuperAdmin({ rol: 'super_admin' })).toBe(true);
    expect(isSuperAdmin({ rol: 'admin' })).toBe(false);
    expect(isAdmin({ rol: 'administrador' })).toBe(true);

    expect(isAllowedInAdminPanel({ rol: 'super_admin' })).toBe(true);
    expect(isAllowedInAdminPanel({ rol: 'admin' })).toBe(true);
    expect(isAllowedInAdminPanel({ rol: 'alumno' })).toBe(false);
    expect(isAllowedInAdminPanel({ rol: 'estudiante' })).toBe(false);
    expect(isAllowedInAdminPanel(null)).toBe(false);
  });
});

describe('colorPalette utils', () => {
  it('expone 48 colores predefinidos intercalados en 8 familias', () => {
    expect(Object.keys(COLOR_FAMILIES)).toHaveLength(8);
    expect(PREDEFINED_COLORS).toHaveLength(48);
  });

  it('encuentra la familia tonal más cercana y selecciona por orden cíclico', () => {
    expect(getColorFamilyTones('#15803d')).toEqual(COLOR_FAMILIES.verde);
    expect(getColorFamilyTones('#1d4ed8')).toEqual(COLOR_FAMILIES.azul);
    expect(getColorFamilyTones('invalid')).toEqual(COLOR_FAMILIES.rojo);

    expect(getColorByOrder('#b91c1c', 1)).toBe(COLOR_FAMILIES.rojo[0]);
    expect(getColorByOrder('#b91c1c', 6)).toBe(COLOR_FAMILIES.rojo[5]);
    expect(getColorByOrder('#b91c1c', 7)).toBe(COLOR_FAMILIES.rojo[0]);
  });
});

describe('searchUtils', () => {
  it('coincide texto ignorando tildes, mayúsculas y espacios extra', () => {
    expect(matchesSearch('Quechua Sureño desde Español', 'sureno')).toBe(true);
    expect(matchesSearch('Introducción al quechua', 'INTRODUCCION')).toBe(true);
    expect(matchesSearch('Mi familia', '')).toBe(true);
    expect(matchesSearch('Mi familia', 'verbos')).toBe(false);
    expect(matchesSearch(null, 'algo')).toBe(false);
  });
});
