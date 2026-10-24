const byOrder = (a, b) =>
  Number(a?.orden_clasificacion ?? a?.orden ?? 0) -
  Number(b?.orden_clasificacion ?? b?.orden ?? 0);

const displayOrder = (item, fallback) =>
  Number(item?.orden_clasificacion ?? item?.orden ?? fallback);

const statusLabel = (item) =>
  item?.activo === false || item?.estado === 'inactivo' ? 'Inactivo' : 'Activo';

const compactText = (value, fallback = '—') => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
};

const FALLBACK_UNIT_COLORS = ['#8B2635', '#315C8C', '#2F766D', '#8A5A20', '#6C4A8E', '#426A3A'];

const parseHexColor = (value, fallback) => {
  const normalized = String(value || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
};

const mixWithWhite = (rgb, amount = 0.9) =>
  rgb.map((channel) => Math.round(channel + (255 - channel) * amount));

const buildRows = (unidades) => {
  const rows = [];

  unidades.forEach((unidad, unidadIndex) => {
    const sesiones = [...(unidad.sesiones || [])].sort(byOrder);
    const unitColor = parseHexColor(
      unidad.color,
      parseHexColor(FALLBACK_UNIT_COLORS[unidadIndex % FALLBACK_UNIT_COLORS.length], [139, 38, 53])
    );
    const softColor = mixWithWhite(unitColor, 0.91);
    const unidadLabel = `${displayOrder(unidad, unidadIndex + 1)}. ${compactText(
      unidad.titulo || unidad.nombre,
      'Unidad sin título'
    )}\n${compactText(unidad.categoria_nivel || unidad.nivel, 'Sin nivel')} · ${statusLabel(unidad)}`;

    const unitRowCount = sesiones.length === 0
      ? 1
      : sesiones.reduce(
          (total, sesion) => total + Math.max((sesion.lecciones || []).length, 1),
          0
        );
    const unitCell = {
      content: unidadLabel,
      rowSpan: unitRowCount,
      styles: {
        fillColor: unitColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        valign: 'middle',
      },
    };

    if (sesiones.length === 0) {
      rows.push([
        unitCell,
        { content: 'Sin sesiones', styles: { fillColor: softColor } },
        { content: '—', styles: { fillColor: softColor } },
        { content: '—', styles: { fillColor: softColor } },
        { content: '—', styles: { fillColor: softColor } },
        { content: statusLabel(unidad), styles: { fillColor: softColor } },
      ]);
      return;
    }

    let primeraFilaUnidad = true;
    sesiones.forEach((sesion, sesionIndex) => {
      const lecciones = [...(sesion.lecciones || [])].sort(byOrder);
      const sesionLabel = `${displayOrder(sesion, sesionIndex + 1)}. ${compactText(
        sesion.titulo,
        'Sesión sin título'
      )} · ${statusLabel(sesion)}`;
      const sessionCell = {
        content: sesionLabel,
        rowSpan: Math.max(lecciones.length, 1),
        styles: {
          fillColor: mixWithWhite(unitColor, 0.82),
          textColor: unitColor,
          fontStyle: 'bold',
          valign: 'middle',
        },
      };

      if (lecciones.length === 0) {
        rows.push([
          ...(primeraFilaUnidad ? [unitCell] : []),
          sessionCell,
          { content: 'Sin lecciones', styles: { fillColor: softColor } },
          { content: '—', styles: { fillColor: softColor } },
          { content: '—', styles: { fillColor: softColor } },
          { content: statusLabel(sesion), styles: { fillColor: softColor } },
        ]);
        primeraFilaUnidad = false;
        return;
      }

      lecciones.forEach((leccion, leccionIndex) => {
        rows.push([
          ...(primeraFilaUnidad && leccionIndex === 0 ? [unitCell] : []),
          ...(leccionIndex === 0 ? [sessionCell] : []),
          {
            content: `${displayOrder(leccion, leccionIndex + 1)}. ${compactText(
              leccion.titulo,
              'Lección sin título'
            )}`,
            styles: { fillColor: softColor },
          },
          { content: compactText(leccion.descripcion), styles: { fillColor: softColor } },
          {
            content: String(leccion.xp_recompensa_base ?? leccion.xp_recompensa ?? 0),
            styles: { fillColor: softColor },
          },
          { content: statusLabel(leccion), styles: { fillColor: softColor } },
        ]);
        primeraFilaUnidad = false;
      });
    });
  });

  return rows.length > 0
    ? rows
    : [['Sin unidades registradas', '—', '—', '—', '—', '—']];
};

const safeFilePart = (value) =>
  compactText(value, 'curso')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const getImageDimensions = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = dataUrl;
  });

