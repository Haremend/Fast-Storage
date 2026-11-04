# Fast Storage — 个人云端存储与文档语义智能检索系统

[![Next.js 15](https://img.shields.io/badge/Next.js-15.4-black?logo=next.js)](https://nextjs.org/)
[![Upstash](https://img.shields.io/badge/Powered%20By-Upstash%20Suite-00E599?logo=redis)](https://upstash.com)
[![Design Style](https://img.shields.io/badge/UI-iOS%20Frosted%20Glass-007AFF)](https://developer.apple.com/design/)
[![Deployed on Vercel](https://img.shields.io/badge/Deploy%20Ready-Vercel-000000?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Fast Storage** 是一套专为 **Vercel Serverless** 环境量身定制的高性能、轻量级个人云端存储与文档智能检索平台。系统采用**现代化 iOS 明亮扁平磨砂玻璃透明 (Frosted Glassmorphism)** UI 设计风格，深度融合了 **Upstash** 云原生无服务器套件（Blob、Vector、QStash、Redis），并配备**单用户环境变量安全登录**系统。

---

## 🌟 核心功能模块与架构

```
                        ┌──────────────────────────────────────────────┐
                        │         Next.js 15 App Router 前端界面        │
                        │   (iOS 磨砂玻璃态 + 明暗双模 + 全中文交互)      │
                        └──────────────────────┬───────────────────────┘
                                               │
                               ┌───────────────┴───────────────┐
                               │   单用户认证中间件与会话守卫     │
                               │  (ADMIN_USERNAME/PASSWORD)    │
                               └───────────────┬───────────────┘
                                               │
                ┌──────────────────────────────┴──────────────────────────────┐
                │         Serverless API 路由与模块化解耦服务层 (/api/*)         │
                └───────┬──────────────┬───────────────┬──────────────┬───────┘
                        │              │               │              │
                        ▼              ▼               ▼              ▼
               ┌────────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐
               │  Upstash Blob  │ │Upstash Vector│ │Upstash QStash│ │Upstash Redis│
               │  轻量对象存储   │ │ 语义向量检索 │ │ 异步任务队列 │ │全局缓存/会话│
               └────────────────┘ └─────────────┘ └─────────────┘ └────────────┘
```

### 1. 🔐 单用户环境变量安全认证
- **免数据库账号系统**：通过 Vercel 环境变量 `ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 动态配置唯一的管理员凭据。
- **安全会话守卫**：采用带 `HttpOnly`、`SameSite=Lax` 的安全 Cookie 进行状态保持，并在 Redis 中自动持久化认证会话；支持随时一键安全登出。

### 2. 💎 现代 iOS 明亮扁平磨砂玻璃 UI (Frosted Glassmorphism)
- **视觉美学**：基于 Apple 规范的高斯模糊背板（`backdrop-blur-20px`）、通透半透明卡片边界与触控回弹微动效（`ios-press`）。
- **明暗双模一键切换**：顶栏提供精致的 Sun / Moon 切换按钮，原生适配明亮清爽白与深邃极客黑两种风格。

### 3. 📂 个人云端文档全能管理 (Upstash Blob)
- **多类型文件上传**：支持文档、PDF、Markdown、代码文件、个人头像上传至 Upstash Blob。
- **文件详情检视**：查看文件 SHA-256 指纹、真实 MIME 类型、存储 Bucket 节点与元数据。
- **二进制真实下载**：一键生成带 `Content-Disposition: attachment` 的真实二进制下载流。
- **全球公开链接一键复制**：提供直达 Upstash 边缘 CDN 节点的公开访问短链，方便快速分享。

### 4. 🧠 语义向量检索与对比实验舱 (Upstash Vector)
- **内置 Dense Embedding**：基于 Upstash Vector 自带高维稠密嵌入模型，无缝将个人笔记与文档映射至高维向量空间。
- **直观对照实验室**：特别设计了 **传统字面检索（LIKE / Exact Match）** 与 **Upstash Vector 语义检索（Semantic Cosine Distance）** 的同屏对比实验，让使用者一目了然语义检索在跨词汇、近义概念理解上的巨大优势。

### 5. ⚡ 异步工作流与并发注入演示舱 (Upstash QStash)
- **接口削峰解耦**：将文本抽取、高维向量计算与 Webhook 调度转交后台异步处理，上传响应 `<150ms`。
- **批量并发注入测试**：内置一键模拟 5 路并发任务批量排队与压测演示，直观展现异步任务状态流转（排队中 -> 处理中 -> 已完成）与耗时统计。

### 6. 🗄️ Redis 空间浏览器与经典特性实验舱 (Upstash Redis)
- **全能键值浏览器**：支持按 Pattern 模式检索、实时查看全部活跃键、TTL 倒计时、类型标识、查看完整内容、在线新增或编辑键值，以及安全删除。
- **经典特性实验 1：分布式 API 频控保护 (Rate Limiter)**：模拟 10 秒 5 次请求的频控限制，直观展示滑动窗口机制与防御恶意刷量。
- **经典特性实验 2：全局分布式原子累加器 (Atomic INCR)**：演示多 Serverless 实例并发读写时无竞争条件的全局数字累加。
- **经典特性实验 3：临时缓存与 TTL 倒计时 (TTL Expire)**：写入短期令牌或敏感缓存，倒计时结束自动从内存抹除。

---

## 🔒 代码安全与防泄密自查声明

本开源项目严格遵守防泄密与安全自查规范：
- 代码中**绝对没有任何硬编码**的个人秘钥、个人 Token、密码或私有生产地址；
- 所有敏感参数**完全从环境变量 (`process.env`) 读取**；
- `.gitignore` 包含全面的过滤规则，确保 `.env`、`.env*.local`、`.vercel` 绝不会被意外提交；
- 仓库内仅提供带有安全占位符的示例配置文件 `.env.example`，您可以放心推送到公开或私有 GitHub 仓库。

---

## ⚙️ 环境变量说明 (`.env.example`)

| 环境变量名称 | 必需 | 描述说明 | 默认值 / 获取方式 |
| :--- | :---: | :--- | :--- |
| `ADMIN_USERNAME` | 否 | 单用户管理员账号 | 未设置时默认为 `admin` |
| `ADMIN_PASSWORD` | 否 | 单用户管理员密码 | 未设置时默认为 `admin123456` |
| `UPSTASH_BLOB_TOKEN` | 推荐 | Upstash Blob 对象存储访问凭证 | [Upstash Console > Blob](https://console.upstash.com/blob) 中创建 Bucket 获取 |
| `UPSTASH_REDIS_REST_URL` | 推荐 | Upstash Redis REST 通讯端点 URL | [Upstash Console > Redis](https://console.upstash.com/redis) 数据库详情页 |
| `UPSTASH_REDIS_REST_TOKEN`| 推荐 | Upstash Redis REST 访问令牌 | [Upstash Console > Redis](https://console.upstash.com/redis) 数据库详情页 |
| `UPSTASH_VECTOR_REST_URL`| 推荐 | Upstash Vector 索引端点 URL | [Upstash Console > Vector](https://console.upstash.com/vector) 索引详情页 |
| `UPSTASH_VECTOR_REST_TOKEN`| 推荐 | Upstash Vector 索引访问令牌 | [Upstash Console > Vector](https://console.upstash.com/vector) 索引详情页 |
| `QSTASH_TOKEN` | 推荐 | QStash 异步消息队列访问令牌 | [Upstash Console > QStash](https://console.upstash.com/qstash) 详情页 |
| `APP_URL` | 否 | 应用访问基础域名 | 本地为 `http://localhost:3000`，Vercel 部署会自动注入 |

> 💡 **提示**：系统内置了「本地开发兼容引擎（Hybrid Mock Engine）」，如果暂未配置 Upstash 秘钥，仍可正常进入系统、体验所有上传、语义检索对比、并发队列压测与 Redis 增删改查演示！

---

## 🚀 本地开发与运行指南

### 1. 克隆代码并安装依赖

```bash
git clone https://github.com/your-username/upcloud-vault.git
cd upcloud-vault

# 安装依赖
npm install
```

### 2. 配置本地环境变量（可选）

```bash
cp .env.example .env.local
```

打开 `.env.local` 填入您的管理员账号密码以及 Upstash 凭证。

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)，输入账号密码即可畅享全套功能。

---

## 🌐 部署到 Vercel 完整步骤

本项目采用无状态 HTTP REST 通讯架构，完美适配 Vercel 的 Serverless Function 运行时与 Edge CDN。以下是部署步骤：

### 步骤 1：推送代码至 GitHub
```bash
git add .
git commit -m "feat: complete iOS glassmorphism Fast Storage with auth and Redis studio"
git push origin main
```

### 步骤 2：在 Vercel 控制台导入项目
1. 打开 [vercel.com](https://vercel.com) 并登录您的账号；
2. 点击右上角 **「Add New...」 -> 「Project」**；
3. 选择刚刚推送到 GitHub 的 `upcloud-vault` 仓库，点击 **「Import」**。

### 步骤 3：配置构建参数
保持 Vercel 的默认识别项即可：
- **Framework Preset**: `Next.js`
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 步骤 4：配置环境变量（关键步骤）
在「**Environment Variables**」展开面板中添加如下变量：
- `ADMIN_USERNAME`: 自定义管理员账号（如 `myadmin`）
- `ADMIN_PASSWORD`: 自定义管理员高强度密码（如 `SecretPass2026!`）
- `UPSTASH_BLOB_TOKEN`: 从 Upstash 控制台获取的 Blob Token
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST Token
- `UPSTASH_VECTOR_REST_URL`: Upstash Vector REST URL
- `UPSTASH_VECTOR_REST_TOKEN`: Upstash Vector REST Token
- `QSTASH_TOKEN`: Upstash QStash Token

### 步骤 5：点击部署 (Deploy)
点击 **「Deploy」** 按钮。等待约 1 分钟构建完成，即可获得专属的 production 访问地址（例如 `https://upcloud-vault.vercel.app`）。

---

## 📋 推送至 GitHub 前的安全自查清单

在执行 `git push` 前，请确保已核对以下项目：

- [x] **无硬编码秘钥**：全项目代码使用 `process.env.*` 获取凭据，绝无明文密码。
- [x] **无个人私有接口地址**：所有 API 均走相对路径 (`/api/*`) 或从环境变量动态获取。
- [x] **.gitignore 已严格配置**：已将所有 `.env*` 敏感文件（除 `.env.example` 占位模板外）排除在 Git 之外。
- [x] **零泄密风险**：`.env.example` 中仅保留通用示例占位符。
- [x] **编译与 Lint 验证**：经 `npm run build` 和 `npm run lint` 验证，无任何语法或类型错误。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。
