const WHITE_LOGO_URL = '/RimaqMasi%20EDU%20White.svg';
let whiteLogoPromise;

export const loadWhitePdfLogo = () => {
  if (whiteLogoPromise) return whiteLogoPromise;

  whiteLogoPromise = new Promise((resolve) => {
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
