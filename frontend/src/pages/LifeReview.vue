<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { generateLifeReview, reincarnate } from '../services/api';

const route = useRoute();
const router = useRouter();
const review = ref<any>(null);
const loading = ref(false);
const error = ref('');
const reincarnating = ref(false);

async function loadReview() {
  const characterId = route.query.characterId as string || localStorage.getItem('lastDeathCharacterId');
  if (!characterId) {
    error.value = '未找到角色信息';
    return;
  }
  loading.value = true;
  try {
    const res = await generateLifeReview({ characterId });
    review.value = res?.data || null;
  } catch (e) {
    error.value = '加载生平回顾失败';
  } finally {
    loading.value = false;
  }
}

async function doReincarnate(inheritKey?: string) {
  const characterId = route.query.characterId as string || localStorage.getItem('lastDeathCharacterId');
  if (!characterId) return;

  reincarnating.value = true;
  try {
    const res = await reincarnate({ characterId, inheritKey, familyBackground: 'ordinary' });
    const newId = res?.data?.newCharacterId;
    if (newId) {
      localStorage.setItem('characterId', newId);
      localStorage.removeItem('lastDeathCharacterId');
      localStorage.removeItem('lastReviewId');
      router.push('/timeline');
    }
  } catch (e) {
    error.value = '转世失败';
  } finally {
    reincarnating.value = false;
  }
}

function formatStatLabel(key: string) {
  const map: Record<string, string> = { mood: '心情', health: '健康', money: '财富', intelligence: '智力', charm: '魅力' };
  return map[key] || key;
}

const dimensionLabels: Record<string, string> = {
  statsScore: '属性卓越', careerScore: '职业成就', wealthScore: '财富积累',
  relScore: '关系质量', eventsScore: '人生经历', longevityScore: '长寿', achScore: '成就加成',
};

onMounted(loadReview);
</script>

<template>
  <section>
    <div v-if="loading" class="page" style="text-align:center;padding:40px">
      <p>正在生成生平回顾...</p>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div v-if="review" class="page">
      <!-- 主角 -->
      <div class="review-hero" :class="review.tier?.key || 'normal'">
        <h2 class="review-name">{{ review.characterName }}</h2>
        <p class="review-dates">{{ review.deathAge }}岁 · {{ review.totalQuarters }}个季度</p>
        <span class="tier-badge" :class="review.tier?.key || 'normal'">
          {{ review.tier?.emoji }} {{ review.tier?.label }}
        </span>
        <p style="margin-top:8px;font-size:15px;opacity:0.85">{{ review.tier?.description }}</p>
        <p style="font-size:13px;opacity:0.7">死因：{{ review.deathCause }} | 称号：{{ review.title }}</p>
      </div>

      <!-- 评分详情 -->
      <div class="card section">
        <h3>综合评分：{{ review.scoreData?.total || 0 }} / 10000</h3>
        <div class="bar" style="height:12px;margin:8px 0">
          <span class="meter-good" :style="{ width: Math.min(100, (review.scoreData?.total || 0) / 100) + '%' }" />
        </div>
        <div class="grid grid-3" style="margin-top:8px">
          <div v-for="(val, key) in review.scoreData?.dimensions || {}" :key="key" class="review-stat-card">
            <div class="review-stat-value">{{ val }}</div>
            <div class="review-stat-label">{{ dimensionLabels[key] || key }}</div>
          </div>
        </div>
      </div>

      <!-- 生平叙事 -->
      <div class="card section">
        <h3>生平叙事</h3>
        <p class="review-narrative">{{ review.narrative }}</p>
      </div>

      <!-- 巅峰属性 -->
      <div class="card section">
        <h3>巅峰属性</h3>
        <div class="review-stats-grid">
          <div v-for="(val, key) in review.peakStats || {}" :key="key" class="review-stat-card">
            <div class="review-stat-value">{{ val }}</div>
            <div class="review-stat-label">{{ formatStatLabel(key) }}</div>
          </div>
        </div>
      </div>

      <!-- 职业轨迹 -->
      <div class="card section">
        <h3>职业轨迹</h3>
        <p>最终职业：{{ review.careerSummary?.job || '无' }} · {{ review.careerSummary?.level || '入门' }}</p>
      </div>

      <!-- 属性总览 -->
      <div class="grid grid-3 section">
        <div class="review-stat-card card">
          <div class="review-stat-value">{{ review.achievementsUnlocked || 0 }}</div>
          <div class="review-stat-label">成就解锁</div>
        </div>
        <div class="review-stat-card card">
          <div class="review-stat-value">{{ review.eventsExperienced || 0 }}</div>
          <div class="review-stat-label">事件经历</div>
        </div>
        <div class="review-stat-card card">
          <div class="review-stat-value">{{ review.relationshipCount || 0 }}</div>
          <div class="review-stat-label">人际关系</div>
        </div>
      </div>

      <!-- Reincarnation -->
      <div class="card section">
        <h3>转世重生</h3>
        <p class="page-hint">选择一项属性继承到下一世，带着前世的馈赠重新开始。</p>
        <div class="actions" style="margin-top:8px">
          <button class="btn-subtle" :disabled="reincarnating" @click="doReincarnate('mood')">继承心情 +8</button>
          <button class="btn-subtle" :disabled="reincarnating" @click="doReincarnate('health')">继承健康 +8</button>
          <button class="btn-subtle" :disabled="reincarnating" @click="doReincarnate('money')">继承财富 +300</button>
          <button class="btn-subtle" :disabled="reincarnating" @click="doReincarnate('charm')">继承魅力 +5</button>
          <button class="btn-subtle" :disabled="reincarnating" @click="doReincarnate('intelligence')">继承智力 +5</button>
          <button class="btn-primary" :disabled="reincarnating" @click="doReincarnate()">随机转世</button>
        </div>
        <p v-if="reincarnating" style="margin-top:8px;color:var(--text-soft)">转世中...</p>
      </div>

      <!-- Quarter log timeline -->
      <div v-if="review.quarterLogs?.length" class="card section">
        <h3>生命时间线（最后50个季度）</h3>
        <div class="timeline-strip" style="max-height:400px">
          <div v-for="entry in review.quarterLogs" :key="entry.id" class="timeline-entry">
            <span class="timeline-dot" />
            <span class="timeline-q">{{ entry.age_years }}岁</span>
            <span class="timeline-event">
              {{ entry.event_text || `${entry.life_stage} · 心情${entry.mood} 健康${entry.health} 财富${entry.money}` }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  margin-top: 12px;
}
</style>
