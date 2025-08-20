'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { FaTwitter, FaInstagram, FaYoutube, FaFacebook, FaTiktok } from 'react-icons/fa';
import { UploadedFile, ProcessingResult } from '@/app/types';
import ProcessingPipeline from './ProcessingPipeline';

interface ResultDisplayProps {
  file: UploadedFile;
  onComplete: (id: string, result: ProcessingResult) => void;
  onStatusUpdate: (id: string, status: UploadedFile['status']) => void;
}

export default function ResultDisplay({
  file,
  onComplete,
  onStatusUpdate,
}: ResultDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getJudgmentIcon = (judgment: string) => {
    switch (judgment) {
      case '○':
        return <CheckCircleIcon className="w-8 h-8 text-green-400" />;
      case '×':
        return <XCircleIcon className="w-8 h-8 text-red-400" />;
      case '?':
        return <ExclamationCircleIcon className="w-8 h-8 text-green-300" />;  // 黄色→緑系に変更
      default:
        return <ClockIcon className="w-8 h-8 text-gray-400" />;
    }
  };

  const getJudgmentColor = (judgment: string) => {
    switch (judgment) {
      case '○':
        return 'from-green-500 to-emerald-600';
      case '×':
        return 'from-red-500 to-rose-600';
      case '?':
        return 'from-green-400 to-emerald-500';  // 黄色→緑系に変更（基本問題なし扱い）
      default:
        return 'from-gray-500 to-slate-600';
    }
  };

  const getJudgmentBg = (judgment: string) => {
    switch (judgment) {
      case '○':
        return 'bg-green-500/10 border-green-500/30';
      case '×':
        return 'bg-red-500/10 border-red-500/30';
      case '?':
        return 'bg-green-400/10 border-green-400/30';  // 黄色→緑系に変更
      default:
        return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const getSocialIcon = (domain: string) => {
    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      return <FaTwitter className="w-4 h-4 text-blue-400" />;
    }
    if (domain.includes('instagram.com')) {
      return <FaInstagram className="w-4 h-4 text-pink-400" />;
    }
    if (domain.includes('youtube.com')) {
      return <FaYoutube className="w-4 h-4 text-red-400" />;
    }
    if (domain.includes('facebook.com')) {
      return <FaFacebook className="w-4 h-4 text-blue-600" />;
    }
    if (domain.includes('tiktok.com')) {
      return <FaTiktok className="w-4 h-4 text-gray-800" />;
    }
    return <GlobeAltIcon className="w-4 h-4 text-gray-400" />;
  };

  const getDomainIcon = (isOfficial: boolean, domain: string) => {
    if (isOfficial) {
      return <ShieldCheckIcon className="w-4 h-4 text-green-400" />;
    }
    if (domain.includes('twitter.com') || domain.includes('instagram.com') ||
        domain.includes('youtube.com') || domain.includes('facebook.com') ||
        domain.includes('tiktok.com')) {
      return <UserGroupIcon className="w-4 h-4 text-blue-400" />;
    }
    return <ExclamationCircleIcon className="w-4 h-4 text-green-300" />;
  };

  const getFavicon = (domain: string) => {
    // より確実なfavicon取得方法
    try {
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
      return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=32`;
    } catch {
      // フォールバック: デフォルトアイコン
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNjM2Njc4IiByeD0iNCIvPgo8cGF0aCBkPSJNMTYgOGE4IDggMCAxIDEgMCAxNiA4IDggMCAwIDEgMC0xNnoiIGZpbGw9IiNBM0E4QjgiLz4KPHN2Zz4K';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-effect-dark rounded-2xl p-6 hover-lift"
    >
      <div className="flex items-start space-x-6">
        {/* サムネイル */}
        <motion.div
          className="flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative">
            <img
              src={file.preview}
              alt={file.file.name}
              className="w-32 h-32 object-cover rounded-2xl shadow-xl border-2 border-slate-600"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
          </div>
        </motion.div>

        {/* メイン内容 */}
        <div className="flex-grow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 truncate max-w-xs">
                {file.file.name}
              </h3>
              <div className="flex items-center space-x-2 text-slate-400 text-sm">
                <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>•</span>
                <span>{file.file.type}</span>
              </div>
            </div>

            {/* ステータス表示 */}
            {file.status === 'completed' && file.result && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-xl border
                  ${getJudgmentBg(file.result.judgment)}
                `}
              >
                {getJudgmentIcon(file.result.judgment)}
                <span className="font-bold text-white text-lg">
                  {file.result.judgment === '○' ? '問題なし' :
                   file.result.judgment === '×' ? '違法確定' : '判定保留'}
                </span>
              </motion.div>
            )}
          </div>

          {/* 待機状態 */}
          {file.status === 'waiting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-3 text-slate-300"
            >
              <ClockIcon className="w-5 h-5 animate-pulse" />
              <span>処理待機中...</span>
            </motion.div>
          )}

          {/* 処理中 */}
          {file.status === 'processing' && (
            <ProcessingPipeline
              file={file}
              onComplete={onComplete}
              onStatusUpdate={onStatusUpdate}
            />
          )}

          {/* 完了状態 */}
          {file.status === 'completed' && file.result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* 判定理由 */}
              <div className={`
                p-4 rounded-xl border backdrop-blur-sm
                ${getJudgmentBg(file.result.judgment)}
              `}>
                <p className="text-white font-medium">
                  {file.result.reason}
                </p>
              </div>

              {/* 検索結果 */}
              {file.result.searchResults && file.result.searchResults.length > 0 && (
                <div>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center space-x-2 w-full text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800/70 transition-all duration-200"
                  >
                    <LinkIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">
                      検出されたリンク ({file.result.searchResults.length}件)
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-auto"
                    >
                      <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-3 space-y-2 overflow-hidden"
                      >
                        {file.result.searchResults.map((result, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-slate-800/30 rounded-xl p-4 hover:bg-slate-800/50 transition-all duration-200 border border-slate-700/50"
                          >
                            <div className="flex items-start space-x-4">
                              {/* ファビコン */}
                              <div className="flex-shrink-0">
                                <img
                                  src={getFavicon(result.domain)}
                                  alt={`${result.domain} favicon`}
                                  className="w-8 h-8 rounded"
                                  onError={(e) => {
                                    // フォールバック画像を設定
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNjM2NjY4IiByeD0iNCIvPgo8cGF0aCBkPSJNMTYgOGE4IDggMCAxIDEgMCAxNiA4IDggMCAwIDEgMC0xNnoiIGZpbGw9IiNBM0E4QjgiLz4KPHN2Zz4K';
                                  }}
                                />
                              </div>

                              <div className="flex-grow min-w-0">
                                {/* ドメイン情報 */}
                                <div className="flex items-center space-x-2 mb-2">
                                  {getDomainIcon(result.isOfficial, result.domain)}
                                  <span className="text-white font-medium">
                                    {result.domain}
                                  </span>
                                  <span className={`
                                    px-2 py-1 rounded-full text-xs font-medium
                                    ${result.isOfficial
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    }
                                  `}>
                                    {result.isOfficial ? '公式' : '非公式'}
                                  </span>
                                  {getSocialIcon(result.domain)}
                                </div>

                                {/* URL リンク */}
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                                >
                                  <span className="truncate text-sm">
                                    {result.url}
                                  </span>
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                                </a>

                                {/* マッチタイプ */}
                                <div className="mt-2 flex items-center space-x-2">
                                  <span className="text-xs text-slate-400">マッチタイプ:</span>
                                  <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                                    {result.matchType === 'exact' ? '完全一致' :
                                     result.matchType === 'partial' ? '部分一致' : '関連画像'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* タイムスタンプ */}
              <div className="text-xs text-slate-500 text-right">
                判定完了: {file.result.timestamp.toLocaleString('ja-JP')}
              </div>
            </motion.div>
          )}

          {/* エラー状態 */}
          {file.status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center space-x-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
            >
              <XCircleIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">エラーが発生しました</p>
                <p className="text-red-300 text-sm">ファイルを再度アップロードしてください</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}