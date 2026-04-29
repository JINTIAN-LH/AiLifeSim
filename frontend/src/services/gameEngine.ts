/**
 * 客户端游戏引擎 — 使用 localStorage 镜像后端逻辑。
 * 支持完全离线/静态托管部署，无需后端。
 */
// 使用浏览器原生 crypto 生成 ID（无需依赖）
function genId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ══════════════════════════════════════════
// 类型定义
// ══════════════════════════════════════════

export interface Character {
  id: string;
  name: string;
  gender: string;
  avatar: string;
  personality: string;
  familyBackground: string;
  mood: number;
  health: number;
  stress: number;
  money: number;
  charm: number;
  intelligence: number;
  job: string;
  job_level: string;
  age: number;
  quarters_lived: number;
  life_stage: string;
  is_alive: boolean;
  death_age: number | null;
  death_cause: string | null;
  peak_mood: number;
  peak_health: number;
  peak_money: number;
  peak_intelligence: number;
  peak_charm: number;
  birth_season: string;
  generation: number;
  created_at: string;
  updated_at: string;
}

export interface QuarterLog {
  id: string;
  character_id: string;
  quarter_number: number;
  age_years: number;
  life_stage: string;
  mood: number; health: number; stress: number;
  money: number; charm: number; intelligence: number;
  job: string; job_level: string;
  event_text: string | null;
  event_code: string | null;
  player_choice: string | null;
  result_text: string | null;
  created_at: string;
}

export interface LifeReview {
  id: string;
  character_id: string;
  character_name: string;
  total_quarters: number;
  death_age_years: number;
  death_cause: string;
  total_score: number;
  tier: string;
  title: string;
  generated_at: string;
}

// ══════════════════════════════════════════
// 人生阶段
// ══════════════════════════════════════════

const LIFE_STAGES = [
  { key: 'infant', name: '婴幼儿期', nameCN: '婴幼儿期', ageRange: [0, 3], quartersRange: [0, 15], description: '初来人世，蹒跚学步，咿呀学语。' },
  { key: 'child', name: '童年期', nameCN: '童年期', ageRange: [4, 12], quartersRange: [16, 51], description: '天真烂漫，探索世界，结交伙伴。' },
  { key: 'teen', name: '少年期', nameCN: '少年期', ageRange: [13, 17], quartersRange: [52, 71], description: '青春萌动，求知若渴，自我觉醒。' },
  { key: 'young_adult', name: '青年期', nameCN: '青年期', ageRange: [18, 30], quartersRange: [72, 123], description: '意气风发，追逐梦想，拥抱世界。' },
  { key: 'prime', name: '壮年期', nameCN: '壮年期', ageRange: [31, 45], quartersRange: [124, 183], description: '中流砥柱，事业家庭，责任担当。' },
  { key: 'middle', name: '中年期', nameCN: '中年期', ageRange: [46, 60], quartersRange: [184, 243], description: '知天命，守成业，智慧沉淀。' },
  { key: 'elder', name: '老年期', nameCN: '老年期', ageRange: [61, 120], quartersRange: [244, 480], description: '夕阳无限，回顾一生，安享晚年。' },
];

function getLifeStageByQuarters(quarters: number) {
  const q = Number(quarters);
  for (const stage of LIFE_STAGES) {
    if (q >= stage.quartersRange[0] && q <= stage.quartersRange[1]) return stage;
  }
  return LIFE_STAGES[LIFE_STAGES.length - 1];
}

function quartersToAge(q: number) { return parseFloat((q / 4).toFixed(1)); }

// ══════════════════════════════════════════
// 家庭出身
// ══════════════════════════════════════════

const BABY_STATS = { mood: 60, health: 90, stress: 0, money: 0, charm: 30, intelligence: 5 };

const FAMILY_BG: Record<string, { money: number; bonus: Record<string, number> }> = {
  ordinary: { money: 0, bonus: {} },
  wealthy: { money: 500, bonus: { charm: 5, intelligence: 3 } },
  poor: { money: 0, bonus: { stress: 10, mood: -5 } },
  artistic: { money: 100, bonus: { charm: 10, intelligence: 5 } },
  scholarly: { money: 200, bonus: { intelligence: 15, charm: 3 } },
};

function applyFamilyBackground(bgKey: string) {
  const bg = FAMILY_BG[bgKey] || FAMILY_BG.ordinary;
  const stats = { ...BABY_STATS, money: BABY_STATS.money + (bg.money || 0) };
  for (const [k, v] of Object.entries(bg.bonus)) {
    if (k in stats) (stats as any)[k] = Math.max(0, Math.min(100, (stats as any)[k] + v));
  }
  return stats;
}

// ══════════════════════════════════════════
// 死亡系统
// ══════════════════════════════════════════

const DEATH_CAUSES: Record<string, { key: string; label: string; description: string; icon: string }> = {
  natural_aging: { key: 'natural_aging', label: '寿终正寝', description: '在睡梦中安详离世。', icon: '🏡' },
  illness: { key: 'illness', label: '疾病缠身', description: '积劳成疾，不敌病魔。', icon: '🏥' },
  accident: { key: 'accident', label: '意外事故', description: '命运无常，生命戛然而止。', icon: '⚡' },
  overwork: { key: 'overwork', label: '过劳而亡', description: '身心俱疲，过度劳累。', icon: '💼' },
  depression: { key: 'depression', label: '抑郁而终', description: '长期心情低落。', icon: '🌧' },
};

