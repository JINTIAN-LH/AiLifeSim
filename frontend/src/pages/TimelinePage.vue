<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { advanceQuarter, resolveEvent, getTimeline, getStatus, submitCustomEvent } from '../services/api';

type EventOption = {
  option: string;
  result: string;
  status_change?: Record<string, number>;
};

type LifeEvent = {
  event_code: string;
  category: string;
  event_text: string;
  options: EventOption[];
  isMilestone?: boolean;
};

const router = useRouter();
const status = ref<any>(null);
const error = ref('');
const loading = ref(false);
const actionMsg = ref('');
const currentEvents = ref<LifeEvent[]>([]);
const resolvedEvents = ref<{ event: LifeEvent; chosenOption: EventOption; idx: number }[]>([]);
const statChanges = ref<Record<string, number>>({});
const deathInfo = ref<any>(null);
const deathWarning = ref<any>(null);
const timeline = ref<any[]>([]);
const showTimeline = ref(false);
const transitioning = ref(false);
const newStage = ref('');

function clampBar(value: number | undefined) {
  return Math.min(100, Math.max(0, Number(value ?? 0)));
}

function barColor(value: number | undefined) {
  const n = clampBar(value);
  if (n >= 70) return 'meter-good';
  if (n >= 40) return 'meter-mid';
  return 'meter-bad';
}

function stageClass(stageName: string) {
  const map: Record<string, string> = {
    '婴幼儿期': 'stage-infant',
    '童年期': 'stage-child',
    '少年期': 'stage-teen',
    '青年期': 'stage-young',
    '壮年期': 'stage-prime',
    '中年期': 'stage-middle',
    '老年期': 'stage-elder',
  };
  return map[stageName] || '';
}

function ageDisplay(quarters: number) {
  const years = Math.floor(quarters / 4);
  const months = (quarters % 4) * 3;
  if (months === 0) return `${years}岁`;
  return `${years}岁${months}个月`;
}

function seasonEmoji(quarters: number) {
  const s = quarters % 4;
  return ['🌸', '☀️', '🍂', '❄️'][s];
}

const stageKey = computed(() => {
  const s = status.value?.character?.life_stage || '';
  const map: Record<string, string> = {
    '婴幼儿期': 'infant', '童年期': 'child', '少年期': 'teen',
    '青年期': 'young_adult', '壮年期': 'prime', '中年期': 'middle', '老年期': 'elder',
  };
  return map[s] || '';
});

async function refresh() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未找到角色，请先创建角色。';
    return;
  }
  const res = await getStatus(characterId);
  status.value = res?.data || null;
  if (status.value?.character && !status.value.character.is_alive) {
    deathInfo.value = {
      age: status.value.character.age,
      cause: { label: status.value.character.death_cause || '寿终正寝' },
    };
  }
}

async function loadTimeline() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;
  const res = await getTimeline(characterId, 30);
  timeline.value = res?.data?.logs || [];
}

async function advance() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;

  loading.value = true;
  error.value = '';
  actionMsg.value = '';
  currentEvents.value = [];
  resolvedEvents.value = [];
  statChanges.value = {};
  deathWarning.value = null;
  transitioning.value = false;
  newStage.value = '';

  try {
    const res = await advanceQuarter({ characterId });
    const data = res?.data;

    currentEvents.value = data?.events || [];
    transitioning.value = data?.transitioning || false;
    newStage.value = data?.lifeStage || '';
    deathWarning.value = data?.deathWarning || null;

    if (data?.dead) {
      deathInfo.value = data.deathInfo;
      // Save reviewId for navigation
      if (data.reviewId) {
        localStorage.setItem('lastReviewId', data.reviewId);
        localStorage.setItem('lastDeathCharacterId', characterId);
      }
    }

    if (data?.passiveDelta) {
      statChanges.value = data.passiveDelta;
    }

    await refresh();
    if (showTimeline.value) await loadTimeline();
  } catch (e) {
    error.value = '季度推进失败';
  } finally {
    loading.value = false;
  }
}

