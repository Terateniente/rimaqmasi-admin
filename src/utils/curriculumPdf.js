import {
  PDF_THEME,
  applyModernPageChrome,
  compactText,
  darkenForHeader,
  drawModernPdfHero,
  drawPdfKpiStrip,
  drawPillBadge,
  drawVectorArrow,
  formatGeneratedDate,
  loadWhitePdfLogo,
  mixWithWhite,
  parseHexColor,
  resolveBadgeTone,
  safeFilePart,
} from './pdfBranding.js';

const FALLBACK_UNIT_COLORS = ['#B91C2C', '#1D5FAA', '#0F766E', '#B45309', '#6D28D9', '#15803D'];

const byOrder = (a, b) =>
  Number(a?.orden_clasificacion ?? a?.orden ?? 0) -
  Number(b?.orden_clasificacion ?? b?.orden ?? 0);

const displayOrder = (item, fallback) =>
  Number(item?.orden_clasificacion ?? item?.orden ?? fallback);

const isActiveItem = (item) =>
  item?.activo !== false && item?.estado !== 'inactivo';

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
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, element: image });
    image.onerror = reject;
    image.src = dataUrl;
  });

const loadCoverImage = async (url) => {
  if (!url || typeof fetch === 'undefined' || typeof Image === 'undefined') return null;
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

const traceRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const createUnitPanelBgDataUrl = (image, widthMm, heightMm, radiusMm, baseRgb, opacity = 0.15) => {
  if (!image?.element || typeof document === 'undefined') return null;
  try {
    const scale = 12;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(widthMm * scale));
    canvas.height = Math.max(1, Math.round(heightMm * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    traceRoundedRect(ctx, 0, 0, canvas.width, canvas.height, radiusMm * scale);
    ctx.clip();

    ctx.fillStyle = `rgb(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = opacity;
    const coverScale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const drawW = image.width * coverScale;
    const drawH = image.height * coverScale;
    const dx = (canvas.width - drawW) / 2;
    const dy = (canvas.height - drawH) / 2;
    ctx.drawImage(image.element, dx, dy, drawW, drawH);
    ctx.restore();

    return canvas.toDataURL('image/png');
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

const measureLessonCard = (doc, leccion, index, colWidth) => {
  const order = displayOrder(leccion, index + 1);
  const title = compactText(leccion?.titulo, 'Lección sin título');
  const desc = compactText(leccion?.descripcion, '');
  const textMaxW = Math.max(24, colWidth - 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  const titleLines = doc.splitTextToSize(title, textMaxW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  const descLines = desc ? doc.splitTextToSize(desc, textMaxW) : [];

  const titleH = titleLines.length * 3.5;
  const descH = descLines.length > 0 ? 0.9 + descLines.length * 3.2 : 0;
  const contentH = Math.max(5.2, titleH + descH);

  return {
    order,
    titleLines,
    descLines,
    height: contentH,
  };
};

const buildUnitLayout = (doc, unidad, unidadIndex, { leftPanelW, rightPanelW }) => {
  const fallbackHex = FALLBACK_UNIT_COLORS[unidadIndex % FALLBACK_UNIT_COLORS.length];
  const unitColor = parseHexColor(unidad.color, parseHexColor(fallbackHex, PDF_THEME.PRIMARY));
  const accentColor = darkenForHeader(unitColor);
  const unitOrder = displayOrder(unidad, unidadIndex + 1);
  const unitTitle = compactText(unidad.titulo || unidad.nombre, 'Unidad sin título');
  const unitLevel = compactText(unidad.categoria_nivel || unidad.nivel, '');

  const sesiones = [...(unidad.sesiones || [])].filter(isActiveItem).sort(byOrder);
  const totalLessons = sesiones.reduce(
    (sum, sesion) => sum + [...(sesion.lecciones || [])].filter(isActiveItem).length,
    0
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const unitTitleLines = doc.splitTextToSize(unitTitle, leftPanelW - 10);
  const leftSummaryText = `${sesiones.length} ${sesiones.length === 1 ? 'sesión' : 'sesiones'} · ${totalLessons} ${totalLessons === 1 ? 'lección' : 'lecciones'}`;
  const minLeftHeight = 14 + unitTitleLines.length * 4.2 + (unitLevel ? 6.5 : 0) + 9;

  const innerW = rightPanelW - 11;
  const colGap = 6;
  const twoColW = (innerW - colGap) / 2;

  const sessionLayouts = sesiones.map((sesion, sesionIndex) => {
    const sesOrder = displayOrder(sesion, sesionIndex + 1);
    const sesTitle = compactText(sesion.titulo, 'Sesión sin título');
    const sesBadgeText = `Sesión ${sesOrder}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    const badgeW = doc.getTextWidth(sesBadgeText) + 4.8;
    doc.setFontSize(8.6);
    const titleLines = doc.splitTextToSize(sesTitle, Math.max(40, innerW - badgeW - 3.5));
    const headerHeight = Math.max(6.2, titleLines.length * 3.8 + 2.4) + 2.2;

    const lecciones = [...(sesion.lecciones || [])].filter(isActiveItem).sort(byOrder);
    const useSingleCol = lecciones.length === 1;
    const colWidth = useSingleCol ? innerW : twoColW;

    const rows = [];
    if (lecciones.length === 0) {
      rows.push({ kind: 'empty', height: 6.5 });
    } else if (useSingleCol) {
      const card = measureLessonCard(doc, lecciones[0], 0, colWidth);
      rows.push({ kind: 'lessons', colWidth, items: [card], height: card.height + 2.6 });
    } else {
      for (let i = 0; i < lecciones.length; i += 2) {
        const leftCard = measureLessonCard(doc, lecciones[i], i, colWidth);
        const rightCard = lecciones[i + 1]
          ? measureLessonCard(doc, lecciones[i + 1], i + 1, colWidth)
          : null;
        const rowH = Math.max(leftCard.height, rightCard?.height || 0) + 2.8;
        rows.push({
          kind: 'lessons',
          colWidth,
          items: rightCard ? [leftCard, rightCard] : [leftCard],
          height: rowH,
        });
      }
    }

    return {
      sesOrder,
      sesBadgeText,
      titleLines,
      headerHeight,
      rows,
    };
  });

  // Secuencia plana de bloques dentro de la unidad para paginar sin cortar filas
  const blocks = [];
  if (sessionLayouts.length === 0) {
    blocks.push({ kind: 'empty-unit', height: 8 });
  } else {
    sessionLayouts.forEach((session, sIdx) => {
      const firstRowH = session.rows[0]?.height || 0;
      blocks.push({
        kind: 'session-header',
        session,
        height: session.headerHeight,
        minPairHeight: session.headerHeight + firstRowH,
        topGap: sIdx === 0 ? 0 : 2.5,
      });
      session.rows.forEach((row) => {
        blocks.push({
          kind: 'session-row',
          row,
          height: row.height,
        });
      });
    });
  }

  return {
    unitOrder,
    unitTitleLines,
    unitLevel,
    leftSummaryText,
    unitColor,
    accentColor,
    unitImage: unidad._loadedImage || null,
    minLeftHeight,
    blocks,
  };
};

const drawLessonItem = (doc, item, x, y, accentColor) => {
  const cx = x + 2.4;
  const cy = y + 2.3;
  doc.setFillColor(...accentColor);
  doc.circle(cx, cy, 2.3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...PDF_THEME.WHITE);
  doc.text(String(item.order), cx, cy + 0.85, { align: 'center' });

  const textX = x + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
  doc.text(item.titleLines, textX, y + 3.1);

  if (item.descLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...PDF_THEME.TEXT_SECONDARY);
    const descY = y + 3.1 + item.titleLines.length * 3.5 + 0.6;
    doc.text(item.descLines, textX, descY);
  }
};

