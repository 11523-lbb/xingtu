# 星途 · 追星打卡社区 Demo

面向追星用户的兴趣社区 Demo：围绕明星相关地点、打卡攻略与用户内容，AI Agent 把社区沉淀的信息转化为可执行的打卡路线。

> **社区负责沉淀，AI 负责转化，行动负责回流。**

## 技术栈

React 18 + TypeScript + Vite + React Router + Zustand（纯前端，无后端；Mock 数据 + 本地持久化）

## 快速开始

```bash
npm install
npm run dev        # 开发模式 http://localhost:5173
npm run build      # 生产构建（tsc 严格检查 + 打包到 dist/）
npm run preview    # 预览构建产物
```

## 演示路径（完整产品闭环）

```
首页（今天，去哪里打卡？）
  ↓
社区（打卡照片 / 攻略 / 路线分享）
  ↓
打卡点详情（来源标注 + 社区攻略）→「把这里加入 AI 路线」
  ↓
AI 规划输入（结构化条件 + 上下文预填）
  ↓
Agent 执行过程（星轨 7 步可视化：需求理解 → 地点查询 → 社区攻略 → 筛选 → 规划 → 校验 → 优化）
  ↓
路线结果（星轨时间轴 +「为什么是这条路线」+ 社区证据）
  ↓
开始打卡 → 逐站完成（星轨进度）
  ↓
发布打卡 → 回到社区（自己的帖子出现在推荐流）
```

## 工程命令

| 命令 | 说明 |
|---|---|
| `npm run test:agent` | Agent 引擎测试（8 组：规划/筛选/店休/少走路/美食/上下文/确定性/失败场景） |
| `npm run test:ui` | 页面行为测试（34 组：输入/执行/结果/打卡闭环） |
| `npm run validate:data` | Mock 数据完整性校验（ID/外键/时间/坐标/一致性） |

## 目录结构

```
mock/                    # 演示数据集（城市/明星/地点/帖子/路线/用户 + 图片清单）
scripts/                 # 数据校验脚本
src/
├── services/data.ts     # 数据访问层（未来换真实 API 只改这一层）
├── services/agent/      # AI Agent 引擎（orchestrator + rules + 5 Tools，确定性规则编排）
├── store/               # Zustand（用户资产 / Agent 流程 / 打卡会话 / 本地发布）
├── components/          # 设计系统组件（星轨语言：Logo / 路线图 / 时间轴 / 进度）
└── pages/               # 12 个页面
tests/                   # Vitest 测试（引擎 + UI 行为）
```

## 数据说明

本仓库全部用户、帖子、评论、路线均为虚构；涉及真实公众人物与场所的内容仅为产品功能演示（`mock/meta.json` 含完整免责声明）。地点数据以 `sourceType`（public/demo）标注来源口径，UI 中同步展示。
