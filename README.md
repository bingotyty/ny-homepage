# ny-homepage

ニューヨーク合同会社 (NEW YORK LLC) コーポレートサイト。

AIによるオンライン広告コンプライアンス監視・検閲ソリューションを提供する
銀座のテクノロジー企業の公式ホームページ。

## デザインコンセプト

- **TikTok かわいい** — シアン × マゼンタの RGB グリッチを軸に、ポップでキュートな雰囲気
- **日式「爽やか・すっきり」** — 丸ゴシック系フォントと大胆な余白
- **高精度アニメーション** — 浮遊ステッカー、弾みスプリング、3D Tilt、スクロール連動リビール

## 使用技術

- 静的 HTML / CSS / JavaScript（ビルド不要）
- Express（開発用 HTTP サーバー）
- Google Fonts: Fredoka, M PLUS Rounded 1c, Zen Maru Gothic

## 開発・起動

```bash
npm install
npm start
# => http://127.0.0.1:6644
```

カスタムポート:

```bash
PORT=8080 npm start
```

## ディレクトリ構成

```
ny-homepage/
├── public/
│   ├── index.html    # マークアップ
│   ├── styles.css    # スタイル + アニメーション
│   └── script.js     # インタラクション
├── server.js         # Express 静的配信
└── package.json
```

## 公開

本番環境: https://ny.withllm.com （Cloudflare Tunnel 経由）

## ライセンス

© 2026 NEW YORK LLC. All Rights Reserved.
