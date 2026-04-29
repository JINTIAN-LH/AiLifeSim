<template>
  <div class="app-shell">
    <header class="app-header app-hero">
      <div class="hero-main">
        <div>
          <p class="hero-tag">第二人生</p>
          <h1 class="app-title">第二人生 · 城市演化局</h1>
          <p class="app-subtitle">从出生到谢幕，用季度推进的人生模拟，把选择、关系、职业与传承织成完整的一世。</p>
        </div>
        <div class="hero-overview" aria-label="游戏特性概览">
          <article class="overview-tile">
            <span class="overview-kicker">推进节奏</span>
            <strong>季度驱动</strong>
            <span>一次推进，带来事件、属性与关系变化。</span>
          </article>
          <article class="overview-tile">
            <span class="overview-kicker">核心目标</span>
            <strong>活出你的人生弧线</strong>
            <span>从开局背景到晚年回顾，形成独特世代记忆。</span>
          </article>
        </div>
      </div>
      <div class="hero-chip-wrap">
        <span class="hero-chip">季度推演</span>
        <span class="hero-chip">城市叙事</span>
        <span class="hero-chip">职业成长</span>
        <span class="hero-chip">社交关系</span>
        <span class="hero-chip">世代传承</span>
      </div>
      <nav class="app-nav" aria-label="主导航">
        <router-link class="nav-item" to="/">
          <span class="nav-item-title">主城</span>
          <span class="nav-item-meta">总览</span>
        </router-link>
        <router-link class="nav-item" to="/create">
          <span class="nav-item-title">创建</span>
          <span class="nav-item-meta">开局</span>
        </router-link>
        <router-link class="nav-item" to="/timeline">
          <span class="nav-item-title">推进</span>
          <span class="nav-item-meta">季度</span>
        </router-link>
        <router-link class="nav-item" to="/status">
          <span class="nav-item-title">状态</span>
          <span class="nav-item-meta">属性</span>
        </router-link>
        <router-link class="nav-item" to="/npc">
          <span class="nav-item-title">社交</span>
          <span class="nav-item-meta">关系</span>
        </router-link>
        <router-link class="nav-item" to="/bag">
          <span class="nav-item-title">背包</span>
          <span class="nav-item-meta">资源</span>
        </router-link>
        <router-link class="nav-item" to="/career">
          <span class="nav-item-title">职业</span>
          <span class="nav-item-meta">成长</span>
        </router-link>
        <router-link class="nav-item" to="/legacy">
          <span class="nav-item-title">往世</span>
          <span class="nav-item-meta">传承</span>
        </router-link>
        <router-link class="nav-item" to="/profile">
          <span class="nav-item-title">面板</span>
          <span class="nav-item-meta">总表</span>
        </router-link>
      </nav>
    </header>

    <section class="app-layout">
      <aside class="side-panel">
        <div class="side-section">
          <h3>本局节奏</h3>
          <ul>
            <li>出生后以季度推进，感受人生阶段跃迁</li>
            <li>事件会联动心情、健康、财富与社交关系</li>
            <li>代际回顾会保留你每一世的重要选择</li>
          </ul>
        </div>
        <div class="side-section">
          <h3>循环公式</h3>
          <p class="side-note">推进季度 → 触发事件 → 消耗或获取资源 → 重塑人生轨迹。</p>
        </div>
      </aside>

      <main class="page">
        <router-view />
      </main>
    </section>
  </div>

</template>
