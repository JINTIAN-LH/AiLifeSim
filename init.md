# 模拟人生/第二人生 MVP 一次性落地初始化文档（init）

## 1. 目标与范围

- 项目目标：在最短路径内落地可上线的 小程序/网页小游戏 MVP。
- 固定技术栈：
  - 前端：Vue 3 + Vite + Tailwind CSS
  - 后端：Node.js + Express + SQLite
- 本次实现范围：仅覆盖 P0 + P1。
- 不纳入本次范围：P2（玩家互社、排行榜、更多职业/皮肤等）。

## 2. 交付定义（DoD）

满足以下条件即判定本轮实现完成：

1. P0 + P1 功能可用（见第 11 节验收清单）。
2. 前端可在本地运行并连接后端。
3. 后端可在本地运行并持久化 SQLite 数据。
4. Funloom 前端可部署，Render 后端可部署。
5. 小程序 web-view 可正常嵌入并联通核心接口。
6. AI 调用失败时，降级脚本可自动接管主流程。

## 3. 建议目录结构

```text
aiLifeSim/
├─ init.md
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  ├─ .env.development
│  ├─ .env.production
│  └─ src/
│     ├─ main.ts
│     ├─ App.vue
│     ├─ router/index.ts
│     ├─ stores/
│     │  ├─ player.ts
│     │  ├─ npc.ts
│     │  └─ event.ts
│     ├─ services/
│     │  ├─ api.ts
│     │  └─ ws.ts
│     ├─ pages/
│     │  ├─ Login.vue
│     │  ├─ CreateRole.vue
│     │  ├─ Home.vue
│     │  ├─ NpcSocial.vue
│     │  ├─ Career.vue
│     │  ├─ Bag.vue
│     │  └─ Profile.vue
│     └─ components/
│        └─ EventModal.vue
└─ backend/
   ├─ package.json
   ├─ .env
   ├─ server.js
   ├─ app.js
   ├─ routes/
   │  ├─ character.js
   │  ├─ action.js
   │  ├─ npc.js
   │  ├─ event.js
   │  └─ achievement.js
   ├─ services/
   │  ├─ aiService.js
   │  ├─ fallbackService.js
   │  ├─ gameEngine.js
   │  └─ relationEngine.js
   ├─ db/
   │  ├─ sqlite.js
   │  ├─ init.sql
   │  └─ seed.js
   └─ prompts/
      ├─ npc.txt
      ├─ event.txt
      ├─ career.txt
      └─ relationship.txt
```

## 4. 环境变量

### 4.1 前端（frontend/.env.development）

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### 4.2 前端（frontend/.env.production）

```bash
VITE_API_BASE_URL=https://<render-backend-domain>
VITE_WS_URL=wss://<render-backend-domain>
```

### 4.3 后端（backend/.env）

```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
AI_PROVIDER=openai
AI_API_KEY=your_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
ENABLE_AI_FALLBACK=true
SQLITE_PATH=./data/lifesim.db
```

## 5. SQLite 数据库 Schema

> 初始化时执行 backend/db/init.sql。

### 5.1 characters

- id (TEXT, PK)
- name, gender, avatar, personality
- mood (INT, 0-100)
- health (INT, 0-100)
- stress (INT, 0-100)
- money (INT)
- charm (INT)
- intelligence (INT)
- job (TEXT)
- job_level (TEXT)
- age (INT)
- created_at, updated_at

### 5.2 npcs

- id (TEXT, PK)
- name
- role_type (同事/挚友/邻居/候选恋人/导师)
- personality
- mood_state
- unlocked (INT, 0/1)
- created_at

### 5.3 npc_relations

- id (TEXT, PK)
- character_id
- npc_id
- favorability (INT, -100~100)
- relationship_stage (TEXT)
- updated_at

### 5.4 npc_memories

- id (TEXT, PK)
- character_id
- npc_id
- memory_text
- weight (INT)
- expires_at (DATETIME)
- created_at

### 5.5 inventory_items