const drawUnitChunkCard = (doc, unit, chunkBlocks, {
  x,
  y,
  leftPanelW,
  rightPanelW,
  gap,
  isContinuation,
}) => {
  const { unitColor, accentColor } = unit;
  const rightX = x + leftPanelW + gap;
  const innerX = rightX + 5.5;
  const innerW = rightPanelW - 11;

  const blocksHeight = chunkBlocks.reduce(
    (sum, block) => sum + (block.topGap || 0) + block.height,
    0
  );
  const cardHeight = Math.max(
    isContinuation ? 26 : unit.minLeftHeight,
    blocksHeight + 8.5
  );

  // Panel izquierdo de Unidad (pastel suave + imagen de unidad al 15% si existe)
  const leftBaseRgb = mixWithWhite(unitColor, 0.86);
  const unitBgDataUrl = createUnitPanelBgDataUrl(
    unit.unitImage,
    leftPanelW,
    cardHeight,
    3.2,
    leftBaseRgb,
    0.15
  );
  doc.setDrawColor(...mixWithWhite(unitColor, 0.72));
  doc.setLineWidth(0.28);
  if (unitBgDataUrl) {
    doc.addImage(unitBgDataUrl, 'PNG', x, y, leftPanelW, cardHeight, undefined, 'FAST');
    doc.roundedRect(x, y, leftPanelW, cardHeight, 3.2, 3.2, 'S');
  } else {
    doc.setFillColor(...leftBaseRgb);
    doc.roundedRect(x, y, leftPanelW, cardHeight, 3.2, 3.2, 'FD');
  }

  // Píldora superior de la unidad en el panel izquierdo
  const pillX = x + 3.5;
  const pillY = y + 3.5;
  const pillW = leftPanelW - 7;
  const pillH = 6.8;
  doc.setFillColor(...accentColor);
  doc.roundedRect(pillX, pillY, pillW, pillH, 3.2, 3.2, 'F');

  // Etiqueta UNIDAD N centrada dentro de la píldora
  const pillCy = pillY + pillH / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...PDF_THEME.WHITE);
  const unitTag = isContinuation ? `UNIDAD ${unit.unitOrder} (cont.)` : `UNIDAD ${unit.unitOrder}`;
  doc.text(unitTag, pillX + pillW / 2, pillCy + 0.95, { align: 'center' });

  // Cuerpo izquierdo: título de unidad y conteo
  const leftBodyTop = pillY + pillH + 3.5;
  const leftAvailableH = cardHeight - (leftBodyTop - y) - 3.5;
  const titleH = unit.unitTitleLines.length * 4.1;
  const metaH = (unit.unitLevel ? 5.5 : 0) + 4;
  const leftContentH = titleH + 2 + metaH;
  let leftCursorY = leftBodyTop + Math.max(0, (leftAvailableH - leftContentH) / 2) + 3.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
  doc.text(unit.unitTitleLines, x + leftPanelW / 2, leftCursorY, { align: 'center' });
  leftCursorY += titleH + 1.2;

  if (unit.unitLevel) {
    const levelTone = resolveBadgeTone(unit.unitLevel);
    drawPillBadge(doc, {
      x: x + leftPanelW / 2,
      y: leftCursorY - 1.5,
      text: `NIVEL ${unit.unitLevel}`,
      bg: levelTone.bg,
      color: levelTone.color,
      fontSize: 6.2,
      height: 4.3,
      paddingX: 2,
      align: 'center',
    });
    leftCursorY += 5.2;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.setTextColor(...PDF_THEME.TEXT_SECONDARY);
  doc.text(unit.leftSummaryText, x + leftPanelW / 2, leftCursorY + 1.5, { align: 'center' });

  // Panel derecho de Sesiones y Lecciones (pastel muy claro)
  doc.setFillColor(...mixWithWhite(unitColor, 0.95));
  doc.setDrawColor(...mixWithWhite(unitColor, 0.78));
  doc.setLineWidth(0.28);
  doc.roundedRect(rightX, y, rightPanelW, cardHeight, 3.2, 3.2, 'FD');

  let rightCursorY = y + 4.5;
  chunkBlocks.forEach((block) => {
    if (block.topGap) rightCursorY += block.topGap;

    if (block.kind === 'empty-unit') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.8);
      doc.setTextColor(...PDF_THEME.TEXT_MUTED);
      doc.text('Esta unidad aún no tiene sesiones activas.', innerX, rightCursorY + 4);
      rightCursorY += block.height;
      return;
    }

    if (block.kind === 'session-header') {
      const { session } = block;
      const badge = drawPillBadge(doc, {
        x: innerX,
        y: rightCursorY,
        text: session.sesBadgeText,
        bg: mixWithWhite(unitColor, 0.84),
        color: accentColor,
        fontSize: 6.6,
        height: 4.7,
        paddingX: 2.3,
        radius: 1.4,
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.6);
      doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
      doc.text(session.titleLines, innerX + badge.width + 2.8, rightCursorY + 3.4);

      const lineY = rightCursorY + block.height - 1.5;
      doc.setDrawColor(...mixWithWhite(unitColor, 0.8));
      doc.setLineWidth(0.22);
      doc.line(innerX, lineY, innerX + innerW, lineY);

      rightCursorY += block.height;
      return;
    }

    if (block.kind === 'session-row') {
      const { row } = block;
      if (row.kind === 'empty') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_THEME.TEXT_MUTED);
        doc.text('Sin lecciones activas registradas en esta sesión.', innerX + 2, rightCursorY + 3.5);
      } else {
        const [leftItem, rightItem] = row.items;
        drawLessonItem(doc, leftItem, innerX, rightCursorY, accentColor);
        if (rightItem) {
          drawLessonItem(doc, rightItem, innerX + row.colWidth + 6, rightCursorY, accentColor);
        }
      }
      rightCursorY += block.height;
    }
  });

  return y + cardHeight;
};

