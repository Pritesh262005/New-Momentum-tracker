import api from '../api/axios';

export async function downloadFile(url, filename = 'file', mimeType = null) {
  const res = await api.get(url, { responseType: 'blob' });
  const type = mimeType || res.headers?.['content-type'] || 'application/octet-stream';
  const blob = new Blob([res.data], { type });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadPdf(url, filename = 'file.pdf') {
  return downloadFile(url, filename, 'application/pdf');
}
