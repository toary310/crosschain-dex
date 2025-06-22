# ? ChainBridge DEX

**������N���X�`�F�[�����U�^�����**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Chakra UI](https://img.shields.io/badge/Chakra%20UI-3+-teal.svg)](https://chakra-ui.com/)

> �����̃u���b�N�`�F�[���ԂŃV�[�����X�Ȏ���̌���񋟂���v�V�I��DEX�v���b�g�t�H�[��

## ? ��v�@�\

### ? ���x�ȃg�[�N���X���b�v
- **DEX�A�O���Q�[�V����**: 1inch�A0x�AParaswap�Ƃ̓����ōŗǉ��i������
- **�œK���[�e�B���O**: AI�쓮�̉��i�����A���S���Y��
- **MEV�ی�**: �t�����g�����j���O�U������̕ی�
- **�K�X�œK��**: ����R�X�g�̍ŏ���

### ? �N���X�`�F�[���u���b�W
- **�}���`�v���g�R���Ή�**: LayerZero�AWormhole�AAxelar����
- **�������[�g�œK��**: �œK�ȃu���b�W���[�g�̎����I��
- **���A���^�C���ǐ�**: ����󋵂̏ڍׂȉ���
- **���s���̎������g���C**: ���S�Ȏ�������V�X�e��

### ? �������v�[���Ǘ�
- **�v�[���쐬�E�Ǘ�**: �J�X�^���������v�[���̊ȒP�쐬
- **�C�[���h�t�@�[�~���O**: �����g�[�N���ł̕�V�l��
- **�C���p�[�}�l���g���X�v�Z**: ���X�N�]���ƃA���[�g�@�\
- **��������**: �����I�Ȏ��v�ő剻

### ? ���x�ȕ��̓_�b�V���{�[�h
- **���A���^�C���`���[�g**: TradingView�����̍��x�ȃ`���[�g
- **�|�[�g�t�H���I�ǐ�**: �ڍׂ�P&L���͂ƃp�t�H�[�}���X�w�W
- **�s�ꕪ��**: ��I�Ȏs��f�[�^�Ɠ��@
- **���X�N���g���N�X**: Sharpe��A�ő�h���[�_�E����

## ? �Z�p�X�^�b�N

### �t�����g�G���h
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

### �T�|�[�g�`�F�[��
- **Primary**: Ethereum, Polygon, Arbitrum, Optimism
- **Secondary**: BSC, Avalanche, Fantom, Base
- **Future**: Solana, Cosmos, Polkadot

## ?? �v���W�F�N�g�\��

```
src/
������ app/                    # Next.js App Router
������ components/            # React Components
��   ������ UI/               # Base UI Components
��   ������ Layout/           # Layout Components
��   ������ Swap/             # Swap Features
��   ������ Pools/            # Pool Features
��   ������ Charts/           # Chart Components
������ hooks/                # Custom React Hooks
������ services/             # External Service Integration
������ store/                # Zustand State Management
������ theme/                # Chakra UI Theme
������ utils/                # Utility Functions
������ config/               # Configuration Files
������ types/                # TypeScript Definitions
```

## ? �N�C�b�N�X�^�[�g

### �O�����
- Node.js 20+
- npm �܂��� yarn
- Git

### �C���X�g�[��
```bash
# ���|�W�g�����N���[��
git clone https://github.com/toary310/crosschain-dex.git
cd crosschain-dex

# �ˑ��֌W���C���X�g�[��
npm install

# ���ϐ���ݒ�
cp .env.example .env.local
# .env.local��ҏW���ĕK�v�Ȋ��ϐ���ݒ�

# �J���T�[�o�[���N��
npm run dev
```

### ���ϐ�
```bash
# .env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_1INCH_API_KEY=your_1inch_key
NEXT_PUBLIC_ENVIRONMENT=development
```

## ? �h�L�������g

### ? �d�l���E�݌v��
- [**�v���W�F�N�g�d�l��**](./docs/project-specification.md) - ���S�ȃv���W�F�N�g�d�l�Ɨv����`
- [**�Z�p�d�l��**](./docs/technical-specification.md) - �Z�p�I�Ȏ����ڍ�
- [**API�d�l��**](./docs/api-specification.md) - API�݌v�ƃG���h�|�C���g�d�l

### ?? �A�[�L�e�N�`��
- [**�V�X�e���A�[�L�e�N�`��**](./docs/architecture/system-architecture.md) - �S�̃V�X�e���݌v
- [**�t�����g�G���h�݌v**](./docs/architecture/frontend-architecture.md) - �t�����g�G���h�\��
- [**��ԊǗ��݌v**](./docs/architecture/state-management.md) - Zustand + React Query�݌v

### ? UI/UX
- [**�f�U�C���V�X�e��**](./docs/design/design-system.md) - �f�U�C���K�C�h���C��
- [**�R���|�[�l���g���C�u����**](./docs/design/component-library.md) - �ė��p�\�R���|�[�l���g
- [**�A�N�Z�V�r���e�B�K�C�h**](./docs/design/accessibility.md) - �A�N�Z�V�r���e�B�Ή�

### ? �J���K�C�h
- [**�J�����\�z**](./docs/development/setup.md) - �J�����̃Z�b�g�A�b�v
- [**�R�[�f�B���O�K��**](./docs/development/coding-standards.md) - �R�[�f�B���O���[��
- [**�e�X�g�헪**](./docs/development/testing-strategy.md) - �e�X�g���j�Ǝ���

## ? �e�X�g

```bash
# �P�̃e�X�g
npm run test

# �����e�X�g
npm run test:integration

# E2E�e�X�g
npm run test:e2e

# �e�X�g�J�o���b�W
npm run test:coverage

# Storybook
npm run storybook
```

## ? �J���i��

### ? �����ς�
- **Phase 2**: Advanced Trading Features (100%)
- **Phase 3**: Liquidity Pool System (100%)
- **UI/UX Enhancement**: Comprehensive UI/UX improvements (100%)

### ? �i�s��
- **Phase 1**: Core MVP Development (25%)
- **Phase 4**: Advanced Features (11%)

### ? ����̗\��
- **2025�NQ1**: Phase 1, 4�����A�x�[�^�Ń����[�X
- **2025�NQ2**: ���C���l�b�g���[���`�A�R�~���j�e�B�\�z

## ? �R���g���r���[�V����

�v���W�F�N�g�ւ̍v�������}���܂��I

1. ���̃��|�W�g�����t�H�[�N
2. �t�B�[�`���[�u�����`���쐬 (`git checkout -b feature/amazing-feature`)
3. �ύX���R�~�b�g (`git commit -m 'Add amazing feature'`)
4. �u�����`�Ƀv�b�V�� (`git push origin feature/amazing-feature`)
5. Pull Request���쐬

�ڍׂ� [CONTRIBUTING.md](./CONTRIBUTING.md) ���������������B

## ? ���C�Z���X

���̃v���W�F�N�g�� [MIT License](./LICENSE) �̉��Ō��J����Ă��܂��B

## ? �����N

- **Website**: https://chainbridge-dex.com
- **Documentation**: https://docs.chainbridge-dex.com
- **Discord**: https://discord.gg/chainbridge-dex
- **Twitter**: [@ChainBridgeDEX](https://twitter.com/ChainBridgeDEX)

## ? �ӎ�

���̃v���W�F�N�g�͈ȉ��̃I�[�v���\�[�X�v���W�F�N�g�Ɏx�����Ă��܂��F

- [Next.js](https://nextjs.org/) - React �t���[�����[�N
- [Chakra UI](https://chakra-ui.com/) - ���W�����[�ŃA�N�Z�V�u���ȃR���|�[�l���g���C�u����
- [wagmi](https://wagmi.sh/) - React Hooks for Ethereum
- [Framer Motion](https://www.framer.com/motion/) - �v���_�N�V�����Ή��̃��[�V�������C�u����
- [Zustand](https://github.com/pmndrs/zustand) - �������A�����ŁA�X�P�[���u���ȏ�ԊǗ�

---

**Made with ?? by the ChainBridge Team**