- id (TEXT, PK)
- character_id
- item_code
- item_name
- item_type (consumable/social/skill)
- qty
- created_at, updated_at

### 5.6 events

- id (TEXT, PK)
- character_id
- event_type (positive/negative/neutral)
- event_text
- options_json
- chosen_option
- result_json
- created_at

### 5.7 achievements

- id (TEXT, PK)
- character_id
- code
- unlocked_at

### 5.8 daily_tasks

- id (TEXT, PK)
- character_id
- task_code
- progress
- target
- status (todo/done)
- date_key

## 6. API 契约（后端必须实现）

统一响应：

```json
{
  "code": 200,
  "message": "ok",
  "data": {}
}
```

错误码约定：200 成功，400 参数错误，500 服务器错误，503 AI 调用失败（但允许降级返回可玩结果）。

### 6.1 角色

- POST /api/character/create
  - 入参：name, gender, avatar, personality
  - 出参：characterId, initialStatus

- GET /api/character/status?characterId=xxx
  - 出参：角色核心状态 + 职业 + 背包 + 任务 + 关系摘要

- POST /api/character/restart
  - 入参：characterId, inheritKey
  - 出参：newCharacter

### 6.2 行动

- POST /api/action/do
  - 入参：characterId, actionType(work/social/leisure/study/free)
  - 出参：actionResult, statusDelta, triggeredEvent(optional)

### 6.3 NPC

- POST /api/npc/chat
  - 入参：characterId, npcId, message
  - 出参：npcResponse, favorabilityChange, relationStage

- POST /api/npc/gift
  - 入参：characterId, npcId, itemId
  - 出参：favorabilityChange, npcFeedback

### 6.4 事件

- GET /api/event/random?characterId=xxx
  - 出参：eventId, event, options

- POST /api/event/choose
  - 入参：characterId, eventId, optionIndex
  - 出参：finalResult, statusDelta, relationDelta

### 6.5 成就

- GET /api/character/achievement?characterId=xxx
  - 出参：unlocked, locked

## 7. AI 模块、Prompt 与降级

### 7.1 场景化 AI 模块

- NPC 聊天模块
- 人生事件模块
- 职业反馈模块
- 关系演化模块

### 7.2 输入输出硬约束

- 所有 AI 返回必须是 JSON。
- 输出字段必须与接口 data 字段一致。
- 若字段缺失或 JSON 解析失败，视为 AI 调用失败，进入降级。

### 7.3 降级策略（必须实现）

当 AI 超时、网络异常、额度耗尽、返回格式错误时：

1. NPC 聊天：返回人格化通用回复，好感度变动设为 0 或轻微 +1。
2. 事件生成：返回预设中性事件，确保流程可继续。
3. 职业反馈：返回中性绩效与基础薪资。
4. 关系演化：按最近行为简单规则增减好感并更新阶段。

## 8. 核心数值规则

1. 状态边界：
- mood/health/stress ∈ [0,100]
- favorability ∈ [-100,100]

2. 记忆系统：
- NPC memory TTL = 7 天
- 过期记忆自动衰减或清理

3. 事件触发：
- 每日 1-2 个事件
- 类型比例约正:负:中 = 3:2:5

4. 关系阶段：
- >=80 深爱/挚友
- 50-79 好感/亲密朋友
- 20-49 普通朋友
- 0-19 陌生
- <=-1 厌恶

## 9. 前端页面实现映射

1. 登录/注册页：游客直入 + 本地账号模式。
2. 角色创建页：形象、性格、姓名，提交后进入主城。
3. 主城页：展示核心状态 + 五个动作按钮 + 每日任务 + 消息入口。
4. NPC 社交页：NPC 列表、聊天、送礼、记忆清单。
5. 职业页：职业层级、技能值、升职要求、切换职业。
6. 事件弹窗：2-3 分支，选后回写状态。
7. 背包页：道具分类、使用/赠送。
8. 个人页：成就、结局记录、新人生。

## 10. 开发执行顺序（一次性落地）

### Phase A（脚手架 + 核心通路）

