'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  EyeIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import FileUploader from './components/FileUploader';
import ResultDisplay from './components/ResultDisplay';
import { UploadedFile, ProcessingResult } from './types';

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [history, setHistory] = useState<Array<UploadedFile & { result: ProcessingResult }>>([]);

  // ファイルが追加されたら自動的に処理を開始
  useEffect(() => {
    files.forEach(file => {
      if (file.status === 'waiting') {
        handleStatusUpdate(file.id, 'processing');
      }
    });
  }, [files]);

  const handleFilesSelected = (newFiles: UploadedFile[]) => {
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleComplete = (id: string, result: ProcessingResult) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === id ? { ...file, result } : file
      )
    );

    // 履歴に追加
    const completedFile = files.find(f => f.id === id);
    if (completedFile) {
      setHistory(prev => [...prev, { ...completedFile, result }]);
    }
  };

  const handleStatusUpdate = (id: string, status: UploadedFile['status']) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === id ? { ...file, status } : file
      )
    );
  };

  const getTotalStats = () => {
    const completed = files.filter(f => f.status === 'completed');
    const ok = completed.filter(f => f.result?.judgment === '○').length;
    const ng = completed.filter(f => f.result?.judgment === '×').length;
    const suspicious = completed.filter(f => f.result?.judgment === '△').length;
    const unknown = completed.filter(f => f.result?.judgment === '?').length;
    return { total: files.length, completed: completed.length, ok, ng, suspicious, unknown };
  };

  const stats = getTotalStats();

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="container mx-auto">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="mr-4"
            >
              <SparklesIcon className="w-12 h-12 text-blue-400" />
            </motion.div>
            <motion.h1
              className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            >
              AI違法転載検出システム
            </motion.h1>
          </div>

          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            最先端のAI技術で画像・PDF内の違法転載を瞬時に検出。
            <br />
            Vision API + Gemini AIによる高精度な判定システム
          </motion.p>

          {/* 機能紹介 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center space-x-8 mb-8"
          >
            <div className="flex flex-col items-center text-slate-300">
              <EyeIcon className="w-8 h-8 text-blue-400 mb-2" />
              <span className="text-sm font-medium">画像解析</span>
            </div>
            <div className="flex flex-col items-center text-slate-300">
              <CpuChipIcon className="w-8 h-8 text-purple-400 mb-2" />
              <span className="text-sm font-medium">AI判定</span>
            </div>
            <div className="flex flex-col items-center text-slate-300">
              <ShieldCheckIcon className="w-8 h-8 text-green-400 mb-2" />
              <span className="text-sm font-medium">安全確認</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ファイルアップロード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <FileUploader onFilesSelected={handleFilesSelected} />
        </motion.div>

        {/* 統計情報 */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <div className="glass-effect-dark rounded-2xl p-8 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 mr-2" />
                  検出統計
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                  >
                    <div className="text-3xl font-bold text-slate-200 mb-1">{stats.total}</div>
                    <div className="text-sm text-slate-400">総ファイル数</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/30"
                  >
                    <div className="text-3xl font-bold text-green-400 mb-1">{stats.ok}</div>
                    <div className="text-sm text-green-300 flex items-center justify-center">
                      <ShieldCheckIcon className="w-4 h-4 mr-1" />
                      問題なし
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-red-500/10 rounded-xl border border-red-500/30"
                  >
                    <div className="text-3xl font-bold text-red-400 mb-1">{stats.ng}</div>
                    <div className="text-sm text-red-300 flex items-center justify-center">
                      <XCircleIcon className="w-4 h-4 mr-1" />
                      違法転載
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30"
                  >
                    <div className="text-3xl font-bold text-yellow-400 mb-1">{stats.suspicious}</div>
                    <div className="text-sm text-yellow-300 flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      疑わしい
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-gray-500/10 rounded-xl border border-gray-500/30"
                  >
                    <div className="text-3xl font-bold text-gray-400 mb-1">{stats.unknown}</div>
                    <div className="text-sm text-gray-300 flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      分析不可
                    </div>
                  </motion.div>
                </div>

                {/* プログレスバー */}
                {stats.total > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>処理進捗</span>
                      <span>{stats.completed}/{stats.total} 完了</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.completed / stats.total) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 処理結果一覧 */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto"
            >
              <motion.h2
                className="text-2xl font-bold text-white mb-8 flex items-center"
                initial={{ x: -20 }}
                animate={{ x: 0 }}
              >
                <EyeIcon className="w-6 h-6 mr-2 text-blue-400" />
                検出結果
              </motion.h2>

              <div className="space-y-6">
                <AnimatePresence>
                  {files.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ResultDisplay
                        file={file}
                        onComplete={handleComplete}
                        onStatusUpdate={handleStatusUpdate}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ダウンロードボタン */}
        <AnimatePresence>
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 text-center"
            >
              <motion.button
                onClick={() => {
                  const dataStr = JSON.stringify(history, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `detection-history-${new Date().toISOString().slice(0,10)}.json`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="btn-secondary inline-flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>検出履歴をダウンロード</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}