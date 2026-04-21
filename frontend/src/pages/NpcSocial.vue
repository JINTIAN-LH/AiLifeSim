<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { chatNpc, listNpcs, giftNpc, getStatus, repairNpc } from '../services/api';

const npcs = ref<any[]>([]);
const selectedNpcId = ref('');
const input = ref('');
const chatResult = ref('');
const giftResult = ref('');
const repairResult = ref('');
const error = ref('');
const inventory = ref<any[]>([]);

async function load() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId) {
    error.value = '未检测到角色，请先创建角色。';
    return;
  }
  const [npcRes, statusRes] = await Promise.all([listNpcs(characterId), getStatus(characterId)]);
  npcs.value = npcRes?.data || [];
  inventory.value = statusRes?.data?.inventory || [];
  if (!selectedNpcId.value && npcs.value.length > 0) {
    selectedNpcId.value = npcs.value[0].id;
  }
}

async function sendChat() {
  const characterId = localStorage.getItem('characterId');
  if (!characterId || !selectedNpcId.value || !input.value.trim()) return;
  error.value = '';
  giftResult.value = '';
  try {
    const res = await chatNpc({ characterId, npcId: selectedNpcId.value, message: input.value.trim() });
    chatResult.value = `${res?.data?.npcResponse || ''}（好感变化 ${res?.data?.favorabilityChange ?? 0}）`;
    input.value = '';
    await load();
  } catch (e) {
    error.value = '聊天失败';
  }
}

async function sendGift(itemId: string) {
  const characterId = localStorage.getItem('characterId');
  if (!characterId || !selectedNpcId.value) return;
  error.value = '';
  chatResult.value = '';
  try {
    const res = await giftNpc({ characterId, npcId: selectedNpcId.value, itemId });
    giftResult.value = `${res?.data?.npcFeedback || ''}（好感变化 ${res?.data?.favorabilityChange ?? 0}）`;
    await load();
  } catch (e) {
    error.value = '送礼失败';
  }
}

async function repair(method: 'apology' | 'help' | 'talk') {
  const characterId = localStorage.getItem('characterId');
  if (!characterId || !selectedNpcId.value) return;
  error.value = '';
  chatResult.value = '';
  giftResult.value = '';
  try {
    const res = await repairNpc({ characterId, npcId: selectedNpcId.value, method });
    repairResult.value = `${res?.data?.feedback || ''}（好感变化 ${res?.data?.favorabilityChange ?? 0}）`;
    await load();
  } catch (e) {
    error.value = '修复关系失败';
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
        <h2 class="page-title">NPC 社交</h2>
        <p class="page-hint">聊天、送礼与修复关系会直接影响好感度与关系阶段。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div class="grid grid-2">
      <article class="card">
        <h3 style="margin-top: 0;">人物列表</h3>
        <select v-model="selectedNpcId" style="width: 100%; margin-bottom: 8px;">
          <option v-for="npc in npcs" :key="npc.id" :value="npc.id">
            {{ npc.name }}（{{ npc.role_type }} / 好感 {{ npc.favorability ?? 0 }}）
          </option>
        </select>

        <ul class="list-reset" style="display: grid; gap: 8px;">
          <li v-for="npc in npcs" :key="npc.id" class="card" style="padding: 10px;" :style="{ borderColor: selectedNpcId === npc.id ? '#d86f45' : '#dfd2bf' }">
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <strong>{{ npc.name }}</strong>
              <span class="page-hint">{{ npc.role_type }}</span>
            </div>
            <div class="page-hint" style="margin-top: 6px;">好感度 {{ npc.favorability ?? 0 }} / 阶段 {{ npc.relationship_stage || '陌生' }}</div>
          </li>
        </ul>
      </article>

      <article class="card">
        <h3 style="margin-top: 0;">互动面板</h3>

        <div class="actions" style="margin-bottom: 8px;">
          <input v-model="input" placeholder="输入聊天内容" style="flex: 1; min-width: 180px;" />
          <button class="btn-primary" @click="sendChat">发送</button>
        </div>

        <p v-if="chatResult" class="feedback ok">{{ chatResult }}</p>

        <h4 style="margin-bottom: 8px;">赠送礼物</h4>
        <div class="grid">
          <button
            class="btn-subtle"
            v-for="item in inventory.filter((x) => x.item_type === 'social' && x.qty > 0)"
            :key="item.id"
            @click="sendGift(item.id)"
          >
            赠送 {{ item.item_name }}（剩余 {{ item.qty }}）
          </button>
        </div>

        <p v-if="giftResult" class="feedback ok">{{ giftResult }}</p>

        <h4 style="margin-bottom: 8px;">关系修复</h4>
        <div class="actions">
          <button class="btn-subtle" @click="repair('apology')">道歉</button>
          <button class="btn-subtle" @click="repair('help')">帮忙</button>
          <button class="btn-subtle" @click="repair('talk')">深聊</button>
        </div>
        <p v-if="repairResult" class="feedback ok">{{ repairResult }}</p>
      </article>
    </div>
  </section>
</template>
