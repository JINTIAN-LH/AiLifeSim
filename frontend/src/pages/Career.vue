<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getCareerInfo, switchCareer, runCareerExam } from '../services/api';

const career = ref<any>(null);
const selectedJob = ref('office');
const msg = ref('');
const error = ref('');
const loading = ref(false);

const jobs = [
  { value: 'office', label: '上班族' },
  { value: 'creator', label: '创作者' },
  { value: 'shopkeeper', label: '小店主' },
  { value: 'freelancer', label: '自由职业者' },
  { value: 'developer', label: '开发者' },
];

async function load() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未检测到角色，请先创建角色。';
    return;
  }
  const res = await getCareerInfo(characterId);
  career.value = res?.data || null;
  if (career.value?.job) {
    selectedJob.value = career.value.job;
  }
}

async function doSwitch() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;
  loading.value = true;
  msg.value = '';
  error.value = '';
  try {
    const res = await switchCareer({ characterId, job: selectedJob.value });
    msg.value = `已切换职业为 ${res?.data?.job || selectedJob.value}`;
    await load();
  } catch (e) {
    error.value = '职业切换失败';
  } finally {
    loading.value = false;
  }
}

async function exam() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;
  loading.value = true;
  msg.value = '';
  error.value = '';
  try {
    const res = await runCareerExam({ characterId });
    if (res?.data?.passed) {
      msg.value = `考核通过，等级 ${res?.data?.previousLevel} -> ${res?.data?.currentLevel}`;
    } else {
      msg.value = `考核未通过，评分 ${res?.data?.score}`;
    }
    await load();
  } catch (e) {
    error.value = '考核失败';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = '职业信息加载失败';
  }
});
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">职业面板</h2>
        <p class="page-hint">切换赛道、参与考核，稳步推进职业成长。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div v-if="career" class="grid grid-3">
      <article class="card">
        <div class="kpi-value">{{ career.job || '-' }}</div>
        <div class="kpi-label">当前职业</div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ career.job_level || '-' }}</div>
        <div class="kpi-label">职业等级</div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ (career.intelligence || 0) + (career.charm || 0) + (career.mood || 0) - (career.stress || 0) }}</div>
        <div class="kpi-label">考核参考分</div>
      </article>

      <article class="card" style="grid-column: span 3;">
        <p style="margin: 0;">考核依据：智力 {{ career.intelligence }} + 魅力 {{ career.charm }} + 心情 {{ career.mood }} - 压力 {{ career.stress }}</p>
      </article>
    </div>

    <div class="card" style="margin-top: 12px;">
      <h3 style="margin-top: 0;">职业操作</h3>
      <div class="actions" style="align-items: center;">
      <select v-model="selectedJob">
        <option v-for="job in jobs" :key="job.value" :value="job.value">{{ job.label }}</option>
      </select>
      <button class="btn-subtle" :disabled="loading" @click="doSwitch">切换职业</button>
      <button class="btn-primary" :disabled="loading" @click="exam">参加升职考核</button>
      </div>

      <p v-if="msg" class="feedback ok">{{ msg }}</p>
    </div>
  </section>
</template>
