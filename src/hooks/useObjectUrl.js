import { useEffect, useState } from 'react';

/** URL temporal para previsualizar un archivo local; se libera al cambiar o desmontar. */
export const useObjectUrl = (file) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) { setUrl(null); return undefined; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
};
