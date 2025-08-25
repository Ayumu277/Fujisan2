import {
  publisherDomains,
  legitimateSellers,
  premiumOfficialDomains,
  suspiciousDomains,
  socialMediaDomains,
  imageShareDomains,
  unofficialViewerDomains,
  artSiteDomains,
  forumDomains
} from './officialDomains';

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function isOfficialDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');
  return publisherDomains.some(d => normalizedDomain.includes(d)) ||
         legitimateSellers.some(d => normalizedDomain.includes(d));
}

// 🎯 特別公式サイト判定（問答無用で○、Gemini分析スキップ）
export function isPremiumOfficialDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');
  return premiumOfficialDomains.some(d => normalizedDomain.includes(d));
}

export function isSuspiciousDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');
  return suspiciousDomains.some(d => normalizedDomain.includes(d));
}

// 🎯 SNS判定関数
export function isSNSDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');
  return socialMediaDomains.some(d => normalizedDomain.includes(d));
}

// 詳細なドメイン分類
export function getDetailedDomainType(domain: string): string {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');

  if (socialMediaDomains.some(d => normalizedDomain.includes(d))) return 'SNS';
  if (imageShareDomains.some(d => normalizedDomain.includes(d))) return '画像共有サイト';
  if (unofficialViewerDomains.some(d => normalizedDomain.includes(d))) return '非公式ビューアサイト';
  if (artSiteDomains.some(d => normalizedDomain.includes(d))) return 'イラストサイト';
  if (forumDomains.some(d => normalizedDomain.includes(d))) return '掲示板サイト';

  return 'その他';
}

export function classifyDomain(url: string): 'premium-official' | 'official' | 'sns' | 'suspicious' | 'unofficial' {
  const domain = extractDomain(url);

  if (isPremiumOfficialDomain(domain)) {
    return 'premium-official';  // 🎯 特別公式サイト（最優先）
  } else if (isOfficialDomain(domain)) {
    return 'official';
  } else if (isSNSDomain(domain)) {
    return 'sns';  // 🎯 SNS（公式以外は△判定）
  } else if (isSuspiciousDomain(domain)) {
    return 'suspicious';  // 🚨 疑わしいドメインとして分類
  } else {
    return 'unofficial';
  }
}

// 🎯 初期判定を行う関数（要件に基づく）
export function getInitialJudgment(url: string): '○' | '△' | '×' {
  const classification = classifyDomain(url);

  if (classification === 'premium-official') {
    return '○';  // 🎯 特別公式サイトは即○
  } else if (classification === 'official') {
    return '○';  // 公式サイトは安全
  } else if (classification === 'sns') {
    return '△';  // 🎯 SNSは公式以外は△（画像比較問題により）
  } else if (classification === 'suspicious') {
    return '△';  // 疑わしいドメインは初期状態で「疑わしい」
  } else {
    return '△';  // その他も疑わしいとして扱う
  }
}

// 🎯 画像ファイル判定関数
export function isImageFile(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // 画像ファイル拡張子のリスト
    const imageExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico',
      '.tiff', '.tif', '.avif', '.heic', '.heif', '.jfif', '.pjpeg', '.pjp'
    ];

    return imageExtensions.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

// 🎯 SNS URL情報抽出関数
export function extractSNSInfo(url: string): {
  platform: string;
  username?: string;
  postId?: string;
  isProfile?: boolean;
  description: string;
} {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace('www.', '');
    const pathname = urlObj.pathname;

    // Instagram
    if (domain.includes('instagram.com')) {
      const pathParts = pathname.split('/').filter(p => p);

      if (pathParts[0] === 'p' && pathParts[1]) {
        // 投稿URL: /p/{post_id}/
        return {
          platform: 'Instagram',
          postId: pathParts[1],
          description: `Instagram投稿 (ID: ${pathParts[1]})`
        };
      } else if (pathParts[0] === 'stories' && pathParts[1]) {
        // ストーリー: /stories/{username}/
        return {
          platform: 'Instagram',
          username: pathParts[1],
          description: `Instagramストーリー (@${pathParts[1]})`
        };
      } else if (pathParts[0] && !pathParts[0].includes('.')) {
        // プロフィール: /{username}/
        return {
          platform: 'Instagram',
          username: pathParts[0],
          isProfile: true,
          description: `Instagramプロフィール (@${pathParts[0]})`
        };
      }
    }

    // Twitter/X
    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      const pathParts = pathname.split('/').filter(p => p);

      if (pathParts[0] && pathParts[1] === 'status' && pathParts[2]) {
        // ツイート: /{username}/status/{tweet_id}
        return {
          platform: 'X(Twitter)',
          username: pathParts[0],
          postId: pathParts[2],
          description: `X投稿 (@${pathParts[0]}, ID: ${pathParts[2]})`
        };
      } else if (pathParts[0] && !pathParts[1]) {
        // プロフィール: /{username}
        return {
          platform: 'X(Twitter)',
          username: pathParts[0],
          isProfile: true,
          description: `Xプロフィール (@${pathParts[0]})`
        };
      }
    }

    // TikTok
    if (domain.includes('tiktok.com')) {
      const pathParts = pathname.split('/').filter(p => p);

      if (pathParts[0] && pathParts[0].startsWith('@') && pathParts[1] === 'video' && pathParts[2]) {
        // 動画: /@{username}/video/{video_id}
        const username = pathParts[0].substring(1);
        return {
          platform: 'TikTok',
          username: username,
          postId: pathParts[2],
          description: `TikTok動画 (@${username}, ID: ${pathParts[2]})`
        };
      } else if (pathParts[0] && pathParts[0].startsWith('@')) {
        // プロフィール: /@{username}
        const username = pathParts[0].substring(1);
        return {
          platform: 'TikTok',
          username: username,
          isProfile: true,
          description: `TikTokプロフィール (@${username})`
        };
      }
    }

    // その他のSNS
    return {
      platform: domain,
      description: `SNS投稿 (${domain})`
    };

  } catch {
    return {
      platform: 'Unknown',
      description: 'URL解析エラー'
    };
  }
}