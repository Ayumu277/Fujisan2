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
                  maxResults: 30
                }
              ]
            }
          ]
        }),
      }
    );

    const data = await visionResponse.json();
    console.log('Vision API Response:', JSON.stringify(data, null, 2));

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

    if (!webDetection) {
      console.log('No web detection results found');
      return NextResponse.json({
        urls: [],
        webDetection: null,
        message: 'この画像に対する検索結果は見つかりませんでした。'
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

    console.log(`Found ${allMatchingUrls.size} matching URLs`);

    return NextResponse.json({
      urls: Array.from(allMatchingUrls),
      webDetection: webDetection,
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