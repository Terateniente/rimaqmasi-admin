import api from './api';

export const getAdminAnalytics = async (days = 30) => {
  const response = await api.get(`/admin/analytics/overview?days=${encodeURIComponent(days)}`);
  return response.data.data;
};

export const getAdminExport = async (dataset, days = 30) => {
  const response = await api.get(`/admin/analytics/export/${encodeURIComponent(dataset)}?days=${encodeURIComponent(days)}`);
  return response.data.data;
};

const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
export const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const content = [headers.map(csvCell).join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
};
