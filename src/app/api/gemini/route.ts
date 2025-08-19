import { NextRequest, NextResponse } from 'next/server';
import { GeminiAnalysisRequest, GeminiAnalysisResponse } from '@/app/types';
import { illegalKeywords } from '@/app/utils/officialDomains';

export async function POST(request: NextRequest) {
  try {
    const body: GeminiAnalysisRequest = await request.json();
    const { url, content, isSnS } = body;

    // Gemini APIプロンプトの作成
    const prompt = isSnS ?
      `次のSNS投稿を分析してください。これは出版物に関する投稿です。

      URL: ${url}
      内容: ${content || 'コンテンツを取得できませんでした'}

      以下の基準で判定してください：
      1. 公式出版社のアカウントからの投稿 → ○
      2. 読者の感想・レビュー・おすすめ → ○
      3. 違法アップロードや海賊版の宣伝 → ×
      4. 大量のページ画像の無断転載 → ×
      5. 判定が困難な場合 → ?

      判定結果を以下の形式で返してください：
      判定: [○/×/?]
      理由: [判定理由を1-2文で説明]`
      :
      `次のウェブサイトを分析してください。

      URL: ${url}
      内容: ${content || 'コンテンツを取得できませんでした'}

      以下のキーワードが含まれているか確認してください：
      ${illegalKeywords.join(', ')}

      以下の基準で違法性を判定してください：
      1. 明らかな海賊版サイト（違法ダウンロード提供） → ×
      2. 無断転載で商用利用している → ×
      3. 著作権侵害を明確に行っている → ×
      4. 違法性がない、または判定困難 → ○
      5. 画像のみで判定不可能 → ?

      判定結果を以下の形式で返してください：
      判定: [○/×/?]
      理由: [判定理由を1-2文で説明]`;

    // Gemini API呼び出し
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error('Gemini API request failed');
    }

    const data = await geminiResponse.json();
    const responseText = data.candidates[0].content.parts[0].text;

    // レスポンスから判定結果を抽出
    const judgmentMatch = responseText.match(/判定:\s*([○×?])/);
    const reasonMatch = responseText.match(/理由:\s*(.+)/);

    const result: GeminiAnalysisResponse = {
      judgment: (judgmentMatch ? judgmentMatch[1] : '?') as '○' | '×' | '?',
      reason: reasonMatch ? reasonMatch[1] : '判定理由を取得できませんでした',
      isIllegal: judgmentMatch ? judgmentMatch[1] === '×' : false,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Gemini API処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}