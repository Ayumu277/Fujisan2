// 公式出版社ドメインリスト（50社程度）
export const publisherDomains = [
  'shueisha.co.jp',
  'kodansha.co.jp',
  'shogakukan.co.jp',
  'kadokawa.co.jp',
  'bunshun.jp',
  'shinchosha.co.jp',
  'gentosha.co.jp',
  'hakusensha.co.jp',
  'ichijinsha.co.jp',
  'akitashoten.co.jp',
  // TODO: 残りの出版社ドメインを追加
];

// 正規販売サイト
export const legitimateSellers = [
  'amazon.co.jp',
  'amazon.com',
  'rakuten.co.jp',
  'books.rakuten.co.jp',
  'shopping.yahoo.co.jp',
  'ebookjapan.yahoo.co.jp',
  'bookwalker.jp',
  'cmoa.jp',
  'dlsite.com',
  'dmm.com',
];

// 🎯 特別公式サイト（問答無用で○判定、Gemini分析スキップ）
export const premiumOfficialDomains = [
  // DOCOMOマガジン
  'dmagazine.docomo.ne.jp',
  'dmagazine.jp',

  // 雑誌配信サービス
  'fujisan.co.jp',
  'magazine.rakuten.co.jp',
  'magazine.dmkt-sp.jp',
  'bookhodai.jp',
  'video.unext.jp',
  'magastore.jp',

  // 電子書籍・コミック配信
  'bookwalker.jp',
  'honto.jp',
  'ebookstore.sony.jp',
  'kinokuniya.co.jp',
  'cmoa.jp',
  'comic.k-manga.jp',
  'manga.line.me',
  'piccoma.com',
  'renta.papy.co.jp',
  'ebookjapan.yahoo.co.jp',
  'sukima.me',
  'manga-bang.com',

  // 出版社公式サイト
  'shueisha.co.jp',
  'kodansha.co.jp',
  'shogakukan.co.jp',
  'hakusensha.co.jp',
  'shinchosha.co.jp',
  'bunshun.co.jp',
  'tkj.jp',
  'kobunsha.com',
  'chuko.co.jp',
  'shufu.co.jp',
  'shufunotomo.co.jp',
  'asahi.com',
  'mainichibooks.com',
  'nhk-book.co.jp',
  'fujinkoron.jp',
  'hpplus.jp',
  'ananweb.jp',
];

// 🚨 疑わしいドメイン分類（初期判定：疑わしい）

// SNSドメイン
export const socialMediaDomains = [
  'twitter.com',
  'x.com',
  'instagram.com',
  'facebook.com',
  'threads.net',
  'tiktok.com',
  'weibo.com',
  'weibo.cn',
  'tieba.baidu.com',
  'reddit.com',
  'discord.com',
  'telegram.org',
  't.me',
];

// 画像共有サイトドメイン
export const imageShareDomains = [
  'pinterest.com',
  'pinterest.jp',
  'imgur.com',
  'we-heart-it.com',
  'weheartit.com',
  'flickr.com',
  'photobucket.com',
  'imageshack.com',
  'gyazo.com',
  'prnt.sc',
  'lightshot.com',
];

// 非公式ビューアサイトドメイン
export const unofficialViewerDomains = [
  'tumgik.com',
  'tumbex.com',
  'picuki.com',
  'imginn.com',
  'dumpor.com',
  'storiesdown.com',
  'instastories.watch',
  'profile-viewer.com',
  'insta-stalker.com',
  'story-saver.net',
];

// イラストサイトドメイン
export const artSiteDomains = [
  'deviantart.com',
  'artstation.com',
  'pixiv.net',
  'artfol.co',
  'behance.net',
  'dribbble.com',
  'portfoliobox.net',
  'carbonmade.com',
  'cargocollective.com',
];

// 掲示板サイトドメイン
export const forumDomains = [
  '5ch.net',
  '2ch.sc',
  'open2ch.net',
  '4chan.org',
  '4channel.org',
  '8kun.top',
  'futaba-chan.com',
  'may.2chan.net',
  'dec.2chan.net',
];

// 🔍 全ての疑わしいドメインをまとめた配列（SNSは除外）
export const suspiciousDomains = [
  ...imageShareDomains,
  ...unofficialViewerDomains,
  ...artSiteDomains,
  ...forumDomains,
];

// 違法サイトのキーワード（Gemini判定用）
export const illegalKeywords = [
  '無料ダウンロード',
  'free download',
  'PDF配布',
  '全巻セット',
  'torrent',
  'crack',
  'raw',
  '海賊版',
  'pirate',
  'illegal',
]