async function chooseEvent(eventCode: string, optionIndex: number) {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;

  const targetEvent = currentEvents.value.find(e => e.event_code === eventCode);
  if (!targetEvent) {
    error.value = '事件不存在或已被处理';
    return;
  }

  loading.value = true;
  try {
    const res = await resolveEvent({
      characterId,
      quarterNumber: status.value?.character?.quarters_lived || 0,
      eventCode,
      optionIndex,
      eventText: targetEvent.event_text,
      options: targetEvent.options,
    });
    const data = res?.data;
    const chosenOption = data?.option;
    if (!chosenOption) {
      error.value = res?.message || '事件选择失败';
      return;
    }
    resolvedEvents.value.push({
      event: targetEvent,
      chosenOption,
      idx: optionIndex,
    });

    // Remove the resolved event
    currentEvents.value = currentEvents.value.filter(e => e.event_code !== eventCode);

    await refresh();
  } catch (e) {
    error.value = '事件选择失败';
  } finally {
    loading.value = false;
  }
}

function viewLifeReview() {
  const characterId = localStorage.getItem('characterId');
  if (characterId) {
    router.push(`/review?characterId=${characterId}`);
  }
}

function goToReincarnate() {
  const characterId = localStorage.getItem('characterId');
  if (characterId) {
    router.push(`/create?reincarnate=${characterId}`);
  }
}

function statDeltaText(key: string) {
  const labels: Record<string, string> = {
    mood: '心情', health: '健康', stress: '压力', money: '金钱', charm: '魅力', intelligence: '智力',
  };
  const v = statChanges.value[key];
  if (!v) return '';
  const sign = v > 0 ? '+' : '';
  return `${labels[key] || key}: ${sign}${v.toFixed(1)}`;
}

const showCustomEvent = ref(false);
const customEventText = ref('');
const customOption1 = ref('');
const customOption2 = ref('');
const customResult1 = ref('');
const customResult2 = ref('');
const loadingCustom = ref(false);
const customResult = ref('');

async function submitCustom() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId || !customEventText.value.trim()) return;
  loadingCustom.value = true;
  customResult.value = '';
  try {
    const options: any[] = [];
    if (customOption1.value.trim()) {
      options.push({ option: customOption1.value.trim(), result: customResult1.value.trim() || '(自定义)' });
    }
    if (customOption2.value.trim()) {
      options.push({ option: customOption2.value.trim(), result: customResult2.value.trim() || '(自定义)' });
    }
    const res = await submitCustomEvent({
      characterId,
      event_text: customEventText.value.trim(),
      options: options.length > 0 ? options : undefined,
      auto_resolve: options.length === 0,
    });
    if (res?.data?.applied) {
      customResult.value = '事件已生效！推进下一季度查看效果。';
    } else if (res?.data?.options) {
      // Add as pending event
      currentEvents.value.push({
        event_code: res.data.event_code,
        category: res.data.category || 'fate',
        event_text: res.data.event_text,
        options: res.data.options,
        isMilestone: false,
      });
      customResult.value = '事件已添加，请在上方选择回应。';
    }
    // Clear form
    customEventText.value = '';
    customOption1.value = '';
    customOption2.value = '';
    customResult1.value = '';
    customResult2.value = '';
    await refresh();
  } catch (e) {
    customResult.value = '提交失败，请重试。';
  } finally {
    loadingCustom.value = false;
  }
}

const statKeys = ['mood', 'health', 'stress', 'money', 'charm', 'intelligence'] as const;
const statLabels: Record<string, string> = {
  mood: '心情', health: '健康', stress: '压力', money: '财富', charm: '魅力', intelligence: '智力',
};

