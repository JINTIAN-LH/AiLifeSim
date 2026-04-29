const { DEATH_CAUSES } = require('./deathService');

const TIERS = {
  legendary: { key: 'legendary', label: '传奇人生', emoji: '👑', color: '#ffd700', description: '你的一生波澜壮阔，堪称传奇。后人将传颂你的名字。' },
  excellent: { key: 'excellent', label: '精彩人生', emoji: '🌟', color: '#6fcad2', description: '你活得充实而精彩，留下了许多值得回味的瞬间。' },
  normal: { key: 'normal', label: '平凡人生', emoji: '🌿', color: '#7a9d6b', description: '你过了一个普通但不平庸的人生，平凡中有真情。' },
  tough: { key: 'tough', label: '坎坷人生', emoji: '🌧', color: '#e07c74', description: '你经历了许多波折和磨难，但每一道伤疤都是你活过的证明。' },
  tragic: { key: 'tragic', label: '悲惨人生', emoji: '💔', color: '#6b6b6b', description: '命运对你格外苛刻，你的一生充满了苦难与遗憾。' },
};

function calculateLifeScore(quarterLogs, character, achievements, relationships) {
  const deathAge = character.death_age || character.age || 0;
  const peakMood = character.peak_mood || character.mood || 0;
  const peakHealth = character.peak_health || character.health || 0;
  const peakMoney = character.peak_money || character.money || 0;
  const peakIntelligence = character.peak_intelligence || character.intelligence || 0;
  const peakCharm = character.peak_charm || character.charm || 0;
  const achievementCount = Array.isArray(achievements) ? achievements.length : 0;
  const totalQuarters = Array.isArray(quarterLogs) ? quarterLogs.length : 0;

  // 1. Stat Excellence (0-2000)
  const statAvg = (Math.min(100, peakMood) + Math.min(100, peakHealth) + Math.min(100, peakCharm) + Math.min(100, peakIntelligence)) / 4;
  const statsScore = Math.min(2000, Math.floor(statAvg * 20));

  // 2. Career Achievement (0-2000)
  const jobLevels = ['entry', 'junior', 'mid', 'senior', 'expert'];
  const maxLevelIdx = jobLevels.indexOf(character.job_level || 'entry');
  const careerScore = Math.min(2000, (maxLevelIdx + 1) * 400);

  // 3. Wealth (0-1500)
  const wealthScore = Math.min(1500, Math.floor(Math.sqrt(Math.max(0, peakMoney)) * 15));

  // 4. Relationships (0-1500)
  const relCount = Array.isArray(relationships) ? relationships.length : 0;
  const maxFav = relCount > 0 ? Math.max(...relationships.map(r => r.favorability || 0)) : 0;
  const closeCount = Array.isArray(relationships) ? relationships.filter(r => (r.favorability || 0) >= 50).length : 0;
  const relScore = Math.min(1500, Math.floor(maxFav * 8 + closeCount * 150));

  // 5. Life Experiences (0-1500)
  const eventsScore = Math.min(1500, Math.floor(Math.sqrt(totalQuarters) * 30 + Math.min(500, totalQuarters * 2)));

  // 6. Longevity (0-500)
  const longevityScore = Math.min(500, Math.floor(deathAge * 5));

  // 7. Achievement Bonus (0-1000)
  const achScore = Math.min(1000, achievementCount * 80);

  const total = statsScore + careerScore + wealthScore + relScore + eventsScore + longevityScore + achScore;

  return {
    total: Math.min(10000, total),
    dimensions: { statsScore, careerScore, wealthScore, relScore, eventsScore, longevityScore, achScore },
  };
}

function determineTier(totalScore) {
  if (totalScore >= 8000) return TIERS.legendary;
  if (totalScore >= 6000) return TIERS.excellent;
  if (totalScore >= 3500) return TIERS.normal;
  if (totalScore >= 1500) return TIERS.tough;
  return TIERS.tragic;
}

function generateTitle(scoreData, tier, character) {
  const dims = scoreData.dimensions;
  const maxDim = Object.entries(dims).reduce((a, b) => (a[1] > b[1] ? a : b));
  const dimLabels = {
    statsScore: '全才',
    careerScore: '职场精英',
    wealthScore: '财富达人',
    relScore: '社交之星',
    eventsScore: '经历丰富',
    longevityScore: '长寿',
    achScore: '成就猎人',
  };

  const tag = dimLabels[maxDim[0]] || '';
  const name = character.name || '无名者';

  if (tier.key === 'legendary') return `${tag}·${name}的传奇一生`;
  if (tier.key === 'excellent') return `${tag}·${name}的精彩人生`;
  if (tier.key === 'normal') return `${name}的平凡岁月`;
  if (tier.key === 'tough') return `${name}的坎坷旅途`;
  return `${name}的灰暗人生`;
}

function generateReviewNarrative(scoreData, tier, character, deathCause, quarterLogs) {
  const name = character.name || '你';
  const deathAge = character.death_age || character.age || 0;
  const causeLabel = deathCause ? deathCause.label : '寿终正寝';
  const totalQuarters = Array.isArray(quarterLogs) ? quarterLogs.length : 0;

  let narrative = '';

  // Opening
  narrative += `${name}，${deathAge}岁，因${causeLabel}离世。\n\n`;

  // Tier-specific narrative
  switch (tier.key) {
    case 'legendary':
      narrative += `你的一生如璀璨星河，在${totalQuarters}个季度中书写了不朽的篇章。`;
      if (scoreData.dimensions.careerScore >= 1500) narrative += '你在职场上叱咤风云，成就斐然。';
      if (scoreData.dimensions.relScore >= 1200) narrative += '你拥有深厚而真挚的情谊，是身边人的依靠。';
      if (scoreData.dimensions.wealthScore >= 1200) narrative += '你积累了可观的财富，也懂得如何运用它。';
      narrative += '你的人生将被铭记。';
      break;
    case 'excellent':
      narrative += `你度过了充实而有意义的${totalQuarters}个季度。`;
      if (scoreData.dimensions.statsScore >= 1500) narrative += '你全面发展，各方面都取得了不错的成就。';
      if (scoreData.dimensions.eventsScore >= 1000) narrative += '你的人生经历丰富多彩，阅尽世间风景。';
      narrative += '虽有遗憾，但更多的是满足与欣慰。';
      break;
    case 'normal':
      narrative += `你的人生平凡但不平庸。${totalQuarters}个季度的时光中，有欢笑也有泪水。`;
      narrative += '你和大多数人一样，在生活的洪流中努力前行。平凡之中，亦有闪光的时刻。';
      break;
    case 'tough':
      narrative += `命运对你并不仁慈。在${totalQuarters}个季度的旅程中，你经历了太多波折。`;
      if (scoreData.dimensions.wealthScore < 500) narrative += '经济上的困窘让你步履维艰。';
      if (scoreData.dimensions.statsScore < 800) narrative += '身心状态长期不佳，让你疲于应对。';
      narrative += '但无论如何，你坚持走到了最后。这份韧性值得尊敬。';
      break;
    case 'tragic':
      narrative += `你的一生充满了苦难。在仅有的${totalQuarters}个季度里，命运一次次将你击倒。`;
      narrative += '但愿来世，命运能对你温柔一些。';
      break;
  }

  // Closing reflection
  narrative += `\n\n人生不是用长度来衡量的，而是用深度和温度。`;
  narrative += `愿你安息。`;

  return narrative;
}

module.exports = {
  TIERS,
  calculateLifeScore,
  determineTier,
  generateTitle,
  generateReviewNarrative,
};
