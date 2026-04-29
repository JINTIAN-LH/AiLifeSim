const LIFE_STAGES = [
  { key: 'infant', name: '婴幼儿期', nameCN: '婴幼儿期', ageRange: [0, 3], quartersRange: [0, 15], description: '初来人世，蹒跚学步，咿呀学语。' },
  { key: 'child', name: '童年期', nameCN: '童年期', ageRange: [4, 12], quartersRange: [16, 51], description: '天真烂漫，探索世界，结交伙伴。' },
  { key: 'teen', name: '少年期', nameCN: '少年期', ageRange: [13, 17], quartersRange: [52, 71], description: '青春萌动，求知若渴，自我觉醒。' },
  { key: 'young_adult', name: '青年期', nameCN: '青年期', ageRange: [18, 30], quartersRange: [72, 123], description: '意气风发，追逐梦想，拥抱世界。' },
  { key: 'prime', name: '壮年期', nameCN: '壮年期', ageRange: [31, 45], quartersRange: [124, 183], description: '中流砥柱，事业家庭，责任担当。' },
  { key: 'middle', name: '中年期', nameCN: '中年期', ageRange: [46, 60], quartersRange: [184, 243], description: '知天命，守成业，智慧沉淀。' },
  { key: 'elder', name: '老年期', nameCN: '老年期', ageRange: [61, 120], quartersRange: [244, 480], description: '夕阳无限，回顾一生，安享晚年。' },
];

const STAGE_COLORS = {
  infant: '#fce4ec',
  child: '#fff3e0',
  teen: '#e8f5e9',
  young_adult: '#e3f2fd',
  prime: '#f3e5f5',
  middle: '#fff8e1',
  elder: '#efebe9',
};

function quartersToAge(quarters) {
  return parseFloat((quarters / 4).toFixed(1));
}

function ageToQuarters(ageYears) {
  return Math.floor(ageYears * 4);
}

function getLifeStage(ageYears) {
  // Floor to handle fractional ages that fall between integer ranges (e.g. 3.75 → infant age 3)
  const age = Math.floor(Number(ageYears));
  for (const stage of LIFE_STAGES) {
    if (age >= stage.ageRange[0] && age <= stage.ageRange[1]) {
      return stage;
    }
  }
  return LIFE_STAGES[LIFE_STAGES.length - 1];
}

function getLifeStageByQuarters(quarters) {
  // Use quartersRange directly to avoid float-age gap issues
  const q = Number(quarters);
  for (const stage of LIFE_STAGES) {
    if (q >= stage.quartersRange[0] && q <= stage.quartersRange[1]) {
      return stage;
    }
  }
  return LIFE_STAGES[LIFE_STAGES.length - 1];
}

function getNextStage(stageKey) {
  const idx = LIFE_STAGES.findIndex(s => s.key === stageKey);
  if (idx >= 0 && idx < LIFE_STAGES.length - 1) {
    return LIFE_STAGES[idx + 1];
  }
  return null;
}

function isStageTransition(prevQuarters, newQuarters) {
  const prevStage = getLifeStageByQuarters(prevQuarters);
  const newStage = getLifeStageByQuarters(newQuarters);
  return prevStage.key !== newStage.key;
}

function quarterToSeasonLabel(quarterNumber) {
  const seasons = ['春', '夏', '秋', '冬'];
  const year = Math.floor(quarterNumber / 4);
  const season = seasons[quarterNumber % 4];
  return `${year}岁·${season}`;
}

function getPassiveStatEffects(ageYears, currentStats) {
  const age = Number(ageYears);
  const effects = { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 };

  // Natural health changes with age
  if (age < 18) {
    effects.health = 0.3;
    effects.intelligence = 0.5;
  } else if (age < 30) {
    effects.health = 0.1;
  } else if (age < 50) {
    effects.health = -0.1;
    effects.stress = 1;
  } else if (age < 65) {
    effects.health = -0.3;
    effects.mood = -0.2;
  } else {
    effects.health = -0.6;
    effects.mood = -0.3;
    effects.stress = 2;
  }

  return effects;
}

const BABY_STATS = { mood: 60, health: 90, stress: 0, money: 0, charm: 30, intelligence: 5 };

const FAMILY_BACKGROUNDS = {
  ordinary: { name: '普通家庭', money: 0, bonus: {} },
  wealthy: { name: '富裕家庭', money: 500, bonus: { charm: 5, intelligence: 3 } },
  poor: { name: '贫困家庭', money: 0, bonus: { stress: 10, mood: -5 } },
  artistic: { name: '艺术世家', bonus: { charm: 10, intelligence: 5, money: 100 } },
  scholarly: { name: '书香门第', bonus: { intelligence: 15, charm: 3, money: 200 } },
};

function applyFamilyBackground(baseStats, bgKey) {
  const bg = FAMILY_BACKGROUNDS[bgKey] || FAMILY_BACKGROUNDS.ordinary;
  const stats = { ...baseStats, money: (baseStats.money || 0) + (bg.money || 0) };
  if (bg.bonus) {
    for (const [key, val] of Object.entries(bg.bonus)) {
      if (stats[key] !== undefined) {
        stats[key] = Math.max(0, Math.min(100, stats[key] + val));
      }
    }
  }
  return stats;
}

module.exports = {
  LIFE_STAGES,
  STAGE_COLORS,
  quartersToAge,
  ageToQuarters,
  getLifeStage,
  getLifeStageByQuarters,
  getNextStage,
  isStageTransition,
  quarterToSeasonLabel,
  getPassiveStatEffects,
  BABY_STATS,
  FAMILY_BACKGROUNDS,
  applyFamilyBackground,
};
