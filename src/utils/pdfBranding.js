const WHITE_LOGO_URL = '/RimaqMasi%20EDU%20White.svg';
let whiteLogoPromise;

/**
 * Paleta oficial del sistema de diseño RimaqMasi EDU (variables.css / components.css) adaptada a PDF.
 */
export const PDF_THEME = Object.freeze({
  // Superficies
  WHITE: [255, 255, 255],
  SURFACE_LOW: [248, 250, 252],
  SURFACE_CONTAINER: [241, 245, 249],
  ROW_ALT: [250, 251, 253],

  // Bordes
  BORDER: [226, 232, 240],
  BORDER_STRONG: [203, 213, 225],

  // Texto
  TEXT_PRIMARY: [17, 24, 39],
  TEXT_BODY: [51, 65, 85],
  TEXT_SECONDARY: [71, 85, 105],
  TEXT_MUTED: [100, 116, 139],
  TEXT_SUBTLE: [148, 163, 184],

  // Acento institucional único
  PRIMARY: [185, 28, 44],
  PRIMARY_CONTAINER: [254, 242, 242],
  ON_PRIMARY_CONTAINER: [159, 22, 36],

  // Badges semánticos discretos (.rq-badge)
  SUCCESS_BG: [220, 252, 231],
  SUCCESS_TEXT: [20, 83, 45],
  WARNING_BG: [254, 243, 199],
  WARNING_TEXT: [120, 53, 15],
  SECONDARY_BG: [219, 234, 254],
  SECONDARY_TEXT: [10, 46, 92],
  NEUTRAL_BG: [241, 245, 249],
  NEUTRAL_TEXT: [71, 85, 105],
  DANGER_BG: [254, 226, 226],
  DANGER_TEXT: [153, 27, 27],
});

const WIN_ANSI_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6,
  0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c,
  0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
]);

/**
 * Normaliza caracteres fuera de WinAnsi para evitar glifos rotos en fuentes PDF estándar.
 */
export const sanitizePdfText = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u21D2/g, '=>')
    .replace(/[\u2713\u2714]/g, 'Si')
    .replace(/[\u2715\u2716\u2717]/g, 'No')
    .replace(/[\u2605\u2606]/g, '*')
    .replace(/\u00A0/g, ' ');

  let safe = '';
  for (const ch of normalized) {
    const code = ch.codePointAt(0);
    if (
      code === 0x0a
      || code === 0x0d
      || code === 0x09
      || (code >= 0x20 && code <= 0x7e)
      || (code >= 0xa0 && code <= 0xff)
      || WIN_ANSI_EXTRAS.has(code)
    ) {
      safe += ch;
    }
  }
  return safe;
};

export const compactText = (value, fallback = '—') => {
  const text = sanitizePdfText(value).replace(/\s+/g, ' ').trim();
  return text || fallback;
};

export const safeFilePart = (value, fallback = 'documento') =>
  compactText(value, fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || fallback;

export const formatGeneratedDate = (date = new Date()) => {
  const formatted = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return sanitizePdfText(formatted.replace(/\./g, ''));
};

export const parseHexColor = (value, fallback) => {
  const normalized = String(value || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return [0, 1, 2].map((i) => Number.parseInt(normalized[i] + normalized[i], 16));
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  }
  return fallback;
};

export const mixWithWhite = (rgb, amount = 0.9) =>
  rgb.map((channel) => Math.round(channel + (255 - channel) * amount));

export const mixWithColor = (rgbA, rgbB, ratio = 0.5) =>
  rgbA.map((channel, index) => Math.round(channel * (1 - ratio) + rgbB[index] * ratio));

export const getRelativeLuminance = ([r, g, b]) =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;

export const darkenForHeader = (rgb) => {
  let candidate = [...rgb];
  let step = 0;
  while (getRelativeLuminance(candidate) > 0.36 && step < 8) {
    candidate = mixWithColor(candidate, PDF_THEME.TEXT_PRIMARY, 0.22);
    step += 1;
  }
  return candidate;
};

export const loadWhitePdfLogo = () => {
  if (whiteLogoPromise) return whiteLogoPromise;

  whiteLogoPromise = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = image.naturalWidth / image.naturalHeight;
      canvas.width = 1400;
      canvas.height = Math.round(canvas.width / ratio);
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(null);
        return;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), ratio });
    };
    image.onerror = () => resolve(null);
    image.src = WHITE_LOGO_URL;
  });

  return whiteLogoPromise;
};

