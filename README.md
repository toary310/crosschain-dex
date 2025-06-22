# ? ChainBridge DEX

**次世代クロスチェーン分散型取引所**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Chakra UI](https://img.shields.io/badge/Chakra%20UI-3+-teal.svg)](https://chakra-ui.com/)

> 複数のブロックチェーン間でシームレスな取引体験を提供する革新的なDEXプラットフォーム

## ? 主要機能

### ? 高度なトークンスワップ
- **DEXアグリゲーション**: 1inch、0x、Paraswapとの統合で最良価格を実現
- **最適ルーティング**: AI駆動の価格発見アルゴリズム
- **MEV保護**: フロントランニング攻撃からの保護
- **ガス最適化**: 取引コストの最小化

### ? クロスチェーンブリッジ
- **マルチプロトコル対応**: LayerZero、Wormhole、Axelar統合
- **自動ルート最適化**: 最適なブリッジルートの自動選択
- **リアルタイム追跡**: 取引状況の詳細な可視化
- **失敗時の自動リトライ**: 堅牢な取引処理システム

### ? 流動性プール管理
- **プール作成・管理**: カスタム流動性プールの簡単作成
- **イールドファーミング**: 複数トークンでの報酬獲得
- **インパーマネントロス計算**: リスク評価とアラート機能
- **自動複利**: 効率的な収益最大化

### ? 高度な分析ダッシュボード
- **リアルタイムチャート**: TradingView統合の高度なチャート
- **ポートフォリオ追跡**: 詳細なP&L分析とパフォーマンス指標
- **市場分析**: 包括的な市場データと洞察
- **リスクメトリクス**: Sharpe比、最大ドローダウン等

## ? 技術スタック

### フロントエンド
```typescript
// Core Framework
Next.js 15 (App Router) + TypeScript 5.3+ + React 18+

// Web3 Integration
wagmi v2 + viem v2 + @tanstack/react-query

// UI/UX Framework
Chakra UI v3 + Framer Motion + React Icons

// State Management
Zustand + React Query + Immer

// Development Tools
ESLint + Prettier + Vitest + Playwright + Storybook
```

### サポートチェーン
- **Primary**: Ethereum, Polygon, Arbitrum, Optimism
- **Secondary**: BSC, Avalanche, Fantom, Base
- **Future**: Solana, Cosmos, Polkadot

## ?? プロジェクト構造

```
src/
├── app/                    # Next.js App Router
├── components/            # React Components
│   ├── UI/               # Base UI Components
│   ├── Layout/           # Layout Components
│   ├── Swap/             # Swap Features
│   ├── Pools/            # Pool Features
│   └── Charts/           # Chart Components
├── hooks/                # Custom React Hooks
├── services/             # External Service Integration
├── store/                # Zustand State Management
├── theme/                # Chakra UI Theme
├── utils/                # Utility Functions
├── config/               # Configuration Files
└── types/                # TypeScript Definitions
```

## ? クイックスタート

### 前提条件
- Node.js 20+
- npm または yarn
- Git

### インストール
```bash
# リポジトリをクローン
git clone https://github.com/toary310/crosschain-dex.git
cd crosschain-dex

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.localを編集して必要な環境変数を設定

# 開発サーバーを起動
npm run dev
```

### 環境変数
```bash
# .env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_1INCH_API_KEY=your_1inch_key
NEXT_PUBLIC_ENVIRONMENT=development
```

## ? ドキュメント

### ? 仕様書・設計書
- [**プロジェクト仕様書**](./docs/project-specification.md) - 完全なプロジェクト仕様と要件定義
- [**技術仕様書**](./docs/technical-specification.md) - 技術的な実装詳細
- [**API仕様書**](./docs/api-specification.md) - API設計とエンドポイント仕様

### ?? アーキテクチャ
- [**システムアーキテクチャ**](./docs/architecture/system-architecture.md) - 全体システム設計
- [**フロントエンド設計**](./docs/architecture/frontend-architecture.md) - フロントエンド構成
- [**状態管理設計**](./docs/architecture/state-management.md) - Zustand + React Query設計

### ? UI/UX
- [**デザインシステム**](./docs/design/design-system.md) - デザインガイドライン
- [**コンポーネントライブラリ**](./docs/design/component-library.md) - 再利用可能コンポーネント
- [**アクセシビリティガイド**](./docs/design/accessibility.md) - アクセシビリティ対応

### ? 開発ガイド
- [**開発環境構築**](./docs/development/setup.md) - 開発環境のセットアップ
- [**コーディング規約**](./docs/development/coding-standards.md) - コーディングルール
- [**テスト戦略**](./docs/development/testing-strategy.md) - テスト方針と実装

## ? テスト

```bash
# 単体テスト
npm run test

# 統合テスト
npm run test:integration

# E2Eテスト
npm run test:e2e

# テストカバレッジ
npm run test:coverage

# Storybook
npm run storybook
```

## ? 開発進捗

### ? 完了済み
- **Phase 2**: Advanced Trading Features (100%)
- **Phase 3**: Liquidity Pool System (100%)
- **UI/UX Enhancement**: Comprehensive UI/UX improvements (100%)

### ? 進行中
- **Phase 1**: Core MVP Development (25%)
- **Phase 4**: Advanced Features (11%)

### ? 今後の予定
- **2025年Q1**: Phase 1, 4完了、ベータ版リリース
- **2025年Q2**: メインネットローンチ、コミュニティ構築

## ? コントリビューション

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

## ? ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## ? リンク

- **Website**: https://chainbridge-dex.com
- **Documentation**: https://docs.chainbridge-dex.com
- **Discord**: https://discord.gg/chainbridge-dex
- **Twitter**: [@ChainBridgeDEX](https://twitter.com/ChainBridgeDEX)

## ? 謝辞

このプロジェクトは以下のオープンソースプロジェクトに支えられています：

- [Next.js](https://nextjs.org/) - React フレームワーク
- [Chakra UI](https://chakra-ui.com/) - モジュラーでアクセシブルなコンポーネントライブラリ
- [wagmi](https://wagmi.sh/) - React Hooks for Ethereum
- [Framer Motion](https://www.framer.com/motion/) - プロダクション対応のモーションライブラリ
- [Zustand](https://github.com/pmndrs/zustand) - 小さく、高速で、スケーラブルな状態管理

---

**Made with ?? by the ChainBridge Team**
