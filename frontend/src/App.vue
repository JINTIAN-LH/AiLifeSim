<template>
  <div class="app-shell">
    <header class="app-header app-hero">
      <div>
        <p class="hero-tag">Life Engine v2</p>
        <h1 class="app-title">第二人生 · 城市剧场</h1>
        <p class="app-subtitle">剧情、职业、关系共同演化。你每天 10 分钟的选择，会写成一整段人生。</p>
      </div>
      <div class="hero-chip-wrap">
        <span class="hero-chip">AI 事件驱动</span>
        <span class="hero-chip">NPC 记忆系统</span>
        <span class="hero-chip">职业成长路线</span>
      </div>
      <nav class="app-nav">
        <router-link class="nav-item" to="/">主城</router-link>
        <router-link class="nav-item" to="/create">创建角色</router-link>
        <router-link class="nav-item" to="/status">状态</router-link>
        <router-link class="nav-item" to="/npc">NPC 社交</router-link>
        <router-link class="nav-item" to="/bag">背包</router-link>
        <router-link class="nav-item" to="/career">职业</router-link>
        <router-link class="nav-item" to="/profile">个人面板</router-link>
      </nav>
    </header>

    <section class="app-layout">
      <aside class="side-panel">
        <h3>今日建议</h3>
        <ul>
          <li>先做一次工作，拿到基础资金</li>
          <li>随后社交，避免关系冷却</li>
          <li>睡前休闲，稳定心情和压力</li>
        </ul>
        <h3>循环节奏</h3>
        <p class="side-note">工作 -> 社交 -> 学习 -> 事件选择 -> 复盘。</p>
      </aside>

      <main class="page">
        <router-view />
      </main>
    </section>
  </div>

</template>

<style scoped>
.page {
  animation: fade-in 0.35s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