1. 初始化 frontend/backend。
2. 后端接入 SQLite，执行 init.sql + seed。
3. 完成角色创建与状态查询接口。
4. 前端完成登录、创建角色、主城基础展示。

### Phase B（主玩法闭环）

1. 完成 action/do（五大动作）及状态回写。
2. 完成随机事件生成与事件分支选择。
3. 完成 NPC 聊天与送礼。
4. 完成 AI 调用与降级路径。

### Phase C（P1 强化）

1. 关系演化细化 + 关系修复。
2. 职业层级与升职考核。
3. 每日任务 + 连续登录奖励。
4. 成就系统 + 事件/结局记录。

### Phase D（上线）

1. 后端部署 Render。
2. 前端部署 Funloom。
3. 配置跨域与前后端地址。
4. 小程序 web-view 嵌入与白名单配置。

## 11. 本地开发命令

### 11.1 前端

```bash
cd frontend
npm install
npm run dev
```

### 11.2 后端

```bash
cd backend
npm install
node server.js
```

> 建议补充脚本：

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "db:init": "node db/seed.js"
  }
}
```

## 12. 云端部署步骤

### 12.1 Render（后端）

1. 推送 backend 到 GitHub。
2. Render 创建 Web Service 并关联仓库。
3. 配置环境变量（AI_API_KEY、CORS_ORIGIN 等）。
4. Node 版本 16+。
5. Start Command: node server.js。
6. 部署成功后记录后端域名。

### 12.2 Funloom（前端）

1. 执行 npm run build 生成 dist。
2. Funloom 新建静态站点。
3. 上传 dist 全量文件。
4. 获取前端域名。

### 12.3 跨域回填

- 后端 CORS_ORIGIN 设置为 Funloom 域名。
- 前端 VITE_API_BASE_URL 设置为 Render 域名。

## 13. 小程序嵌入步骤（web-view）

1. 小程序页面使用 web-view 指向 Funloom 前端域名。
2. 小程序后台配置业务域名白名单：
   - Funloom 前端域名
   - Render 后端域名
3. 验证核心链路：登录/创建角色/动作/聊天/事件。

## 14. 验收清单（P0 + P1）

### 14.1 P0

- [ ] 角色创建
- [ ] 五个日常动作
- [ ] AI NPC 聊天 + 好感度 + 基础记忆
- [ ] AI 随机事件 + 至少 2 分支
- [ ] AI 职业成长基础反馈
- [ ] 状态系统（心情、健康、压力、财富）
- [ ] 背包与基础道具
- [ ] 基础结局 + 新人生
- [ ] Funloom + Render 部署可访问
- [ ] 异常响应 + AI 降级

### 14.2 P1

- [ ] NPC 专属剧情 + 隐藏 NPC
- [ ] 3 分支事件与闭环结果
- [ ] 职业层级细化 + 升职考核
- [ ] 关系演化 + 修复
- [ ] 每日任务 + 连续登录
- [ ] 成就系统
- [ ] 事件记录 + 结局记录

## 15. 风险与规避

1. Render 持久化风险：SQLite 需挂载持久磁盘，否则存在数据丢失风险。
2. AI 风险：接口不稳定时必须强制走 fallback，不能阻断玩法。
3. 跨域风险：域名变更后需同步更新 CORS 与前端 API 地址。
4. 响应超时风险：为 AI 请求设置超时与重试（建议最多重试 1 次）。
5. 数据一致性风险：关键状态写入使用事务，避免事件分支与状态错位。

## 16. 最短闭环回归脚本

1. 创建角色。
2. 执行一次 work，观察 money/stress 变化。
3. 执行一次 social，进入 NPC 聊天。
4. 拉取一次随机事件并选择分支。
5. 打开背包使用道具。
6. 查询状态接口，确认所有变化已持久化。
7. 模拟 AI 失败，验证 fallback 返回和流程不中断。

---

本 init.md 作为执行主文档：后续任何实现任务优先遵循本文件。若与原始需求文档冲突，以“P0+P1 可落地性”和“稳定不阻断”为第一原则。