function baseDeathProb(age: number, health: number, stress: number, mood: number) {
  let ageFactor = 0;
  if (age >= 80) ageFactor = Math.pow(1.12, age - 80) * 0.008;
  else if (age >= 65) ageFactor = Math.pow(1.08, age - 65) * 0.003;
  else if (age >= 50) ageFactor = (age - 50) * 0.0003;
  const hf = health < 30 ? (30 - health) * 0.0025 : 0;
  const chf = health < 10 ? (10 - health) * 0.008 : 0;
  const sf = stress > 80 ? (stress - 80) * 0.0015 : 0;
  const mf = mood < 15 ? (15 - mood) * 0.003 : 0;
  return Math.min(0.95, ageFactor + hf + chf + sf + mf);
}

function determineDeathCause(age: number, health: number, stress: number, mood: number) {
  const r = Math.random();
  if (age >= 75 && r < 0.6) return 'natural_aging';
  if (age >= 65 && r < 0.4) return 'natural_aging';
  if (health < 15 && r < 0.7) return 'illness';
  if (health < 25 && r < 0.4) return 'illness';
  if (stress > 90 && r < 0.6) return 'overwork';
  if (stress > 80 && r < 0.3) return 'overwork';
  if (mood < 10 && r < 0.7) return 'depression';
  if (mood < 20 && r < 0.35) return 'depression';
  if (r < 0.08) return 'accident';
  return 'natural_aging';
}

function rollDeath(age: number, health: number, stress: number, mood: number) {
  const prob = baseDeathProb(age, health, stress, mood);
  const roll = Math.random();
  if (roll < prob) {
    const cause = determineDeathCause(age, health, stress, mood);
    return { died: true, cause: DEATH_CAUSES[cause] || DEATH_CAUSES.natural_aging, probability: prob, roll };
  }
  return { died: false, cause: null, probability: prob, roll };
}

function getDeathWarning(age: number, health: number, stress: number, mood: number) {
  const prob = baseDeathProb(age, health, stress, mood);
  if (prob > 0.3) return { level: 'critical', text: '你感到生命正在流逝……', probability: prob };
  if (prob > 0.15) return { level: 'warning', text: '身体发出了强烈警告，必须尽快调整状态。', probability: prob };
  if (prob > 0.05) return { level: 'caution', text: '你隐约感到身体有些不对劲……', probability: prob };
  return null;
}

// ══════════════════════════════════════════
// 事件池（精简版用于离线模式）
// ══════════════════════════════════════════

