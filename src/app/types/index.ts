export type ProcessStatus = 'waiting' | 'processing' | 'completed' | 'error';
export type JudgmentResult = '○' | '×' | '?';

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
}

export interface GeminiAnalysisResponse {
  judgment: JudgmentResult;
  reason: string;
  isIllegal: boolean;
}