const loadCoverImage = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await readBlobAsDataUrl(blob);
    const dimensions = await getImageDimensions(dataUrl);
    const format = blob.type.includes('png')
      ? 'PNG'
      : blob.type.includes('webp')
        ? 'WEBP'
        : 'JPEG';
    return { dataUrl, format, ...dimensions };
  } catch {
    return null;
  }
};

const drawContainedImage = (doc, image, x, y, width, height) => {
  const scale = Math.min(width / image.width, height / image.height);
  const renderedWidth = image.width * scale;
  const renderedHeight = image.height * scale;
  doc.addImage(
    image.dataUrl,
    image.format,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight
  );
};

import { drawWhitePdfLogo, loadWhitePdfLogo } from './pdfBranding.js';

export const generateCurriculumPdf = async ({ curso, unidades, generatedBy, portadaUrl }) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const whiteLogo = await loadWhitePdfLogo();
  const coverImage = await loadCoverImage(portadaUrl);
  const courseName = compactText(curso?.nombre, 'Curso sin nombre');
  const origen = compactText(
    curso?.idioma_origen?.nombre || curso?.idioma_origen_nombre,
    'Idioma de origen'
  );
  const destino = compactText(
    curso?.idioma_destino?.nombre || curso?.idioma_destino_nombre,
    'Idioma de destino'
  );
  const orderedUnidades = [...(unidades || [])].sort(byOrder);
  const sesiones = orderedUnidades.flatMap((unidad) => unidad.sesiones || []);
  const lecciones = sesiones.flatMap((sesion) => sesion.lecciones || []);
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedByName = [generatedBy?.nombre, generatedBy?.apellido]
    .filter(Boolean)
    .join(' ');

  doc.setProperties({
    title: `Malla curricular: ${origen} - ${destino}`,
    subject: 'Malla curricular del curso',
    author: generatedByName || 'RIMAQMASI',
    creator: 'RIMAQMASI',
  });

  doc.setFillColor(91, 32, 38);
  doc.rect(0, 0, pageWidth, 44, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 7, 38, 30, 2, 2, 'F');
  if (coverImage) {
    try {
      drawContainedImage(doc, coverImage, 15.5, 8.5, 35, 27);
    } catch {
      // Si el navegador no soporta el formato, el PDF continúa con el recuadro.
    }
  } else {
    doc.setTextColor(91, 32, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(courseName.charAt(0).toUpperCase(), 33, 26, { align: 'center' });
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  drawWhitePdfLogo(doc, whiteLogo, 59, 3, 48);
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(courseName, pageWidth - 75);
  doc.text(titleLines.slice(0, 2), 59, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const subtitleY = Math.min(35, 22 + titleLines.slice(0, 2).length * 7);
  doc.text(`${origen}  →  ${destino}   ·   Nivel ${compactText(curso?.nivel, '—')}`, 59, subtitleY);

  doc.setTextColor(35, 35, 35);
  doc.setFontSize(9);
  const generatedAt = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
  doc.text(`Generado: ${generatedAt}`, 14, 50);
  doc.text(`Estado del curso: ${statusLabel(curso)}`, 14, 56);
  if (generatedByName) {
    doc.text(`Responsable: ${generatedByName}`, pageWidth - 14, 50, { align: 'right' });
  }

  const summary = [
    ['Unidades', orderedUnidades.length],
    ['Sesiones', sesiones.length],
    ['Lecciones', lecciones.length],
    ['XP total', lecciones.reduce((sum, leccion) => sum + Number(leccion.xp_recompensa_base || 0), 0)],
  ];

  summary.forEach(([label, value], index) => {
    const x = 100 + index * 45;
    doc.setFillColor(247, 242, 242);
    doc.roundedRect(x, 48, 39, 14, 2, 2, 'F');
    doc.setTextColor(179, 38, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(value), x + 4, 54);
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, x + 4, 59);
  });

  autoTable(doc, {
    startY: 68,
    head: [['Unidad / nivel', 'Sesión', 'Lección', 'Descripción', 'XP', 'Estado']],
    body: buildRows(orderedUnidades),
    theme: 'grid',
    margin: { top: 16, right: 14, bottom: 16, left: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [91, 32, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 248, 248] },
    columnStyles: {
      0: { cellWidth: 43, fontStyle: 'bold', textColor: [91, 32, 38] },
      1: { cellWidth: 49 },
      2: { cellWidth: 52 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 199, pageWidth - 14, 199);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('RIMAQMASI - Sistema de aprendizaje de idiomas', 14, 204);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 14, 204, { align: 'right' });
  }

  const fileName = `malla-curricular-${safeFilePart(origen)}-${safeFilePart(destino)}.pdf`;
  doc.save(fileName);
  return fileName;
};