const EVENT_POOL_CLIENT: Record<string, any[]> = {
  '婴幼儿期': [
    { event_code: 'infant_first_words', category: 'fate', event_text: '你咿咿呀呀地发出了人生第一个清晰的词语。', options: [{ option: '喊"妈妈"', result: '母亲热泪盈眶。', status_change: { charm: 3, mood: 5 } }, { option: '喊"爸爸"', result: '父亲激动得差点跳起来。', status_change: { charm: 2, mood: 4 } }], trigger_weight: 10, min_age_years: 0.5, max_age_years: 2 },
    { event_code: 'infant_first_steps', category: 'fate', event_text: '你扶着茶几，迈出了人生的第一步。', options: [{ option: '勇敢向前走', result: '跌跌撞撞走了三步，全家为你鼓掌。', status_change: { health: 2, mood: 4 } }, { option: '扶着墙走', result: '展现出超越年龄的稳重。', status_change: { intelligence: 2, health: 1 } }], trigger_weight: 10, min_age_years: 0.75, max_age_years: 2 },
    { event_code: 'infant_kindergarten', category: 'education', event_text: '你第一次被送去幼儿园，嚎啕大哭。', options: [{ option: '抱着妈妈不放手', result: '老师好不容易才哄好你。', status_change: { charm: 2, mood: -3 } }, { option: '被玩具吸引', result: '很快融入了集体。', status_change: { mood: 2, intelligence: 2 } }], trigger_weight: 10, min_age_years: 2, max_age_years: 4 },
    { event_code: 'infant_picky_eater', category: 'daily', event_text: '挑食期到了，青菜统统拒绝。', options: [{ option: '坚决不吃', result: '妈妈放弃了。你赢了。', status_change: { health: -2, mood: 3 } }, { option: '勉强吃了几口', result: '身体棒棒的。', status_change: { health: 3, mood: -1 } }], trigger_weight: 8, min_age_years: 1, max_age_years: 4 },
    { event_code: 'infant_toy_fight', category: 'relation', event_text: '邻居家小朋友看上了你的玩具。', options: [{ option: '死死抱住', result: '对方被你的气势镇住了。', status_change: { stress: 5, mood: 2 } }, { option: '大方分享', result: '一起玩得很开心。', status_change: { charm: 4, mood: 3 } }], trigger_weight: 8, min_age_years: 2, max_age_years: 4 },
    { event_code: 'infant_talent_show', category: 'emotional', event_text: '家庭聚会，大人们让你表演节目。', options: [{ option: '大方唱儿歌', result: '跑调跑到天边但赢得满堂彩。', status_change: { charm: 4, mood: 5 } }, { option: '害羞躲起来', result: '大人们哈哈大笑。', status_change: { stress: -3, mood: 1 } }], trigger_weight: 7, min_age_years: 2, max_age_years: 4 },
  ],
  '童年期': [
    { event_code: 'child_school_first_day', category: 'education', event_text: '你背着新书包踏进小学大门。', options: [{ option: '抢第一排座位', result: '成了班里活跃分子。', status_change: { intelligence: 3, charm: 2, mood: 3 } }, { option: '安静靠窗坐', result: '静静观察新环境。', status_change: { intelligence: 2, mood: 2, stress: -2 } }], trigger_weight: 10, min_age_years: 6, max_age_years: 8 },
    { event_code: 'child_bully', category: 'relation', event_text: '班里大个子抢走了你的文具盒。', options: [{ option: '告诉老师', result: '学会了用正确方式保护自己。', status_change: { mood: 3, stress: -5 } }, { option: '打了一架', result: '被叫了家长但从此没人敢惹你。', status_change: { health: -3, stress: 5, charm: -2 } }], trigger_weight: 8, min_age_years: 7, max_age_years: 12 },
    { event_code: 'child_exam_anxiety', category: 'education', event_text: '期末考临近，很多知识没掌握。', options: [{ option: '挑灯夜战', result: '累得够呛但发挥不错。', status_change: { intelligence: 4, stress: 8, health: -2 } }, { option: '保持平常心', result: '成绩中规中矩但心态好。', status_change: { intelligence: 2, mood: 3 } }], trigger_weight: 9, min_age_years: 8, max_age_years: 13 },
    { event_code: 'child_hobby_discovery', category: 'fate', event_text: '妈妈带你去兴趣班，你发现了自己的天赋。', options: [{ option: '爱上画画', result: '画被贴墙上展览。', status_change: { charm: 3, intelligence: 2, mood: 4 } }, { option: '迷上乐器', result: '音乐打开了新世界。', status_change: { intelligence: 3, mood: 3, stress: -3 } }], trigger_weight: 8, min_age_years: 6, max_age_years: 12 },
    { event_code: 'child_pet', category: 'emotional', event_text: '你捡到一只受伤的小猫。', options: [{ option: '带回家照顾', result: '小猫成了最忠实的伙伴。', status_change: { mood: 5, charm: 3 } }, { option: '送宠物医院', result: '正确的选择。', status_change: { intelligence: 2, mood: 1 } }], trigger_weight: 8, min_age_years: 8, max_age_years: 13 },
    { event_code: 'child_sports_day', category: 'health', event_text: '运动会，你报名接力赛跑。', options: [{ option: '全力冲刺', result: '第一个冲过终点！', status_change: { health: 3, mood: 6, charm: 2 } }, { option: '享受比赛', result: '跑得很开心。', status_change: { mood: 4, charm: 3 } }], trigger_weight: 8, min_age_years: 8, max_age_years: 13 },
  ],
  '少年期': [
    { event_code: 'teen_puberty', category: 'emotional', event_text: '你发现自己身体开始发育变化。', options: [{ option: '坦然接受', result: '自信面对每一天。', status_change: { mood: 3, charm: 3 } }, { option: '感到害羞', result: '成长的必经之路。', status_change: { stress: 3, mood: -2, charm: 1 } }], trigger_weight: 10, min_age_years: 12, max_age_years: 16 },
    { event_code: 'teen_first_love', category: 'emotional', event_text: '隔壁班有人总是偷偷看你。', options: [{ option: '写青涩情书', result: '体会到心动的滋味。', status_change: { mood: 5, charm: 2, stress: 3 } }, { option: '藏进日记', result: '化作学习动力。', status_change: { intelligence: 3, mood: 1 } }], trigger_weight: 9, min_age_years: 14, max_age_years: 18 },
    { event_code: 'teen_gaokao_pressure', category: 'education', event_text: '高考倒计时100天。', options: [{ option: '全力以赴', result: '考出理想成绩。', status_change: { intelligence: 8, stress: 10, health: -3, mood: -3 } }, { option: '劳逸结合', result: '成绩虽不顶尖但还不错。', status_change: { intelligence: 4, mood: 2, health: 1 } }, { option: '偷偷哭一场', result: '哭过后重新振作。', status_change: { mood: -3, stress: -5, charm: 1 } }], trigger_weight: 10, min_age_years: 16, max_age_years: 19 },
    { event_code: 'teen_rebellion', category: 'emotional', event_text: '觉得父母不理解你，大吵一架。', options: [{ option: '摔门而去', result: '父母在客厅等了一夜。', status_change: { stress: 5, mood: -3, charm: -2 } }, { option: '冷静沟通', result: '父母比你想的更理解你。', status_change: { mood: 3, intelligence: 2, stress: -5 } }], trigger_weight: 9, min_age_years: 13, max_age_years: 18 },
    { event_code: 'teen_competition_win', category: 'fate', event_text: '老师推荐你参加市级竞赛。', options: [{ option: '接受挑战', result: '获得名次！信心大增。', status_change: { intelligence: 5, charm: 3, mood: 5 } }, { option: '婉拒', result: '错过了机会。', status_change: { stress: -3, mood: -2, intelligence: 1 } }], trigger_weight: 8, min_age_years: 13, max_age_years: 18 },
    { event_code: 'teen_club_join', category: 'daily', event_text: '社团招新，琳琅满目。', options: [{ option: '辩论社', result: '逻辑和表达能力大增。', status_change: { intelligence: 3, charm: 2 } }, { option: '篮球社', result: '体能和团队协作提升。', status_change: { health: 4, charm: 2, mood: 3 } }, { option: '文学社', result: '在文字中找到归属。', status_change: { intelligence: 2, charm: 3, mood: 2 } }], trigger_weight: 8, min_age_years: 13, max_age_years: 18 },
  ],
  '青年期': [
    { event_code: 'young_career_start', category: 'career', event_text: '走出校园，面临职业选择。', options: [{ option: '稳定工作', result: '进入大公司前景稳定。', status_change: { money: 500, stress: -3, mood: 2 } }, { option: '创业公司', result: '激情满满值得一搏。', status_change: { money: 300, stress: 8, mood: 5, intelligence: 2 } }, { option: '继续深造', result: '积累更多资本。', status_change: { intelligence: 5, money: -200, stress: 5 } }], trigger_weight: 10, min_age_years: 21, max_age_years: 28 },
    { event_code: 'young_first_love_real', category: 'emotional', event_text: '朋友聚会遇到心动的人。', options: [{ option: '主动要联系方式', result: '一段美好恋情展开。', status_change: { mood: 8, charm: 3, money: -100 } }, { option: '含蓄等待', result: '缘分没有降临。', status_change: { mood: 1, intelligence: 1 } }], trigger_weight: 10, min_age_years: 20, max_age_years: 30 },
    { event_code: 'young_travel_adventure', category: 'fate', event_text: '攒了钱想独自背包旅行。', options: [{ option: '背上包出发', result: '走过许多地方，见识广阔。', status_change: { mood: 8, intelligence: 3, charm: 3, money: -300 } }, { option: '存起来以后再说', result: '失去了年轻时探索的机会。', status_change: { money: 500, mood: -2 } }], trigger_weight: 8, min_age_years: 22, max_age_years: 30 },
    { event_code: 'young_heartbreak', category: 'emotional', event_text: '恋人提出分手。世界塌了一半。', options: [{ option: '哭了三天', result: '时间会治愈一切。', status_change: { mood: -10, stress: 5, health: -2 } }, { option: '化悲痛为力量', result: '变得更优秀了。', status_change: { intelligence: 3, money: 300, mood: -3, stress: 3 } }], trigger_weight: 8, min_age_years: 20, max_age_years: 32 },
    { event_code: 'young_entrepreneur_opportunity', category: 'career', event_text: '朋友拉你一起创业。', options: [{ option: 'All in', result: '学到了比工资更宝贵的东西。', status_change: { money: -500, intelligence: 5, stress: 10, mood: 5 } }, { option: '谨慎拒绝', result: '保持了财务稳定。', status_change: { money: 200, stress: -3, mood: -1 } }], trigger_weight: 7, min_age_years: 24, max_age_years: 32, requires_min_money: 500 },
    { event_code: 'young_networking_key', category: 'career', event_text: '结识了一位业界前辈。', options: [{ option: '主动请教', result: '前辈成了导师。', status_change: { intelligence: 4, charm: 3, money: 200 } }, { option: '交换名片没跟进', result: '机会悄悄溜走。', status_change: { charm: 1 } }], trigger_weight: 8, min_age_years: 24, max_age_years: 35 },
  ],
  '壮年期': [
    { event_code: 'prime_marriage_decision', category: 'family', event_text: '伴侣提出结婚。你看着镜中的自己。', options: [{ option: '欣然同意', result: '举办温馨婚礼。', status_change: { mood: 8, money: -800, stress: 3, charm: 3 } }, { option: '想再等等', result: '伴侣有些失望但理解。', status_change: { mood: -2, stress: 5 } }], trigger_weight: 9, min_age_years: 28, max_age_years: 40 },
    { event_code: 'prime_midlife_reflection', category: 'emotional', event_text: '很久没做真正喜欢的事了。', options: [{ option: '重拾爱好', result: '生活变得更有色彩。', status_change: { mood: 6, stress: -5, health: 2 } }, { option: '继续埋头工作', result: '越来越像工作机器。', status_change: { money: 300, stress: 5, mood: -3 } }], trigger_weight: 8, min_age_years: 35, max_age_years: 46 },
    { event_code: 'prime_career_peak_choice', category: 'career', event_text: '升职机会但要调到外地。', options: [{ option: '接受升职', result: '事业更上一层楼。', status_change: { money: 600, intelligence: 3, stress: 8, mood: 2 } }, { option: '留在原地', result: '选了稳定和家庭。', status_change: { mood: 4, stress: -5, charm: 2 } }], trigger_weight: 9, min_age_years: 33, max_age_years: 46 },
    { event_code: 'prime_health_wakeup', category: 'health', event_text: '体检报告亮红灯。', options: [{ option: '开始健康生活', result: '身体指标明显改善。', status_change: { health: 8, stress: -6, mood: 3 } }, { option: '暂时顾不上', result: '把报告塞进抽屉。', status_change: { health: -5, stress: 3 } }], trigger_weight: 8, min_age_years: 38, max_age_years: 50 },
    { event_code: 'prime_parent_health', category: 'family', event_text: '父母身体出现状况。', options: [{ option: '多陪伴父母', result: '陪父母日子很珍贵。', status_change: { mood: 3, money: -200, stress: 3, charm: 3 } }, { option: '请护工照顾', result: '保障了但有些愧疚。', status_change: { money: 300, stress: 5, mood: -3 } }], trigger_weight: 8, min_age_years: 36, max_age_years: 50 },
    { event_code: 'prime_investment_opportunity', category: 'fate', event_text: '一辈子一次的投资机会。', options: [{ option: '谨慎投资部分', result: '获得不错回报。', status_change: { money: 500, intelligence: 2 } }, { option: '全投进去', result: '大半积蓄打水漂。', status_change: { money: -800, stress: 10, mood: -8 } }], trigger_weight: 7, min_age_years: 35, max_age_years: 50, requires_min_money: 1000 },
  ],
  '中年期': [
    { event_code: 'middle_empty_nest', category: 'family', event_text: '孩子考上远方大学，房间空了。', options: [{ option: '投入自己爱好', result: '生活翻开新页。', status_change: { mood: 4, stress: -5 } }, { option: '难以放手', result: '孩子有点烦过度关心。', status_change: { stress: 3, mood: -2 } }], trigger_weight: 9, min_age_years: 48, max_age_years: 62 },
    { event_code: 'middle_career_legacy', category: 'career', event_text: '老板让你带新人。', options: [{ option: '倾囊相授', result: '声望达到顶峰。', status_change: { charm: 5, mood: 5, intelligence: 2 } }, { option: '随便应付', result: '错过了传承机会。', status_change: { stress: -2, charm: -1 } }], trigger_weight: 8, min_age_years: 46, max_age_years: 60 },
    { event_code: 'middle_health_scare', category: 'health', event_text: '胸口发闷被紧急送医。', options: [{ option: '彻底改变生活方式', result: '重新审视了人生。', status_change: { health: 5, stress: -10, mood: 3, money: -200 } }, { option: '忽略警告', result: '身体发出一次警告。', status_change: { health: -3, stress: 5 } }], trigger_weight: 8, min_age_years: 50, max_age_years: 62 },
    { event_code: 'middle_retirement_planning', category: 'fate', event_text: '认真思考退休生活。', options: [{ option: '制定详细计划', result: '为晚年打下坚实基础。', status_change: { money: 400, intelligence: 2, stress: -3 } }, { option: '船到桥头自然直', result: '选择随遇而安。', status_change: { mood: 3, stress: -2 } }], trigger_weight: 7, min_age_years: 50, max_age_years: 62 },
    { event_code: 'middle_old_friend_reunion', category: 'relation', event_text: '老同学聚会，二十多年没见了。', options: [{ option: '积极参加', result: '仿佛回到青春时代。', status_change: { mood: 6, charm: 2 } }, { option: '婉拒', result: '一切照旧。', status_change: { mood: -1 } }], trigger_weight: 7, min_age_years: 48, max_age_years: 62 },
    { event_code: 'middle_wisdom_sharing', category: 'emotional', event_text: '社区邀请你分享人生经验。', options: [{ option: '真诚分享', result: '打动了很多年轻人。', status_change: { charm: 4, mood: 5, intelligence: 1 } }, { option: '简单客套', result: '平平淡淡结束。', status_change: { mood: 0 } }], trigger_weight: 7, min_age_years: 50, max_age_years: 65 },
  ],
  '老年期': [
    { event_code: 'elder_retirement_day', category: 'fate', event_text: '在职最后一天，同事为你举办欢送会。', options: [{ option: '分享职业回忆', result: '有笑有泪大家都舍不得你。', status_change: { mood: 6, charm: 3 } }, { option: '低调离开', result: '安静离开工作了几十年的地方。', status_change: { mood: 3, stress: -5 } }], trigger_weight: 10, min_age_years: 60, max_age_years: 70 },
    { event_code: 'elder_grandchildren', category: 'family', event_text: '第一次抱到孙子，小小生命安静睡着。', options: [{ option: '帮忙带孩子', result: '虽然累但觉得一切都值。', status_change: { mood: 8, health: -2, stress: 3 } }, { option: '偶尔看看', result: '保持轻松祖孙关系。', status_change: { mood: 5, stress: -2 } }], trigger_weight: 9, min_age_years: 62, max_age_years: 80 },
    { event_code: 'elder_health_decline', category: 'health', event_text: '身体大不如前，走几步就喘。', options: [{ option: '积极锻炼', result: '坚持让衰老慢了一些。', status_change: { health: 3, mood: 3, stress: -2 } }, { option: '接受现实', result: '心态平和。', status_change: { mood: 2, health: -3 } }], trigger_weight: 8, min_age_years: 65, max_age_years: 100 },
    { event_code: 'elder_bucket_list', category: 'emotional', event_text: '列了一份生前愿望清单。', options: [{ option: '一件件实现', result: '少了很多遗憾。', status_change: { mood: 8, money: -200, health: -2 } }, { option: '觉得太晚了', result: '清单蒙了灰。', status_change: { mood: -3 } }], trigger_weight: 8, min_age_years: 65, max_age_years: 90 },
    { event_code: 'elder_wisdom_letters', category: 'family', event_text: '决定给后辈每人写一封信。', options: [{ option: '认真写', result: '成了最珍贵的传家宝。', status_change: { charm: 4, mood: 6, intelligence: 1 } }, { option: '简单祝福', result: '心意到了。', status_change: { mood: 3 } }], trigger_weight: 7, min_age_years: 68, max_age_years: 95 },
    { event_code: 'elder_life_review_natural', category: 'emotional', event_text: '坐在摇椅上回顾一生。', options: [{ option: '感到满足', result: '内心平静充实。', status_change: { mood: 5, stress: -8 } }, { option: '有些遗憾', result: '学会了与自己和解。', status_change: { mood: 2, stress: -3 } }], trigger_weight: 8, min_age_years: 70, max_age_years: 110 },
  ],
};

