import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiAnalysisRequest, GeminiAnalysisResponse, GeminiImageComparisonRequest, GeminiImageComparisonResponse } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 🎯 リクエストタイプで分岐処理
    if (body.requestType === 'image_comparison') {
      return await handleImageComparison(body as GeminiImageComparisonRequest);
    } else {
      return await handleContentAnalysis(body as GeminiAnalysisRequest);
    }
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

// 🎯 画像比較処理
async function handleImageComparison(body: GeminiImageComparisonRequest): Promise<NextResponse> {
  const { originalImageBase64, detectedImageUrl, detectedDomain } = body;

  // APIキー確認
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
                 process.env.GEMINI_API_KEY ||
                 process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API キーが設定されていません' },
      { status: 500 }
    );
  }

  console.log('🖼️ Gemini画像比較 Request:', { detectedImageUrl, detectedDomain });

  try {
    // Google AI SDK初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 🎯 画像比較プロンプト
    const prompt = `次の2つの画像を比較して、同一の画像または非常に似ている画像かどうかを判定してください。

    【比較対象】
    1. 元画像: ユーザーがアップロードした画像
    2. 検出画像: Vision APIで検出された画像 (URL: ${detectedImageUrl}, ドメイン: ${detectedDomain})

    【判定基準】
    - 同一画像: 完全に同じ画像、または微細な違いのみ
    - 類似画像: 同じコンテンツだが解像度・色調・トリミング等に違いがある
    - 異なる画像: 全く違うコンテンツ、無関係な画像

    【判定結果を以下の形式で返してください】
    類似度: [identical/similar/different]
    理由: [判定理由を1-2文で説明]
    詳細分析必要: [true/false]`;

    // 画像付きでGeminiに送信
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: originalImageBase64,
          mimeType: "image/jpeg"
        }
      }
    ]);

    if (!result.response) {
      throw new Error('Gemini API: レスポンスが空です');
    }

    const responseText = result.response.text();
    console.log('📝 Gemini画像比較 Response:', responseText);

    // レスポンスから判定結果を抽出
    const similarityMatch = responseText.match(/類似度:\s*(identical|similar|different)/);
    const reasonMatch = responseText.match(/理由:\s*(.+?)(?:\n|$)/);
    const analyzeMatch = responseText.match(/詳細分析必要:\s*(true|false)/);

    const similarity = (similarityMatch ? similarityMatch[1] : 'similar') as 'identical' | 'similar' | 'different';
    const isSimilar = similarity === 'identical' || similarity === 'similar';
    const shouldAnalyze = analyzeMatch ? analyzeMatch[1] === 'true' : isSimilar;

    const comparisonResult: GeminiImageComparisonResponse = {
      isSimilar,
      similarity,
      reason: reasonMatch ? reasonMatch[1] : '画像比較結果を取得できませんでした',
      shouldAnalyze
    };

    console.log('✅ Gemini画像比較結果:', comparisonResult);
    return NextResponse.json(comparisonResult);

  } catch (error) {
    console.error('❌ Gemini画像比較エラー:', error);
    return NextResponse.json(
      {
        error: 'Gemini画像比較処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 🎯 コンテンツ分析処理（既存ロジック）
async function handleContentAnalysis(body: GeminiAnalysisRequest): Promise<NextResponse> {
  const { url, content, isSnS, snsInfo } = body;

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

  console.log('🤖 Gemini API Request:', { url, isSnS, hasContent: !!content, snsInfo });

  try {
    // Google AI SDK初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 🎯 SNS用 vs 一般サイト用のプロンプト分岐
    const prompt = isSnS
      ? `次のSNS投稿を分析してください。

      URL: ${url}
      ${snsInfo ? `プラットフォーム: ${snsInfo.platform}` : ''}
      ${snsInfo?.username ? `ユーザー名: @${snsInfo.username}` : ''}
      ${snsInfo?.postId ? `投稿ID: ${snsInfo.postId}` : ''}
      ${snsInfo?.isProfile ? '※ プロフィールページ' : ''}
      内容: ${content || 'コンテンツを取得できませんでした（URL情報で分析）'}

            **🎯 厳格な公式判定基準**:

      **○（安全）の条件（以下のいずれかが明確に確認できる場合のみ）**:
      1. **公式マーク**: ✓、🔰、☑️、✅等の認証マークが明示されている
      2. **明示的な公式表示**: 「【公式】」「公式」「official」「Official」が含まれている
      3. **法人・企業格**: 「〜株式会社」「〜有限会社」「〜出版」「〜社」「Corporation」「Inc.」「Ltd.」
      4. **出版・メディア**: 「〜マガジン」「〜新聞」「〜テレビ」「〜放送」「〜出版社」
      5. **公式モデル・著名人**: 明らかに公式なタレント、モデル、著名人アカウント

      **△（疑わしい）の条件**:
      - **上記の明確な公式マーカーがない場合は全て△判定**
      - 個人名のアカウント
      - 企業名らしき名前でも公式表示がない場合
      - ファンアカウント、非公式アカウント
      - 判定が困難な場合は必ず△

      **🚨 重要**: 曖昧な判断は避け、明確な公式マーカーがない限り△判定すること

      **判定例**:
      - @shueisha_official → ○（official含有）
      - @kodansha_magazine → ○（magazine含有）
      - 【公式】講談社 → ○（【公式】明示）
      - @john_doe → △（個人名、公式マーカーなし）
      - @some_company → △（公式表示なし、企業名らしくても△）

      **判定結果を以下の形式で返してください**:
      判定: [○/△]
      分析コメント: [具体的な公式マーカーの有無と判定理由]
      補足: [流用リスクまたは公式性について]`
      : `次のウェブサイト/ページを分析してください。
      このサイトは初期判定で「疑わしい」と分類されており、詳細分析により最終判定を決定します。

      URL: ${url}
      内容: ${content || 'コンテンツを取得できませんでした'}

      **分析指針**:
      - 合法的で安全な表現が多い場合 → ○（安全）
      - 違法性や疑わしい表現が含まれる場合 → △（疑わしい維持）

      **○（安全）の基準**:
      - 公式アカウント、正当なレビュー、感想投稿
      - 創作イラスト、ファンアート（著作権侵害でない）
      - 健全な画像共有、コミュニティ投稿
      - 合法的な商用利用、宣伝

      **△（疑わしい維持）の基準**:
      - 著作権侵害の可能性
      - 違法ダウンロードへの誘導
      - 海賊版サイトの宣伝
      - 不審な商業利用
      - 判定が困難な場合

      **判定結果を以下の形式で返してください**:
      判定: [○/△]
      分析コメント: [内容の詳細分析を2-3文で説明]
      補足: [追加の注意点があれば記載]`;

    // ✨ 最新のGemini 2.5 Flash APIで生成
    console.log('🚀 Gemini-2.5-flash でコンテンツ生成中...');
    const result = await model.generateContent(prompt);

    if (!result.response) {
      throw new Error('Gemini API: レスポンスが空です');
    }

    const responseText = result.response.text();
    console.log('📝 Gemini Response:', responseText);

    // レスポンスから判定結果を抽出（新フォーマット対応）
    const judgmentMatch = responseText.match(/判定:\s*([○△×])/);
    const analysisCommentMatch = responseText.match(/分析コメント:\s*(.+?)(?:\n|$)/);
    const supplementMatch = responseText.match(/補足:\s*(.+?)(?:\n|$)/);

    const analysisResult: GeminiAnalysisResponse = {
      judgment: (judgmentMatch ? judgmentMatch[1] : '△') as '○' | '△' | '×',
      reason: analysisCommentMatch ? analysisCommentMatch[1] : '分析コメントを取得できませんでした',
      supplement: supplementMatch ? supplementMatch[1] : '',
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