export const drawWhitePdfLogo = (doc, logo, x, y, width) => {
  if (!logo?.dataUrl || !logo.ratio) return false;
  doc.addImage(logo.dataUrl, 'PNG', x, y, width, width / logo.ratio, undefined, 'FAST');
  return true;
};

/**
 * Flecha vectorial sobria para rutas entre idiomas.
 */
export const drawVectorArrow = (doc, x, yCenter, color = PDF_THEME.TEXT_MUTED, length = 5) => {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.35);
  const lineEnd = x + length - 1.4;
  doc.line(x, yCenter, lineEnd, yCenter);
  doc.triangle(
    lineEnd,
    yCenter - 0.85,
    lineEnd,
    yCenter + 0.85,
    x + length,
    yCenter,
    'F'
  );
  return length;
};

/**
 * Resuelve colores semánticos discretos consistentes con .rq-badge (components.css).
 */
export const resolveBadgeTone = (rawValue) => {
  const val = compactText(rawValue, '').toLowerCase();
  if (['activo', 'publicado', 'completado', 'aprobado', 'sí', 'si'].includes(val)) {
    return { bg: PDF_THEME.SUCCESS_BG, color: PDF_THEME.SUCCESS_TEXT, dot: null };
  }
  if (['en revisión', 'en revision', 'revision', 'pendiente', 'proceso'].includes(val)) {
    return { bg: PDF_THEME.WARNING_BG, color: PDF_THEME.WARNING_TEXT, dot: null };
  }
  if (['rechazado', 'error', 'eliminado', 'bloqueado'].includes(val)) {
    return { bg: PDF_THEME.DANGER_BG, color: PDF_THEME.DANGER_TEXT, dot: null };
  }
  if (/^[abc][12]$/.test(val)) {
    if (val.startsWith('a')) return { bg: PDF_THEME.SECONDARY_BG, color: PDF_THEME.SECONDARY_TEXT, dot: null };
    if (val.startsWith('b')) return { bg: PDF_THEME.WARNING_BG, color: PDF_THEME.WARNING_TEXT, dot: null };
    return { bg: PDF_THEME.SUCCESS_BG, color: PDF_THEME.SUCCESS_TEXT, dot: null };
  }
  return { bg: PDF_THEME.NEUTRAL_BG, color: PDF_THEME.NEUTRAL_TEXT, dot: null };
};

/**
 * Dibuja una insignia discreta estilo .rq-badge y devuelve sus dimensiones.
 */
export const drawPillBadge = (doc, {
  x,
  y,
  text,
  bg = PDF_THEME.NEUTRAL_BG,
  color = PDF_THEME.NEUTRAL_TEXT,
  borderColor = null,
  dotColor = null,
  fontSize = 6.6,
  height = 4.6,
  paddingX = 2.2,
  radius = 1.2,
  align = 'left',
  fontStyle = 'bold',
}) => {
  const safe = compactText(text, '');
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  const textWidth = doc.getTextWidth(safe);
  const dotSpace = dotColor ? 2.4 : 0;
  const width = textWidth + paddingX * 2 + dotSpace;

  const drawX = align === 'right'
    ? x - width
    : align === 'center'
      ? x - width / 2
      : x;

  doc.setFillColor(...bg);
  if (borderColor) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.22);
    doc.roundedRect(drawX, y, width, height, radius, radius, 'FD');
  } else {
    doc.roundedRect(drawX, y, width, height, radius, radius, 'F');
  }

  let textX = drawX + paddingX;
  if (dotColor) {
    doc.setFillColor(...dotColor);
    doc.circle(drawX + paddingX + 0.8, y + height / 2, 0.7, 'F');
    textX += dotSpace;
  }

  doc.setTextColor(...color);
  const baselineY = y + height / 2 + fontSize * 0.125;
  doc.text(safe, textX, baselineY);

  return { x: drawX, y, width, height };
};