function selectEvents(character: any, quarterNumber: number, recentEventCodes: string[] = []) {
  const age = parseFloat((quarterNumber / 4).toFixed(1));
  const stage = getLifeStageByQuarters(quarterNumber);
  const pool = EVENT_POOL_CLIENT[stage.nameCN] || [];
  if (pool.length === 0) return [];

  const eligible = pool.filter((e: any) => {
    if (age < (e.min_age_years || 0) || age > (e.max_age_years || 120)) return false;
    if (e.requires_min_money && (character.money || 0) < e.requires_min_money) return false;
    return true;
  });
  if (eligible.length === 0) return [];

  const recentSet = new Set(recentEventCodes.slice(-8));
  const weighted = eligible.map((e: any) => ({
    event: e,
    weight: recentSet.has(e.event_code) ? (e.trigger_weight || 10) * 0.2 : (e.trigger_weight || 10),
  }));

  const totalWeight = weighted.reduce((s: number, w: any) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  const selected = [];
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) { selected.push(w.event); break; }
  }

  if (selected.length === 1 && Math.random() < 0.1) {
    const remaining = weighted.filter((w: any) => w.event.event_code !== selected[0].event_code);
    if (remaining.length > 0) {
      const t2 = remaining.reduce((s: number, w: any) => s + w.weight, 0);
      let r2 = Math.random() * t2;
      for (const w of remaining) { r2 -= w.weight; if (r2 <= 0) { selected.push(w.event); break; } }
    }
  }
  return selected;
}

