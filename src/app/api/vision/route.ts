import { NextRequest, NextResponse } from 'next/server';

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
                  includeGeoResults: true  // 地理的結果を含める
                },
                languageHints: ['ja', 'en']  // 日本語と英語を優先
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

    // 結果の収集
    const allMatchingUrls = new Set<string>();

    // 完全一致
    if (webDetection.fullMatchingImages?.length > 0) {
      webDetection.fullMatchingImages.forEach((img: any) => {
        if (img.url) allMatchingUrls.add(img.url);
      });
    }

    // 部分一致
    if (webDetection.partialMatchingImages?.length > 0) {
      webDetection.partialMatchingImages.forEach((img: any) => {
        if (img.url) allMatchingUrls.add(img.url);
      });
    }

    // ページ内の画像
    if (webDetection.pagesWithMatchingImages?.length > 0) {
      webDetection.pagesWithMatchingImages.forEach((page: any) => {
        if (page.url) allMatchingUrls.add(page.url);
      });
    }

         // 🎯 最終結果の詳細ログ
     console.log('=== 最終結果サマリー ===');
     console.log('🎯 最終URL数:', allMatchingUrls.size);
     console.log('📊 カテゴリ別詳細:');
     console.log('  ✅ 完全一致:', webDetection.fullMatchingImages?.length || 0);
     console.log('  ⚡ 部分一致:', webDetection.partialMatchingImages?.length || 0);
     console.log('  📄 関連ページ:', webDetection.pagesWithMatchingImages?.length || 0);
     console.log('  ❌ 憎き類似:', webDetection.visuallySimilarImages?.length || 0, '(完全無視)');
     console.log('  🏷️ WebEntities:', webDetection.webEntities?.length || 0);
     console.log('  💡 BestGuess:', webDetection.bestGuessLabels?.length || 0);

     if (allMatchingUrls.size === 0) {
       console.log('🚨🚨🚨 緊急事態: 確実に存在する画像が0件！');
       console.log('💀 これは絶対に異常です - 原因を特定する必要があります');

       // 類似画像が検出されているかチェック
       if (webDetection.visuallySimilarImages?.length > 0) {
         console.log('🔥 重要発見: 類似画像は', webDetection.visuallySimilarImages.length, '件検出済み');
         console.log('💡 つまり画像認識は正常 → API設定またはフィルタリングの問題');

         // 類似画像の詳細をログ（デバッグ用のみ）
         console.log('🔍 類似画像詳細（参考用）:');
         webDetection.visuallySimilarImages.slice(0, 3).forEach((img: any, i: number) => {
           console.log(`  ${i+1}. ${img.url}`);
         });
       }

       // WebEntitiesの詳細
       if (webDetection.webEntities?.length > 0) {
         console.log('🏷️ WebEntities詳細:');
         webDetection.webEntities.slice(0, 5).forEach((entity: any, i: number) => {
           console.log(`  ${i+1}. ${entity.description} (score: ${entity.score})`);
         });
       }

       // BestGuessLabelsの詳細
       if (webDetection.bestGuessLabels?.length > 0) {
         console.log('💡 BestGuess詳細:');
         webDetection.bestGuessLabels.forEach((label: any, i: number) => {
           console.log(`  ${i+1}. ${label.label} (lang: ${label.languageCode})`);
         });
       }
     }

     console.log('=== 画像解析デバッグ終了 ===');

     return NextResponse.json({
       urls: Array.from(allMatchingUrls),
       webDetection: webDetection,
       debug: {
         imageSize: bytes.byteLength,
         base64Size: base64Image.length,
         totalCategories: {
           fullMatch: webDetection.fullMatchingImages?.length || 0,
           partialMatch: webDetection.partialMatchingImages?.length || 0,
           relatedPages: webDetection.pagesWithMatchingImages?.length || 0,
           visuallySimilar: webDetection.visuallySimilarImages?.length || 0,
           webEntities: webDetection.webEntities?.length || 0,
           bestGuess: webDetection.bestGuessLabels?.length || 0
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