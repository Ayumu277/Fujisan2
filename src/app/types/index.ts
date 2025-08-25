export type ProcessStatus = 'waiting' | 'processing' | 'completed' | 'error';
export type JudgmentResult = '○' | '△' | '×' | '?';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: ProcessStatus;
  result?: ProcessingResult;
}

export interface ProcessingResult {
  judgment: JudgmentResult;
  reason: string;
  searchResults?: SearchResult[];
  timestamp: Date;
}

export interface SearchResult {
  url: string;
  domain: string;
  domainType: string;        // 新規追加：ドメインタイプ
  initialJudgment: JudgmentResult;  // 新規追加：初期判定
  finalJudgment: JudgmentResult;    // 新規追加：最終判定
  analysisComment: string;   // 新規追加：Gemini解析コメント
  supplement?: string;       // 新規追加：補足コメント
  isOfficial: boolean;
  matchType: 'exact' | 'partial';  // 'related'を削除（テキスト検索汚染防止）
}

export interface UrlWithMatchType {
  url: string;
  matchType: 'exact' | 'partial';  // 'related'を削除（テキスト検索汚染防止）
}

export interface VisionAPIResponse {
  urls: string[];
  urlsWithMatchType?: UrlWithMatchType[];
  error?: string;
  message?: string;
  webDetection?: {
    fullMatchingImages?: Array<{
      url: string;
    }>;
    partialMatchingImages?: Array<{
      url: string;
    }>;
    pagesWithMatchingImages?: Array<{
      url: string;
      pageTitle?: string;
    }>;
  };
}

export interface GeminiAnalysisRequest {
  url: string;
  content?: string;
  isSnS: boolean;
  snsInfo?: {
    platform: string;
    username?: string;
    postId?: string;
    isProfile?: boolean;
    description: string;
  };
}

export interface GeminiAnalysisResponse {
  judgment: JudgmentResult;
  reason: string;
  supplement?: string;  // 新規追加：補足コメント
  isIllegal: boolean;
}

// 🎯 画像比較用の型定義
export interface GeminiImageComparisonRequest {
  requestType: 'image_comparison';
  originalImageBase64: string;  // 元画像（アップロードされた画像）
  detectedImageUrl: string;     // 検出された画像のURL
  detectedDomain: string;       // 検出された画像のドメイン
}

export interface GeminiImageComparisonResponse {
  isSimilar: boolean;          // 似ているかどうか
  similarity: 'identical' | 'similar' | 'different';  // 類似度レベル
  reason: string;              // 判定理由
  shouldAnalyze: boolean;      // 詳細分析が必要かどうか
}