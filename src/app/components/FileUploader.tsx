'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudArrowUpIcon, DocumentIcon, PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { UploadedFile } from '@/app/types';

interface FileUploaderProps {
  onFilesSelected: (files: UploadedFile[]) => void;
}

export default function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);

    // 🔍 デバッグ: アップロードされたファイルの詳細をログ
    console.log('=== ファイルアップロード詳細 ===');
    files.forEach((file, index) => {
      console.log(`📄 ファイル ${index + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeKB: Math.round(file.size / 1024),
        lastModified: new Date(file.lastModified).toISOString(),
        isPDF: file.type === 'application/pdf',
        isImage: file.type.startsWith('image/')
      });
    });

    await new Promise(resolve => setTimeout(resolve, 800)); // スムーズなアニメーションのための短い遅延

    // ファイルごとにプレビューを生成
    const uploadedFiles: UploadedFile[] = await Promise.all(
      files.map(async (file) => {
        let preview: string;

        if (file.type === 'application/pdf') {
          // PDFの場合は最初のページを画像として変換
          console.log(`🔧 PDFプレビュー生成中: ${file.name}`);
          preview = await generatePdfPreview(file);
          console.log(`✅ PDFプレビュー生成完了: ${file.name}`);
        } else {
          // 画像ファイルの場合は従来通り
          preview = URL.createObjectURL(file);
        }

        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          status: 'waiting' as const,
        };
      })
    );

    console.log(`✅ ${uploadedFiles.length} ファイルの処理準備完了`);
    onFilesSelected(uploadedFiles);
    setIsProcessing(false);
  }, [onFilesSelected, setIsProcessing]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        processFiles(selectedFiles);
      }
    },
    [processFiles]
  );

  const generatePdfPreview = async (file: File): Promise<string> => {
    try {
      // PDF.jsを使用してPDFの最初のページを画像として変換
      const pdfjsLib = await import('pdfjs-dist');

      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
        isEvalSupported: false
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // 最初のページ

      const scale = 1.0; // プレビュー用は低解像度でOK
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context could not be created');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
        intent: 'display'
      };

      await page.render(renderContext).promise;
      await pdf.destroy();

      // CanvasをBlobに変換してオブジェクトURL生成
      return new Promise<string>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Canvas to blob conversion failed'));
          }
        }, 'image/jpeg', 0.8);
      });
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      // フォールバック: デフォルトのPDFアイコン的な何かを返す
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMzc0MTUxIiByeD0iOCIvPgo8cGF0aCBkPSJNMzIgMzJoNjR2NjRIMzJ6IiBmaWxsPSIjNkI3MjgwIi8+Cjx0ZXh0IHg9IjY0IiB5PSI3MiIgZmlsbD0iI0Y5RkFGQiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QREY8L3RleHQ+Cjwvc3ZnPgo=';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`
            relative overflow-hidden
            glass-effect-dark rounded-3xl p-12 text-center
            border-2 border-dashed transition-all duration-500 ease-out
            hover-lift hover:scale-[1.02]
            ${isDragOver
              ? 'border-blue-400 bg-blue-500/10 shadow-blue-500/25 shadow-2xl'
              : 'border-slate-600 hover:border-slate-500'
            }
            ${isProcessing ? 'pointer-events-none' : 'cursor-pointer'}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 背景アニメーション */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-20 h-20 bg-blue-500 rounded-full blur-xl animate-float" />
            <div className="absolute bottom-10 right-10 w-16 h-16 bg-purple-500 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-pink-500 rounded-full blur-lg animate-float" style={{ animationDelay: '4s' }} />
          </div>

          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-500" />
                  <SparklesIcon className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-xl font-semibold text-blue-400">ファイルを処理中...</p>
                <p className="text-sm text-slate-400 mt-2">AI検出システムに送信しています</p>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative z-10"
              >
                <motion.div
                  className="mb-8"
                  animate={{ y: isDragOver ? -10 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative inline-block">
                    <CloudArrowUpIcon className="w-20 h-20 text-blue-400 mx-auto mb-4 drop-shadow-lg" />
                    {isDragOver && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl"
                      />
                    )}
                  </div>

                  <div className="flex justify-center space-x-4 mb-6">
                    <div className="flex items-center space-x-2 bg-slate-800/50 rounded-full px-4 py-2">
                      <PhotoIcon className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-slate-300">画像</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-800/50 rounded-full px-4 py-2">
                      <DocumentIcon className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-slate-300">PDF</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ scale: isDragOver ? 1.05 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {isDragOver ? 'ここにファイルをドロップ!' : 'ファイルをアップロード'}
                  </h3>
                  <p className="text-slate-300 mb-6">
                    画像またはPDFをドラッグ&ドロップ、または下のボタンから選択
                  </p>

                  <label className="cursor-pointer group">
                    <motion.span
                      className="btn-primary inline-flex items-center space-x-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CloudArrowUpIcon className="w-5 h-5" />
                      <span>ファイルを選択</span>
                    </motion.span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileInput}
                    />
                  </label>

                  <div className="mt-6 text-sm text-slate-400">
                    <p className="mb-1">対応形式</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['JPEG', 'PNG', 'GIF', 'WebP', 'PDF'].map((format) => (
                        <span
                          key={format}
                          className="bg-slate-700/50 px-2 py-1 rounded text-xs border border-slate-600"
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ドラッグオーバー時のオーバーレイ効果 */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-500/10 rounded-3xl border-2 border-blue-400 pointer-events-none"
              style={{ backdropFilter: 'blur(4px)' }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}