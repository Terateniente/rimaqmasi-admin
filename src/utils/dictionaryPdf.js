import {
  findIdioma,
  getIdiomaNombre,
  getUserDisplayName,
  getWordTranslations,
} from './dictionaryViewUtils.js';
import { drawWhitePdfLogo, loadWhitePdfLogo } from './pdfBranding.js';

const compactText = (value, fallback = '—') => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
};

const statusLabels = {
  publicado: 'Publicado',
  revision: 'En revisión',
  borrador: 'Borrador',
  archivado: 'Archivado',
};

const getCategoryNames = (word) => {
  const categories = word?.categorias?.length
    ? word.categorias
    : word?.categoria
      ? [word.categoria]
      : [];
  return categories.map((category) => category.nombre).filter(Boolean).join(', ') || '—';
};

const getTranslations = (word, idiomas) => {
  const translations = getWordTranslations(word, idiomas);
  if (translations.length === 0) return '—';
  return translations.map((translation, index) => {
    const languageName = getIdiomaNombre(translation.idioma, 'Idioma no indicado');
    const description = compactText(translation.definicion, '');
    const context = description
      && description.toLocaleLowerCase('es') !== translation.termino?.toLocaleLowerCase('es')
      && !/^sin definici[oó]n$/iu.test(description)
      ? ` — ${compactText(translation.definicion)}`
      : '';
    return `${index + 1}. ${compactText(translation.termino)} [${languageName}]${context}`;
  }).join('\n');
};

const safeFilePart = (value) => compactText(value, 'todos')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

export const generateDictionaryPdf = async ({ palabras, idiomas, filtros = {} }) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const words = [...(palabras || [])].sort((a, b) =>
    compactText(a.termino, '').localeCompare(compactText(b.termino, ''), 'es', { sensitivity: 'base' })
  );
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const whiteLogo = await loadWhitePdfLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalTranslations = words.reduce(
    (total, word) => total + getWordTranslations(word, idiomas).length,
    0
  );
  const filterSummary = [
    filtros.idioma && `Idioma: ${filtros.idioma}`,
    filtros.estado && `Estado: ${filtros.estado}`,
    filtros.categoria && `Categoría: ${filtros.categoria}`,
    filtros.busqueda && `Búsqueda: “${filtros.busqueda}”`,
  ].filter(Boolean).join('  ·  ') || 'Sin filtros: listado completo';

  doc.setProperties({
    title: 'Diccionario RIMAQMASI',
    subject: 'Palabras y traducciones del diccionario',
    author: 'RIMAQMASI',
    creator: 'RIMAQMASI',
  });

  doc.setFillColor(185, 33, 46);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  drawWhitePdfLogo(doc, whiteLogo, 14, 4, 62);
  doc.setFontSize(22);
  doc.text('Diccionario y traducciones', 14, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(filterSummary, 14, 33);

  const generatedAt = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
  doc.setTextColor(55, 55, 55);
  doc.text(`Generado: ${generatedAt}`, 14, 45);

  [
    ['Palabras', words.length],
    ['Traducciones', totalTranslations],
    ['Con audio', words.filter((word) => Boolean(word.url_audio)).length],
  ].forEach(([label, value], index) => {
    const x = pageWidth - 143 + index * 44;
    doc.setFillColor(247, 242, 242);
    doc.roundedRect(x, 41, 39, 14, 2, 2, 'F');
    doc.setTextColor(185, 33, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(String(value), x + 4, 47);
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, x + 4, 52);
  });

  const rows = words.map((word, index) => {
    const language = findIdioma(idiomas, word.idioma_id ?? word.idiomas_id, word.idioma);
    return [
      String(index + 1),
      compactText(word.termino),
      getIdiomaNombre(language, 'Sin idioma'),
      getTranslations(word, idiomas),
      getCategoryNames(word),
      compactText(word.tipo_gramatical),
      compactText(word.transcripcion_fonetica),
      [word.url_audio ? 'Audio' : '', word.url_imagen ? 'Imagen' : ''].filter(Boolean).join(' + ') || '—',
      statusLabels[word.estado] || compactText(word.estado),
      getUserDisplayName(word.creadoPor || word.creado_por),
    ];
  });

  autoTable(doc, {
    startY: 61,
    head: [['N.°', 'Palabra', 'Idioma', 'Traducciones', 'Categoría', 'Tipo gramatical', 'Fonética', 'Multimedia', 'Estado', 'Creado por']],
    body: rows.length > 0 ? rows : [['—', 'No hay palabras para exportar', '—', '—', '—', '—', '—', '—', '—', '—']],
    theme: 'grid',
    margin: { top: 15, right: 10, bottom: 16, left: 10 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 2.1,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [185, 33, 46],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [250, 248, 248] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25, fontStyle: 'bold', textColor: [185, 33, 46] },
      2: { cellWidth: 20 },
      3: { cellWidth: 60 },
      4: { cellWidth: 28 },
      5: { cellWidth: 23 },
      6: { cellWidth: 30 },
      7: { cellWidth: 25, halign: 'center' },
      8: { cellWidth: 20, halign: 'center' },
      9: { cellWidth: 28 },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 220, 220);
    doc.line(10, 199, pageWidth - 10, 199);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('RIMAQMASI - Diccionario de idiomas', 10, 204);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 10, 204, { align: 'right' });
  }

  const suffix = filtros.idioma ? safeFilePart(filtros.idioma) : 'completo';
  const fileName = `diccionario-rimaqmasi-${suffix}.pdf`;
  doc.save(fileName);
  return fileName;
};
