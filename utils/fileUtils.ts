// Add this declaration to inform TypeScript about the global JSZip object from the CDN
declare const JSZip: any;

export const downloadFile = (filename: string, content: string | Blob, mimeType: string, isBase64: boolean = false) => {
  const blob = isBase64 && typeof content === 'string'
    ? base64ToBlob(content, mimeType)
    : content instanceof Blob ? content : new Blob([content], { type: mimeType });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export const fetchImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read blob as base64 string.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


interface FileForZip {
  name: string;
  content: string;
  isBase64?: boolean;
}

export const zipAndDownloadFiles = async (zipFileName: string, files: FileForZip[]) => {
  const zip = new JSZip();
  
  files.forEach(file => {
    if (file.isBase64) {
      // JSZip can handle base64 strings directly
      zip.file(file.name, file.content, { base64: true });
    } else {
      zip.file(file.name, file.content);
    }
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadFile(`${zipFileName}.zip`, zipBlob, 'application/zip');
};
