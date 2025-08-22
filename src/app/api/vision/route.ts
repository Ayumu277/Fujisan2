import { NextRequest, NextResponse } from 'next/server';

// Vision API型定義
interface VisionImage {
  url?: string;
}

interface VisionPage {
  url: string;
  pageTitle?: string;
}




export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: '画像が提供されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        {
          error: `サポートされていないファイル形式です: ${image.type}`,
          urls: [],
          webDetection: null
        },
        { status: 400 }
      );
    }

    // 画像をBase64に変換（修正版）
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // 🔍 詳細デバッグ情報
    console.log('=== 画像解析デバッグ開始 ===');
    console.log('📊 画像ファイル情報:');
    console.log('  - ファイル名:', image.name);
    console.log('  - ファイルサイズ:', bytes.byteLength, 'bytes');
    console.log('  - MIMEタイプ:', image.type);
    console.log('  - Base64サイズ:', base64Image.length, 'chars');
    console.log('  - Base64プレビュー:', base64Image.substring(0, 100) + '...');

    // Base64データの検証
    if (!base64Image || base64Image.length === 0) {
      return NextResponse.json(
        {
          error: '画像データの変換に失敗しました',
          urls: [],
          webDetection: null
        },
        { status: 400 }
      );
    }

    // APIキーの確認
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('Google Vision API key is not configured');
    }

    // Google Vision API呼び出し
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                {
                  type: 'WEB_DETECTION',
                  maxResults: 100  // 30→100に増加
                }
              ],
              imageContext: {
                webDetectionParams: {
                  includeGeoResults: false  // 地理的結果を含めない（テキスト検索防止）
                }
                // languageHints削除 - テキストベース検索を完全に無効化
              }
            }
          ]
        }),
      }
    );

    const data = await visionResponse.json();

    // 🔍 Vision APIレスポンス詳細分析
    console.log('🌐 Vision API Response Status:', visionResponse.status);
    console.log('📡 Vision API Response Headers:', Object.fromEntries(visionResponse.headers.entries()));
    console.log('💾 Vision API Response Size:', JSON.stringify(data).length, 'chars');
    console.log('🔍 Vision API Full Response:', JSON.stringify(data, null, 2));

    if (!visionResponse.ok) {
      console.error('Vision API Error:', data);
      throw new Error(`Vision API request failed: ${data.error?.message || 'Unknown error'}`);
    }

    // エラーレスポンスのチェック
    if (data.responses?.[0]?.error) {
      const error = data.responses[0].error;
      console.error('Vision API returned error:', error);

      // 画像データの問題の場合、より詳細なエラーメッセージを返す
      if (error.code === 3) {
        return NextResponse.json({
          urls: [],
          webDetection: null,
          error: '画像データの読み取りに失敗しました。別の画像をお試しください。'
        });
      }

      throw new Error(`Vision API error: ${error.message}`);
    }

    const response = data.responses?.[0];
    const webDetection = response?.webDetection;

    // 🔍 レスポンス構造の詳細分析
    console.log('🧩 Response Structure Analysis:');
    console.log('  - responses配列長:', data.responses?.length || 0);
    console.log('  - response keys:', response ? Object.keys(response) : 'none');
    console.log('  - error in response:', response?.error || 'none');
    console.log('  - webDetection存在:', !!webDetection);

    if (response?.error) {
      console.log('🚨 Vision API Error:', response.error);
      return NextResponse.json({
        error: 'Vision APIエラー: ' + response.error.message,
        urls: [],
        webDetection: null
      }, { status: 500 });
    }

    if (!webDetection) {
      console.log('❌ webDetection が存在しません');
      console.log('🔍 Available response properties:', response ? Object.keys(response) : 'none');
      return NextResponse.json({
        urls: [],
        webDetection: null,
        message: 'この画像に対する検索結果は見つかりませんでした。',
        debug: {
          hasResponse: !!response,
          responseKeys: response ? Object.keys(response) : []
        }
      });
    }

    // 結果の収集（マッチタイプ付き）
    const allMatchingUrls = new Set<string>();
    const urlsWithMatchType: { url: string; matchType: 'exact' | 'partial' }[] = [];

    // 完全一致
    if (webDetection.fullMatchingImages?.length > 0) {
      webDetection.fullMatchingImages.forEach((img: VisionImage) => {
        if (img && img.url) {
          allMatchingUrls.add(img.url);
          urlsWithMatchType.push({ url: img.url, matchType: 'exact' });
        }
      });
    }

    // 部分一致
    if (webDetection.partialMatchingImages?.length > 0) {
      webDetection.partialMatchingImages.forEach((img: VisionImage) => {
        if (img && img.url) {
          allMatchingUrls.add(img.url);
          urlsWithMatchType.push({ url: img.url, matchType: 'partial' });
        }
      });
    }

    // 現在のURL数をチェック
    const currentUrlCount = allMatchingUrls.size;
    console.log('🔢 現在のURL数（関連ページ除く）:', currentUrlCount);

    // 🎯 条件付き関連ページ追加（5件未満の場合のみ）
    if (currentUrlCount < 5 && webDetection.pagesWithMatchingImages?.length > 0) {
      console.log('📄 結果が5件未満のため関連ページを補完として追加します');
      webDetection.pagesWithMatchingImages.forEach((page: VisionPage) => {
        if (page && page.url && !allMatchingUrls.has(page.url)) {
          allMatchingUrls.add(page.url);
          urlsWithMatchType.push({ url: page.url, matchType: 'partial' }); // 関連ページは部分一致として扱う
        }
      });
      console.log(`✅ 関連ページから${allMatchingUrls.size - currentUrlCount}件を追加`);
    } else if (currentUrlCount >= 5) {
      console.log('🚫 十分な結果があるため関連ページは無効化（テキスト検索汚染防止）');
    } else {
      console.log('📄 関連ページが存在しません');
    }


         // 🎯 最終結果の詳細ログ
     console.log('=== 最終結果サマリー ===');
     console.log('🎯 最終URL数:', allMatchingUrls.size);
     console.log('📊 カテゴリ別詳細:');
         console.log('  ✅ 完全一致:', webDetection.fullMatchingImages?.length || 0);
    console.log('  ⚡ 部分一致:', webDetection.partialMatchingImages?.length || 0);
    const relatedPagesCount = webDetection.pagesWithMatchingImages?.length || 0;
    const relatedPagesUsed = currentUrlCount < 5 && relatedPagesCount > 0;
    console.log('  📄 関連ページ:', relatedPagesCount, relatedPagesUsed ? '(補完として使用)' : '(条件により無効化)');

     if (allMatchingUrls.size === 0) {
       console.log('🚨🚨🚨 緊急事態: 確実に存在する画像が0件！');
       console.log('💀 これは絶対に異常です - 原因を特定する必要があります');



     }

     console.log('=== 画像解析デバッグ終了 ===');

         return NextResponse.json({
      urls: Array.from(allMatchingUrls),
      urlsWithMatchType: urlsWithMatchType,  // マッチタイプ情報も送信
      webDetection: webDetection,
       debug: {
         imageSize: bytes.byteLength,
         base64Size: base64Image.length,
                 totalCategories: {
          fullMatch: webDetection.fullMatchingImages?.length || 0,
          partialMatch: webDetection.partialMatchingImages?.length || 0,
         relatedPages: webDetection.pagesWithMatchingImages?.length || 0,
         relatedPagesEnabled: currentUrlCount < 5 && (webDetection.pagesWithMatchingImages?.length || 0) > 0
        }
       }
     });

  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      {
        error: 'Vision API処理中にエラーが発生しました',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}