const drawRoadmapUnits = (doc, unidades, { startY, margin = 14 }) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxPageY = pageHeight - 16;
  const totalWidth = pageWidth - margin * 2;
  const leftPanelW = 58;
  const gap = 4;
  const rightPanelW = totalWidth - leftPanelW - gap;
  const unitSpacing = 4.5;

  if (unidades.length === 0) {
    doc.setFillColor(...PDF_THEME.SURFACE_LOW);
    doc.setDrawColor(...PDF_THEME.BORDER);
    doc.roundedRect(margin, startY, totalWidth, 24, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.TEXT_MUTED);
    doc.text('Este curso aún no tiene unidades activas registradas.', pageWidth / 2, startY + 13.5, { align: 'center' });
    return startY + 24;
  }

  let cursorY = startY;

  unidades.forEach((unidad, unitIdx) => {
    const layout = buildUnitLayout(doc, unidad, unitIdx, { leftPanelW, rightPanelW });
    const fullContentH = layout.blocks.reduce(
      (sum, b) => sum + (b.topGap || 0) + b.height,
      0
    );
    const fullCardH = Math.max(layout.minLeftHeight, fullContentH + 8.5);
    const freshPageTopY = 17;

    // Si cabe completa en una página nueva pero no en la actual, saltar página para mantenerla íntegra
    if (cursorY + fullCardH > maxPageY && freshPageTopY + fullCardH <= maxPageY && cursorY > freshPageTopY + 4) {
      doc.addPage();
      cursorY = freshPageTopY;
    }

    let blockIdx = 0;
    let isContinuation = false;

    while (blockIdx < layout.blocks.length) {
      const availableH = maxPageY - cursorY;
      const nextBlock = layout.blocks[blockIdx];
      const nextMinNeeded = nextBlock.kind === 'session-header'
        ? nextBlock.minPairHeight
        : nextBlock.height;
      const minStartHeight = Math.max(
        isContinuation ? 26 : layout.minLeftHeight,
        nextMinNeeded + 9
      );

      if (availableH < minStartHeight && cursorY > freshPageTopY + 1) {
        doc.addPage();
        cursorY = freshPageTopY;
      }

      const maxBlocksH = maxPageY - cursorY - 8.5;
      const chunkBlocks = [];
      let usedH = 0;

      while (blockIdx < layout.blocks.length) {
        const block = layout.blocks[blockIdx];
        const gapBefore = chunkBlocks.length === 0 ? 0 : (block.topGap || 0);
        const needed = block.kind === 'session-header'
          ? gapBefore + block.minPairHeight
          : gapBefore + block.height;

        if (chunkBlocks.length > 0 && usedH + needed > maxBlocksH) {
          break;
        }

        const cloned = block.topGap && chunkBlocks.length === 0
          ? { ...block, topGap: 0 }
          : block;
        chunkBlocks.push(cloned);
        usedH += (cloned.topGap || 0) + cloned.height;
        blockIdx += 1;
      }

      const endY = drawUnitChunkCard(doc, layout, chunkBlocks, {
        x: margin,
        y: cursorY,
        leftPanelW,
        rightPanelW,
        gap,
        isContinuation,
      });

      if (blockIdx < layout.blocks.length) {
        doc.addPage();
        cursorY = freshPageTopY;
        isContinuation = true;
      } else {
        cursorY = endY + unitSpacing;
      }
    }
  });

  return cursorY;
};

