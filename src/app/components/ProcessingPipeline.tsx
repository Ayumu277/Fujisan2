'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeIcon, 
  MagnifyingGlassIcon, 
  CpuChipIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { UploadedFile, ProcessingResult, SearchResult } from '@/app/types';
import { classifyDomain, extractDomain } from '@/app/utils/domainChecker';
import { processFile } from '@/app/utils/pdfConverter';

interface ProcessingPipelineProps {
  file: UploadedFile;
  onComplete: (id: string, result: ProcessingResult) => void;
  onStatusUpdate: (id: string, status: UploadedFile['status']) => void;
}

export default function ProcessingPipeline({
  file,
  onComplete,
  onStatusUpdate,
}: ProcessingPipelineProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [stepDetails, setStepDetails] = useState('');

  useEffect(() => {
    processPipeline();
  }, [file.id]);

  const processPipeline = async () => {
    try {
      onStatusUpdate(file.id, 'processing');
      setCurrentStep('preparation');
      setStepDetails('ファイルの前処理を開始しています...');
      setProgress(5);

      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 1: ファイル処理（PDF変換含む）
      setCurrentStep('conversion');
      setStepDetails('ファイルを画像形式に変換しています...');
      setProgress(15);
      
      const processedFiles = await processFile(file.file);
      setProgress(25);

      // Step 2: Google Vision API呼び出し
      setCurrentStep('vision');
      setStepDetails('Google Vision APIで画像を解析しています...');
      setProgress(35);
      
      const formData = new FormData();
      formData.append('image', processedFiles[0]);

      const visionResponse = await fetch('/api/vision', {
        method: 'POST',
        body: formData,
      });

      const visionData = await visionResponse.json();
      setProgress(50);

// エラーチェック
if (visionData.error) {
  throw new Error(visionData.error);
}

if (!visionData.urls || visionData.urls.length === 0) {
  // 検索結果がない場合
  const result: ProcessingResult = {
    judgment: '?',
    reason: visionData.message || '画像の一致が見つかりませんでした',
    searchResults: [],
    timestamp: new Date(),
  };
  setProgress(100);
  onStatusUpdate(file.id, 'completed');
  onComplete(file.id, result);
  return;
}

      // Step 3: URL分析と判定
      setCurrentStep('analysis');
      setStepDetails('検出されたURLを分析しています...');
      setProgress(65);
      
      const searchResults: SearchResult[] = [];
      let finalJudgment: ProcessingResult['judgment'] = '○';
      let finalReason = '';

      for (const url of visionData.urls) {
        const domain = extractDomain(url);
        const classification = classifyDomain(url);

        searchResults.push({
          url,
          domain,
          isOfficial: classification === 'official',
          matchType: 'exact', // TODO: Vision APIから実際のmatchTypeを取得
        });

        if (classification === 'official') {
          // 公式ドメインなら即○
          finalJudgment = '○';
          finalReason = `公式ドメイン (${domain}) で確認されました`;
          break;
        } else if (classification === 'social' || classification === 'unofficial') {
          // Gemini APIで詳細分析
          setCurrentStep('gemini');
          setStepDetails('AI分析エンジンで詳細判定しています...');
          setProgress(80);
          
          const geminiResponse = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              isSnS: classification === 'social',
            }),
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            if (geminiData.judgment === '×') {
              finalJudgment = '×';
              finalReason = geminiData.reason;
              break;
            } else if (geminiData.judgment === '?') {
              finalJudgment = '?';
              finalReason = geminiData.reason;
            }
          }
        }
      }

      // 最終結果の準備
      setCurrentStep('finalizing');
      setStepDetails('結果をまとめています...');
      setProgress(95);

      // 結果が設定されていない場合のデフォルト
      if (!finalReason) {
        if (searchResults.length === 0) {
          finalJudgment = '?';
          finalReason = '画像の一致が見つかりませんでした';
        } else {
          finalReason = '問題のある転載は検出されませんでした';
        }
      }

      const result: ProcessingResult = {
        judgment: finalJudgment,
        reason: finalReason,
        searchResults,
        timestamp: new Date(),
      };

      setProgress(100);
      onStatusUpdate(file.id, 'completed');
      onComplete(file.id, result);
    } catch (error) {
      console.error('Pipeline error:', error);
      onStatusUpdate(file.id, 'error');
      onComplete(file.id, {
        judgment: '?',
        reason: 'エラーが発生しました: ' + (error as Error).message,
        timestamp: new Date(),
      });
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'preparation':
      case 'conversion':
        return <EyeIcon className="w-6 h-6" />;
      case 'vision':
        return <MagnifyingGlassIcon className="w-6 h-6" />;
      case 'analysis':
      case 'gemini':
        return <CpuChipIcon className="w-6 h-6" />;
      case 'finalizing':
        return <CheckCircleIcon className="w-6 h-6" />;
      default:
        return <EyeIcon className="w-6 h-6" />;
    }
  };

  const steps = [
    { id: 'preparation', label: 'ファイル準備', description: 'ファイルの前処理' },
    { id: 'conversion', label: 'ファイル変換', description: 'PDF→画像変換' },
    { id: 'vision', label: 'Vision API', description: '画像解析・検索' },
    { id: 'analysis', label: 'URL分析', description: 'ドメイン分析' },
    { id: 'gemini', label: 'AI判定', description: '最終判定' },
    { id: 'finalizing', label: '結果作成', description: '結果のまとめ' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-effect-dark rounded-2xl p-8 max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="text-white">
            {getStepIcon(currentStep)}
          </div>
        </motion.div>

        <h3 className="text-xl font-bold text-white mb-2">AI検出システム実行中</h3>
        <p className="text-slate-300 text-sm mb-4">{stepDetails}</p>

        {/* プログレスバー */}
        <div className="w-full bg-slate-700/50 rounded-full h-3 mb-6">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="absolute inset-0 shimmer" />
          </motion.div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">進捗</span>
          <span className="text-blue-400 font-semibold">{progress}%</span>
        </div>
      </div>

      {/* ステップ一覧 */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
          
          return (
            <motion.div
              key={step.id}
              className={`
                flex items-center space-x-3 p-3 rounded-xl transition-all duration-300
                ${isActive ? 'bg-blue-500/20 border border-blue-500/30' : 
                  isCompleted ? 'bg-green-500/10 border border-green-500/20' : 
                  'bg-slate-800/30 border border-slate-700/50'}
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                ${isActive ? 'bg-blue-500 text-white' : 
                  isCompleted ? 'bg-green-500 text-white' : 
                  'bg-slate-600 text-slate-400'}
              `}>
                {isCompleted ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <div className={`font-medium ${
                  isActive ? 'text-blue-400' : 
                  isCompleted ? 'text-green-400' : 
                  'text-slate-400'
                }`}>
                  {step.label}
                </div>
                <div className="text-xs text-slate-500">{step.description}</div>
              </div>

              {isActive && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}