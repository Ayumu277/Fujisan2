export async function convertPdfToImages(file: File): Promise<Blob[]> {
  // クライアントサイド専用のPDF変換を動的にインポート
  if (typeof window === 'undefined') {
    throw new Error('PDF変換はクライアントサイドでのみ実行できます');
  }

  const { convertPdfToImagesClient } = await import('./clientPdfConverter');
  return convertPdfToImagesClient(file);
}

export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type);
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export async function processFile(file: File): Promise<Blob[]> {
  if (isImageFile(file)) {
    return [file];
  } else if (isPdfFile(file)) {
    return await convertPdfToImages(file);
  } else {
    throw new Error('サポートされていないファイル形式です');
  }
}