function getPassiveStats(age: number) {
  const effects: Record<string, number> = { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 };
  if (age < 18) { effects.health = 0.3; effects.intelligence = 0.5; }
  else if (age < 30) { effects.health = 0.1; }
  else if (age < 50) { effects.health = -0.1; effects.stress = 1; }
  else if (age < 65) { effects.health = -0.3; effects.mood = -0.2; }
  else { effects.health = -0.6; effects.mood = -0.3; effects.stress = 2; }
  return effects;
}

function clampStats(stats: Record<string, number>) {
  const r: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats)) {
    if (k === 'money') r[k] = Math.max(0, Math.round(v));
    else r[k] = Math.max(0, Math.min(100, Math.round(v)));
  }
  return r;
}

// ══════════════════════════════════════════
// 回顾评分
// ══════════════════════════════════════════

const TIERS = {
  legendary: { key: 'legendary', label: '传奇人生', emoji: '👑', description: '你的一生波澜壮阔，堪称传奇。' },
  excellent: { key: 'excellent', label: '精彩人生', emoji: '🌟', description: '你活得充实而精彩。' },
  normal: { key: 'normal', label: '平凡人生', emoji: '🌿', description: '平凡但不平庸。' },
  tough: { key: 'tough', label: '坎坷人生', emoji: '🌧', description: '经历了许多波折。' },
  tragic: { key: 'tragic', label: '悲惨人生', emoji: '💔', description: '命运格外苛刻。' },
};