/**
 * Encabezado editorial sobrio sobre fondo blanco/claro fiel al sistema (.rq-page-heading).
 */
export const drawModernPdfHero = (doc, {
  whiteLogo,
  eyebrow = 'REPORTE OFICIAL',
  title,
  subtitle = '',
  renderSubtitle = null,
  metaLeft = '',
  metaRight = '',
  leftSlot = null,
  margin = 14,
}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const safeTitle = compactText(title, 'Documento RimaqMasi EDU');

  // 1. Línea superior institucional fina (1.2mm, solo color primario #B91C2C)
  doc.setFillColor(...PDF_THEME.PRIMARY);
  doc.rect(0, 0, pageWidth, 1.2, 'F');

  // 2. Fila superior de marca y metadatos (y = 5..14.5mm)
  const brandBoxW = 36;
  const brandBoxH = 7.5;
  const brandBoxY = 4.8;
  doc.setFillColor(...PDF_THEME.PRIMARY);
  doc.roundedRect(margin, brandBoxY, brandBoxW, brandBoxH, 1.4, 1.4, 'F');

  const logoW = 30.5;
  const logoH = whiteLogo?.ratio ? logoW / whiteLogo.ratio : 5;
  const logoY = brandBoxY + (brandBoxH - logoH) / 2;
  if (!drawWhitePdfLogo(doc, whiteLogo, margin + (brandBoxW - logoW) / 2, logoY, logoW)) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...PDF_THEME.WHITE);
    doc.text('RIMAQMASI EDU', margin + brandBoxW / 2, brandBoxY + 4.8, { align: 'center' });
  }

  // Etiqueta sobria del módulo junto a la marca
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...PDF_THEME.TEXT_MUTED);
  doc.text(compactText(eyebrow, '').toUpperCase(), margin + brandBoxW + 3.5, brandBoxY + 4.9);

  // Metadatos alineados a la derecha en la fila superior
  const metaCombined = [metaLeft, metaRight].map((m) => compactText(m, '')).filter(Boolean).join('   ·   ');
  if (metaCombined) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(...PDF_THEME.TEXT_MUTED);
    const metaMaxW = pageWidth - margin * 2 - brandBoxW - 46;
    const metaLines = doc.splitTextToSize(metaCombined, metaMaxW).slice(0, 2);
    if (metaLines.length === 1) {
      doc.text(metaLines[0], pageWidth - margin, brandBoxY + 4.9, { align: 'right' });
    } else {
      doc.text(metaLines[0], pageWidth - margin, brandBoxY + 3.3, { align: 'right' });
      doc.text(metaLines[1], pageWidth - margin, brandBoxY + 6.7, { align: 'right' });
    }
  }

  // Línea divisoria sutil bajo la barra de marca
  const dividerTopY = 15.2;
  doc.setDrawColor(...PDF_THEME.BORDER);
  doc.setLineWidth(0.25);
  doc.line(margin, dividerTopY, pageWidth - margin, dividerTopY);

  // 3. Bloque de título estilo .rq-page-heading
  const tileW = leftSlot ? (leftSlot.width || 22) : 0;
  const tileH = leftSlot ? (leftSlot.height || 22) : 0;
  const headingTopY = dividerTopY + 4.2;
  const textAnchorX = leftSlot ? margin + tileW + 5 : margin;
  const contentX = textAnchorX + 4.2;
  const contentWidth = pageWidth - contentX - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.5);
  const titleLines = doc.splitTextToSize(safeTitle, contentWidth).slice(0, 2);
  const titleLineH = 6.2;
  const titleBlockH = titleLines.length * titleLineH;

  let subLines = [];
  const hasCustomSub = typeof renderSubtitle === 'function';
  const hasTextSub = !hasCustomSub && Boolean(compactText(subtitle, ''));
  if (hasTextSub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    subLines = doc.splitTextToSize(compactText(subtitle, ''), contentWidth).slice(0, 2);
  }
  const subBlockH = hasCustomSub ? 5.6 : subLines.length > 0 ? subLines.length * 4.1 : 0;
  const textSectionH = titleBlockH + (subBlockH > 0 ? 1.8 + subBlockH : 0);
  const sectionBodyH = Math.max(textSectionH, tileH);

  // Slot izquierdo opcional (.rq-tile)
  if (leftSlot) {
    const slotY = headingTopY + (sectionBodyH - tileH) / 2;
    doc.setFillColor(...PDF_THEME.PRIMARY_CONTAINER);
    doc.setDrawColor(...PDF_THEME.BORDER);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, slotY, tileW, tileH, 2.2, 2.2, 'FD');
    leftSlot.render(margin + 1, slotY + 1, tileW - 2, tileH - 2);
  }

  // Barra vertical carmesí (.rq-page-heading__accent)
  const accentTopY = headingTopY + (sectionBodyH - textSectionH) / 2;
  doc.setFillColor(...PDF_THEME.PRIMARY);
  doc.roundedRect(textAnchorX, accentTopY + 0.4, 1.2, Math.max(8, textSectionH - 0.8), 0.6, 0.6, 'F');

  // Título
  const titleY = accentTopY + 4.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.5);
  doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
  doc.text(titleLines, contentX, titleY);

  // Subtítulo o ruta de idiomas
  if (hasCustomSub) {
    const subY = titleY + (titleLines.length - 1) * titleLineH + 5.8;
    renderSubtitle({ x: contentX, y: subY, maxWidth: contentWidth });
  } else if (subLines.length > 0) {
    const subY = titleY + (titleLines.length - 1) * titleLineH + 5.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.TEXT_SECONDARY);
    doc.text(subLines, contentX, subY);
  }

  const bottomY = headingTopY + sectionBodyH + 4;
  doc.setDrawColor(...PDF_THEME.BORDER);
  doc.setLineWidth(0.25);
  doc.line(margin, bottomY, pageWidth - margin, bottomY);

  return {
    heroHeight: bottomY,
    bottomY,
  };
};

