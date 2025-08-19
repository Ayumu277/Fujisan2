'use client';

// クライアントサイド専用のPDF変換ユーティリティ
export async function convertPdfToImagesClient(file: File): Promise<Blob[]> {
  // PDF.jsをクライアントサイドでのみ動的にインポート
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

  const images: Blob[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    console.log(`PDF loaded: ${pdf.numPages} pages`);

    // 各ページを画像に変換
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      
      // スケールを設定（解像度）
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      // Canvas要素を作成
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context could not be created');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // PDFページをcanvasに描画
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;

      // CanvasをBlobに変換
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            throw new Error('Canvas to blob conversion failed');
          }
        }, 'image/jpeg', 0.8);
      });

      images.push(blob);
    }

    console.log(`Converted ${images.length} pages to images`);
    return images;
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`PDF変換に失敗しました: ${(error as Error).message}`);
  }
}

export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type);
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}