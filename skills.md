# AI Skill 配置规范（全工程通用）

本文件定义本地与项目级的技能库安装、更新、选择优先级和执行流程。
目标：我参与的每个工程，默认都启用这 5 组能力，且可重复执行、可审计。

## 1. 技能库清单（固定）

1. gstack
- 仓库: https://github.com/garrytan/gstack
- 作用: 端到端工程流程（计划、评审、QA、发布）

2. agency-agents
- 仓库: https://github.com/msitarzewski/agency-agents
- 作用: 多角色专业代理（工程/设计/产品/测试）

3. superpowers
- 仓库: https://github.com/obra/superpowers
- 作用: 强制化研发方法论（brainstorm -> plan -> TDD -> review）

4. agent-skill-creator
- 仓库: https://github.com/FrancyJGLisboa/agent-skill-creator
- 作用: 将团队流程沉淀为可复用 SKILL，并分发到多工具

5. react-admin
- 仓库: https://github.com/marmelab/react-admin
- 作用: 作为后台/管理端设计和数据提供层参考库（非必须安装为 agent skill）

## 2. 默认安装策略（Windows + VS Code / Copilot）

### 2.1 全局路径约定

- Claude/Copilot 通用全局路径: ~/.claude/skills/
- 通用多工具路径: ~/.agents/skills/

说明：VS Code Copilot 兼容读取 ~/.claude/skills/ 下的 SKILL.md。

### 2.2 推荐安装命令（一次执行）

在 Git Bash / WSL / Linux shell 执行：

```bash
mkdir -p ~/.claude/skills ~/.agents/skills

git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git ~/.claude/skills/agency-agents
git clone --depth 1 https://github.com/obra/superpowers.git ~/.claude/skills/superpowers
git clone --depth 1 https://github.com/FrancyJGLisboa/agent-skill-creator.git ~/.claude/skills/agent-skill-creator

ln -s ~/.claude/skills/agent-skill-creator ~/.agents/skills/agent-skill-creator 2>/dev/null || true
```

如果是 PowerShell（无 ln -s），用：

```powershell
New-Item -ItemType Directory -Force "$HOME/.claude/skills" | Out-Null
git clone --depth 1 https://github.com/garrytan/gstack.git "$HOME/.claude/skills/gstack"
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git "$HOME/.claude/skills/agency-agents"
git clone --depth 1 https://github.com/obra/superpowers.git "$HOME/.claude/skills/superpowers"
git clone --depth 1 https://github.com/FrancyJGLisboa/agent-skill-creator.git "$HOME/.claude/skills/agent-skill-creator"
```

## 3. 项目级接入策略（每个新项目必须）

1. 检查是否存在项目技能目录
- .github/skills/

2. 若需要项目内共享技能，优先用软链接
- 将常用 skill 链接到 .github/skills/ 下，避免复制

3. 提交最小化配置文件
- 保留本文件（skills.md）
- 在项目 README 增加“Skill 使用说明”章节

## 4. 激活优先级与路由规则

### 4.1 任务路由（默认）

1. 需求澄清和计划阶段
- 优先: superpowers（brainstorming / writing-plans）
- 备选: gstack（/office-hours, /autoplan）

2. 工程实现阶段
- 优先: superpowers（subagent-driven-development, test-driven-development）
- 备选: gstack（/review, /qa, /ship）

3. 角色分工与多职能输出
- 优先: agency-agents（按 Engineering / Design / Testing 选角色）

4. 团队知识沉淀为技能
- 优先: agent-skill-creator（生成 SKILL.md + install.sh + references）

5. 后台管理场景（管理端 UI/数据流）
- 参考: react-admin（Data Provider、Resource、CRUD 结构）

### 4.2 冲突处理

同一环节多个技能冲突时，按以下顺序：
1. 与当前交付目标最直接相关
2. 约束更强（可验证、可测试）
3. 变更更小（优先低风险）

## 5. 更新与维护（每周一次）

```bash
cd ~/.claude/skills/gstack && git pull
cd ~/.claude/skills/agency-agents && git pull
cd ~/.claude/skills/superpowers && git pull
cd ~/.claude/skills/agent-skill-creator && git pull
```

补充：
- gstack 可使用其升级命令（如 /gstack-upgrade）
- agency-agents 如有新增角色，执行 convert/install 脚本同步到目标工具

## 6. 最低质量门槛（必须满足）

1. 每次重要改动前必须有计划（plan）
2. 每次交付前必须有验证（build/test/smoke）
3. 每次项目迭代必须沉淀至少一条可复用经验到技能文档

## 7. 本项目当前执行结果

1. 已完成本文件的标准化 skill 配置
2. 后续在每个新项目中沿用同一规范
3. 前端展示会按“设计先行 + 结构化验证”继续迭代