function calculateLifeScore(quarterLogs: QuarterLog[], character: Character) {
  const peakMood = character.peak_mood || 0;
  const peakHealth = character.peak_health || 0;
  const peakMoney = character.peak_money || 0;
  const peakIntelligence = character.peak_intelligence || 0;
  const peakCharm = character.peak_charm || 0;
  const statAvg = (Math.min(100, peakMood) + Math.min(100, peakHealth) + Math.min(100, peakCharm) + Math.min(100, peakIntelligence)) / 4;
  const statsScore = Math.min(2000, Math.floor(statAvg * 20));
  const jobLevels = ['entry', 'junior', 'mid', 'senior', 'expert'];
  const maxLevelIdx = jobLevels.indexOf(character.job_level || 'entry');
  const careerScore = Math.min(2000, (maxLevelIdx + 1) * 400);
  const wealthScore = Math.min(1500, Math.floor(Math.sqrt(Math.max(0, peakMoney)) * 15));
  const eventsScore = Math.min(1500, Math.floor(Math.sqrt(quarterLogs.length) * 30 + Math.min(500, quarterLogs.length * 2)));
  const longevityScore = Math.min(500, Math.floor((character.death_age || character.age || 0) * 5));
  const achScore = Math.min(1000, 0);
  const total = statsScore + careerScore + wealthScore + eventsScore + longevityScore + achScore;
  return { total: Math.min(10000, total), dimensions: { statsScore, careerScore, wealthScore, eventsScore, longevityScore, achScore, relScore: 0 } };
}

function determineTier(score: number) {
  if (score >= 8000) return TIERS.legendary;
  if (score >= 6000) return TIERS.excellent;
  if (score >= 3500) return TIERS.normal;
  if (score >= 1500) return TIERS.tough;
  return TIERS.tragic;
}

// ══════════════════════════════════════════
// LocalStorage 辅助函数
// ══════════════════════════════════════════

function loadCharacters(): Record<string, Character> {
  try { return JSON.parse(localStorage.getItem('game_characters') || '{}'); } catch { return {}; }
}
function saveCharacters(chars: Record<string, Character>) {
  localStorage.setItem('game_characters', JSON.stringify(chars));
}
function loadQuarterLogs(charId: string): QuarterLog[] {
  try { return JSON.parse(localStorage.getItem(`game_qlogs_${charId}`) || '[]'); } catch { return []; }
}
function saveQuarterLogs(charId: string, logs: QuarterLog[]) {
  localStorage.setItem(`game_qlogs_${charId}`, JSON.stringify(logs));
}
function loadReviews(charId: string): LifeReview[] {
  try { return JSON.parse(localStorage.getItem(`game_reviews_${charId}`) || '[]'); } catch { return []; }
}
function saveReviews(charId: string, reviews: LifeReview[]) {
  localStorage.setItem(`game_reviews_${charId}`, JSON.stringify(reviews));
}

// ══════════════════════════════════════════
// 对外接口（镜像后端路由）
// ══════════════════════════════════════════