export const generateCurriculumPdf = async ({ curso, unidades, generatedBy, portadaUrl }) => {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const orderedUnidadesBase = [...(unidades || [])].filter(isActiveItem).sort(byOrder);
  const [whiteLogo, coverImage, unitImages] = await Promise.all([
    loadWhitePdfLogo(),
    loadCoverImage(portadaUrl),
    Promise.all(orderedUnidadesBase.map((unidad) => loadCoverImage(unidad.url_imagen || unidad.imagen))),
  ]);
  const orderedUnidades = orderedUnidadesBase.map((unidad, index) => ({
    ...unidad,
    _loadedImage: unitImages[index] || null,
  }));

  const courseName = compactText(curso?.nombre, 'Curso sin nombre');
  const origen = compactText(
    curso?.idioma_origen?.nombre || curso?.idioma_origen_nombre,
    'Idioma de origen'
  );
  const destino = compactText(
    curso?.idioma_destino?.nombre || curso?.idioma_destino_nombre,
    'Idioma de destino'
  );
  const nivel = compactText(curso?.nivel, 'A1');

  // Solo unidades, sesiones y lecciones activas
  const sesiones = orderedUnidades.flatMap((unidad) =>
    [...(unidad.sesiones || [])].filter(isActiveItem)
  );
  const lecciones = sesiones.flatMap((sesion) =>
    [...(sesion.lecciones || [])].filter(isActiveItem)
  );

  const generatedByName = [
    generatedBy?.nombres || generatedBy?.nombre,
    generatedBy?.apellidos || generatedBy?.apellido,
  ].filter(Boolean).join(' ');

  doc.setProperties({
    title: `Malla curricular: ${origen} - ${destino}`,
    subject: 'Malla curricular del curso',
    author: generatedByName || 'RIMAQMASI EDU',
    creator: 'RIMAQMASI EDU',
  });

  // 1. Encabezado sobrio (sin Estado)
  const hero = drawModernPdfHero(doc, {
    whiteLogo,
    eyebrow: 'MALLA CURRICULAR',
    title: courseName,
    leftSlot: {
      width: 22,
      height: 22,
      render: (x, y, w, h) => {
        if (coverImage) {
          try {
            drawContainedImage(doc, coverImage, x, y, w, h);
            return;
          } catch {
            // Continúa con monograma si el formato de imagen no es compatible
          }
        }
        doc.setFillColor(...PDF_THEME.PRIMARY_CONTAINER);
        doc.roundedRect(x, y, w, h, 1.4, 1.4, 'F');
        doc.setTextColor(...PDF_THEME.PRIMARY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(courseName.charAt(0).toUpperCase(), x + w / 2, y + h / 2 + 1.8, { align: 'center' });
      },
    },
    renderSubtitle: ({ x, y }) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...PDF_THEME.TEXT_BODY);
      doc.text(origen, x, y);
      let cursorX = x + doc.getTextWidth(origen) + 2.5;
      cursorX += drawVectorArrow(doc, cursorX, y - 1.1, PDF_THEME.TEXT_MUTED, 5) + 2.5;
      doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
      doc.text(destino, cursorX, y);
      cursorX += doc.getTextWidth(destino) + 4.5;

      const levelTone = resolveBadgeTone(nivel);
      drawPillBadge(doc, {
        x: cursorX,
        y: y - 3.5,
        text: `NIVEL ${nivel}`,
        bg: levelTone.bg,
        color: levelTone.color,
        fontSize: 6.4,
        height: 4.5,
        paddingX: 2.2,
      });
    },
    metaLeft: `Generado: ${formatGeneratedDate()}`,
    metaRight: generatedByName ? `Responsable: ${generatedByName}` : 'Gestión Académica',
  });

  // 2. Tres tarjetas KPI (sin XP ni Estado)
  const kpi = drawPdfKpiStrip(
    doc,
    [
      {
        label: 'Unidades',
        value: String(orderedUnidades.length),
        sub: 'Estructura modular del curso',
      },
      {
        label: 'Sesiones',
        value: String(sesiones.length),
        sub: 'Bloques temáticos de aprendizaje',
      },
      {
        label: 'Lecciones',
        value: String(lecciones.length),
        sub: 'Contenidos y actividades del curso',
      },
    ],
    { y: hero.bottomY + 4.5 }
  );

  // 3. Tarjetas modernas estilo Hoja de Ruta
  drawRoadmapUnits(doc, orderedUnidades, { startY: kpi.bottomY + 5 });

  applyModernPageChrome(doc, {
    reportTitle: courseName,
    subtitle: `${origen} -> ${destino} (Nivel ${nivel})`,
  });

  const fileName = `malla-curricular-${safeFilePart(origen)}-${safeFilePart(destino)}.pdf`;
  doc.save(fileName);
  return fileName;
};
