function npcFallback(stage = 'stranger') {
  const stageMap = {
    deep: '今天看到你我就很安心，我们一起把这一天过好。',
    close: '你来啦，我正想找你聊聊今天发生的事。',
    normal: '最近还好吗？要不要一起出去走走？',
    stranger: '你好呀，今天看起来精神不错。',
    hostile: '我现在不太想聊这个话题。',
  };
  return {
    npc_response: stageMap[stage] || stageMap.stranger,
    favorability_change: 0,
  };
}

function eventFallback(type = 'neutral') {
  const positive = {
    event: '你在路上捡到一张抽奖券，中奖了。',
    options: [
      {
        option: '把奖金存起来',
        result: '你变得更有安全感。',
        status_change: { money: 280, mood: 5 },
      },
      {
        option: '请朋友吃饭',
        result: '关系升温，心情很好。',
        status_change: { money: -120, mood: 12 },
      },
    ],
  };
  const negative = {
    event: '你最近压力过大，今天身体有点不舒服。',
    options: [
      {
        option: '请假休息',
        result: '身体恢复了一些，但收入下降。',
        status_change: { health: 10, money: -80, stress: -8 },
      },
      {
        option: '硬撑继续工作',
        result: '收入保住了，但状态更差。',
        status_change: { health: -8, stress: 10, money: 60 },
      },
    ],
  };
  const neutral = {
    event: '你收到一条周末聚会邀请。',
    options: [
      {
        option: '参加聚会',
        result: '你认识了新朋友。',
        status_change: { mood: 8, stress: -4 },
      },
      {
        option: '在家独处',
        result: '你获得了安静的恢复时间。',
        status_change: { health: 5, stress: -3 },
      },
    ],
  };

  if (type === 'positive') return positive;
  if (type === 'negative') return negative;
  return neutral;
}

function chooseEventTypeByStatus(status) {
  if (!status) return 'neutral';
  if (status.health <= 35 || status.stress >= 75) return 'negative';
  if (status.money >= 1600 || status.mood >= 75) return 'positive';
  return 'neutral';
}

function clampStatus(base, delta = {}) {
  const next = { ...base };
  const keys = ['mood', 'health', 'stress', 'money', 'charm', 'intelligence'];
  for (const key of keys) {
    if (delta[key] === undefined) continue;
    next[key] = Number(next[key] || 0) + Number(delta[key] || 0);
  }
  next.mood = Math.max(0, Math.min(100, Number(next.mood || 0)));
  next.health = Math.max(0, Math.min(100, Number(next.health || 0)));
  next.stress = Math.max(0, Math.min(100, Number(next.stress || 0)));
  return next;
}

function favorabilityDeltaByMessage(message = '') {
  const text = String(message).trim();
  if (!text) return 0;
  if (/谢谢|喜欢|帮助|一起|开心|抱抱/.test(text)) return 3;
  if (/讨厌|滚|烦|不想/.test(text)) return -3;
  return 1;
}

function stageFromFavorability(f) {
  if (f >= 80) return 'deep';
  if (f >= 50) return 'close';
  if (f >= 20) return 'normal';
  if (f >= 0) return 'stranger';
  return 'hostile';
}

module.exports = {
  npcFallback,
  eventFallback,
  chooseEventTypeByStatus,
  clampStatus,
  favorabilityDeltaByMessage,
  stageFromFavorability,
};
