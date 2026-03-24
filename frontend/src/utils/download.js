import api from '../api/axios';

export async function downloadPdf(url, filename = 'file.pdf') {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

