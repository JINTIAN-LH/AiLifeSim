<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getStatus } from '../services/api';

const status = ref<any>(null);
const error = ref('');

function clampBar(value: number | undefined) {
  return Math.min(100, Math.max(0, Number(value ?? 0)));
}

function moodColor(value: number | undefined) {
  const n = clampBar(value);
  if (n >= 70) return 'meter-good';
  if (n >= 40) return 'meter-mid';
  return 'meter-bad';
}

function ageDisplay(quarters: number) {
  const years = Math.floor(quarters / 4);
  const months = (quarters % 4) * 3;
  if (months === 0) return `${years}岁`;
  return `${years}岁${months}个月`;
}

function stageClass(stageName: string) {
  const map: Record<string, string> = {
    婴幼儿期: 'stage-infant',
    童年期: 'stage-child',
    少年期: 'stage-teen',
    青年期: 'stage-young',
    壮年期: 'stage-prime',
    中年期: 'stage-middle',
    老年期: 'stage-elder',
  };
  return map[stageName] || '';
}

const statKeys = ['mood', 'health', 'stress', 'money', 'charm', 'intelligence'] as const;
const statLabels: Record<string, string> = {
  mood: '心情',
  health: '健康',
  stress: '压力',
  money: '财富',
  charm: '魅力',
  intelligence: '智力',
};

async function refresh() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '';
    status.value = null;
    return;
  }
  try {
    const res = await getStatus(characterId);
    status.value = res?.data || null;
  } catch {
    error.value = '状态加载失败';
  }
}

onMounted(refresh);
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">主城中心</h2>
        <p class="page-hint">在这里决定下一步是继续本世人生，还是开启一个新的出身与命运分支。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div v-if="status?.character" class="home-stack">
      <section class="home-hero">
        <article class="card life-focus-card">
          <div class="life-focus-head">
            <div class="life-focus-meta">
              <span class="eyebrow">当前人生</span>
              <div class="life-focus-title-row">
                <span class="stage-badge" :class="stageClass(status.character.life_stage || '青年期')">
                  {{ status.character.life_stage || '青年期' }}
                </span>
                <div>
                  <div class="kpi-value life-name">{{ status.character.name || '新角色' }}</div>
                  <div class="kpi-label">{{ ageDisplay(status.character.quarters_lived || 0) }} · 第{{ status.character.generation || 1 }}世</div>
                </div>
              </div>
            </div>
            <div class="life-focus-cta">
              <router-link to="/timeline" class="button-link">
                <button class="btn-primary btn-block">继续本世人生</button>
              </router-link>
              <router-link to="/status" class="ghost-link">查看完整状态面板</router-link>
            </div>
          </div>

          <div class="life-focus-grid">
            <div class="summary-chip">
              <span class="summary-label">当前职业</span>
              <strong>{{ status.character.job || '尚未入职' }}</strong>
            </div>
            <div class="summary-chip">
              <span class="summary-label">可支配财富</span>
              <strong>{{ status.character.money ?? 0 }} 金币</strong>
            </div>
            <div class="summary-chip">
              <span class="summary-label">人生阶段</span>
              <strong>{{ status.character.life_stage || '青年期' }}</strong>
            </div>
          </div>
        </article>

        <article class="card cadence-card">
          <span class="eyebrow">游玩建议</span>
          <h3>现在最适合做什么</h3>
          <ul class="list-reset cadence-list">
            <li>先推进一个季度，确认属性和事件反馈是否健康。</li>
            <li>压力偏高时优先去社交或查看状态，避免连续硬推进。</li>
            <li>职业和财富曲线稳定后，再考虑冲刺更高层级目标。</li>
          </ul>
        </article>
      </section>

      <section class="grid grid-2 home-section-gap">
        <article class="card status-card">
          <div class="section-head">
            <div>
              <span class="eyebrow">核心状态</span>
              <h3>这世人生的即时面板</h3>
            </div>
            <router-link to="/status" class="section-link">完整面板</router-link>
          </div>
          <div class="status-list">
            <div v-for="key in statKeys" :key="key" class="status-row">
              <div class="status-row-top">
                <span>{{ statLabels[key] }}</span>
                <strong>{{ status.character[key] }}</strong>
              </div>
              <div class="bar status-bar">
                <span
                  :class="key === 'stress' ? moodColor(100 - status.character[key]) : moodColor(status.character[key])"
                  :style="{ width: clampBar(key === 'stress' ? status.character[key] : status.character[key]) + '%' }"
                />
              </div>
            </div>
          </div>
        </article>

        <article class="card command-card">
          <div class="section-head">
            <div>
              <span class="eyebrow">快捷入口</span>
              <h3>围绕当前人生的下一步</h3>
            </div>
          </div>
          <div class="action-grid">
            <router-link to="/timeline" class="action-tile emphasis-tile">
              <span class="action-icon">⏳</span>
              <strong>推进季度</strong>
              <span>继续事件链，推动年龄、关系与资源变化。</span>
            </router-link>
            <router-link to="/npc" class="action-tile">
              <span class="action-icon">💬</span>
              <strong>经营社交</strong>
              <span>查看 NPC 互动，稳住关系与情绪波动。</span>
            </router-link>
            <router-link to="/career" class="action-tile">
              <span class="action-icon">💼</span>
              <strong>调整职业</strong>
              <span>确认工作状态与成长路径是否跑偏。</span>
            </router-link>
            <router-link to="/legacy" class="action-tile">
              <span class="action-icon">📜</span>
              <strong>查看往世</strong>
              <span>回顾世代成果，判断这世的独特价值。</span>
            </router-link>
          </div>
        </article>
      </section>

      <div v-if="status.character.age >= 18 && !status.character.life_stage" class="card section legacy-note-card">
        <span class="eyebrow">兼容提醒</span>
        <h3>检测到旧版角色存档</h3>
        <p class="page-hint">旧版角色仍可浏览，但新版推荐从婴幼儿期开始，以完整体验季度人生推演、事件分支和代际回顾。</p>
      </div>
    </div>

    <div v-else class="home-stack">
      <section class="empty-hero card">
        <span class="empty-emoji" aria-hidden="true">🌇</span>
        <div class="empty-copy">
          <span class="eyebrow">第一步</span>
          <h3>开始你的人生旅程</h3>
          <p class="page-hint">从新生儿开始，经历婴幼儿、童年、少年、青年、壮年、中年、老年七个阶段。每个季度都会带来新的事件与抉择。</p>
        </div>
        <router-link to="/create" class="button-link empty-cta">
          <button class="btn-primary">创建新角色</button>
        </router-link>
      </section>

      <section class="grid grid-3 onboarding-grid">
        <article class="card onboarding-card">
          <span class="action-icon">👶</span>
          <h3>设定开局</h3>
          <p class="page-hint">选择家庭背景、性格与形象，决定这一世的起点资源。</p>
        </article>
        <article class="card onboarding-card">
          <span class="action-icon">🧭</span>
          <h3>季度推进</h3>
          <p class="page-hint">按节奏推进人生，每次选择都将改写长期曲线。</p>
        </article>
        <article class="card onboarding-card">
          <span class="action-icon">🏛️</span>
          <h3>回顾传承</h3>
          <p class="page-hint">一世结束后，回顾这一生留下的结果与下一世的影响。</p>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.home-stack {
  display: grid;
  gap: 14px;
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 14px;
}

