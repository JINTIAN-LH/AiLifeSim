<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getStatus } from '../services/api';

const status = ref<any>(null);
const error = ref('');

function barWidth(value: number | undefined) {
  return `${Math.min(100, Math.max(0, Number(value ?? 0)))}%`;
}

onMounted(async () => {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未找到角色，请先创建';
    return;
  }
  try {
    const res = await getStatus(characterId);
    status.value = res?.data || null;
  } catch (e) {
    error.value = '获取状态失败';
  }
});
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">角色状态</h2>
        <p class="page-hint">实时查看属性变化、任务推进与连续登录奖励。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div v-else-if="status?.character" class="grid grid-3">
      <article class="card">
        <div class="kpi-value">{{ status.character.mood }}</div>
        <div class="kpi-label">心情</div>
        <div class="bar"><span style="background: linear-gradient(90deg, #58c38c, #2f9e63);" :style="{ width: barWidth(status.character.mood) }" /></div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.health }}</div>
        <div class="kpi-label">健康</div>
        <div class="bar"><span style="background: linear-gradient(90deg, #6fcad2, #2d8f8b);" :style="{ width: barWidth(status.character.health) }" /></div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.stress }}</div>
        <div class="kpi-label">压力</div>
        <div class="bar"><span style="background: linear-gradient(90deg, #ef9a95, #cd4d45);" :style="{ width: barWidth(status.character.stress) }" /></div>
      </article>

      <article class="card">
        <div class="kpi-value">{{ status.character.money }}</div>
        <div class="kpi-label">财富</div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.charm }}</div>
        <div class="kpi-label">魅力</div>
      </article>
      <article class="card">
        <div class="kpi-value">{{ status.character.intelligence }}</div>
        <div class="kpi-label">智力</div>
      </article>
    </div>

    <div v-if="status?.character" class="grid grid-2" style="margin-top: 12px;">
      <article class="card">
        <h3>身份信息</h3>
        <p style="margin: 8px 0 0;">姓名：{{ status.character.name }}</p>
        <p class="page-hint">职业：{{ status.character.job || '未定' }} / 等级：{{ status.character.job_level || '入门' }}</p>
        <p v-if="status.loginInfo" class="page-hint">
          连续登录：{{ status.loginInfo.streakCount }} 天 ｜ 今日奖励：{{ status.loginInfo.claimed ? status.loginInfo.rewardMoney : 0 }} 金币
        </p>
      </article>

      <article class="card">
        <h3>每日任务</h3>
        <ul class="list-reset" style="display: grid; gap: 8px;">
          <li v-for="task in status.tasks || []" :key="task.id" class="card" style="padding: 10px;">
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <strong>{{ task.task_code }}</strong>
              <span :style="{ color: task.status === 'done' ? '#2f9e63' : '#72675a' }">{{ task.status }}</span>
            </div>
            <div class="page-hint" style="margin-top: 6px;">进度 {{ task.progress }}/{{ task.target }}</div>
          </li>
        </ul>
      </article>
    </div>

    <pre v-else style="white-space: pre-wrap;">{{ status }}</pre>
  </section>
</template>
