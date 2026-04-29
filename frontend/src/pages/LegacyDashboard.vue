<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getLifeReviews } from '../services/api';

const router = useRouter();
const reviews = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  try {
    const res = await getLifeReviews();
    reviews.value = res?.data || [];
  } catch (e) {
    error.value = '加载往世记录失败';
  } finally {
    loading.value = false;
  }
}

function viewReview(review: any) {
  router.push(`/review?characterId=${review.character_id}`);
}

function tierEmoji(tier: string) {
  const map: Record<string, string> = { '传奇人生': '👑', '精彩人生': '🌟', '平凡人生': '🌿', '坎坷人生': '🌧', '悲惨人生': '💔' };
  return map[tier] || '📜';
}

onMounted(load);
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h2 class="page-title">往世总览</h2>
        <p class="page-hint">浏览所有已经结束的人生，每一世都是独一无二的故事。</p>
      </div>
    </div>

    <p v-if="error" class="feedback err">{{ error }}</p>

    <div v-if="loading" style="text-align:center;padding:20px">加载中...</div>

    <div v-if="!loading && reviews.length === 0 && !error" class="card" style="text-align:center;padding:30px">
      <p>还没有任何往世记录。</p>
      <p class="page-hint">开始新的人生，创造属于你的传奇吧。</p>
    </div>

    <div class="legacy-grid">
      <article
        v-for="review in reviews"
        :key="review.id"
        class="legacy-card"
        @click="viewReview(review)"
      >
        <h3 class="legacy-card-name">
          {{ tierEmoji(review.tier) }} {{ review.character_name }}
        </h3>
        <p class="legacy-card-meta">
          {{ review.death_age_years }}岁 · {{ review.total_quarters }}个季度 · {{ review.death_cause }}
        </p>
        <p class="legacy-card-meta" style="margin-top:4px">
          {{ review.tier }} · 评分 {{ review.total_score }}
        </p>
        <p class="legacy-card-meta" style="margin-top:4px">
          {{ review.title }}
        </p>
        <p style="font-size:11px;color:var(--text-soft);margin:4px 0 0">
          {{ new Date(review.generated_at).toLocaleDateString('zh-CN') }}
        </p>
      </article>
    </div>
  </section>
</template>
