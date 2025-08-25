'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  EyeIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { UploadedFile, ProcessingResult, SearchResult, VisionAPIResponse, GeminiImageComparisonRequest, GeminiImageComparisonResponse } from '@/app/types';
import { classifyDomain, extractDomain, getDetailedDomainType, getInitialJudgment, isPremiumOfficialDomain, isSNSDomain, extractSNSInfo, isImageFile } from '@/app/utils/domainChecker';
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
  const [analyzingUrls, setAnalyzingUrls] = useState<{url: string; status: 'pending' | 'analyzing' | 'done'}[]>([]);

  useEffect(() => {
    processPipeline();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const processPipeline = useCallback(async () => {
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

      // 🎯 元画像のBase64データを保存（画像比較用）
      const originalImageBuffer = await processedFiles[0].arrayBuffer();
      const originalImageBase64 = Buffer.from(originalImageBuffer).toString('base64');

      const formData = new FormData();
      formData.append('image', processedFiles[0]);

      const visionResponse = await fetch('/api/vision', {
        method: 'POST',
        body: formData,
      });

      const visionData: VisionAPIResponse = await visionResponse.json();
      setProgress(50);

// エラーチェック
if (visionData.error) {
  throw new Error(visionData.error);
}

if (!visionData.urls || visionData.urls.length === 0) {
  // 検索結果がない場合
  const result: ProcessingResult = {
    judgment: '○',
    reason: '検出画像なし',
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

      // マッチタイプ別統計情報をログ出力
      if (visionData.urlsWithMatchType) {
        const matchTypeStats = {
          exact: visionData.urlsWithMatchType.filter((item) => item && item.matchType === 'exact').length,
          partial: visionData.urlsWithMatchType.filter((item) => item && item.matchType === 'partial').length,
        };
        console.log('🎯 マッチタイプ別統計:', matchTypeStats);
        setStepDetails(`検出結果: 完全${matchTypeStats.exact}件, 部分${matchTypeStats.partial}件`);
      }

      // URLリストを初期化
      const urlStatusList = visionData.urls.map((url: string) => ({
        url,
        status: 'pending' as const
      }));
      setAnalyzingUrls(urlStatusList);

      // URLの分類とGeminiAPI呼び出しの準備
      const urlAnalysisTasks = visionData.urls.map(async (url: string, index: number) => {
        // 🎯 画像ファイルの場合は即？判定
        if (isImageFile(url)) {
          const domain = extractDomain(url);
          const matchTypeInfo = visionData.urlsWithMatchType?.find((item) => item && item.url === url);
          const matchType = matchTypeInfo?.matchType || 'exact';

          const searchResult: SearchResult = {
            url,
            domain,
            domainType: '画像ファイル',
            initialJudgment: '?',
            finalJudgment: '?',
            analysisComment: '画像ファイルのため分析不可',
            supplement: '直接画像URLは判定対象外',
            isOfficial: false,
            matchType: matchType,
          };

          return {
            searchResult,
            judgment: '?' as ProcessingResult['judgment'],
            reason: `画像ファイル (${domain})`,
            isOfficial: false
          };
        }

        const domain = extractDomain(url);
        const classification = classifyDomain(url);

        // マッチタイプを取得（urlsWithMatchTypeから該当URLのmatchTypeを検索）
        const matchTypeInfo = visionData.urlsWithMatchType?.find((item) => item && item.url === url);
        const matchType = matchTypeInfo?.matchType || 'exact'; // デフォルトは'exact'

        // 🎯 新しいロジックでSearchResultを構築
        const domainType = getDetailedDomainType(domain);
        const initialJudgment = getInitialJudgment(url);

        const searchResult: SearchResult = {
          url,
          domain,
          domainType,
          initialJudgment,
          finalJudgment: initialJudgment,  // 初期値として設定
          analysisComment: '分析中...',
          supplement: '',
          isOfficial: classification === 'official' || classification === 'premium-official',
          matchType: matchType,
        };

        // 🎯 特別公式サイトの場合（問答無用で○、Gemini分析スキップ）
        if (classification === 'premium-official') {
          searchResult.finalJudgment = '○';
          searchResult.analysisComment = '特別公式サイト';
          return {
            searchResult,
            judgment: '○' as ProcessingResult['judgment'],
            reason: `特別公式サイト (${domain}) で確認されました`,
            isOfficial: true
          };
        }

        // 通常公式ドメインの場合
        if (classification === 'official') {
          searchResult.finalJudgment = '○';
          searchResult.analysisComment = '公式ドメイン';
          return {
            searchResult,
            judgment: '○' as ProcessingResult['judgment'],
            reason: `公式ドメイン (${domain}) で確認されました`,
            isOfficial: true
          };
        }

        // 🎯 SNS・疑わしいドメイン・非公式サイトの場合、まず画像比較実行
        if (classification === 'sns' || classification === 'suspicious' || classification === 'unofficial') {
          try {
            // Step 1: 画像比較を先に実行
            setAnalyzingUrls(prev => {
              const newList = [...prev];
              newList[index] = { url, status: 'analyzing' };
              return newList;
            });
            if (classification === 'sns') {
              setStepDetails(`SNS画像比較中: ${domain} (${domainType})`);
            } else {
              setStepDetails(`画像比較中: ${domain} (${domainType})`);
            }

            const imageComparisonResponse = await fetch('/api/gemini', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                requestType: 'image_comparison',
                originalImageBase64,
                detectedImageUrl: url,
                detectedDomain: domain,
              } as GeminiImageComparisonRequest),
            });

            if (imageComparisonResponse.ok) {
              const comparisonData: GeminiImageComparisonResponse = await imageComparisonResponse.json();
              console.log('🖼️ 画像比較結果:', comparisonData);

              // 🎯 画像が全く違う場合は即○判定
              if (comparisonData.similarity === 'different') {
                setAnalyzingUrls(prev => {
                  const newList = [...prev];
                  newList[index] = { url, status: 'done' };
                  return newList;
                });

                searchResult.finalJudgment = '○';
                searchResult.analysisComment = '異なる画像のため安全';
                searchResult.supplement = comparisonData.reason;

                return {
                  searchResult,
                  judgment: '○' as ProcessingResult['judgment'],
                  reason: `異なる画像のため安全 (${domain}): ${comparisonData.reason}`,
                  isOfficial: false
                };
              }

              // 🎯 画像が類似/同一の場合は詳細分析継続
              if (classification === 'sns') {
                setStepDetails(`SNS分析中: ${domain} (公式アカウント判定)`);
              } else {
                setStepDetails(`詳細AI分析中: ${domain} (類似画像検出)`);
              }
            }

            // Step 2: 詳細分析実行（SNS判定 or 画像比較失敗 or 類似/同一画像の場合）

            // 🎯 SNSの場合はURL情報を抽出
            const requestBody: {
              url: string;
              isSnS: boolean;
              snsInfo?: ReturnType<typeof extractSNSInfo>;
            } = {
              url,
              isSnS: classification === 'sns',
            };

            if (classification === 'sns') {
              const snsInfo = extractSNSInfo(url);
              requestBody.snsInfo = snsInfo;
              setStepDetails(`SNS分析中: ${snsInfo.description}`);
            }

            const geminiResponse = await fetch('/api/gemini', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json();
              // 分析完了を通知
              setAnalyzingUrls(prev => {
                const newList = [...prev];
                newList[index] = { url, status: 'done' };
                return newList;
              });

              // 🎯 Gemini分析結果をSearchResultに反映
              searchResult.finalJudgment = geminiData.judgment;
              searchResult.analysisComment = geminiData.reason;
              searchResult.supplement = geminiData.supplement || '';

              return {
                searchResult,
                judgment: geminiData.judgment as ProcessingResult['judgment'],
                reason: geminiData.reason,
                isOfficial: false
              };
            } else {
              // HTTPエラーの場合
              console.error(`Gemini API HTTP error for ${url}: ${geminiResponse.status}`);
              searchResult.finalJudgment = '△';
              searchResult.analysisComment = `AI分析エラー (${geminiResponse.status})`;
              return {
                searchResult,
                judgment: '△' as ProcessingResult['judgment'],
                reason: `AI分析でエラーが発生しました (${geminiResponse.status})`,
                isOfficial: false
              };
            }
          } catch (error) {
            console.error(`Gemini API error for ${url}:`, error);
            searchResult.finalJudgment = '△';
            searchResult.analysisComment = 'AI分析エラー';
            return {
              searchResult,
              judgment: '△' as ProcessingResult['judgment'],
              reason: 'AI分析でネットワークエラーが発生しました',
              isOfficial: false
            };
          }
        }

        // デフォルト：疑わしいとして判定
        searchResult.finalJudgment = '△';
        searchResult.analysisComment = '疑わしいドメイン';
        return {
          searchResult,
          judgment: '△' as ProcessingResult['judgment'],
          reason: `疑わしいドメイン (${domainType})`,
          isOfficial: false
        };
      });

      // Gemini分析の並列実行
      setCurrentStep('gemini');
      setStepDetails(`AI分析エンジンで${visionData.urls.length}件のURLを分析中...`);
      setProgress(80);

      // 全てのURL分析を並列実行
      const analysisResults = await Promise.all(urlAnalysisTasks);

      // 🎯 結果の集約（△が1つでもあれば全体を△に）
      let hasNegative = false;
      let hasSuspicious = false;
      let hasUnknown = false;
      let suspiciousCount = 0;
      let unknownCount = 0;

      for (const result of analysisResults) {
        searchResults.push(result.searchResult);

        // 判定の収集
        if (result.judgment === '×') {
          hasNegative = true;
          finalJudgment = '×';
          finalReason = result.reason;
          break; // ×が見つかったら即終了
        } else if (result.judgment === '△') {
          hasSuspicious = true;
          suspiciousCount++;
        } else if (result.judgment === '?') {
          hasUnknown = true;
          unknownCount++;
        }
      }

      // 🎯 新しい判定ロジック：△や？が1つでもあれば全体を△（疑わしいリンクを検出）
      if (!hasNegative) {
        if (hasSuspicious || hasUnknown) {
          finalJudgment = '△';
          finalReason = '疑わしいリンクを検出';
        } else {
          finalJudgment = '○';
          finalReason = '安全なリンクのみ検出されました';
        }
      }

      // 最終結果の準備
      setCurrentStep('finalizing');
      setStepDetails('結果をまとめています...');
      setProgress(95);

      // 結果が設定されていない場合のデフォルト
      if (!finalReason) {
        if (searchResults.length === 0) {
          finalJudgment = '△';
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
        judgment: '△',
        reason: 'エラーが発生しました: ' + (error as Error).message,
        timestamp: new Date(),
      });
    }
  }, [file, onStatusUpdate, onComplete]);

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

      {/* AI分析の進捗表示 */}
      {currentStep === 'gemini' && analyzingUrls.length > 0 && (
        <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">AI分析進捗</h4>
          <div className="space-y-2">
            {analyzingUrls.map((item, idx) => {
              // undefinedチェックを追加
              if (!item || !item.url) {
                return null;
              }
              const domain = item.url.match(/^https?:\/\/([^\/]+)/)?.[1] || item.url;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'done' ? 'bg-green-500' :
                    item.status === 'analyzing' ? 'bg-blue-500 animate-pulse' :
                    'bg-slate-600'
                  }`} />
                  <span className={`flex-1 truncate ${
                    item.status === 'done' ? 'text-green-400' :
                    item.status === 'analyzing' ? 'text-blue-400' :
                    'text-slate-500'
                  }`}>
                    {domain}
                  </span>
                  <span className="text-slate-600">
                    {item.status === 'done' ? '完了' :
                     item.status === 'analyzing' ? '分析中...' :
                     '待機中'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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