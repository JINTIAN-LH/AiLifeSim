<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCharacter } from '../services/api';

const name = ref('');
const gender = ref('female');
const avatar = ref('sunny');
const personality = ref('optimistic');
const familyBackground = ref('ordinary');
const router = useRouter();
const loading = ref(false);
const error = ref('');

const familyOptions = [
  { value: 'ordinary', label: '普通家庭', desc: '平平淡淡才是真，起步平稳' },
  { value: 'wealthy', label: '富裕家庭', desc: '初始财富 +500，魅力智力略高' },
  { value: 'poor', label: '贫困家庭', desc: '压力 +10，但磨练意志' },
  { value: 'artistic', label: '艺术世家', desc: '魅力 +10，智力 +5，财富 +100' },
  { value: 'scholarly', label: '书香门第', desc: '智力 +15，魅力 +3，财富 +200' },
];

const babyStats = ref({ mood: 60, health: 90, stress: 0, money: 0, charm: 30, intelligence: 5 });

function updatePreview() {
  const map: Record<string, any> = {
    ordinary: { mood: 60, health: 90, stress: 0, money: 0, charm: 30, intelligence: 5 },
    wealthy: { mood: 60, health: 90, stress: 0, money: 500, charm: 35, intelligence: 8 },
    poor: { mood: 55, health: 90, stress: 10, money: 0, charm: 30, intelligence: 5 },
    artistic: { mood: 60, health: 90, stress: 0, money: 100, charm: 40, intelligence: 10 },
    scholarly: { mood: 60, health: 90, stress: 0, money: 200, charm: 33, intelligence: 20 },
  };
  babyStats.value = map[familyBackground.value] || map.ordinary;
}

async function submit() {
  error.value = '';
  if (!name.value.trim()) {
    error.value = '请输入姓名';
    return;
  }
  loading.value = true;
  try {
    const data = await createCharacter({
      name: name.value.trim(),
      gender: gender.value,
      avatar: avatar.value,
      personality: personality.value,
      familyBackground: familyBackground.value as any,
    });
    const id = data?.data?.characterId;
    if (id) {
      localStorage.setItem('characterId', id);
      router.push('/timeline');
    } else {
      error.value = '创建失败';
    }
  } catch (e) {
    error.value = '请求失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">新生命诞生</h2>
        <p class="page-hint">你将从新生儿开始，经历完整的人生。每个季度推进，做出选择，书写独一无二的命运。</p>
      </div>
    </div>

    <div class="grid grid-2">
      <article class="card">
        <h3>基础资料</h3>
        <div class="grid">
          <input v-model="name" placeholder="输入角色姓名" />
          <select v-model="gender">
            <option value="female">女性</option>
            <option value="male">男性</option>
            <option value="other">其他</option>
          </select>
          <select v-model="avatar">
            <option value="sunny">暖阳风格</option>
            <option value="vintage">复古风格</option>
            <option value="city">都市风格</option>
            <option value="campus">校园风格</option>
            <option value="dream">梦幻风格</option>
            <option value="minimal">极简风格</option>
          </select>
          <select v-model="personality">
            <option value="optimistic">乐观</option>
            <option value="sensitive">敏感</option>
            <option value="social">社牛</option>
            <option value="diligent">勤奋</option>
            <option value="calm">冷静</option>
          </select>
        </div>

        <h3 style="margin-top:12px">家族背景</h3>
        <select v-model="familyBackground" @change="updatePreview">
          <option v-for="opt in familyOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }} — {{ opt.desc }}
          </option>
        </select>
      </article>

      <article class="card" style="background: linear-gradient(155deg, #fff, #fce4ec);">
        <h3>👶 新生儿预览</h3>
        <p style="margin: 0;">姓名：{{ name || '未命名' }}</p>
        <p class="page-hint">
          性别：{{ gender }} ｜ 形象：{{ avatar }} ｜ 性格：{{ personality }}
        </p>
        <p class="page-hint">
          家族：{{ familyOptions.find(o => o.value === familyBackground)?.label || '普通家庭' }}
        </p>
        <div class="grid grid-3" style="margin-top: 8px;">
          <div class="card" style="padding: 8px;text-align:center">
            <div style="font-size:18px;font-weight:700">{{ babyStats.mood }}</div>
            <div style="font-size:11px;color:var(--text-soft)">心情</div>
          </div>
          <div class="card" style="padding: 8px;text-align:center">
            <div style="font-size:18px;font-weight:700">{{ babyStats.health }}</div>
            <div style="font-size:11px;color:var(--text-soft)">健康</div>
          </div>
          <div class="card" style="padding: 8px;text-align:center">
            <div style="font-size:18px;font-weight:700">{{ babyStats.money }}</div>
            <div style="font-size:11px;color:var(--text-soft)">财富</div>
          </div>
          <div class="card" style="padding: 8px;text-align:center">
            <div style="font-size:18px;font-weight:700">{{ babyStats.charm }}</div>
            <div style="font-size:11px;color:var(--text-soft)">魅力</div>
          </div>
          <div class="card" style="padding: 8px;text-align:center">
            <div style="font-size:18px;font-weight:700">{{ babyStats.intelligence }}</div>
            <div style="font-size:11px;color:var(--text-soft)">智力</div>
          </div>
          <div class="card" style="padding: 8px;text-align:center">
            <div style="font-size:18px;font-weight:700">{{ babyStats.stress }}</div>
            <div style="font-size:11px;color:var(--text-soft)">压力</div>
          </div>
        </div>
        <p class="page-hint stack-sm" style="font-size:12px">初始年龄：0岁 · 婴幼儿期 · 第1世</p>
      </article>
    </div>

    <div class="actions" style="margin-top: 12px;">
      <button class="btn-primary" :disabled="loading" @click="submit">
        {{ loading ? '创建中...' : '👶 诞生！开启人生旅程' }}
      </button>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>
  </section>
</template>
