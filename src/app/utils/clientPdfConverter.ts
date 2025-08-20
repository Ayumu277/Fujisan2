'use client';

// クライアントサイド専用のPDF変換ユーティリティ
export async function convertPdfToImagesClient(file: File): Promise<Blob[]> {
  try {
    // PDF.js 5.4.54用の最新設定
    const pdfjsLib = await import('pdfjs-dist');

    // Worker設定（5.4.54対応）
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('PDF.js version:', pdfjsLib.version);
      console.log('Worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    }

    const images: Blob[] = [];
    const arrayBuffer = await file.arrayBuffer();

    // PDF.js 5.4.54用の設定
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0,  // ログレベルを最小に
      isEvalSupported: false  // セキュリティ向上
    });

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

             // PDFページをcanvasに描画（5.4.54対応）
       const renderContext = {
         canvasContext: context,
         viewport: viewport,
         canvas: canvas,
         intent: 'display'  // 表示用に最適化
       };

      await page.render(renderContext).promise;

             // CanvasをBlobに変換（高品質PNG）
       const blob = await new Promise<Blob>((resolve, reject) => {
         canvas.toBlob((blob) => {
           if (blob) {
             resolve(blob);
           } else {
             reject(new Error('Canvas to blob conversion failed'));
           }
         }, 'image/png');  // PNG無損失圧縮
       });

      images.push(blob);
    }

    // PDFリソースをクリーンアップ
    await pdf.destroy();

    console.log(`✅ PDF変換完了: ${images.length} pages → PNG images`);
    return images;

  } catch (error) {
    console.error('❌ PDF conversion error:', error);
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