<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getStatus, useItem } from '../services/api';

const items = ref<any[]>([]);
const msg = ref('');
const error = ref('');
const loadingId = ref('');

const typeMap: Record<string, string> = {
  consumable: '消耗类',
  social: '社交类',
  skill: '技能类',
};

async function load() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未检测到角色，请先创建角色。';
    return;
  }
  const res = await getStatus(characterId);
  items.value = (res?.data?.inventory || []).filter((x: any) => Number(x.qty || 0) > 0);
}

async function use(itemId: string) {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) return;
  loadingId.value = itemId;
  msg.value = '';
  error.value = '';
  try {
    const res = await useItem({ characterId, itemId });
    msg.value = `已使用 ${res?.data?.itemName || '道具'}`;
    await load();
  } catch (e) {
    error.value = '使用失败';
  } finally {
    loadingId.value = '';
  }
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = '加载失败';
  }
});
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">背包</h2>
        <p class="page-hint">管理你的消耗品、礼物和技能道具。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>
    <p v-if="msg" class="feedback ok">{{ msg }}</p>

    <div class="grid grid-3">
      <article class="card" v-for="item in items" :key="item.id">
        <div style="display: flex; justify-content: space-between; gap: 8px;">
          <strong>{{ item.item_name }}</strong>
          <span class="page-hint">x{{ item.qty }}</span>
        </div>
        <p class="page-hint" style="margin-top: 8px;">{{ typeMap[item.item_type] || item.item_type }}</p>
        <button class="btn-subtle" style="margin-top: 8px;" :disabled="loadingId === item.id" @click="use(item.id)">
          {{ loadingId === item.id ? '使用中...' : '使用' }}
        </button>
      </article>
    </div>
  </section>
</template>
