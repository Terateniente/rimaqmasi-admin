import {
  findIdioma,
  getIdiomaNombre,
  getUserDisplayName,
  getWordTranslations,
} from './dictionaryViewUtils.js';
import {
  PDF_THEME,
  applyModernPageChrome,
  compactText,
  drawFilterChipsStrip,
  drawModernPdfHero,
  drawPdfKpiStrip,
  drawPillBadge,
  formatGeneratedDate,
  getModernTableDefaults,
  loadWhitePdfLogo,
  resolveBadgeTone,
  safeFilePart,
} from './pdfBranding.js';

const statusLabels = {
  publicado: 'Publicado',
  revision: 'En revisión',
  borrador: 'Borrador',
  archivado: 'Archivado',
};

const getCategoriesList = (word) => {
  const categories = word?.categorias?.length
    ? word.categorias
    : word?.categoria
      ? [word.categoria]
      : [];
  return categories.map((category) => compactText(category?.nombre, '')).filter(Boolean);
};

const getTranslations = (word, idiomas) => {
  const translations = getWordTranslations(word, idiomas);
  if (translations.length === 0) return '';
  return translations.map((translation, index) => {
    const languageName = getIdiomaNombre(translation.idioma, 'Idioma no indicado');
    const description = compactText(translation.definicion, '');
    const context = description
      && description.toLocaleLowerCase('es') !== translation.termino?.toLocaleLowerCase('es')
      && !/^sin definici[oó]n$/iu.test(description)
      ? ` — ${description}`
      : '';
    return `${index + 1}. ${compactText(translation.termino)} [${languageName}]${context}`;
  }).join('\n');
};

