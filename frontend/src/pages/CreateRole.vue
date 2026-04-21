<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCharacter } from '../services/api';

const name = ref('');
const gender = ref('female');
const avatar = ref('sunny');
const personality = ref('optimistic');
const router = useRouter();
const loading = ref(false);
const error = ref('');

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
    });
    const id = data?.data?.characterId;
    if (id) {
      localStorage.setItem('characterId', id);
      router.push('/status');
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
        <h2 class="page-title">创建角色</h2>
        <p class="page-hint">1 分钟完成设定，开启你的下一段人生。</p>
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
      </article>

      <article class="card" style="background: linear-gradient(155deg, #fff, #fff6ed);">
        <h3>角色预览</h3>
        <p style="margin: 0;">姓名：{{ name || '未命名' }}</p>
        <p class="page-hint">性别：{{ gender }} ｜ 形象：{{ avatar }} ｜ 性格：{{ personality }}</p>
        <div class="grid grid-3" style="margin-top: 8px;">
          <div class="card" style="padding: 10px;">心情 70</div>
          <div class="card" style="padding: 10px;">健康 80</div>
          <div class="card" style="padding: 10px;">财富 1000</div>
        </div>
      </article>
    </div>

    <div class="actions" style="margin-top: 12px;">
      <button class="btn-primary" :disabled="loading" @click="submit">{{ loading ? '创建中...' : '创建并进入世界' }}</button>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>
  </section>
</template>