/**
 * Tarjetas de resumen estilo .nm-card / .rq-stat-card (blancas, borde limpio, sin barras laterales).
 */
export const drawPdfKpiStrip = (doc, cards, {
  y,
  margin = 14,
  gap = 4.5,
  height = 17,
} = {}) => {
  if (!cards?.length) return { bottomY: y };
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalWidth = pageWidth - margin * 2;
  const cardWidth = (totalWidth - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap);

    doc.setFillColor(...PDF_THEME.WHITE);
    doc.setDrawColor(...PDF_THEME.BORDER);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, cardWidth, height, 2, 2, 'FD');

    // Etiqueta superior en mayúsculas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_THEME.TEXT_MUTED);
    doc.text(compactText(card.label, '').toUpperCase(), x + 4, y + 5.1);

    // Valor principal
    const valStr = compactText(card.value, '0');
    doc.setFont('helvetica', 'bold');
    const valSize = valStr.length > 18 ? 9.5 : valStr.length > 12 ? 11 : 13;
    doc.setFontSize(valSize);
    doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
    const clippedVal = doc.splitTextToSize(valStr, cardWidth - 8)[0];
    doc.text(clippedVal, x + 4, y + 10.6);

    // Nota inferior
    if (card.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...PDF_THEME.TEXT_MUTED);
      const clippedSub = doc.splitTextToSize(compactText(card.sub, ''), cardWidth - 8)[0];
      doc.text(clippedSub, x + 4, y + 14.7);
    }
  });

  return { bottomY: y + height };
};

/**
 * Chips neutros uniformes estilo .rq-badge para filtros y alcance.
 */