.life-focus-card {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 234, 0.96)),
    linear-gradient(135deg, rgba(0, 109, 119, 0.06), rgba(217, 122, 43, 0.08));
}

.life-focus-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.life-focus-meta {
  display: grid;
  gap: 6px;
}

.life-focus-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.life-name {
  font-size: 24px;
}

.life-focus-cta {
  display: grid;
  gap: 10px;
  min-width: 200px;
}

.button-link {
  text-decoration: none;
}

.btn-block {
  width: 100%;
}

.ghost-link,
.section-link {
  color: var(--brand-strong);
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.life-focus-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.summary-chip {
  border: 1px solid rgba(185, 174, 157, 0.7);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  padding: 12px;
  display: grid;
  gap: 6px;
}

.summary-label {
  font-size: 12px;
  color: var(--text-soft);
}

.cadence-card {
  display: grid;
  align-content: start;
  gap: 10px;
}

.cadence-card h3,
.status-card h3,
.command-card h3,
.empty-hero h3,
.legacy-note-card h3,
.onboarding-card h3 {
  margin: 0;
}

.cadence-list {
  display: grid;
    gap: 10px;
    color: var(--text-soft);
    font-size: 14px;
}

.cadence-list li {
  position: relative;
  padding-left: 16px;
}

.cadence-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--energy);
}

.home-section-gap {
  gap: 14px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.status-list {
  display: grid;
  gap: 12px;
}

.status-row {
  display: grid;
  gap: 6px;
}

.status-row-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.status-bar {
  height: 7px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.action-tile {
  min-height: 136px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 242, 232, 0.96));
  padding: 14px;
  color: var(--text);
  text-decoration: none;
  display: grid;
  align-content: start;
  gap: 8px;
  transition:
    transform var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);
}

.action-tile:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: 0 12px 28px rgba(31, 45, 61, 0.1);
}

.action-tile span:last-child {
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.emphasis-tile {
  background: linear-gradient(140deg, rgba(0, 109, 119, 0.1), rgba(217, 122, 43, 0.16)), var(--surface-1);
}

.action-icon,
.empty-emoji,
.quick-card-icon {
  font-size: 28px;
  line-height: 1;
}

.legacy-note-card {
  background: linear-gradient(180deg, #fff9e9, #fff3d0);
}

.empty-hero {
  padding: 22px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
}

.empty-copy {
  display: grid;
  gap: 6px;
}

.empty-cta {
  align-self: center;
}

.onboarding-grid {
  gap: 14px;
}

.onboarding-card {
  text-align: left;
  display: grid;
  gap: 10px;
}

@media (max-width: 980px) {
  .home-hero {
    grid-template-columns: 1fr;
  }

  .life-focus-grid {
    grid-template-columns: 1fr;
  }

  .empty-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .life-focus-head,
  .section-head,
  .quick-card {
    flex-direction: column;
    align-items: stretch;
  }

  .life-focus-cta,
  .empty-cta {
    width: 100%;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
