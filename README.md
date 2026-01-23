# FlashIdea (AI Agentic Practice)

**FlashIdea** 并非只是一个简单的笔记应用，而是一次对 **AI Native 工作流工程化** 的深度实践。

本项目旨在探索如何通过前沿 AI 工具（Gemini 2.5 Flash, Supabase）解构复杂的创意生产流程，将“闪念”到“深度内容”的转化过程自动化、结构化。它体现了在 AI 时代，开发者如何从单纯的“编码者”转变为“智能系统架构师”，利用 AI 的边界能力重塑信息处理的效率。

---

## 核心理念与工程化思考 (Core Philosophy)

### 1. 探索 AI 工具的前沿边界
本项目并未止步于调用 API，而是深入挖掘了 **Google Gemini 2.5 Flash** 在多模态理解（语音转写）和结构化生成（JSON Schema）上的极限能力。
*   **边界认知**: 我们不仅使用 AI 生成文本，更利用其作为“逻辑处理器”来决定内容的展示形式（深度解析 vs 叙事故事）。
*   **工具体系**: 整合了 **Supabase** (BaaS) 与 **Gemini** (LLM)，构建了一个无需维护复杂后端逻辑的 Serverless 风格架构，展示了现代 Full-Stack AI 应用的轻量级开发范式。

### 2. 内容结构的解构与工程化
传统的写作是线性的，而 FlashIdea 提出的工程化方案是 **“发散与收敛”**。
*   **解构**: 将用户的“原始灵感（Raw Idea）”视为非结构化数据输入。
*   **重组**: 设计了精密的 Prompt Engineering 管道，强制 AI 输出严格定义的 JSON 结构（Detailed, Story, Analysis, Minimalist 4种变体）。
*   **落地**: 这种将抽象创意转化为具体、多维度的版本管理（Version Control for Ideas）的设计，是内容生产流水线化的典型案例。

### 3. 主体性与实践落地
AI 是工具，核心是人的想象力。
*   **设计初衷**: 拒绝“AI 直出”的平庸内容。我们设计了 **Review & Edit** 环节，强迫用户深度参与。AI 生成的只是“半成品”，必须经过人的筛选和迭代才能成为最终作品。
*   **交互创新**: 界面设计摒弃了传统的“聊天机器人”模式，而是采用“工作室（Studio）”隐喻，强化用户作为“创作者”而非“提问者”的主体感。

---

## 技术架构 (Tech Stack)

*   **Frontend**: React 19, Vite, TailwindCSS (追求极致的响应速度与交互体验)
*   **Backend**: Node.js, Express (轻量级 API 网关)
*   **Database**: Supabase (PostgreSQL) - 利用其强大的 JSONB 能力存储灵活的创意版本
*   **AI Core**: Google Gemini 2.5 Flash - 利用其长上下文和极速响应能力处理实时语音与文本分析

---

## 功能模块详解 (Feature Modules)

### 1. 闪念速记 (Quick Capture)
*   **入口**: 首页 (`screens/QuickNoteScreen.tsx`)
*   **描述**: 一个极简的输入界面，专注于以最快速度捕捉灵感。
*   **特性**:
    *   **智能语音**: 支持长语音录入，自动检测静音（10秒）并停止录制。
    *   **实时转写**: 集成 Gemini 多模态能力，将语音流精准转为文本。
    *   **自动保存**: 本地+云端双重备份，确保灵感不丢失。

### 2. AI 深度工坊 (AI Studio)
*   **入口**: 编辑页 (`screens/EditorScreen.tsx`)
*   **描述**: 灵感的“炼金术士”。将一句简单的想法裂变为丰富的内容矩阵。
*   **特性**:
    *   **结构化生成**: 一键生成 4 种不同维度的版本（深度解析、故事叙述、多维分析、精简摘要）。
    *   **上下文感知**: AI 会理解你原始灵感的潜在语境，补全缺失的逻辑。

### 3. 内容版本管理 (Version Control)
*   **入口**: 版本页 (`screens/StudioVersionsScreen.tsx`)
*   **描述**: 像管理代码一样管理你的创意。
*   **特性**:
    *   **非线性编辑**: 可以随时回溯到任何一个历史版本。
    *   **卡片式预览**: 直观对比不同版本的优劣。
    *   **同步删除**: 支持对不满意的变体进行清理，保持灵感库的整洁。

