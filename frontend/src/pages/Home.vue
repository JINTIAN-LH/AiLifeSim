<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { doAction, getStatus, chooseEvent } from '../services/api';

type EventOption = {
  option: string;
  result: string;
  status_change?: Record<string, number>;
};

const status = ref<any>(null);
const error = ref('');
const loading = ref(false);
const actionMsg = ref('');
const currentEvent = ref<{ eventId: string; event: string; options: EventOption[] } | null>(null);

function clampBar(value: number | undefined) {
  const n = Number(value ?? 0);
  return Math.min(100, Math.max(0, n));
}

function moodColor(value: number | undefined) {
  const n = clampBar(value);
  if (n >= 70) return 'linear-gradient(90deg, #3fbf7f, #2f9e63)';
  if (n >= 40) return 'linear-gradient(90deg, #e7b34d, #d18a1f)';
  return 'linear-gradient(90deg, #e07b78, #cd4d45)';
}

async function refresh() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未检测到角色，请先去创建角色。';
    return;
  }
  const res = await getStatus(characterId);
  status.value = res?.data || null;
}

async function runAction(actionType: 'work' | 'social' | 'leisure' | 'study' | 'free') {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未检测到角色，请先去创建角色。';
    return;
  }
  loading.value = true;
  error.value = '';
  actionMsg.value = '';
  try {
    const res = await doAction({ characterId, actionType });
    actionMsg.value = res?.data?.actionResult || '动作完成';
    currentEvent.value = res?.data?.triggeredEvent || null;
    await refresh();
  } catch (e) {
    error.value = '动作执行失败';
  } finally {
    loading.value = false;
  }
}

async function choose(index: number) {
  const characterId = localStorage.getItem('characterId');
  if (!characterId || !currentEvent.value) return;
  loading.value = true;
  try {
    const res = await chooseEvent({ characterId, eventId: currentEvent.value.eventId, optionIndex: index });
    actionMsg.value = res?.data?.finalResult || '已选择事件';
    currentEvent.value = null;
    await refresh();
  } catch (e) {
    error.value = '事件选择失败';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await refresh();
  } catch (e) {
    error.value = '状态加载失败';
  }
});
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">主城中心</h2>
        <p class="page-hint">完成每日行动，推动职业、关系与事件持续演化。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div v-if="status?.character" class="grid grid-3">
      <article class="card">
        <div class="kpi-value">{{ status.character.name || '新角色' }}</div>
        <div class="kpi-label">当前角色</div>
        <p class="page-hint" style="margin-top: 8px">职业：{{ status.character.job || '未定' }} / 等级：{{ status.character.job_level || '入门' }}</p>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.money ?? 0 }}</div>
        <div class="kpi-label">财富金币</div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ (status.tasks || []).filter((t: any) => t.status === 'done').length }}/{{ (status.tasks || []).length }}</div>
        <div class="kpi-label">今日任务完成</div>
      </article>
    </div>

    <div v-if="status?.character" class="card" style="margin-top: 12px;">
      <div class="grid grid-3">
        <div>
          <div>心情 {{ status.character.mood }}</div>
          <div class="bar"><span :style="{ width: clampBar(status.character.mood) + '%', background: moodColor(status.character.mood) }" /></div>
        </div>
        <div>
          <div>健康 {{ status.character.health }}</div>
          <div class="bar"><span :style="{ width: clampBar(status.character.health) + '%', background: moodColor(status.character.health) }" /></div>
        </div>
        <div>
          <div>压力 {{ status.character.stress }}</div>
          <div class="bar"><span :style="{ width: clampBar(status.character.stress) + '%', background: moodColor(100 - status.character.stress) }" /></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 12px;">
      <h3 style="margin: 0 0 8px;">今日行动</h3>
      <div class="actions">
        <button class="btn-primary" :disabled="loading" @click="runAction('work')">工作</button>
        <button class="btn-subtle" :disabled="loading" @click="runAction('social')">社交</button>
        <button class="btn-subtle" :disabled="loading" @click="runAction('leisure')">休闲</button>
        <button class="btn-subtle" :disabled="loading" @click="runAction('study')">学习</button>
        <button class="btn-subtle" :disabled="loading" @click="runAction('free')">自由行动</button>
      </div>

      <p v-if="actionMsg" class="feedback ok">{{ actionMsg }}</p>
    </div>

    <div v-if="currentEvent" class="card" style="margin-top: 12px; border: 1px dashed #d6bea0;">
      <h3 style="margin-top: 0;">随机事件</h3>
      <p style="margin-top: 0;">{{ currentEvent.event }}</p>
      <div class="grid">
        <button class="btn-subtle" v-for="(op, idx) in currentEvent.options" :key="idx" :disabled="loading" @click="choose(idx)">
          {{ op.option }}
        </button>
      </div>
    </div>
  </section>
</template>