export const drawFilterChipsStrip = (doc, chips, {
  y,
  label = '',
  margin = 14,
  gap = 2.2,
} = {}) => {
  if (!chips?.length) return { bottomY: y };
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxX = pageWidth - margin;
  let cursorX = margin;
  let cursorY = y;
  const chipHeight = 4.8;

  if (label) {
    const labelText = compactText(label, '').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...PDF_THEME.TEXT_MUTED);
    doc.text(labelText, cursorX, cursorY + 3.3);
    cursorX += doc.getTextWidth(labelText) + 3;
  }

  chips.forEach((chip) => {
    const text = compactText(chip.text, '');
    if (!text) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    const estWidth = doc.getTextWidth(text) + 4.4;
    if (cursorX + estWidth > maxX && cursorX > margin) {
      cursorX = margin;
      cursorY += chipHeight + 1.6;
    }
    const badge = drawPillBadge(doc, {
      x: cursorX,
      y: cursorY,
      text,
      bg: PDF_THEME.NEUTRAL_BG,
      color: PDF_THEME.NEUTRAL_TEXT,
      borderColor: PDF_THEME.BORDER,
      dotColor: null,
      fontSize: 6.6,
      height: chipHeight,
      paddingX: 2.2,
      radius: 1.2,
    });
    cursorX += badge.width + gap;
  });

  return { bottomY: cursorY + chipHeight };
};

/**
 * Estilos base compartidos estilo .rq-table (cabecera clara #F8FAFC, bordes #E2E8F0).
 */
export const getModernTableDefaults = ({ startY, margin = 14, fontSize = 8 } = {}) => ({
  startY,
  theme: 'plain',
  margin: { top: 17, right: margin, bottom: 16, left: margin },
  rowPageBreak: 'avoid',
  showHead: 'everyPage',
  styles: {
    font: 'helvetica',
    fontSize,
    cellPadding: { top: 2.8, right: 2.6, bottom: 2.8, left: 2.6 },
    fillColor: PDF_THEME.WHITE,
    textColor: PDF_THEME.TEXT_PRIMARY,
    lineColor: PDF_THEME.BORDER,
    lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
    valign: 'middle',
    overflow: 'linebreak',
  },
  headStyles: {
    fillColor: PDF_THEME.SURFACE_LOW,
    textColor: PDF_THEME.TEXT_SECONDARY,
    fontStyle: 'bold',
    fontSize: Math.max(7, fontSize - 0.5),
    cellPadding: { top: 3, right: 2.6, bottom: 3, left: 2.6 },
    lineColor: PDF_THEME.BORDER_STRONG,
    lineWidth: { bottom: 0.35, top: 0.2, left: 0, right: 0 },
  },
  alternateRowStyles: {
    fillColor: PDF_THEME.ROW_ALT,
  },
});

/**
 * Encabezado compacto de continuación (páginas 2+) y pie de página sobrio en todo el documento.
 */
export const applyModernPageChrome = (doc, {
  reportTitle,
  subtitle = '',
  footerLeft = 'RIMAQMASI EDU  ·  Plataforma de aprendizaje de idiomas',
  margin = 14,
} = {}) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const safeTitle = compactText(reportTitle, '');
  const safeSubtitle = compactText(subtitle, '');

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);

    if (page > 1) {
      doc.setFillColor(...PDF_THEME.PRIMARY);
      doc.rect(0, 0, pageWidth, 0.8, 'F');
      doc.setDrawColor(...PDF_THEME.BORDER);
      doc.setLineWidth(0.25);
      doc.line(margin, 12, pageWidth - margin, 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
      doc.text('RIMAQMASI EDU', margin, 8.2);

      const rightHeader = [safeTitle, safeSubtitle].filter(Boolean).join('  ·  ');
      if (rightHeader) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        doc.setTextColor(...PDF_THEME.TEXT_MUTED);
        const clipped = doc.splitTextToSize(rightHeader, pageWidth - margin * 2 - 42)[0];
        doc.text(clipped, pageWidth - margin, 8.2, { align: 'right' });
      }
    }

    const lineY = pageHeight - 11.5;
    doc.setDrawColor(...PDF_THEME.BORDER);
    doc.setLineWidth(0.25);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_THEME.TEXT_MUTED);
    doc.text(compactText(footerLeft, ''), margin, pageHeight - 6.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_THEME.TEXT_SECONDARY);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 6.2, { align: 'right' });
  }
};