---


## 未来演进路线 (Future Roadmap)

### 1. 深度知识增强 (RAG Integration)
从“灵感捕捉”进化为“知识整合”。
*   **计划**: 引入 **RAG (Retrieval-Augmented Generation)** 架构，支持用户上传 PDF/论文/行业报告。系统将构建向量数据库，使 AI 在生成笔记时能够精准检索并引用私域知识库中的关键论据，实现“基于实证的创意写作”。

### 2. 全模态叙事 (Multimodal Storytelling)
突破纯文本的局限，向视频化内容生产迈进。
*   **计划**: 扩展多模态输入/输出能力。
    *   **Input**: 支持图像理解，识别用户上传图片中的关键信息作为灵感源。
    *   **Output**: 结合 Stable Diffusion 或 Flux 模型自动为笔记生成配图；探索集成 Runway/Pika API，将最终的文字稿一键转化为短视频脚本甚至成品视频流。

### 3. 对于生成内容的深度调优（Agentic Workflow）
从“单次生成”升级为“人机协同进化”。
*   **计划**: 引入 **LangChain** 或 **LangGraph** 重构核心编排层。
    *   构建多轮对话系统，允许用户对生成的某一段落提出具体的修改意见（如“这段语气再犀利一点”）。
    *   设计“反思 Agent (Reflection Agent)”，在后台自动对生成内容进行逻辑自洽性检查和润色，模拟专业编辑的审稿流程。

### 4. 垂直领域模型微调 (Fine-tuning & Style Transfer)
打造千人千面的写作替身。
*   **计划**: 建立高质量的风格化语料库（如“科技评论风”、“小红书种草风”、“深度研报风”）。
*   **实施**: 利用 **LoRA (Low-Rank Adaptation)** 技术对基座模型进行轻量级微调 (SFT)。相比于目前的 Prompt Engineering，微调后的模型将能更细腻、更稳定地捕捉特定文风的韵律与用词习惯，真正实现“像你一样思考，比你写得更好”。


## 项目结构与文件功能全解 (Full File Structure)

以下是 FlashIdea 项目中所有文件的详细功能说明：

```text
FlashIdea/
├── .DS_Store              # [系统] macOS 文件夹元数据（可忽略）
├── .env                   # [配置] 环境变量文件（通常用于本地开发存 Key，但本项目主要用 config.json）
├── App.tsx                # [前端] React 路由主入口，定义了 QuickNote -> Editor -> Versions 的页面跳转关系
├── README.md              # [文档] 项目说明书，包含设计理念、安装指南和 API 参考
├── components/
│   └── BottomNav.tsx      # [前端组件] 底部导航栏，提供全局导航功能
├── db_schema.sql          # [数据库] Supabase 初始化 SQL 脚本，定义了 Projects/Versions/Drafts 三张表
├── dist/                  # [构建产物] 执行 npm run build 后生成的静态资源目录（部署用）
├── geminiService.ts       # [前端服务] 核心业务层，封装了 fetch 请求，负责与后端 API 通信（AI 生成、数据存储）
├── index.html             # [前端入口] 浏览器加载的第一个 HTML 文件，挂载 React 应用
├── index.tsx              # [前端入口] React 渲染入口，引入全局样式和 Context
├── metadata.json          # [配置] 项目元数据描述及权限声明（如麦克风权限）
├── node_modules/          # [依赖] npm 安装的所有第三方库
├── package-lock.json      # [依赖] 锁定依赖版本，确保环境一致性
├── package.json           # [配置] 项目配置清单，定义了 scripts (dev, server) 和依赖包
├── project.config.json    # [核心配置] 全局配置文件，定义 API Key、Prompt 提示词、数据库 Key 和端口
├── scratchpad.md          # [文档] AI 协作过程中的任务板和进度记录
├── screens/
│   ├── EditorScreen.tsx         # [前端页面] AI 工坊：展示 AI 生成的 4 个版本，支持手动修改和单版本重成
│   ├── QuickNoteScreen.tsx      # [前端页面] 首页：支持语音/文本输入、静音检测、实时转写和草稿自动保存
│   └── StudioVersionsScreen.tsx # [前端页面] 档案室：查看历史项目，进行版本对比、删除和管理
├── server/
│   ├── activity.log       # [后端日志] 记录用户操作流水的日志文件（自动生成）
│   ├── index.ts           # [后端核心] Express 服务器，提供 RESTful API，处理数据库读写和 Gemini AI 调用
│   └── logger.ts          # [后端工具] 简单的文件日志写入工具
├── tsconfig.json          # [配置] TypeScript 编译配置文件
├── types.ts               # [类型] 前后端通用的数据接口定义 (Project, ContentVersion, Draft)
└── vite.config.ts         # [配置] Vite 构建配置，设置端口 3000 及 /api 代理转发规则
```