export const GameEngine = {
  /** Check if engine has local data */
  isAvailable(): boolean {
    try { return localStorage !== undefined; } catch { return false; }
  },

  /** Create a new character */
  createCharacter(payload: { name: string; gender?: string; avatar?: string; personality?: string; familyBackground?: string }) {
    const id = genId();
    const now = new Date().toISOString();
    const bg = payload.familyBackground || 'ordinary';
    const stats = applyFamilyBackground(bg);
    const season = ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)];

    const character: Character = {
      id, name: payload.name.trim(), gender: payload.gender || 'female',
      avatar: payload.avatar || 'sunny', personality: payload.personality || 'optimistic',
      familyBackground: bg,
      mood: stats.mood, health: stats.health, stress: stats.stress,
      money: stats.money, charm: stats.charm, intelligence: stats.intelligence,
      job: 'unemployed', job_level: 'entry', age: 0, quarters_lived: 0,
      life_stage: '婴幼儿期', is_alive: true, death_age: null, death_cause: null,
      peak_mood: stats.mood, peak_health: stats.health, peak_money: stats.money,
      peak_intelligence: stats.intelligence, peak_charm: stats.charm,
      birth_season: season, generation: 1,
      created_at: now, updated_at: now,
    };

    const chars = loadCharacters();
    chars[id] = character;
    saveCharacters(chars);

    // Initial quarter log
    const log: QuarterLog = {
      id: genId(), character_id: id, quarter_number: 0, age_years: 0,
      life_stage: '婴幼儿期', mood: stats.mood, health: stats.health, stress: stats.stress,
      money: stats.money, charm: stats.charm, intelligence: stats.intelligence,
      job: 'unemployed', job_level: 'entry',
      event_text: '一个新生命诞生了。', event_code: null, player_choice: null, result_text: null,
      created_at: now,
    };
    saveQuarterLogs(id, [log]);

    return { code: 200, data: { characterId: id, initialStatus: character, familyBackground: bg, birthSeason: season, age: 0 } };
  },

  /** Get character status */
  getStatus(characterId: string) {
    const chars = loadCharacters();
    const c = chars[characterId];
    if (!c) return { code: 400, data: null };
    return { code: 200, data: { character: c } };
  },

  /** Advance one quarter */
  advanceQuarter(characterId: string) {
    const chars = loadCharacters();
    const c = chars[characterId];
    if (!c) return { code: 400, data: null };
    if (!c.is_alive) return { code: 400, message: 'already deceased', data: null };

    const prevQ = c.quarters_lived || 0;
    const newQ = prevQ + 1;
    const age = quartersToAge(newQ);
    const stage = getLifeStageByQuarters(newQ);
    const prevStage = getLifeStageByQuarters(prevQ);
    const transitioning = prevStage.key !== stage.key;
    const now = new Date().toISOString();

    // Passive stats
    const passive = getPassiveStats(age);
    const currentStats: Record<string, number> = {
      mood: c.mood + (passive.mood || 0),
      health: c.health + (passive.health || 0),
      stress: c.stress + (passive.stress || 0),
      money: c.money + (passive.money || 0),
      charm: c.charm + (passive.charm || 0),
      intelligence: c.intelligence + (passive.intelligence || 0),
    };
    const clampedStats = clampStats(currentStats);

    // Update peaks
    c.peak_mood = Math.max(c.peak_mood || 0, clampedStats.mood);
    c.peak_health = Math.max(c.peak_health || 0, clampedStats.health);
    c.peak_money = Math.max(c.peak_money || 0, clampedStats.money);
    c.peak_intelligence = Math.max(c.peak_intelligence || 0, clampedStats.intelligence);
    c.peak_charm = Math.max(c.peak_charm || 0, clampedStats.charm);

    // Recent events for cooldown
    const logs = loadQuarterLogs(characterId);
    const recentCodes = logs.slice(-10).map((l: QuarterLog) => l.event_code).filter(Boolean);

    // Select events
    const events = selectEvents({ ...c, ...clampedStats }, newQ, recentCodes as string[]);
    const selectedEvents = events.slice(0, 2);

    if (transitioning) {
      selectedEvents.push({
        event_code: 'stage_transition',
        category: 'fate',
        event_text: `🎉 你进入了${stage.nameCN}！${stage.description}`,
        options: [{ option: '拥抱新阶段', result: `满怀期待迎接${stage.nameCN}的到来。`, status_change: { mood: 5 } }],
        isMilestone: true,
      });
    }

    // Death check
    const deathResult = rollDeath(age, clampedStats.health, clampedStats.stress, clampedStats.mood);
    const deathWarning = deathResult.died ? null : getDeathWarning(age, clampedStats.health, clampedStats.stress, clampedStats.mood);

    // Update character
    Object.assign(c, clampedStats);
    c.quarters_lived = newQ;
    c.age = age;
    c.life_stage = stage.nameCN;
    c.is_alive = !deathResult.died;
    c.updated_at = now;
    if (deathResult.died) {
      c.death_age = age;
      c.death_cause = deathResult.cause?.label || '寿终正寝';
    }
    saveCharacters(chars);

    // Save quarter log
    const eventCodes = selectedEvents.map((e: any) => e.event_code).filter(Boolean);
    const log: QuarterLog = {
      id: genId(), character_id: characterId, quarter_number: newQ, age_years: age,
      life_stage: stage.nameCN,
      mood: clampedStats.mood, health: clampedStats.health, stress: clampedStats.stress,
      money: clampedStats.money, charm: clampedStats.charm, intelligence: clampedStats.intelligence,
      job: c.job || 'unemployed', job_level: c.job_level || 'entry',
      event_text: null, event_code: eventCodes.join(',') || null,
      player_choice: null, result_text: null,
      created_at: now,
    };
    logs.push(log);
    saveQuarterLogs(characterId, logs);

    if (deathResult.died) {
      const scoreData = calculateLifeScore(logs, c);
      const tier = determineTier(scoreData.total);
      const title = `${tier.label} · ${c.name}`;
      const review: LifeReview = {
        id: genId(), character_id: characterId, character_name: c.name,
        total_quarters: logs.length, death_age_years: age,
        death_cause: deathResult.cause?.label || '寿终正寝',
        total_score: scoreData.total, tier: tier.label, title,
        generated_at: now,
      };
      const reviews = loadReviews(characterId);
      reviews.push(review);
      saveReviews(characterId, reviews);

      return { code: 200, data: {
        quarterNumber: newQ, ageYears: age, lifeStage: stage.nameCN,
        events: selectedEvents, passiveDelta: passive, statSnapshot: clampedStats,
        dead: true, deathInfo: { age, cause: deathResult.cause },
        reviewId: review.id,
      }};
    }

    return { code: 200, data: {
      quarterNumber: newQ, ageYears: age, lifeStage: stage.nameCN,
      transitioning, events: selectedEvents, passiveDelta: passive,
      statSnapshot: clampedStats, dead: false, deathWarning,
    }};
  },

  /** Resolve event choice */
  resolveEvent(characterId: string, quarterNumber: number, eventCode: string, optionIndex: number) {
    const chars = loadCharacters();
    const c = chars[characterId];
    if (!c) return { code: 400, data: null };

    let event: any = null;
    // Search all pools + check for custom events or milestones
    if (eventCode === 'stage_transition') {
      event = {
        event_code: 'stage_transition',
        event_text: `🎉 你进入了${c.life_stage}！`,
        options: [{ option: '拥抱新阶段', result: `满怀期待迎接${c.life_stage}的到来。`, status_change: { mood: 5 } }],
      };
    } else {
      for (const pool of Object.values(EVENT_POOL_CLIENT)) {
        const found = pool.find((e: any) => e.event_code === eventCode);
        if (found) { event = found; break; }
      }
    }
    if (!event) return { code: 400, message: 'event not found', data: null };
    const option = event.options[optionIndex];
    if (!option) return { code: 400, message: 'invalid optionIndex', data: null };

    const delta = option.status_change || {};
    const currentStats: Record<string, number> = {
      mood: c.mood + (delta.mood || 0), health: c.health + (delta.health || 0),
      stress: c.stress + (delta.stress || 0), money: c.money + (delta.money || 0),
      charm: c.charm + (delta.charm || 0), intelligence: c.intelligence + (delta.intelligence || 0),
    };
    const clamped = clampStats(currentStats);
    Object.assign(c, clamped);
    c.updated_at = new Date().toISOString();
    saveCharacters(chars);

    // Update quarter log
    const logs = loadQuarterLogs(characterId);
    const targetLog = logs.find((l: QuarterLog) => l.quarter_number === (quarterNumber || c.quarters_lived));
    if (targetLog) {
      targetLog.event_text = event.event_text;
      targetLog.player_choice = option.option;
      targetLog.result_text = option.result;
      targetLog.event_code = eventCode;
      saveQuarterLogs(characterId, logs);
    }

    return { code: 200, data: { event, option, statDelta: delta, statSnapshot: clamped } };
  },

  /** Get timeline */
  getTimeline(characterId: string, limit = 40, offset = 0) {
    const logs = loadQuarterLogs(characterId);
    const sorted = logs.sort((a: QuarterLog, b: QuarterLog) => b.quarter_number - a.quarter_number);
    const page = sorted.slice(offset, offset + limit);
    return { code: 200, data: { logs: page, total: logs.length } };
  },

  /** Generate life review */
  generateReview(characterId: string) {
    const chars = loadCharacters();
    const c = chars[characterId];
    if (!c) return { code: 400, data: null };
    const logs = loadQuarterLogs(characterId);
    const scoreData = calculateLifeScore(logs, c);
    const tier = determineTier(scoreData.total);
    const title = `${tier.label} · ${c.name}`;
    return { code: 200, data: {
      characterName: c.name, deathAge: c.death_age || c.age,
      deathCause: c.death_cause || '寿终正寝',
      totalQuarters: logs.length, scoreData, tier, title,
      peakStats: { mood: c.peak_mood, health: c.peak_health, money: c.peak_money, intelligence: c.peak_intelligence, charm: c.peak_charm },
      careerSummary: { job: c.job, level: c.job_level },
      eventsExperienced: logs.length,
      quarterLogs: logs.slice(-50),
    }};
  },

  /** Get life reviews */
  getReviews(characterId?: string) {
    if (characterId) {
      return { code: 200, data: loadReviews(characterId) };
    }
    const chars = loadCharacters();
    const all: LifeReview[] = [];
    for (const id of Object.keys(chars)) {
      all.push(...loadReviews(id));
    }
    return { code: 200, data: all.sort((a, b) => b.generated_at.localeCompare(a.generated_at)) };
  },

  /** Reincarnate */
  reincarnate(characterId: string, inheritKey?: string, familyBackground?: string) {
    const chars = loadCharacters();
    const old = chars[characterId];
    if (!old) return { code: 400, data: null };

    // Kill old character
    if (old.is_alive) {
      old.is_alive = false;
      old.death_age = old.age;
      old.death_cause = '转世重生';
      old.updated_at = new Date().toISOString();
    }

    const bgKey = familyBackground || 'ordinary';
    let stats = applyFamilyBackground(bgKey);

    if (inheritKey && ['mood', 'health', 'money', 'charm', 'intelligence'].includes(inheritKey)) {
      const bonusMap: Record<string, number> = { mood: 8, health: 8, money: 300, charm: 5, intelligence: 5 };
      (stats as any)[inheritKey] = Math.min(100, (stats as any)[inheritKey] + (bonusMap[inheritKey] || 0));
    }

    const newId = genId();
    const now = new Date().toISOString();
    const generation = (old.generation || 1) + 1;
    const season = ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)];

    const newChar: Character = {
      id: newId, name: `${old.name || '玩家'}·第${generation}世`,
      gender: old.gender, avatar: old.avatar, personality: old.personality,
      familyBackground: bgKey,
      mood: stats.mood, health: stats.health, stress: stats.stress,
      money: stats.money, charm: stats.charm, intelligence: stats.intelligence,
      job: 'unemployed', job_level: 'entry', age: 0, quarters_lived: 0,
      life_stage: '婴幼儿期', is_alive: true, death_age: null, death_cause: null,
      peak_mood: stats.mood, peak_health: stats.health, peak_money: stats.money,
      peak_intelligence: stats.intelligence, peak_charm: stats.charm,
      birth_season: season, generation,
      created_at: now, updated_at: now,
    };

    chars[newId] = newChar;
    saveCharacters(chars);

    const log: QuarterLog = {
      id: genId(), character_id: newId, quarter_number: 0, age_years: 0,
      life_stage: '婴幼儿期', mood: stats.mood, health: stats.health, stress: stats.stress,
      money: stats.money, charm: stats.charm, intelligence: stats.intelligence,
      job: 'unemployed', job_level: 'entry',
      event_text: '一个新生命诞生了，带着前世的记忆碎片来到这个世界。',
      event_code: null, player_choice: null, result_text: null,
      created_at: now,
    };
    saveQuarterLogs(newId, [log]);

    return { code: 200, data: {
      newCharacterId: newId, name: newChar.name, generation,
      inheritKey: inheritKey || null, familyBackground: bgKey, initialStats: stats,
    }};
  },
};
