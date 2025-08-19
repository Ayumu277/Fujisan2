import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiAnalysisRequest, GeminiAnalysisResponse } from '@/app/types';
import { illegalKeywords } from '@/app/utils/officialDomains';

export async function POST(request: NextRequest) {
  try {
    const body: GeminiAnalysisRequest = await request.json();
    const { url, content, isSnS } = body;

    // APIキー確認（複数のキー名を試行）
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
                   process.env.GEMINI_API_KEY ||
                   process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('Gemini API key not found. Checked:', {
        'NEXT_PUBLIC_GEMINI_API_KEY': !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        'GEMINI_API_KEY': !!process.env.GEMINI_API_KEY,
        'GOOGLE_API_KEY': !!process.env.GOOGLE_API_KEY
      });
      return NextResponse.json(
        { error: 'Gemini API キーが設定されていません' },
        { status: 500 }
      );
    }

    console.log('🤖 Gemini API Request:', { url, isSnS, hasContent: !!content });

    // Google AI SDK初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Gemini APIプロンプト（基本○判定・緩和版）
    const prompt = isSnS
      ? `次のSNS投稿を分析してください。

      URL: ${url}
      内容: ${content || 'コンテンツを取得できませんでした'}

      **重要**: 基本的には○判定してください。×になるのは以下の明確な違法行為のみです：

      ×（違法）の条件：
      1. 明確な海賊版サイトへの誘導
      2. 違法ダウンロードの直接提供
      3. 完全に一致した画像での違法再販の宣伝

      ○（問題なし）の例：
      - 公式アカウント、読者の感想、レビュー、おすすめ
      - 単純な画像投稿（JPEG、PNG等）
      - 表紙画像の共有
      - 内容の紹介や感想
      - 判定が曖昧な場合は全て○

      判定結果を以下の形式で返してください：
      判定: [○/×/?]
      理由: [判定理由を1-2文で説明]`
      : `次のウェブサイトを分析してください。

      URL: ${url}
      内容: ${content || 'コンテンツを取得できませんでした'}

      **重要**: 基本的には○判定してください。×になるのは以下の明確な違法行為のみです：

      ×（違法）の条件（すべて満たす場合のみ）：
      1. 画像が完全に一致している かつ
      2. 海賊版サイト または 違法再販サイト または 著作権侵害サイト
      3. 明確に違法コンテンツを配布・販売している

      ○（問題なし）の例：
      - 単純な画像ファイル（JPEG、PNG等）は即座に○
      - 公式サイト、書店、レビューサイト
      - ファンサイト、感想サイト、ブログ
      - SNS投稿、画像共有サイト
      - 判定が困難・曖昧な場合は全て○
      - 以下のキーワードがあっても内容次第で○: ${illegalKeywords.join(', ')}

      判定結果を以下の形式で返してください：
      判定: [○/×/?]
      理由: [判定理由を1-2文で説明]`;

    // ✨ 最新のGemini 2.5 Flash APIで生成
    console.log('🚀 Gemini-2.5-flash でコンテンツ生成中...');
    const result = await model.generateContent(prompt);

    if (!result.response) {
      throw new Error('Gemini API: レスポンスが空です');
    }

    const responseText = result.response.text();
    console.log('📝 Gemini Response:', responseText);

    // レスポンスから判定結果を抽出
    const judgmentMatch = responseText.match(/判定:\s*([○×?])/);
    const reasonMatch = responseText ? responseText.match(/理由:\s*(.+)/) : null;

    const analysisResult: GeminiAnalysisResponse = {
      judgment: (judgmentMatch ? judgmentMatch[1] : '?') as '○' | '×' | '?',
      reason: reasonMatch ? reasonMatch[1] : '判定理由を取得できませんでした',
      isIllegal: judgmentMatch ? judgmentMatch[1] === '×' : false,
    };

    console.log('✅ Gemini分析結果:', analysisResult);
    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('❌ Gemini API error:', error);

    // エラーの詳細を分析
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
    }

    return NextResponse.json(
      {
        error: 'Gemini API処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}