---

## 快速启动 (Quick Start)

### 1. 环境准备
确保您的环境已安装 Node.js (v20+)。

### 2. 克隆与安装
```bash
git clone <repository-url>
cd FlashIdea
npm install
```

### 3. 配置密钥 (Configuration)
本项目采用集中式配置管理，请修改根目录下的 `project.config.json`：

```json
{
    "api": {
        "port": 3001,
        "prefix": "/api"
    },
    "ai": {
        "model": "gemini-2.5-flash",
        "prompts": {
            "transcribe": "Custom prompt for transcription...",
            "refine": "Custom prompt for idea refinement...",
            "single": "Custom prompt for single version generation..."
        }
    },
    "supabase": {
        "url": "YOUR_SUPABASE_URL",
        "key": "YOUR_SUPABASE_ANON_KEY"
    },
    "gemini": {
        "apiKey": "YOUR_GEMINI_API_KEY"
    }
}
```
> **小技巧**: 使用 Supabase 提供的 RESTful 接口可以省去大量后端 CRUD 代码，让我们将精力集中在 AI 业务逻辑上。

### 4. 数据库初始化
在 Supabase SQL Editor 中运行以下指令，构建项目所需的结构化存储：

```sql
-- Projects Table: 存储核心创意元数据
create table projects (
  id text primary key,
  title text,
  original_note text,
  tags jsonb,
  main_image_url text,
  timestamp bigint
);

-- Versions Table: 核心创意的不同维度变体
create table versions (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  title text,
  tags jsonb,
  description text,
  content text,
  image_url text,
  type text,
  is_recommended boolean default false
);

-- Drafts Table: 快速捕捉的碎片化灵感
create table drafts (
  id text primary key,
  text text,
  timestamp bigint
);
```

### 5. 启动服务 (Deployment)
本项目采用前后端分离但同构开发的模式。

**终端 1 (后端 API 服务):**
```bash
npm run server
```

**终端 2 (前端界面):**
```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000` 即可体验。

---



---

## API 参考 (API Reference)

后端设计遵循 RESTful 规范，专注于数据透传与 AI 能力封装。

### Projects
- `GET /projects`: 获取所有创意项目及其衍生版本。
- `POST /projects`: 同步项目状态（支持自动 Diff 更新版本）。
- `DELETE /projects/:id`: 归档/删除项目。

### AI Services (Core Logic)
- `POST /ai/transcribe`: 音频流 -> 文本 (Multimodal Capability)
- `POST /ai/refine`: 文本 -> 4种结构化变体 (Structured Generation)
- `POST /ai/single`: 文本 + 上下文 -> 单一增强版本 (Contextual Refinement)

---
## 相关资源与教程 (Resources & Tutorials)

*   **Vibe Coding 工程化流解说**: 深度解析本项目背后的 "Vibe Coding" 心流开发模式。  
    [👉 点击查看飞书文档 (Feishu Doc)](https://dw9ipw7kh1c.feishu.cn/wiki/HsqiwuurAic9HVk2y6mcyPW9nkc?from=from_copylink)

*   **项目全景解说视频**: 关于 FlashIdea 的设计初衷、技术选型与演示。  
    [👉 点击观看视频 (Youtube/Bilibili)](https://youtu.be/i2-FGI7uhOM)

---

*Made with ❤️ by Jacob, driven by AI Native Architecture.*

