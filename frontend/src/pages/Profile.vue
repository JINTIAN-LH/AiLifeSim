<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { generateEnding, listEndings, restartLife } from '../services/api';

const endings = ref<any[]>([]);
const msg = ref('');
const error = ref('');
const loading = ref(false);
const inheritKey = ref<'money' | 'intelligence' | 'charm' | 'mood' | 'health'>('intelligence');

async function load() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未检测到角色，请先创建角色。';
    return;
  }
  const res = await listEndings(characterId);
  endings.value = res?.data || [];
}

async function makeEnding() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;
  loading.value = true;
  msg.value = '';
  error.value = '';
  try {
    const res = await generateEnding({ characterId });
    msg.value = `${res?.data?.endingType || ''}：${res?.data?.endingText || ''}`;
    await load();
  } catch (e) {
    error.value = '结局生成失败';
  } finally {
    loading.value = false;
  }
}

async function restart() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;
  loading.value = true;
  msg.value = '';
  error.value = '';
  try {
    const res = await restartLife({ characterId, inheritKey: inheritKey.value });
    const newId = res?.data?.newCharacterId;
    if (newId) {
      localStorage.setItem('characterId', newId);
    }
    msg.value = `已重启人生，继承 ${inheritKey.value}，奖励 ${res?.data?.bonus ?? 0}`;
    await load();
  } catch (e) {
    error.value = '重开失败';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = '面板加载失败';
  }
});
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">个人面板</h2>
        <p class="page-hint">结算本轮人生，选择继承属性，开启下一次轮回。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>
    <p v-if="msg" class="feedback ok">{{ msg }}</p>

    <div class="grid grid-2">
      <article class="card">
        <h3 style="margin-top: 0;">人生结算</h3>
        <p class="page-hint">根据当前数据生成结局描述，沉淀你的故事轨迹。</p>
        <button class="btn-primary" :disabled="loading" @click="makeEnding">生成本轮结局</button>
      </article>

      <article class="card">
        <h3 style="margin-top: 0;">开启新人生</h3>
        <p class="page-hint">继承一项核心属性，获得开局优势。</p>
        <div class="actions">
          <select v-model="inheritKey">
            <option value="intelligence">继承智力</option>
            <option value="charm">继承魅力</option>
            <option value="money">继承财富</option>
            <option value="mood">继承心情</option>
            <option value="health">继承健康</option>
          </select>
          <button class="btn-subtle" :disabled="loading" @click="restart">开启新人生</button>
        </div>
      </article>
    </div>

    <article class="card" style="margin-top: 12px;">
      <h3 style="margin-top: 0;">结局记录</h3>
      <ul class="list-reset" style="display: grid; gap: 8px;">
        <li v-for="(row, idx) in endings" :key="idx" class="card" style="padding: 10px;">
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <strong>{{ row.ending_type }}</strong>
            <span class="page-hint">评分 {{ row.score }}</span>
          </div>
          <div class="page-hint" style="margin-top: 6px;">{{ row.created_at }}</div>
          <p style="margin: 8px 0 0;">{{ row.ending_text }}</p>
        </li>
      </ul>
    </article>
  </section>
</template>
