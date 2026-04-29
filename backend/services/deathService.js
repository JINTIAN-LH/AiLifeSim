const DEATH_CAUSES = {
  natural_aging: { key: 'natural_aging', label: '寿终正寝', description: '在睡梦中安详离世，走完了圆满的一生。', icon: '🏡' },
  illness: { key: 'illness', label: '疾病缠身', description: '长期积劳成疾，最终不敌病魔。', icon: '🏥' },
  accident: { key: 'accident', label: '意外事故', description: '命运无常，一场意外让生命戛然而止。', icon: '⚡' },
  overwork: { key: 'overwork', label: '过劳而亡', description: '身心俱疲，过度劳累压垮了最后的防线。', icon: '💼' },
  depression: { key: 'depression', label: '抑郁而终', description: '长期心情低落，内心的黑暗吞噬了一切。', icon: '🌧' },
};

function baseDeathProbability(age, health, stress, mood) {
  // Age factor: negligible before 50, Gompertz-like after
  let ageFactor = 0;
  if (age >= 80) {
    ageFactor = Math.pow(1.12, age - 80) * 0.008;
  } else if (age >= 65) {
    ageFactor = Math.pow(1.08, age - 65) * 0.003;
  } else if (age >= 50) {
    ageFactor = (age - 50) * 0.0003;
  }

  // Health factor: significant when health is low
  const healthFactor = health < 30 ? (30 - health) * 0.0025 : 0;
  const criticalHealthFactor = health < 10 ? (10 - health) * 0.008 : 0;

  // Stress factor: chronic high stress
  const stressFactor = stress > 80 ? (stress - 80) * 0.0015 : 0;

  // Mood factor: severe depression risk
  const moodFactor = mood < 15 ? (15 - mood) * 0.003 : 0;

  return Math.min(0.95, ageFactor + healthFactor + criticalHealthFactor + stressFactor + moodFactor);
}

function determineDeathCause(age, health, stress, mood) {
  const rand = Math.random();

  // Very old age → natural causes dominant
  if (age >= 75 && rand < 0.6) return 'natural_aging';
  if (age >= 65 && rand < 0.4) return 'natural_aging';

  // Low health → illness
  if (health < 15 && rand < 0.7) return 'illness';
  if (health < 25 && rand < 0.4) return 'illness';

  // High stress → overwork
  if (stress > 90 && rand < 0.6) return 'overwork';
  if (stress > 80 && rand < 0.3) return 'overwork';

  // Low mood → depression
  if (mood < 10 && rand < 0.7) return 'depression';
  if (mood < 20 && rand < 0.35) return 'depression';

  // Small chance of accident at any age
  if (rand < 0.08) return 'accident';

  return 'natural_aging';
}

function getDeathWarning(age, health, stress, mood) {
  const prob = baseDeathProbability(age, health, stress, mood);
  if (prob > 0.3) return { level: 'critical', text: '你感到生命正在流逝，每一个选择都可能成为最后的抉择。', probability: prob };
  if (prob > 0.15) return { level: 'warning', text: '身体发出了强烈警告，必须尽快调整状态。', probability: prob };
  if (prob > 0.05) return { level: 'caution', text: '你隐约感到身体有些不对劲，也许该多注意健康了。', probability: prob };
  return null;
}

function rollForDeath(age, health, stress, mood) {
  const prob = baseDeathProbability(age, health, stress, mood);
  const roll = Math.random();
  const died = roll < prob;

  if (died) {
    const cause = determineDeathCause(age, health, stress, mood);
    return {
      died: true,
      cause: DEATH_CAUSES[cause] || DEATH_CAUSES.natural_aging,
      probability: prob,
      roll,
    };
  }

  return {
    died: false,
    cause: null,
    probability: prob,
    roll,
  };
}

module.exports = {
  DEATH_CAUSES,
  baseDeathProbability,
  determineDeathCause,
  getDeathWarning,
  rollForDeath,
};