onMounted(async () => {
  try {
    await refresh();
    await loadTimeline();
  } catch (e) {
    error.value = '状态加载失败';
  }
});
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">时光推进</h2>
        <p class="page-hint">每个季度推进一段人生，做出你的选择，书写独一无二的人生故事。</p>
      </div>
      <span v-if="status?.character?.life_stage" class="stage-badge" :class="stageClass(status.character.life_stage)">
        {{ status.character.life_stage }}
      </span>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <!-- 状态面板 -->
    <div v-if="status?.character && !deathInfo" class="grid grid-3">
      <article class="card">
        <div class="kpi-value">{{ status.character.name || '新角色' }}</div>
        <div class="kpi-label">
          {{ ageDisplay(status.character.quarters_lived || 0) }}
          <span style="margin-left:4px">{{ seasonEmoji(status.character.quarters_lived || 0) }}</span>
        </div>
        <p class="page-hint stack-sm">
          第{{ (status.character.quarters_lived || 0) + 1 }}季度 · {{ status.character.generation || 1 }}世
        </p>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.money ?? 0 }}</div>
        <div class="kpi-label">财富金币</div>
        <p class="page-hint stack-sm">职业：{{ status.character.job || '无' }}</p>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.job_level === 'expert' ? '专家' : status.character.job_level === 'senior' ? '高级' : status.character.job_level === 'mid' ? '中级' : status.character.job_level === 'junior' ? '初级' : '入门' }}</div>
        <div class="kpi-label">职业等级</div>
      </article>
    </div>

    <!-- 属性条 -->
    <div v-if="status?.character && !deathInfo" class="card section">
      <div class="grid grid-3">
        <div v-for="key in statKeys" :key="key">
          <div style="font-size:13px;margin-bottom:2px">{{ statLabels[key] }} {{ status.character[key] }}</div>
          <div class="bar">
            <span :class="key === 'stress' ? barColor(100 - status.character[key]) : barColor(status.character[key])"
              :style="{ width: clampBar(key === 'stress' ? status.character[key] : status.character[key]) + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- 被动属性变化 -->
    <div v-if="Object.keys(statChanges).length && !deathInfo" class="feedback ok" style="margin-top:8px">
      季度自然变化：
      <template v-for="key in statKeys" :key="key">
        <span v-if="statChanges[key]" class="stat-delta" :class="statChanges[key] > 0 ? 'positive' : 'negative'">
          {{ statDeltaText(key) }}
        </span>
      </template>
    </div>

    <!-- 阶段跃迁通知 -->
    <div v-if="transitioning && newStage" class="feedback ok" style="font-size:15px;font-weight:650">
      🎉 恭喜！你进入了 <strong>{{ newStage }}</strong>！
    </div>

    <!-- 死亡警告 -->
    <div v-if="deathWarning" class="death-warning" :class="deathWarning.level">
      {{ deathWarning.text }}
    </div>

    <!-- 推进按钮（存活时） -->
    <div v-if="status?.character?.is_alive && !deathInfo" class="advance-btn-wrap">
      <button class="advance-btn" :disabled="loading" @click="advance">
        {{ loading ? '时光流逝中...' : `⏳ 进入下一季度 ${seasonEmoji((status.character.quarters_lived || 0) + 1)}` }}
      </button>
    </div>

    <!-- 当前事件 -->
    <div v-for="(evt, eidx) in currentEvents" :key="eidx" class="event-panel" :class="{ milestone: evt.isMilestone }">
      <p class="event-text">{{ evt.event_text }}</p>
      <div class="event-options">
        <button
          v-for="(op, oidx) in evt.options"
          :key="oidx"
          class="event-option-btn"
          :disabled="loading"
          @click="chooseEvent(evt.event_code, oidx)"
        >
          {{ op.option }}
        </button>
      </div>
    </div>

    <!-- 已解决事件结果 -->
    <div v-for="(res, ridx) in resolvedEvents" :key="'r' + ridx" class="event-result">
      <strong>{{ res.chosenOption?.option || '已选择' }}</strong>：{{ res.chosenOption?.result || '结果处理中' }}
    </div>

    <!-- 死亡遮罩 -->
    <div v-if="deathInfo" class="death-overlay">
      <div class="death-modal">
        <h2>生命终结</h2>
        <p class="death-cause">{{ deathInfo.cause?.label || '寿终正寝' }}</p>
        <p class="death-age">享年 {{ deathInfo.age }} 岁</p>
        <p style="margin:0 0 20px;color:#8a8070;font-size:14px">
          {{ deathInfo.cause?.description || '' }}
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn-primary" @click="viewLifeReview">查看生平回顾</button>
          <button class="btn-subtle" style="background:rgba(255,255,255,0.1);color:#e0d8c8;border:1px solid #4a3f2f" @click="goToReincarnate">转世重生</button>
        </div>
      </div>
    </div>

    <!-- 时间线切换 -->
    <div v-if="status?.character?.is_alive" style="margin-top:14px">
      <button class="btn-subtle" @click="showTimeline = !showTimeline; if (showTimeline) loadTimeline()">
        {{ showTimeline ? '收起时间线' : '📜 查看时间线' }}
      </button>
    </div>

    <!-- 时间线 -->
    <div v-if="showTimeline && timeline.length" class="timeline-strip">
      <div v-for="entry in timeline" :key="entry.id" class="timeline-entry">
        <span class="timeline-dot" :class="{ milestone: entry.life_stage !== (timeline[0]?.life_stage) }" />
        <span class="timeline-q">{{ entry.age_years }}岁 Q{{ (entry.quarter_number % 4) + 1 }}</span>
        <span class="timeline-event">
          {{ entry.event_text || `${entry.life_stage} · 心情${entry.mood} 健康${entry.health} 财富${entry.money}` }}
        </span>
      </div>
    </div>

    <!-- 自定义事件面板 -->
    <div v-if="status?.character?.is_alive && !deathInfo" class="card section">
      <button class="btn-subtle" @click="showCustomEvent = !showCustomEvent">
        {{ showCustomEvent ? '收起' : '✏️ 自定义事件（玩家/大模型输入）' }}
      </button>
      <div v-if="showCustomEvent" class="custom-event-form">
        <textarea
          v-model="customEventText"
          placeholder="描述这个季度发生的事件…（可来自外部LLM或你的创意）"
          rows="3"
        />
        <div class="grid grid-2" style="margin-top:6px">
          <input v-model="customOption1" placeholder="选项1（可选）" />
          <input v-model="customOption2" placeholder="选项2（可选）" />
        </div>
        <div class="grid grid-2" style="margin-top:4px">
          <input v-model="customResult1" placeholder="选项1结果" />
          <input v-model="customResult2" placeholder="选项2结果" />
        </div>
        <p class="page-hint stack-sm">提示：留空选项则事件自动生效。外部大语言模型可通过 /api/life/llm-context 获取角色上下文来生成事件。</p>
        <button
          class="btn-primary"
          style="margin-top:6px"
          :disabled="loadingCustom || !customEventText.trim()"
          @click="submitCustom()"
        >
          {{ loadingCustom ? '提交中...' : '提交自定义事件' }}
        </button>
        <p v-if="customResult" class="feedback ok" style="margin-top:8px">{{ customResult }}</p>
      </div>
    </div>

    <!-- No character -->
    <div v-if="!status?.character && !error" class="card section" style="text-align:center">
      <p>还没有角色，去创建一个开始你的人生吧。</p>
      <router-link to="/create">
        <button class="btn-primary" style="margin-top:8px">创建角色</button>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.section {
  margin-top: 12px;
}
.custom-event-form {
  margin-top: 10px;
}
.custom-event-form textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  background: var(--surface-1);
  color: var(--text);
  resize: vertical;
  box-sizing: border-box;
}
</style>