export const generateDictionaryPdf = async ({ palabras, idiomas, filtros = {}, generatedBy = null }) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const words = [...(palabras || [])].sort((a, b) =>
    compactText(a.termino, '').localeCompare(compactText(b.termino, ''), 'es', { sensitivity: 'base' })
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const whiteLogo = await loadWhitePdfLogo();

  const totalTranslations = words.reduce(
    (total, word) => total + getWordTranslations(word, idiomas).length,
    0
  );
  const translatedWordsCount = words.filter((w) => getWordTranslations(w, idiomas).length > 0).length;
  const publishedCount = words.filter((w) => w.estado === 'publicado').length;
  const audioCount = words.filter((w) => Boolean(w.url_audio)).length;
  const imageCount = words.filter((w) => Boolean(w.url_imagen)).length;

  const uniqueLanguages = new Set();
  const uniqueCategories = new Set();
  words.forEach((word) => {
    const lang = findIdioma(idiomas, word.idioma_id ?? word.idiomas_id, word.idioma);
    const langName = getIdiomaNombre(lang, '');
    if (langName) uniqueLanguages.add(langName);
    getCategoriesList(word).forEach((cat) => uniqueCategories.add(cat));
  });

  const generatedByName = generatedBy
    ? getUserDisplayName(generatedBy, '')
    : '';

  doc.setProperties({
    title: 'Diccionario RIMAQMASI EDU',
    subject: 'Palabras y traducciones del diccionario',
    author: generatedByName || 'RIMAQMASI EDU',
    creator: 'RIMAQMASI EDU',
  });

  // 1. Encabezado sobrio estilo .rq-page-heading
  const hero = drawModernPdfHero(doc, {
    whiteLogo,
    eyebrow: 'DICCIONARIO LÉXICO',
    title: 'Diccionario y traducciones',
    subtitle: 'Catálogo multilingüe de términos, fonética, categorías gramaticales y equivalencias',
    metaLeft: `Generado: ${formatGeneratedDate()}`,
    metaRight: generatedByName
      ? `Responsable: ${generatedByName}`
      : `${words.length} términos exportados`,
  });

  // 2. Chips de filtros neutros uniformes (.rq-badge)
  const filterChips = [
    filtros.idioma && { text: `Idioma: ${filtros.idioma}` },
    filtros.estado && { text: `Estado: ${filtros.estado}` },
    filtros.categoria && { text: `Categoría: ${filtros.categoria}` },
    filtros.busqueda && { text: `Búsqueda: "${filtros.busqueda}"` },
  ].filter(Boolean);

  const chipsToShow = filterChips.length > 0
    ? filterChips
    : [{ text: 'Catálogo completo (sin filtros activos)' }];

  const chipStrip = drawFilterChipsStrip(doc, chipsToShow, {
    y: hero.bottomY + 3.5,
    label: 'Filtros:',
  });

  // 3. Tarjetas resumen estilo .nm-card (sin barras laterales)
  const langCount = uniqueLanguages.size;
  const catCount = uniqueCategories.size;
  const kpi = drawPdfKpiStrip(
    doc,
    [
      {
        label: 'Palabras',
        value: String(words.length),
        sub: `${publishedCount} ${publishedCount === 1 ? 'publicada' : 'publicadas'}`,
      },
      {
        label: 'Traducciones',
        value: String(totalTranslations),
        sub: `${translatedWordsCount} ${translatedWordsCount === 1 ? 'término traducido' : 'términos traducidos'}`,
      },
      {
        label: 'Multimedia',
        value: `${audioCount} ${audioCount === 1 ? 'audio' : 'audios'}`,
        sub: `${imageCount} con imagen`,
      },
      {
        label: 'Cobertura',
        value: `${langCount} ${langCount === 1 ? 'idioma' : 'idiomas'}`,
        sub: `${catCount} ${catCount === 1 ? 'categoría activa' : 'categorías activas'}`,
      },
    ],
    { y: chipStrip.bottomY + 3.5 }
  );

  // 4. Tabla sobria estilo .rq-table (7 columnas)
  const rows = words.map((word, index) => {
    const language = findIdioma(idiomas, word.idioma_id ?? word.idiomas_id, word.idioma);
    const languageName = getIdiomaNombre(language, 'Sin idioma');
    const term = compactText(word.termino);
    const grammar = compactText(word.tipo_gramatical, '');
    const phonetic = compactText(word.transcripcion_fonetica, '');
    const profileLine = [languageName, grammar].filter(Boolean).join(' · ');
    const fullTermBlock = [term, profileLine, phonetic].filter(Boolean).join('\n');

    const translationsText = getTranslations(word, idiomas);
    const categoryText = getCategoriesList(word).join(', ') || '—';
    const hasAudio = Boolean(word.url_audio);
    const hasImage = Boolean(word.url_imagen);
    const mediaLabel = [hasAudio ? 'Audio' : '', hasImage ? 'Imagen' : ''].filter(Boolean).join(' · ') || '—';
    const statusText = statusLabels[word.estado] || compactText(word.estado);
    const authorText = getUserDisplayName(word.creadoPor || word.creado_por);

    return [
      {
        content: String(index + 1),
        styles: { halign: 'center', fontStyle: 'bold', textColor: PDF_THEME.TEXT_MUTED, fontSize: 7.5 },
      },
      {
        content: fullTermBlock,
        _termCell: { term, profileLine, phonetic },
        styles: { fontStyle: 'bold', fontSize: 8.4 },
      },
      {
        content: translationsText || 'Sin traducciones registradas',
        styles: {
          textColor: translationsText ? PDF_THEME.TEXT_BODY : PDF_THEME.TEXT_SUBTLE,
          fontStyle: translationsText ? 'normal' : 'italic',
          fontSize: 7.8,
        },
      },
      {
        content: categoryText,
        styles: { textColor: PDF_THEME.TEXT_SECONDARY, fontSize: 7.6 },
      },
      {
        content: mediaLabel,
        styles: {
          halign: 'center',
          fontSize: 7.4,
          fontStyle: hasAudio || hasImage ? 'bold' : 'normal',
          textColor: hasAudio || hasImage ? PDF_THEME.TEXT_SECONDARY : PDF_THEME.TEXT_SUBTLE,
        },
      },
      {
        content: statusText,
        _statusPill: statusText,
        styles: { halign: 'center', fontSize: 6.8 },
      },
      {
        content: authorText,
        styles: { textColor: PDF_THEME.TEXT_MUTED, fontSize: 7.4 },
      },
    ];
  });

  if (rows.length === 0) {
    rows.push([
      {
        content: 'No hay palabras para exportar con los filtros seleccionados.',
        colSpan: 7,
        styles: {
          halign: 'center',
          textColor: PDF_THEME.TEXT_MUTED,
          fontStyle: 'italic',
          cellPadding: 8,
        },
      },
    ]);
  }

  const baseTable = getModernTableDefaults({ startY: kpi.bottomY + 4.5, fontSize: 7.8 });
  const pendingRender = new Map();

  autoTable(doc, {
    ...baseTable,
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'Término y Perfil',
      'Traducciones y Contexto',
      'Categoría',
      { content: 'Multimedia', styles: { halign: 'center' } },
      { content: 'Estado', styles: { halign: 'center' } },
      'Creado por',
    ]],
    body: rows,
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 90 },
      3: { cellWidth: 32 },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 30 },
    },
    willDrawCell: (data) => {
      if (data.section !== 'body') return;
      const raw = data.cell.raw;
      if (!raw || typeof raw !== 'object') return;

      if (raw._termCell) {
        pendingRender.set(data.cell, { type: 'term', ...raw._termCell });
        data.cell.text = [];
      } else if (raw._statusPill) {
        pendingRender.set(data.cell, { type: 'status', label: raw._statusPill });
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const { cell } = data;
      const custom = pendingRender.get(cell);
      if (!custom) return;
      pendingRender.delete(cell);

      if (custom.type === 'term') {
        const availW = cell.width - cell.padding('left') - cell.padding('right');
        const leftX = cell.x + cell.padding('left');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        const termLines = doc.splitTextToSize(custom.term, availW);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.1);
        const profileLines = custom.profileLine ? doc.splitTextToSize(custom.profileLine, availW) : [];
        const phoneticLines = custom.phonetic ? doc.splitTextToSize(custom.phonetic, availW) : [];

        const termH = termLines.length * 3.6;
        const profileH = profileLines.length * 3.0;
        const phoneticH = phoneticLines.length * 3.0;
        const totalH = termH + (profileH ? profileH + 0.5 : 0) + (phoneticH ? phoneticH + 0.4 : 0);

        let cursorY = cell.y + (cell.height - totalH) / 2 + 2.8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_THEME.TEXT_PRIMARY);
        doc.text(termLines, leftX, cursorY);
        cursorY += termH + 0.5;

        if (profileLines.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.1);
          doc.setTextColor(...PDF_THEME.TEXT_MUTED);
          doc.text(profileLines, leftX, cursorY);
          cursorY += profileH + 0.4;
        }

        if (phoneticLines.length > 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.1);
          doc.setTextColor(...PDF_THEME.TEXT_SECONDARY);
          doc.text(phoneticLines, leftX, cursorY);
        }
      } else if (custom.type === 'status') {
        const tone = resolveBadgeTone(custom.label);
        drawPillBadge(doc, {
          x: cell.x + cell.width / 2,
          y: cell.y + (cell.height - 4.6) / 2,
          text: custom.label.toUpperCase(),
          bg: tone.bg,
          color: tone.color,
          fontSize: 6.3,
          height: 4.6,
          paddingX: 2.1,
          align: 'center',
        });
      }
    },
  });

  const subtitle = filterChips.length > 0
    ? filterChips.map((c) => c.text).join('  ·  ')
    : 'Catálogo completo';

  applyModernPageChrome(doc, {
    reportTitle: 'Diccionario y traducciones',
    subtitle,
    footerLeft: 'RIMAQMASI EDU  ·  Diccionario oficial de idiomas',
  });

  const suffix = filtros.idioma ? safeFilePart(filtros.idioma) : 'completo';
  const fileName = `diccionario-rimaqmasi-${suffix}.pdf`;
  doc.save(fileName);
  return fileName;
};
