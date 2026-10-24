export const getIdiomaId = (idioma) =>
  idioma?.idioma_id ?? idioma?.idiomas_id ?? idioma?.id;

export const getIdiomaNombre = (idioma, fallback = 'Idioma no identificado') =>
  idioma?.nombres || idioma?.nombre || fallback;

export const getIdiomaBandera = (idioma) =>
  idioma?.url_icono_bandera || idioma?.url_icono || idioma?.url_bandera || null;

export const getUserDisplayName = (usuario, fallback = 'Autor no disponible') => {
  if (!usuario) return fallback;
  const nombre = [usuario.nombres || usuario.nombre, usuario.apellidos || usuario.apellido]
    .filter(Boolean)
    .join(' ')
    .trim();
  return nombre || usuario.correo || fallback;
};

export const findIdioma = (idiomas, id, embedded) => {
  if (embedded) return embedded;
  if (id === null || id === undefined) return null;
  return idiomas.find((idioma) => String(getIdiomaId(idioma)) === String(id)) || null;
};

export const parseDefinitionText = (value) => {
  const text = String(value || '').trim();
  const termino = text.match(/(?:Término|TÃ©rmino):\s*([^\n]+)/i)?.[1]?.trim() || '';
  const origen = text.match(/Origen:\s*([\s\S]*?)(?=\n?Destino:|$)/i)?.[1]?.trim() || '';
  const destino = text.match(/Destino:\s*([\s\S]*)$/i)?.[1]?.trim() || '';

  if (!termino && !origen && !destino) {
    return { termino: '', origen: '', destino: text, raw: text };
  }
  return { termino, origen, destino, raw: text };
};

const getVisibleTranslationContext = (value) => {
  const context = String(value || '').trim();
  return /^Traducción de .+(?: al español| como .+)\.?$/iu.test(context) ? '' : context;
};

export const getWordTranslations = (palabra, idiomas = []) => {
  const translations = [];
  const relations = palabra?.traduccionesOrigen || palabra?.traducciones_origen || [];

  relations.forEach((relation) => {
    const destination = relation.palabraDestino || relation.palabra_destino;
    if (!destination) return;
    const idioma = findIdioma(
      idiomas,
      destination.idioma_id || destination.idiomas_id,
      destination.idioma
    );
    const destinationLanguageId = getIdiomaId(idioma);
    const sourceLanguageId = palabra?.idioma_id ?? palabra?.idiomas_id ?? getIdiomaId(palabra?.idioma);
    const destinationDefinition = (destination.definiciones || []).find(
      (definition) => String(definition.idioma_definicion_id) === String(destinationLanguageId)
    );
    const legacyDestinationDefinition = (palabra?.definiciones || []).find(
      (definition) => String(definition.idioma_definicion_id) === String(destinationLanguageId)
    );
    const sourceDefinition = (palabra?.definiciones || []).find(
      (definition) => String(definition.idioma_definicion_id) === String(sourceLanguageId)
    );
    const examples = (palabra?.ejemplos || []).filter((example) =>
      !example.idioma_significado_id || String(example.idioma_significado_id) === String(destinationLanguageId)
    );
    translations.push({
      key: `translation-${relation.traduccion_palabra_id || relation.id}`,
      termino: destination.termino,
      definicion: destinationDefinition?.definicion || legacyDestinationDefinition?.definicion || getVisibleTranslationContext(relation.contexto),
      definicionOrigen: sourceDefinition?.definicion || '',
      ejemplos: examples,
      idioma,
      estado: relation.estado,
      principal: relation.es_principal,
      creadoPor: relation.creadoPor || relation.creado_por || palabra?.creadoPor || palabra?.creado_por || null,
      creadoEn: relation.creado_en || palabra?.creado_en || null,
    });
  });

  (palabra?.definiciones || []).forEach((definition, index) => {
    const parsed = parseDefinitionText(definition.definicion);
    const idioma = findIdioma(
      idiomas,
      definition.idioma_definicion_id,
      definition.idioma
    );
    const sourceLanguageId = palabra?.idioma_id ?? palabra?.idiomas_id ?? getIdiomaId(palabra?.idioma);
    if (String(getIdiomaId(idioma)) === String(sourceLanguageId)) return;
    translations.push({
      key: `definition-${definition.definicion_id || definition.id || index}`,
      termino: parsed.termino || parsed.destino || definition.definicion,
      definicion: parsed.destino || parsed.raw,
      definicionOrigen: parsed.origen,
      idioma,
      estado: definition.estado,
      definition,
      creadoPor: palabra?.creadoPor || palabra?.creado_por || null,
      creadoEn: palabra?.creado_en || null,
    });
  });

  return translations.filter(
    (item, index, list) =>
      index === list.findIndex(
        (candidate) =>
          String(candidate.termino).toLocaleLowerCase() === String(item.termino).toLocaleLowerCase() &&
          String(getIdiomaId(candidate.idioma)) === String(getIdiomaId(item.idioma))
      )
  );
};
