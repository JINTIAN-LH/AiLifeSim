const { getLifeStage } = require('./lifeStageService');

// ── Item definitions for event integration ──
const ITEM_EFFECTS = {
  med_001: { health: 12, stress: -6 },
  med_002: { health: 20, stress: -10 },
  med_003: { health: 8, mood: 5 },
  gift_001: { charm: 2, mood: 3 },
  gift_002: { charm: 4, mood: 5 },
  gift_003: { charm: 6, money: -100 },
  book_001: { intelligence: 3, stress: 2 },
  book_002: { intelligence: 6, stress: 4 },
  book_003: { intelligence: 10, mood: 3 },
  food_001: { mood: 8, health: 3 },
  food_002: { mood: 12, health: 5 },
  charm_item_001: { charm: 5, mood: 3 },
  charm_item_002: { charm: 8, mood: 5 },
  stress_relief_001: { stress: -15, mood: 5 },
  stress_relief_002: { stress: -25, mood: 8 },
};

const ITEM_TYPES = {
  consumable: ['med_001', 'med_002', 'med_003', 'food_001', 'food_002', 'stress_relief_001', 'stress_relief_002'],
  social: ['gift_001', 'gift_002', 'gift_003', 'charm_item_001', 'charm_item_002'],
  skill: ['book_001', 'book_002', 'book_003'],
};

// ── Event pool per life stage ──
// Each event: { event_code, life_stage, category, event_text, options, trigger_weight, min_age_years, max_age_years,
//   requires_job?, requires_job_level?, requires_min_money?, requires_npc_stage?, consumes_item?, npc_id?,
//   option_requires_item?, option_item_bonus? }
const EVENT_POOL = {
  '婴幼儿期': [
    {
      event_code: 'infant_first_words',
      life_stage: '婴幼儿期', category: 'fate',
      event_text: '你咿咿呀呀地发出了人生第一个清晰的词语，全家人都兴奋地围了过来。',
      options: [
        { option: '脆生生地喊出"妈妈"', result: '母亲热泪盈眶，把你抱在怀里亲了又亲。', status_change: { charm: 3, mood: 5 } },
        { option: '奶声奶气地喊出"爸爸"', result: '父亲激动得差点跳起来，逢人便讲。', status_change: { charm: 2, mood: 4 } },
      ],
      trigger_weight: 10, min_age_years: 0.5, max_age_years: 2,
    },
    {
      event_code: 'infant_first_steps',
      life_stage: '婴幼儿期', category: 'fate',
      event_text: '你扶着茶几摇摇晃晃地站了起来，迈出了人生的第一步。',
      options: [
        { option: '勇敢地向前走', result: '你跌跌撞撞走了三步，然后一屁股坐在了地上，但全家为你鼓掌。', status_change: { health: 2, mood: 4 } },
        { option: '小心翼翼地扶着墙走', result: '你谨慎地沿着墙边移动，展现出了超越年龄的稳重。', status_change: { intelligence: 2, health: 1 } },
      ],
      trigger_weight: 10, min_age_years: 0.75, max_age_years: 2,
    },
    {
      event_code: 'infant_kindergarten',
      life_stage: '婴幼儿期', category: 'education',
      event_text: '你第一次被送去幼儿园，面对陌生的环境，你嚎啕大哭。',
      options: [
        { option: '抱着妈妈的腿不放手', result: '老师好不容易才把你哄好，但你在幼儿园里交到了第一个朋友。', status_change: { charm: 2, mood: -3 } },
        { option: '哭着哭着就忘了为什么哭', result: '你被教室里的玩具吸引，很快融入了集体。', status_change: { mood: 2, intelligence: 2 } },
      ],
      trigger_weight: 10, min_age_years: 2, max_age_years: 4,
    },
    {
      event_code: 'infant_picky_eater',
      life_stage: '婴幼儿期', category: 'daily',
      event_text: '你进入了挑食期，青菜胡萝卜统统拒绝，只爱吃甜食。',
      options: [
        { option: '坚决不吃，嘴巴紧闭', result: '妈妈使出了浑身解数，最终还是放弃了。你赢了——但营养有点不均衡。', status_change: { health: -2, mood: 3 } },
        { option: '在妈妈的哄劝下勉强吃了几口', result: '虽然不情愿，但你还是吃了一些。身体棒棒的。', status_change: { health: 3, mood: -1 } },
      ],
      trigger_weight: 8, min_age_years: 1, max_age_years: 4,
    },
    {
      event_code: 'infant_toy_fight',
      life_stage: '婴幼儿期', category: 'relation',
      event_text: '邻居家的小朋友来串门，看上了你最喜欢的玩具，伸手就要抢。',
      options: [
        { option: '死死抱住玩具不松手', result: '你展现出了惊人的捍卫意识，对方被你的气势镇住了。', status_change: { stress: 5, mood: 2 } },
        { option: '大方地分享玩具', result: '虽然有点舍不得，但你们一起玩得很开心，成了好朋友。', status_change: { charm: 4, mood: 3 } },
      ],
      trigger_weight: 8, min_age_years: 2, max_age_years: 4,
    },
    {
      event_code: 'infant_talent_show',
      life_stage: '婴幼儿期', category: 'emotional',
      event_text: '家庭聚会上，大人们起哄让你表演节目。所有目光都聚焦在你身上。',
      options: [
        { option: '大方地唱了一首儿歌', result: '虽然跑调跑到天边，但赢得了满堂彩。', status_change: { charm: 4, mood: 5 } },
        { option: '害羞地躲到妈妈身后', result: '大人们哈哈大笑，但没有为难你。', status_change: { stress: -3, mood: 1 } },
      ],
      trigger_weight: 7, min_age_years: 2, max_age_years: 4,
    },
    {
      event_code: 'infant_night_terror',
      life_stage: '婴幼儿期', category: 'health',
      event_text: '半夜你突然惊醒大哭，把父母吓得从床上跳起来。',
      options: [
        { option: '被妈妈抱在怀里轻声哄着', result: '在温暖的怀抱中你慢慢安静下来，原来只是做了个噩梦。', status_change: { mood: -2, stress: -3 } },
        { option: '哭着哭着又睡着了', result: '小孩子就是这样，来得快去得也快。父母却睁眼到天亮。', status_change: { health: -1, stress: 2 } },
      ],
      trigger_weight: 7, min_age_years: 0.5, max_age_years: 3,
    },
    {
      event_code: 'infant_messy_eater',
      life_stage: '婴幼儿期', category: 'daily',
      event_text: '你学会了自己吃饭——但勺子里的食物似乎更喜欢往脸上跑。',
      options: [
        { option: '认真练习，虽然弄得到处都是', result: '妈妈笑着收拾残局，夸你进步很大。独立进食技能开始点亮。', status_change: { intelligence: 2, mood: 2 } },
        { option: '放弃了，张开嘴等喂', result: '你舒服地享受着"张嘴—吃饭"的VIP服务。', status_change: { mood: 3, charm: -1 } },
      ],
      trigger_weight: 8, min_age_years: 0.75, max_age_years: 3,
    },
    {
      event_code: 'infant_park_adventure',
      life_stage: '婴幼儿期', category: 'daily',
      event_text: '周末被带去公园，你对周围的一切都充满了好奇。沙坑、滑梯、秋千……',
      options: [
        { option: '冲向沙坑挖沙子', result: '你挖了一个大大的沙坑，衣服里全是沙子，但开心极了。', status_change: { mood: 5, health: 1 } },
        { option: '在草地上追蝴蝶', result: '虽然一只也没抓到，但奔跑的感觉真好。', status_change: { health: 2, mood: 3 } },
      ],
      trigger_weight: 8, min_age_years: 1, max_age_years: 4,
    },
    {
      event_code: 'infant_grandparent_visit',
      life_stage: '婴幼儿期', category: 'family',
      event_text: '爷爷奶奶来看你了，带来了好多好吃的和玩具。',
      options: [
        { option: '兴奋地扑过去抱大腿', result: '老人家笑得合不拢嘴，把攒了好久的好东西都给了你。', status_change: { charm: 3, mood: 4, money: 50 } },
        { option: '有点认生，躲在妈妈身后偷看', result: '长辈们虽然有点失落，但觉得你害羞的样子特别可爱。', status_change: { charm: 1, mood: 1 } },
      ],
      trigger_weight: 8, min_age_years: 1, max_age_years: 4,
    },
    {
      event_code: 'infant_bath_time',
      life_stage: '婴幼儿期', category: 'daily',
      event_text: '洗澡时间到了——你对水的态度忽冷忽热。',
      options: [
        { option: '在浴盆里疯狂拍水', result: '浴室变成了水帘洞，妈妈的衣服全湿了，但你洗得特别开心。', status_change: { mood: 4, health: 1 } },
        { option: '乖乖坐着让妈妈洗', result: '安安静静地洗完澡，得到了一个香吻作为奖励。', status_change: { charm: 2, mood: 2 } },
      ],
      trigger_weight: 7, min_age_years: 0.5, max_age_years: 3,
    },
    {
      event_code: 'infant_drawing_wall',
      life_stage: '婴幼儿期', category: 'education',
      event_text: '你发现了一个绝妙的画布——家里雪白的墙壁！你拿着蜡笔开始"创作"。',
      options: [
        { option: '画了一个大大的太阳和歪歪扭扭的房子', result: '虽然"作品"让父母哭笑不得，但他们决定把这块墙保留下来。', status_change: { charm: 3, intelligence: 2 } },
        { option: '画着画着就在墙上睡着了', result: '你的"大作"只完成了一半，但那种全神贯注的样子让父母看到了你的专注力。', status_change: { intelligence: 3 } },
      ],
      trigger_weight: 7, min_age_years: 2, max_age_years: 4,
    },
    {
      event_code: 'infant_zoo_first_time',
      life_stage: '婴幼儿期', category: 'education',
      event_text: '父母带你第一次去动物园。你睁大了眼睛看着那些只在图画书里见过的动物。',
      options: [
        { option: '兴奋地指着大象尖叫', result: '你的反应可爱极了，父母拍了好多照片。对大自然的兴趣开始萌芽。', status_change: { intelligence: 3, mood: 4 } },
        { option: '被大老虎的吼声吓哭了', result: '虽然有点害怕，但这也是认识世界的一部分。后来你想起这件事还会笑。', status_change: { stress: 3, mood: -1, intelligence: 2 } },
      ],
      trigger_weight: 8, min_age_years: 1.5, max_age_years: 4,
    },
  ],

  '童年期': [
    {
      event_code: 'child_school_first_day',
      life_stage: '童年期', category: 'education',
      event_text: '你背着新书包，踏进了小学的大门。校园里的一切都那么新奇。',
      options: [
        { option: '兴奋地跑进教室，抢了第一排的座位', result: '老师对你印象深刻，你很快成了班里的活跃分子。', status_change: { intelligence: 3, charm: 2, mood: 3 } },
        { option: '安静地找一个靠窗的位置坐下', result: '你静静地观察着新环境，同桌是个文静的小姑娘。', status_change: { intelligence: 2, mood: 2, stress: -2 } },
      ],
      trigger_weight: 10, min_age_years: 6, max_age_years: 8,
    },
    {
      event_code: 'child_bully',
      life_stage: '童年期', category: 'relation',
      event_text: '班里有个大个子总是欺负同学，今天他盯上了你，抢走了你的文具盒。',
      options: [
        { option: '大声告诉老师', result: '老师严肃处理了这件事，大个子向你道了歉。你学会了用正确的方式保护自己。', status_change: { mood: 3, stress: -5 } },
        { option: '鼓起勇气和他打了一架', result: '虽然你挨了几拳，但从此他再也不敢惹你了。不过你也被叫了家长。', status_change: { health: -3, stress: 5, charm: -2 } },
      ],
      trigger_weight: 8, min_age_years: 7, max_age_years: 12,
    },
    {
      event_code: 'child_exam_anxiety',
      life_stage: '童年期', category: 'education',
      event_text: '期末考试临近，你发现自己还有很多知识没掌握，心里发慌。',
      options: [
        { option: '挑灯夜战，疯狂复习', result: '虽然累得够呛，但考试发挥得不错。', status_change: { intelligence: 4, stress: 8, health: -2 } },
        { option: '保持平常心，按计划复习', result: '你没有给自己太大压力，成绩中规中矩但心态很好。', status_change: { intelligence: 2, mood: 3 } },
      ],
      trigger_weight: 9, min_age_years: 8, max_age_years: 13,
    },
    {
      event_code: 'child_hobby_discovery',
      life_stage: '童年期', category: 'fate',
      event_text: '妈妈带你去上了一个兴趣班，你意外地发现自己对某件事特别有天赋。',
      options: [
        { option: '爱上了画画', result: '你的画被老师贴在了教室墙上展览，你找到了表达自己的方式。', status_change: { charm: 3, intelligence: 2, mood: 4 } },
        { option: '迷上了乐器', result: '音乐为你打开了新世界的大门，你每天练琴都特别投入。', status_change: { intelligence: 3, mood: 3, stress: -3 } },
      ],
      trigger_weight: 8, min_age_years: 6, max_age_years: 12,
    },
    {
      event_code: 'child_family_move',
      life_stage: '童年期', category: 'family',
      event_text: '父母告诉你，因为工作原因，全家要搬到另一个城市。这意味着你要离开熟悉的一切。',
      options: [
        { option: '哭着说不想离开', result: '父母很心疼，但搬家还是发生了。不过在新的地方，你慢慢适应了新生活。', status_change: { mood: -5, stress: 5, charm: 2 } },
        { option: '好奇地问新家是什么样子', result: '你以开放的心态迎接变化，在新城市很快就交到了朋友。', status_change: { charm: 3, mood: 2 } },
      ],
      trigger_weight: 7, min_age_years: 6, max_age_years: 12,
    },
    {
      event_code: 'child_sports_day',
      life_stage: '童年期', category: 'health',
      event_text: '学校运动会到了，你报名参加了接力赛跑。比赛那天阳光明媚。',
      options: [
        { option: '拼尽全力冲刺', result: '你第一个冲过终点线，全班同学为你欢呼！', status_change: { health: 3, mood: 6, charm: 2 } },
        { option: '享受比赛的乐趣，不在乎名次', result: '虽然没拿到名次，但你跑得很开心，还交到了隔壁班的朋友。', status_change: { mood: 4, charm: 3 } },
      ],
      trigger_weight: 8, min_age_years: 8, max_age_years: 13,
    },
    {
      event_code: 'child_pet',
      life_stage: '童年期', category: 'emotional',
      event_text: '你在小区里捡到了一只受伤的小猫，它可怜巴巴地看着你。',
      options: [
        { option: '带回家好好照顾', result: '在你的精心照料下，小猫恢复了健康，成了你最忠实的伙伴。', status_change: { mood: 5, charm: 3 } },
        { option: '送到宠物医院求助', result: '虽然是正确的选择，但你心里一直惦记着那只小猫。', status_change: { intelligence: 2, mood: 1 } },
      ],
      trigger_weight: 8, min_age_years: 8, max_age_years: 13,
    },
    {
      event_code: 'child_best_friend',
      life_stage: '童年期', category: 'relation',
      event_text: '班里转来一个新同学，老师安排TA坐在你旁边。你注意到TA看起来很紧张。',
      options: [
        { option: '主动和TA打招呼，分享零食', result: '你们很快成了形影不离的好朋友，这份友谊持续了很多年。', status_change: { charm: 4, mood: 4 } },
        { option: '保持距离，先观察一段时间', result: '你们慢慢地熟悉起来，虽然不算最好的朋友，但关系不错。', status_change: { charm: 1, stress: -2 } },
      ],
      trigger_weight: 10, min_age_years: 7, max_age_years: 13,
    },
    {
      event_code: 'child_cheating_dilemma',
      life_stage: '童年期', category: 'education',
      event_text: '考试时同桌偷偷递过来一张纸条，上面写着"第三题答案是什么？"',
      options: [
        { option: '假装没看到，继续答题', result: '你坚持了诚实的原则，虽然同桌有点不高兴，但老师后来表扬了你的正直。', status_change: { intelligence: 1, mood: 1, stress: 2 } },
        { option: '悄悄把答案写在纸条上递回去', result: '你帮了同桌，但也感到了良心上的不安。', status_change: { charm: 2, stress: 3, mood: -1 } },
      ],
      trigger_weight: 7, min_age_years: 8, max_age_years: 13,
    },
    {
      event_code: 'child_summer_camp',
      life_stage: '童年期', category: 'fate',
      event_text: '暑假到了，父母给你报名了夏令营。你将第一次离开家独立生活一周。',
      options: [
        { option: '兴奋地打包行李，迫不及待', result: '在夏令营你学会了搭帐篷、生火，还交到了来自各地的朋友。', status_change: { health: 2, charm: 3, intelligence: 2, mood: 4 } },
        { option: '哭着说不想去，想在家打游戏', result: '父母无奈取消了报名。你在家打了一暑假游戏，开学后发现自己错过了很多。', status_change: { mood: 1, health: -1 } },
      ],
      trigger_weight: 8, min_age_years: 8, max_age_years: 12,
    },
    {
      event_code: 'child_teacher_praise',
      life_stage: '童年期', category: 'education',
      event_text: '你的作文被语文老师在班上朗读了。全班同学都在认真听你的文字。',
      options: [
        { option: '害羞但心里美滋滋的', result: '老师的认可给了你极大的信心，从此你爱上了写作。', status_change: { intelligence: 3, mood: 5, charm: 2 } },
        { option: '觉得被当众展示有点尴尬', result: '虽然嘴上说没什么，但你还是偷偷把作文本珍藏了起来。', status_change: { charm: 2, mood: 2 } },
      ],
      trigger_weight: 8, min_age_years: 8, max_age_years: 13,
    },
    {
      event_code: 'child_secret_base',
      life_stage: '童年期', category: 'daily',
      event_text: '和小伙伴们在小区的灌木丛后面发现了一个"秘密基地"——一个废弃的小木屋。',
      options: [
        { option: '带头提议把这里改造成俱乐部', result: '你们花了一个暑假装修"基地"，这成了整个童年最美好的记忆。', status_change: { charm: 4, mood: 5, stress: -3 } },
        { option: '把这个秘密保守好，只和最要好的朋友分享', result: '这个秘密让你们的友谊更加牢固，成了你们之间的专属纽带。', status_change: { charm: 2, mood: 3, intelligence: 1 } },
      ],
      trigger_weight: 7, min_age_years: 7, max_age_years: 12,
    },
    {
      event_code: 'child_first_allowance',
      life_stage: '童年期', category: 'daily',
      event_text: '父母开始给你零花钱了——每周5块钱。这是你人生中第一笔"可支配收入"。',
      options: [
        { option: '存起来，攒够了买心仪的玩具', result: '你学会了储蓄和延迟满足，两个月后你终于买到了心心念念的玩具。', status_change: { money: 30, intelligence: 2 } },
        { option: '拿到手就去小卖部买零食', result: '你享受了即时满足的快乐，但也很快就发现钱不够花了。', status_change: { money: 5, mood: 3 } },
      ],
      trigger_weight: 7, min_age_years: 8, max_age_years: 12,
    },
    {
      event_code: 'child_tree_climbing',
      life_stage: '童年期', category: 'health',
      event_text: '放学后几个小伙伴怂恿你一起爬树摘果子。那棵树看起来挺高的。',
      options: [
        { option: '二话不说挽起袖子就上', result: '你爬到了最高处，看到了不一样的风景。虽然膝盖擦破了皮，但你觉得值了。', status_change: { health: 2, mood: 4, stress: -3 } },
        { option: '在树下帮忙接果子', result: '你用衣服兜着小伙伴们扔下来的果子，分工合作也很开心。', status_change: { charm: 2, mood: 3 } },
      ],
      trigger_weight: 7, min_age_years: 7, max_age_years: 12,
    },
  ],

  '少年期': [
    {
      event_code: 'teen_puberty',
      life_stage: '少年期', category: 'emotional',
      event_text: '你发现自己变声了/身体开始发育，镜子里的自己变得有些陌生。',
      options: [
        { option: '坦然接受成长的变化', result: '你以积极的心态拥抱青春期的到来，自信地面对每一天。', status_change: { mood: 3, charm: 3 } },
        { option: '感到困惑和害羞', result: '你花了一些时间才适应这些变化，但这也是成长的必经之路。', status_change: { stress: 3, mood: -2, charm: 1 } },
      ],
      trigger_weight: 10, min_age_years: 12, max_age_years: 16,
    },
    {
      event_code: 'teen_first_love',
      life_stage: '少年期', category: 'emotional',
      event_text: '你注意到隔壁班有个人总是偷偷看你。你的心跳莫名加速。',
      options: [
        { option: '写了一封青涩的情书', result: '虽然结局并不完美，但你体会到了心动的滋味。', status_change: { mood: 5, charm: 2, stress: 3 } },
        { option: '把这份心情藏在日记本里', result: '你将青涩的情感化作了学习的动力，日记本里写满了秘密。', status_change: { intelligence: 3, mood: 1 } },
      ],
      trigger_weight: 9, min_age_years: 14, max_age_years: 18,
    },
    {
      event_code: 'teen_gaokao_pressure',
      life_stage: '少年期', category: 'education',
      event_text: '高考倒计时100天，教室里弥漫着紧张的气氛。你感到前所未有的压力。',
      options: [
        { option: '制定严格的复习计划，全力以赴', result: '你每天学习到深夜，最终考出了理想的成绩。', status_change: { intelligence: 8, stress: 10, health: -3, mood: -3 }, milestone_key: 'gaokao' },
        { option: '劳逸结合，保持心态平衡', result: '你没有给自己太大压力，成绩虽然不算顶尖但也还不错。', status_change: { intelligence: 4, mood: 2, health: 1 }, milestone_key: 'gaokao' },
        { option: '压力太大，偷偷哭了一场', result: '但哭过之后你重新振作，和父母好好谈了一次，他们很理解你。', status_change: { mood: -3, stress: -5, charm: 1 }, milestone_key: 'gaokao' },
      ],
      trigger_weight: 10, min_age_years: 16, max_age_years: 19,
      isMilestone: true,
    },
    {
      event_code: 'teen_rebellion',
      life_stage: '少年期', category: 'emotional',
      event_text: '你觉得父母根本不理解你，你们为了一件小事大吵了一架。',
      options: [
        { option: '摔门而去，跑去朋友家', result: '你在朋友家住了一晚，第二天还是回家了。父母在客厅等了你一夜。', status_change: { stress: 5, mood: -3, charm: -2 } },
        { option: '冷静下来后主动和父母沟通', result: '你们进行了一次深入的对话，你发现父母其实比你想的更理解你。', status_change: { mood: 3, intelligence: 2, stress: -5 } },
      ],
      trigger_weight: 9, min_age_years: 13, max_age_years: 18,
    },
    {
      event_code: 'teen_friend_betrayal',
      life_stage: '少年期', category: 'relation',
      event_text: '你发现最好的朋友在背后说了你的坏话。你的信任感瞬间崩塌。',
      options: [
        { option: '当面质问，要求解释', result: '对方支支吾吾地道了歉。虽然心里还有疙瘩，但你学会了直面冲突。', status_change: { mood: -2, stress: 5, charm: 2 } },
        { option: '默默疏远，不再联系', result: '你决定把精力放在学习和自己身上。失去一个朋友让你更珍惜真正的友谊。', status_change: { intelligence: 2, mood: -3, charm: 1 } },
      ],
      trigger_weight: 8, min_age_years: 13, max_age_years: 18,
    },
    {
      event_code: 'teen_competition_win',
      life_stage: '少年期', category: 'fate',
      event_text: '老师推荐你参加市级竞赛，你犹豫了——万一失败怎么办？',
      options: [
        { option: '接受挑战，认真备赛', result: '你投入了大量时间准备，最终在比赛中获得了名次！这给了你极大信心。', status_change: { intelligence: 5, charm: 3, mood: 5 } },
        { option: '婉拒了，觉得自己还不够好', result: '你错过了这次机会，但你也意识到躲避挑战只会让自己停滞不前。', status_change: { stress: -3, mood: -2, intelligence: 1 } },
      ],
      trigger_weight: 8, min_age_years: 13, max_age_years: 18,
    },
    {
      event_code: 'teen_club_join',
      life_stage: '少年期', category: 'daily',
      event_text: '学校社团招新，琳琅满目的社团让你眼花缭乱。',
      options: [
        { option: '加入辩论社', result: '你的逻辑思维和表达能力得到了极大锻炼。', status_change: { intelligence: 3, charm: 2 } },
        { option: '加入篮球社', result: '你在球场上挥洒汗水，体能和团队协作能力大幅提升。', status_change: { health: 4, charm: 2, mood: 3 } },
        { option: '加入文学社', result: '你在文字的世界里找到了归属，写作能力悄然成长。', status_change: { intelligence: 2, charm: 3, mood: 2 } },
      ],
      trigger_weight: 8, min_age_years: 13, max_age_years: 18,
    },
    {
      event_code: 'teen_social_media',
      life_stage: '少年期', category: 'daily',
      event_text: '你第一次注册了社交媒体账号，一个全新的世界向你打开了大门。',
      options: [
        { option: '适度使用，主要关注学习和兴趣相关内容', result: '社交媒体成了你获取信息和交流的有用工具。', status_change: { intelligence: 2, charm: 1 } },
        { option: '沉迷其中，每天刷到深夜', result: '你的学习成绩明显下滑，眼睛也近视了，但你在网上交到了不少朋友。', status_change: { health: -3, intelligence: -2, charm: 2, stress: 3 } },
      ],
      trigger_weight: 8, min_age_years: 13, max_age_years: 18,
    },
    {
      event_code: 'teen_part_time_job',
      life_stage: '少年期', category: 'fate',
      event_text: '暑假到了，你决定去打人生中第一份暑假工。奶茶店、书店还是家教？',
      options: [
        { option: '去奶茶店打工', result: '虽然站一天很累，但你赚到了第一笔钱，还学会了做各种饮品。', status_change: { money: 200, health: 2, stress: 5, mood: 3 } },
        { option: '去书店兼职', result: '在安静的书店里，你一边工作一边读了很多书，这份经历很充实。', status_change: { intelligence: 3, money: 150, mood: 3 } },
        { option: '做家教帮学弟学妹补习', result: '教别人的过程中你发现自己对知识的理解更深刻了。', status_change: { intelligence: 4, money: 250, charm: 2 } },
      ],
      trigger_weight: 8, min_age_years: 15, max_age_years: 18,
    },
    {
      event_code: 'teen_bad_habit',
      life_stage: '少年期', category: 'health',
      event_text: '你的朋友中有人开始尝试抽烟，他们怂恿你也来一根。',
      options: [
        { option: '坚决拒绝，说"我不需要这个"', result: '你的坚定让朋友们有些意外，但他们没再劝你。你守住了自己的底线。', status_change: { charm: 3, health: 2 } },
        { option: '出于好奇试了一口，呛得直咳嗽', result: '你觉得一点都不酷，以后再也没碰过。也算是交了"学费"。', status_change: { health: -1, intelligence: 1 } },
      ],
      trigger_weight: 7, min_age_years: 14, max_age_years: 18,
    },
    {
      event_code: 'teen_diary_secret',
      life_stage: '少年期', category: 'emotional',
      event_text: '你发现妈妈在偷看你的日记。你感到自己的隐私被严重侵犯。',
      options: [
        { option: '和妈妈大吵一架，要求她尊重你', result: '虽然闹得很不愉快，但妈妈意识到了你已经长大了，之后你们的边界感更清晰了。', status_change: { stress: 5, mood: -3, charm: 1 } },
        { option: '默默把日记藏到了更隐蔽的地方', result: '你学会了保护自己的隐私，但也和妈妈之间有了一道隐形的墙。', status_change: { stress: 2 } },
      ],
      trigger_weight: 7, min_age_years: 13, max_age_years: 17,
    },
    {
      event_code: 'teen_style_experiment',
      life_stage: '少年期', category: 'daily',
      event_text: '你决定改变自己的形象——剪一个新发型，尝试完全不同的穿衣风格。',
      options: [
        { option: '大胆尝试，染了一头个性的发色', result: '虽然被老师叫了家长，但你觉得自己酷极了。同学们都夸你有勇气。', status_change: { charm: 3, mood: 4, stress: 3 } },
        { option: '选择了一个低调但精致的新形象', result: '你焕然一新但不过分张扬，连平时不和你说话的同学都夸你变好看了。', status_change: { charm: 4, mood: 3 } },
      ],
      trigger_weight: 7, min_age_years: 14, max_age_years: 18,
    },
    {
      event_code: 'teen_volunteer',
      life_stage: '少年期', category: 'fate',
      event_text: '学校组织去养老院做志愿者。你有些不情愿地报了名。',
      options: [
        { option: '认真陪老人聊天，听他们讲故事', result: '一位老奶奶讲了她年轻时的经历，你被深深打动了。你发现每个老人都是一本活历史书。', status_change: { charm: 3, mood: 4, intelligence: 2 } },
        { option: '躲在角落里玩手机，混了一下午', result: '你觉得很无聊，但看着其他同学和老人开心互动，心里有点不是滋味。', status_change: { stress: -1, mood: -1 } },
      ],
      trigger_weight: 7, min_age_years: 13, max_age_years: 18,
    },
  ],

  '青年期': [
    {
      event_code: 'young_career_start',
      life_stage: '青年期', category: 'career',
      event_text: '你走出了校园，面临着人生的第一次职业选择。几份offer摆在面前。',
      options: [
        { option: '选择稳定的工作', result: '你进入了一家大公司，虽然起薪不高但前景稳定。', status_change: { money: 500, stress: -3, mood: 2 }, milestone_key: 'first_job' },
        { option: '选择创业公司的高风险高回报', result: '创业公司的氛围让你充满激情，虽然风险大但你觉得值得一搏。', status_change: { money: 300, stress: 8, mood: 5, intelligence: 2 }, milestone_key: 'first_job' },
        { option: '继续深造，读研读博', result: '你选择继续在学术道路上前行，为未来积累更多资本。', status_change: { intelligence: 5, money: -200, stress: 5 }, milestone_key: 'first_job' },
      ],
      trigger_weight: 10, min_age_years: 21, max_age_years: 28,
      isMilestone: true,
    },
    {
      event_code: 'young_career_boost',
      life_stage: '青年期', category: 'career',
      event_text: '公司有一个重要项目需要人手，这是一次展示自己的好机会。',
      options: [
        { option: '主动请缨，全力以赴', result: '你的表现出色，得到了上司的认可。', status_change: { intelligence: 3, charm: 2, mood: 4 }, item_bonus: { item_code: 'book_002', bonus: { intelligence: 4, mood: 3 } } },
        { option: '低调参与，不出头', result: '你完成了本职工作，但没有给人留下深刻印象。', status_change: { mood: 1 } },
      ],
      trigger_weight: 8, min_age_years: 22, max_age_years: 30,
      requires_job: 'office',
    },
    {
      event_code: 'young_career_tech_opportunity',
      life_stage: '青年期', category: 'career',
      event_text: '一个技术挑战赛邀请你参加，获奖者能得到顶级公司的offer。',
      options: [
        { option: '报名参赛，用技能证明自己', result: '你在比赛中表现出色，获得了关注和机会。', status_change: { intelligence: 5, charm: 3, mood: 5 }, item_bonus: { item_code: 'book_002', bonus: { intelligence: 5, charm: 2 } } },
        { option: '觉得自己还不够格，放弃了', result: '你错失了一次展示自己的机会。', status_change: { stress: -2, mood: -2 } },
      ],
      trigger_weight: 7, min_age_years: 22, max_age_years: 32,
      requires_job: 'developer',
    },
    {
      event_code: 'young_friend_boost',
      life_stage: '青年期', category: 'relation',
      event_text: '好朋友告诉你他那里有一个不错的工作机会，问你有没有兴趣。',
      options: [
        { option: '感谢推荐，接受这个机会', result: '在朋友的帮助下，你顺利获得了这份工作。', status_change: { money: 600, mood: 5, charm: 2 } },
        { option: '婉拒了，想自己闯荡', result: '你决定靠自己的能力找工作。', status_change: { intelligence: 2, mood: -1 } },
      ],
      trigger_weight: 8, min_age_years: 22, max_age_years: 30,
      requires_npc_stage: 'friend',
    },
    {
      event_code: 'young_npc_heart_talk',
      life_stage: '青年期', category: 'emotional',
      event_text: '一个重要的人找你深谈，关于你们的关系和未来。',
      options: [
        { option: '坦诚相待，说出心里话', result: '你们进行了深入的交流，关系更进了一步。', status_change: { mood: 8, charm: 3 }, item_bonus: { item_code: 'gift_002', bonus: { mood: 5, charm: 3 } } },
        { option: '委婉回避，不想面对', result: '你选择了逃避，关系暂时停滞不前。', status_change: { mood: -3, stress: 3 } },
      ],
      trigger_weight: 9, min_age_years: 22, max_age_years: 35,
      requires_npc_stage: 'close_friend',
    },
    {
      event_code: 'young_stress_relief',
      life_stage: '青年期', category: 'daily',
      event_text: '最近压力很大，你感觉快要撑不住了。',
      options: [
        { option: '使用减压物品，好好休息', result: '你用购物袋里的减压道具给自己放了个假，状态恢复了不少。', status_change: { stress: -15, mood: 5 }, consumes_item: 'stress_relief_001' },
        { option: '硬撑着继续工作', result: '你咬牙坚持，但状态越来越差。', status_change: { stress: 8, health: -5, mood: -5 } },
      ],
      trigger_weight: 8, min_age_years: 22, max_age_years: 35,
    },
    {
      event_code: 'young_health_crisis',
      life_stage: '青年期', category: 'health',
      event_text: '你突然感到身体不适，去医院检查后发现需要休养。',
      options: [
        { option: '遵医嘱住院休养', result: '你配合治疗，身体逐渐恢复。', status_change: { health: 10, stress: -5, money: -200 } },
        { option: '觉得没事，继续工作', result: '你忽视了自己的健康，状态越来越差。', status_change: { health: -15, stress: 5, mood: -8 } },
      ],
      trigger_weight: 7, min_age_years: 24, max_age_years: 35,
    },
    {
      event_code: 'young_first_love_real',
      life_stage: '青年期', category: 'emotional',
      event_text: '在一次朋友聚会中，你遇到了一个让你心动的人。你们聊得很投机。',
      options: [
        { option: '主动要了联系方式', result: '你们开始频繁约会，一段美好的恋情就此展开。', status_change: { mood: 8, charm: 3, money: -100 } },
        { option: '含蓄地等待对方主动', result: '缘分没有降临，但你学会了在感情中要更勇敢一些。', status_change: { mood: 1, intelligence: 1 } },
      ],
      trigger_weight: 10, min_age_years: 20, max_age_years: 30,
    },
    {
      event_code: 'young_travel_adventure',
      life_stage: '青年期', category: 'fate',
      event_text: '你攒了一笔钱，萌生了独自背包旅行的想法。世界那么大，你想去看看。',
      options: [
        { option: '背上包就出发', result: '你走过了许多地方，见识了不同的风土人情。这段经历让你变得更加开阔。', status_change: { mood: 8, intelligence: 3, charm: 3, money: -300 } },
        { option: '把钱存起来，等以后再去', result: '你把钱存了起来，但也失去了年轻时探索世界的机会。', status_change: { money: 500, mood: -2 } },
      ],
      trigger_weight: 8, min_age_years: 22, max_age_years: 30,
    },
    {
      event_code: 'young_roommate_conflict',
      life_stage: '青年期', category: 'daily',
      event_text: '和室友因为作息时间不同发生了矛盾，对方经常深夜打游戏影响你休息。',
      options: [
        { option: '心平气和地沟通，制定寝室公约', result: '你们达成了共识，关系反而因为这次沟通变得更好了。', status_change: { charm: 2, stress: -5, mood: 3 } },
        { option: '默默忍受，戴上耳塞睡觉', result: '你的睡眠质量大打折扣，但避免了冲突。', status_change: { stress: 5, health: -2, mood: -3 } },
      ],
      trigger_weight: 7, min_age_years: 18, max_age_years: 26,
    },
    {
      event_code: 'young_entrepreneur_opportunity',
      life_stage: '青年期', category: 'career',
      event_text: '一个朋友拉你一起创业，项目听起来很有前景，但需要投入全部积蓄。',
      options: [
        { option: 'All in 创业', result: '创业之路充满艰辛，但你学到了比工资更宝贵的东西。', status_change: { money: -500, intelligence: 5, stress: 10, mood: 5 } },
        { option: '谨慎地拒绝了', result: '你保持了财务稳定，但心里偶尔会想"如果当初……"', status_change: { money: 200, stress: -3, mood: -1 } },
      ],
      trigger_weight: 7, min_age_years: 24, max_age_years: 32,
      requires_min_money: 500,
    },
    {
      event_code: 'young_heartbreak',
      life_stage: '青年期', category: 'emotional',
      event_text: '你的恋人提出了分手，理由是"我们不合适"。你的世界仿佛塌了一半。',
      options: [
        { option: '躲在家里哭了三天', result: '眼泪流干了，你也终于接受了现实。时间会治愈一切。', status_change: { mood: -10, stress: 5, health: -2 } },
        { option: '化悲痛为力量，投入工作和学习', result: '你把所有的精力都用来提升自己，不知不觉中变得更优秀了。', status_change: { intelligence: 3, money: 300, mood: -3, stress: 3 } },
      ],
      trigger_weight: 8, min_age_years: 20, max_age_years: 32,
    },
    {
      event_code: 'young_networking_key',
      life_stage: '青年期', category: 'career',
      event_text: '在一个行业论坛上，你偶然结识了一位业界前辈。他对你的见解表示赞赏。',
      options: [
        { option: '主动请教，建立联系', result: '前辈成了你的导师，为你的职业发展提供了很多宝贵建议。', status_change: { intelligence: 4, charm: 3, money: 200 } },
        { option: '交换名片但后续没有跟进', result: '机会就这么悄悄溜走了，不过你至少学到了一点：人脉需要主动维护。', status_change: { charm: 1 } },
      ],
      trigger_weight: 8, min_age_years: 24, max_age_years: 35,
    },
    {
      event_code: 'young_rent_crisis',
      life_stage: '青年期', category: 'daily',
      event_text: '房东突然通知要涨房租，涨了30%。你的预算一下子变得紧张起来。',
      options: [
        { option: '据理力争，和房东谈判', result: '你用数据说明了周边房租水平，最终只涨了10%。谈判能力得到了锻炼。', status_change: { money: -100, intelligence: 2, stress: 3 } },
        { option: '决定搬家，换个便宜的地方', result: '虽然搬家很累，但你找到了一个性价比更高的地方，还多了个不错的室友。', status_change: { money: 50, stress: 5, health: -1, charm: 2 } },
      ],
      trigger_weight: 7, min_age_years: 22, max_age_years: 30,
    },
    {
      event_code: 'young_fitness_awakening',
      life_stage: '青年期', category: 'health',
      event_text: '你看到镜子里的自己——久坐办公室让身材走了样。你决定改变。',
      options: [
        { option: '办了健身卡，每周坚持锻炼', result: '几个月后你不仅身材变好了，精神状态也大幅提升。', status_change: { health: 5, charm: 3, mood: 3, money: -200 } },
        { option: '买了瑜伽垫在家练', result: '虽然效果慢一些，但你坚持下来了，体态有了明显改善。', status_change: { health: 3, mood: 2, money: -50 } },
      ],
      trigger_weight: 7, min_age_years: 24, max_age_years: 35,
    },
    {
      event_code: 'young_side_hustle',
      life_stage: '青年期', category: 'career',
      event_text: '你的工资勉强够花，你考虑搞一个副业增加收入。',
      options: [
        { option: '利用专业技能接私活', result: '你的副业渐渐有了起色，每月多了不少额外收入，但确实比之前更累了。', status_change: { money: 400, intelligence: 2, stress: 6 } },
        { option: '开了一个自媒体账号分享日常', result: '虽然赚钱不多，但你找到了表达自我的新方式，还认识了很多同好。', status_change: { charm: 3, mood: 3, money: 100 } },
      ],
      trigger_weight: 8, min_age_years: 24, max_age_years: 35,
    },
    {
      event_code: 'young_city_choice',
      life_stage: '青年期', category: 'fate',
      event_text: '家人希望你回老家发展，但你对大城市还有留恋。十字路口，何去何从？',
      options: [
        { option: '留在大城市继续打拼', result: '你选择了更大的舞台和更多的可能性。虽然辛苦，但你的未来有无限空间。', status_change: { stress: 5, money: 200, intelligence: 2 } },
        { option: '回老家，离家人近一些', result: '你选择了陪伴和安稳。小城市的生活节奏让你感到前所未有的放松。', status_change: { stress: -8, mood: 4, money: -100 } },
      ],
      trigger_weight: 8, min_age_years: 24, max_age_years: 32,
    },
    {
      event_code: 'young_apology_learn',
      life_stage: '青年期', category: 'relation',
      event_text: '你和好朋友因为一件小事闹翻了，已经冷战了两周。你心里很不是滋味。',
      options: [
        { option: '主动迈出第一步，发了条道歉消息', result: '对方秒回了消息——原来TA也一直在等你。友谊在经历了考验后更加牢固。', status_change: { charm: 3, mood: 4, stress: -5 } },
        { option: '继续冷战，等对方先开口', result: '时间越久，隔阂越深。你们都倔强地不肯低头，一段友情就这么淡了。', status_change: { stress: 3, mood: -3 } },
      ],
      trigger_weight: 7, min_age_years: 20, max_age_years: 32,
    },
    {
      event_code: 'young_imposter_syndrome',
      life_stage: '青年期', category: 'emotional',
      event_text: '你得到了一个很好的工作机会，但你总觉得自己不够格，害怕被人发现"真实水平"。',
      options: [
        { option: '接受挑战，在压力中快速成长', result: '你发现其实大家都差不多，你的能力完全胜任。自信心大大增强。', status_change: { intelligence: 4, mood: 3, stress: 5 } },
        { option: '觉得自己还没准备好，婉拒了', result: '安全的选择让你松了一口气，但你偶尔会想：如果当时再勇敢一点会怎样？', status_change: { stress: -5, mood: -2 } },
      ],
      trigger_weight: 7, min_age_years: 22, max_age_years: 32,
    },
  ],

  '壮年期': [
    {
      event_code: 'prime_marriage_decision',
      life_stage: '壮年期', category: 'family',
      event_text: '你的伴侣提出了结婚的想法。你看着镜子里的自己——已经不再年轻了。',
      options: [
        { option: '欣然同意，筹备婚礼', result: '你们举办了一场温馨的婚礼，开始了人生的新阶段。', status_change: { mood: 8, money: -800, stress: 3, charm: 3 }, milestone_key: 'marriage' },
        { option: '觉得还没准备好，想再等等', result: '伴侣虽然有些失望但表示理解。你们继续恋爱长跑。', status_change: { mood: -2, stress: 5 }, milestone_key: 'marriage' },
      ],
      trigger_weight: 9, min_age_years: 28, max_age_years: 40,
      isMilestone: true,
    },
    {
      event_code: 'prime_midlife_reflection',
      life_stage: '壮年期', category: 'emotional',
      event_text: '一个不加班的周末，你突然意识到自己已经很久没有做过真正喜欢的事了。',
      options: [
        { option: '重拾年轻时的爱好', result: '你开始在工作之余花时间做自己喜欢的事，生活变得更有色彩。', status_change: { mood: 6, stress: -5, health: 2 } },
        { option: '觉得没时间，继续埋头工作', result: '日子一天天过去，你变得越来越像一个"工作机器"。', status_change: { money: 300, stress: 5, mood: -3 } },
      ],
      trigger_weight: 8, min_age_years: 35, max_age_years: 46,
    },
    {
      event_code: 'prime_career_peak_choice',
      life_stage: '壮年期', category: 'career',
      event_text: '公司给了你一个升职的机会，但需要你调到另一个城市的分公司。',
      options: [
        { option: '接受升职，举家搬迁', result: '你在新城市打开了局面，事业更上一层楼。', status_change: { money: 600, intelligence: 3, stress: 8, mood: 2 } },
        { option: '留在原地，婉拒升职', result: '你选择了生活的稳定和家庭的陪伴，事业上虽然没有突破但过得很舒心。', status_change: { mood: 4, stress: -5, charm: 2 } },
      ],
      trigger_weight: 9, min_age_years: 33, max_age_years: 46,
      requires_job: 'office',
    },
    {
      event_code: 'prime_career_expert_lead',
      life_stage: '壮年期', category: 'career',
      event_text: '作为领域专家，你被邀请在行业大会上做分享。这是一次建立个人品牌的好机会。',
      options: [
        { option: '认真准备，分享自己的经验', result: '你的演讲获得了热烈反响，很多人记住了你的名字。', status_change: { charm: 5, intelligence: 3, mood: 6 }, item_bonus: { item_code: 'book_003', bonus: { charm: 3, intelligence: 3 } } },
        { option: '婉拒了，觉得太麻烦', result: '你错失了一次提升个人影响力的机会。', status_change: { mood: -2, stress: 2 } },
      ],
      trigger_weight: 7, min_age_years: 35, max_age_years: 48,
      requires_job_level: 'expert',
    },
    {
      event_code: 'prime_freelancer_big_project',
      life_stage: '壮年期', category: 'career',
      event_text: '一个大客户联系你，有一个高报酬的项目想交给你做。',
      options: [
        { option: '接受项目，全力以赴', result: '你高质量完成了项目，获得了丰厚的报酬和口碑。', status_change: { money: 1000, intelligence: 3, stress: 8, mood: 5 } },
        { option: '觉得风险太大，婉拒了', result: '你拒绝了这次机会，但保持了自己的节奏。', status_change: { stress: -3, mood: 1 } },
      ],
      trigger_weight: 7, min_age_years: 33, max_age_years: 48,
      requires_job: 'freelancer',
    },
    {
      event_code: 'prime_creator_viral',
      life_stage: '壮年期', category: 'career',
      event_text: '你创作的作品突然火了！社交媒体上到处都是关于你作品的讨论。',
      options: [
        { option: '趁热打铁，继续创作', result: '你抓住机会，连续推出了几部受欢迎的作品。', status_change: { money: 800, charm: 5, mood: 8 }, item_bonus: { item_code: 'charm_item_002', bonus: { charm: 4, mood: 4 } } },
        { option: '保持低调，不改变节奏', result: '你没有追逐流量，保持了自己的创作风格。', status_change: { mood: 3, intelligence: 2 } },
      ],
      trigger_weight: 7, min_age_years: 32, max_age_years: 48,
      requires_job: 'creator',
    },
    {
      event_code: 'prime_soulmate_support',
      life_stage: '壮年期', category: 'emotional',
      event_text: '你的灵魂伴侣告诉你，无论你做什么决定他都会支持。这让你感到很温暖。',
      options: [
        { option: '和他分享你的人生规划', result: '你们进行了深入的交流，对未来有了更清晰的规划。', status_change: { mood: 10, stress: -8, charm: 3 } },
        { option: '只是表示感谢', result: '你感到了温暖，但没有进一步深入交流。', status_change: { mood: 4 } },
      ],
      trigger_weight: 8, min_age_years: 30, max_age_years: 50,
      requires_npc_stage: 'soulmate',
    },
    {
      event_code: 'prime_parent_health',
      life_stage: '壮年期', category: 'family',
      event_text: '父母的身体开始出现状况，需要你花更多时间照顾他们。',
      options: [
        { option: '减少工作时间，多陪伴父母', result: '你体会到了"子欲养而亲不待"的含义，陪父母的日子虽然累但很珍贵。', status_change: { mood: 3, money: -200, stress: 3, charm: 3 } },
        { option: '请护工照顾，自己专心工作赚钱', result: '父母的照顾得到了保障，但你心里总有一些愧疚。', status_change: { money: 300, stress: 5, mood: -3 } },
      ],
      trigger_weight: 8, min_age_years: 36, max_age_years: 50,
    },
    {
      event_code: 'prime_investment_opportunity',
      life_stage: '壮年期', category: 'fate',
      event_text: '一个投资机会出现——有人说这是一辈子一次的机会，但也可能是陷阱。',
      options: [
        { option: '深入研究后谨慎投资一部分', result: '你的理智和专业帮你做出了正确的判断，获得了不错的回报。', status_change: { money: 500, intelligence: 2 } },
        { option: '把所有积蓄都投了进去', result: '很遗憾，这次你赌错了。大半积蓄打了水漂。', status_change: { money: -800, stress: 10, mood: -8 } },
      ],
      trigger_weight: 7, min_age_years: 35, max_age_years: 50,
      requires_min_money: 1000,
    },
    {
      event_code: 'prime_health_wakeup',
      life_stage: '壮年期', category: 'health',
      event_text: '体检报告出来了，几项指标亮了红灯。医生严肃地告诉你需要改变生活方式。',
      options: [
        { option: '开始规律运动和健康饮食', result: '几个月后，你的身体指标明显改善，整个人也精神了很多。', status_change: { health: 8, stress: -6, mood: 3 } },
        { option: '工作太忙，暂时顾不上', result: '你把体检报告塞进了抽屉，继续原来的生活方式。', status_change: { health: -5, stress: 3 } },
      ],
      trigger_weight: 8, min_age_years: 38, max_age_years: 50,
    },
    {
      event_code: 'prime_child_education',
      life_stage: '壮年期', category: 'family',
      event_text: '孩子的学习成绩不太理想，老师建议你多关注一下孩子的教育。',
      options: [
        { option: '耐心辅导，和孩子一起制定学习计划', result: '在你的陪伴下，孩子的成绩慢慢有了起色，你们的亲子关系也更好了。', status_change: { mood: 3, charm: 2 } },
        { option: '给孩子报了昂贵的补习班', result: '钱包大出血，效果却不太明显。你开始反思什么才是真正的教育。', status_change: { money: -500, stress: 3 } },
      ],
      trigger_weight: 8, min_age_years: 35, max_age_years: 48,
    },
    {
      event_code: 'prime_work_burnout',
      life_stage: '壮年期', category: 'health',
      event_text: '你发现自己对工作失去了热情，每天早上起床都是一种煎熬。同事说这叫"职业倦怠"。',
      options: [
        { option: '请了长假，重新思考职业方向', result: '一段时间的休息让你想清楚了很多事，回来后你调整了工作方式。', status_change: { mood: 5, stress: -8, money: -200 } },
        { option: '咬牙硬撑，相信总会过去的', result: '倦怠感越来越严重，你的效率和创造力都急剧下降。', status_change: { stress: 8, mood: -5, health: -3 } },
      ],
      trigger_weight: 8, min_age_years: 38, max_age_years: 48,
    },
    {
      event_code: 'prime_charity_impulse',
      life_stage: '壮年期', category: 'fate',
      event_text: '你看到一则山区儿童助学项目的报道，内心被触动了。',
      options: [
        { option: '定期捐款资助一个孩子上学', result: '每个月不多的钱却能改变一个孩子的命运。你收到的感谢信让你无比温暖。', status_change: { money: -100, mood: 5, charm: 3 } },
        { option: '报名成为周末志愿者', result: '你用实际行动帮助他人，这种满足感是金钱买不到的。', status_change: { mood: 4, health: 2, charm: 2 } },
      ],
      trigger_weight: 7, min_age_years: 35, max_age_years: 50,
    },
    {
      event_code: 'prime_divorce_crisis',
      life_stage: '壮年期', category: 'family',
      event_text: '你和伴侣之间积累的矛盾终于爆发了。你们已经很久没有好好说过话了。',
      options: [
        { option: '提议去做婚姻咨询', result: '在咨询师的帮助下，你们重新学会了沟通。婚姻渡过了危机，虽然过程很痛苦。', status_change: { stress: -5, mood: 2, money: -300 } },
        { option: '觉得一切都晚了，选择分开', result: '离婚过程很煎熬，但分开后你们都获得了重新开始的机会。', status_change: { stress: 8, mood: -8, money: -500 } },
      ],
      trigger_weight: 7, min_age_years: 36, max_age_years: 50,
    },
    {
      event_code: 'prime_hobby_to_career',
      life_stage: '壮年期', category: 'career',
      event_text: '你业余坚持的兴趣爱好越做越好，甚至开始有人愿意为此付费了。',
      options: [
        { option: '大胆转型，把爱好变成主业', result: '虽然前期收入变少了，但你每天都充满热情。慢慢地，你的新事业站稳了脚跟。', status_change: { mood: 8, money: -300, stress: 5, intelligence: 3 } },
        { option: '保持现状，继续把爱好当副业', result: '主业稳定，副业开心。你在两条线上都稳步前进。', status_change: { money: 200, mood: 3 } },
      ],
      trigger_weight: 7, min_age_years: 36, max_age_years: 48,
    },
    {
      event_code: 'prime_social_circle_shrink',
      life_stage: '壮年期', category: 'relation',
      event_text: '你发现能随时约出来吃饭的朋友越来越少了。大家都忙于家庭和工作。',
      options: [
        { option: '主动组织聚会，维系老朋友', result: '虽然组织起来费心费力，但每次聚会大家都特别开心，友情历久弥新。', status_change: { charm: 3, mood: 4, money: -100 } },
        { option: '接受这个现实，专注于小圈子', result: '朋友不在于多而在于精。你和最亲近的两三个朋友关系更加紧密了。', status_change: { mood: 2, stress: -3 } },
      ],
      trigger_weight: 7, min_age_years: 38, max_age_years: 50,
    },
  ],

  '中年期': [
    {
      event_code: 'middle_empty_nest',
      life_stage: '中年期', category: 'family',
      event_text: '孩子考上了远方的大学，第一次离家独立生活。房间空了，你的心也空了一块。',
      options: [
        { option: '把精力投入到自己的兴趣爱好中', result: '你终于有时间做那些一直想做却没做的事，生活翻开了新的一页。', status_change: { mood: 4, stress: -5 } },
        { option: '每天给孩子打电话，难以放手', result: '孩子有点烦你的过度关心，你也意识到自己该学着放手了。', status_change: { stress: 3, mood: -2 } },
      ],
      trigger_weight: 9, min_age_years: 48, max_age_years: 62,
    },
    {
      event_code: 'middle_career_legacy',
      life_stage: '中年期', category: 'career',
      event_text: '公司来了很多年轻人，他们充满活力但缺乏经验。老板让你负责带新人。',
      options: [
        { option: '倾囊相授，认真做导师', result: '你带出来的新人个个出类拔萃，你在公司里的声望达到了顶峰。', status_change: { charm: 5, mood: 5, intelligence: 2 } },
        { option: '觉得麻烦，随便应付一下', result: '你错过了传承经验的机会，和年轻同事的关系也一般。', status_change: { stress: -2, charm: -1 } },
      ],
      trigger_weight: 8, min_age_years: 46, max_age_years: 60,
    },
    {
      event_code: 'middle_health_scare',
      life_stage: '中年期', category: 'health',
      event_text: '你突然感到胸口发闷，被紧急送往医院。在病床上，你想了很多。',
      options: [
        { option: '出院后彻底改变生活方式', result: '你辞去了高压的工作，开始注重身心健康。这次经历让你重新审视了人生。', status_change: { health: 5, stress: -10, mood: 3, money: -200 } },
        { option: '休养一段时间后回归原来的节奏', result: '你的身体发出了一次警告，但你选择性地忽略了它。', status_change: { health: -3, stress: 5 } },
      ],
      trigger_weight: 8, min_age_years: 50, max_age_years: 62,
    },
    {
      event_code: 'middle_retirement_planning',
      life_stage: '中年期', category: 'fate',
      event_text: '你开始认真思考退休后的生活。是时候为晚年做打算了。',
      options: [
        { option: '制定详细的退休计划，开始储蓄投资', result: '你做了周全的退休准备，为晚年生活打下了坚实的基础。', status_change: { money: 400, intelligence: 2, stress: -3 } },
        { option: '活好当下，船到桥头自然直', result: '你选择了随遇而安，虽然未来不确定但你并不焦虑。', status_change: { mood: 3, stress: -2 } },
      ],
      trigger_weight: 7, min_age_years: 50, max_age_years: 62,
    },
    {
      event_code: 'middle_old_friend_reunion',
      life_stage: '中年期', category: 'relation',
      event_text: '老同学组织了一场聚会，很多人已经二十多年没见了。大家都变了模样。',
      options: [
        { option: '积极参加，重温旧时光', result: '聚会上的欢声笑语让你仿佛回到了青春时代。老朋友的近况让你感慨万千。', status_change: { mood: 6, charm: 2 } },
        { option: '觉得没意思，婉拒了', result: '你在家看了一晚上电视，一切照旧。', status_change: { mood: -1 } },
      ],
      trigger_weight: 7, min_age_years: 48, max_age_years: 62,
    },
    {
      event_code: 'middle_wisdom_sharing',
      life_stage: '中年期', category: 'emotional',
      event_text: '社区邀请你给年轻人做一次分享，谈谈你的人生经验。',
      options: [
        { option: '真诚分享自己的得失与感悟', result: '你的分享打动了很多年轻人。你发现自己的经历原来可以帮到别人。', status_change: { charm: 4, mood: 5, intelligence: 1 } },
        { option: '简单说几句客套话', result: '分享会平平淡淡地结束了。', status_change: { mood: 0 } },
      ],
      trigger_weight: 7, min_age_years: 50, max_age_years: 65,
    },
    {
      event_code: 'middle_aging_parents',
      life_stage: '中年期', category: 'family',
      event_text: '父母的健康状况急剧恶化，医生建议你做好心理准备。时间不多了。',
      options: [
        { option: '放下一切，回家陪伴父母最后的时光', result: '这几个月虽然艰辛，但你没有留下遗憾。父母走得很安详。', status_change: { mood: -3, stress: 5, charm: 3 } },
        { option: '内心挣扎但还是放不下工作', result: '你尽量抽时间陪父母，但总觉得自己做得不够。有些遗憾是一辈子的。', status_change: { money: 200, mood: -5, stress: 3 } },
      ],
      trigger_weight: 7, min_age_years: 52, max_age_years: 65,
    },
    {
      event_code: 'middle_downsized',
      life_stage: '中年期', category: 'career',
      event_text: '公司进行大规模裁员，你这个年纪的人首当其冲。你的名字出现在了名单上。',
      options: [
        { option: '接受现实，拿着赔偿金重新规划', result: '你用多年的经验做起了咨询顾问，虽然不稳定但自由了很多。', status_change: { money: -100, stress: 8, mood: -3, intelligence: 2 } },
        { option: '动用一切人脉争取留下来', result: '你保住了工作，但发现自己成了"边缘人"，日子过得如履薄冰。', status_change: { stress: 10, mood: -5, charm: -2 } },
      ],
      trigger_weight: 7, min_age_years: 48, max_age_years: 60,
    },
    {
      event_code: 'middle_legacy_project',
      life_stage: '中年期', category: 'fate',
      event_text: '你突然有了一个念头：在退休前做一件真正有意义的事。一件能让你被记住的事。',
      options: [
        { option: '写一本书，记录你的行业经验', result: '虽然销量不高，但你的书在业内获得了很好的口碑。', status_change: { intelligence: 4, charm: 3, mood: 4 } },
        { option: '创立一个公益项目', result: '你的项目帮助了很多需要帮助的人，你的人生因为给予而变得更加丰富。', status_change: { mood: 6, charm: 5, money: -300 } },
      ],
      trigger_weight: 7, min_age_years: 52, max_age_years: 63,
    },
    {
      event_code: 'middle_reconnect_spouse',
      life_stage: '中年期', category: 'emotional',
      event_text: '孩子离家后，你和伴侣突然发现——除了聊孩子，你们竟然没什么话题了。',
      options: [
        { option: '提议一起培养共同爱好', result: '你们开始一起学跳舞、一起旅行。空巢期反而成了你们的"第二蜜月"。', status_change: { mood: 6, charm: 3, money: -200 } },
        { option: '各自忙各自的，保持距离', result: '你们在同一个屋檐下过着平行的生活。婚姻还在，但温度已经凉了。', status_change: { stress: 2, mood: -2 } },
      ],
      trigger_weight: 7, min_age_years: 48, max_age_years: 62,
    },
    {
      event_code: 'middle_tech_overwhelm',
      life_stage: '中年期', category: 'daily',
      event_text: '你发现世界变化太快了——新的App、新的流行语、新的思维方式。你感觉自己落伍了。',
      options: [
        { option: '主动学习新技能，请教年轻人', result: '你学会了剪辑视频、用AI工具。虽然起步晚了，但你跟上了时代的步伐。', status_change: { intelligence: 3, charm: 2, mood: 2 } },
        { option: '感叹"我这辈子是学不会了"', result: '你选择了舒适区。世界在变，但你觉得自己的生活节奏没必要跟着变。', status_change: { stress: -3, mood: 0 } },
      ],
      trigger_weight: 7, min_age_years: 50, max_age_years: 65,
    },
    {
      event_code: 'middle_grandparent_debut',
      life_stage: '中年期', category: 'family',
      event_text: '你的孩子告诉你，你要当爷爷/奶奶了。一个新的生命即将到来。',
      options: [
        { option: '高兴得合不拢嘴，开始准备婴儿用品', result: '你第一次抱到孙子的时候，感觉人生又有了新的意义。', status_change: { mood: 8, money: -200 } },
        { option: '担心孩子们的经济压力太大', result: '你默默地在经济上给予支持，虽然不多但表达了你的心意。', status_change: { money: -300, mood: 3 } },
      ],
      trigger_weight: 7, min_age_years: 50, max_age_years: 65,
    },
  ],

  '老年期': [
    {
      event_code: 'elder_retirement_day',
      life_stage: '老年期', category: 'fate',
      event_text: '今天是你在职的最后一天。同事为你举办了退休欢送会。',
      options: [
        { option: '感慨万千，和大家分享职业生涯的回忆', result: '你讲了很多故事，有笑有泪。大家都很舍不得你。', status_change: { mood: 6, charm: 3 } },
        { option: '平静地收拾东西，低调离开', result: '你不喜欢太热闹，在大家的祝福中安静地离开了工作了几十年的地方。', status_change: { mood: 3, stress: -5 } },
      ],
      trigger_weight: 10, min_age_years: 60, max_age_years: 70,
    },
    {
      event_code: 'elder_grandchildren',
      life_stage: '老年期', category: 'family',
      event_text: '你第一次抱到了孙子/孙女。那个小小的生命在你的怀里安静地睡着。',
      options: [
        { option: '主动帮忙带孩子，享受天伦之乐', result: '虽然累，但看着小生命一天天长大，你觉得一切都值了。', status_change: { mood: 8, health: -2, stress: 3 } },
        { option: '偶尔去看看，不过多干涉', result: '你保持了适当的距离，享受轻松的祖孙关系。', status_change: { mood: 5, stress: -2 } },
      ],
      trigger_weight: 9, min_age_years: 62, max_age_years: 80,
    },
    {
      event_code: 'elder_health_decline',
      life_stage: '老年期', category: 'health',
      event_text: '你的身体大不如前，走几步路就喘，记忆力也开始衰退。',
      options: [
        { option: '积极锻炼，做力所能及的运动', result: '虽然身体不如从前，但你的坚持让衰老来得慢了一些。', status_change: { health: 3, mood: 3, stress: -2 } },
        { option: '接受现实，减少活动', result: '你选择了安享晚年，虽然身体机能下降但心态平和。', status_change: { mood: 2, health: -3 } },
      ],
      trigger_weight: 8, min_age_years: 65, max_age_years: 100,
    },
    {
      event_code: 'elder_bucket_list',
      life_stage: '老年期', category: 'emotional',
      event_text: '你列了一份"生前愿望清单"，上面写着那些你一直想做但没做的事。',
      options: [
        { option: '一件一件去实现', result: '你在晚年完成了好几件心愿，人生少了很多遗憾。', status_change: { mood: 8, money: -200, health: -2 } },
        { option: '觉得太晚了，把清单收了起来', result: '清单在抽屉里蒙了灰，有些事错过了就是错过了。', status_change: { mood: -3 } },
      ],
      trigger_weight: 8, min_age_years: 65, max_age_years: 90,
    },
    {
      event_code: 'elder_wisdom_letters',
      life_stage: '老年期', category: 'family',
      event_text: '你决定给后辈们每人写一封信，把一生的智慧浓缩在字里行间。',
      options: [
        { option: '认真写，把每封信都写得真诚感人', result: '这些信成了家族里最珍贵的传家宝。后辈们读了一遍又一遍。', status_change: { charm: 4, mood: 6, intelligence: 1 } },
        { option: '简单写几句祝福', result: '虽然简短，但心意到了。', status_change: { mood: 3 } },
      ],
      trigger_weight: 7, min_age_years: 68, max_age_years: 95,
    },
    {
      event_code: 'elder_life_review_natural',
      life_stage: '老年期', category: 'emotional',
      event_text: '你坐在摇椅上，晒着太阳，脑海里像放电影一样回顾了自己的一生。',
      options: [
        { option: '感到满足，觉得这一生过得很值', result: '你微笑着闭上了眼睛，内心平静而充实。', status_change: { mood: 5, stress: -8 } },
        { option: '有些遗憾，但也能接受', result: '人生不如意十之八九，你学会了与自己和解。', status_change: { mood: 2, stress: -3 } },
      ],
      trigger_weight: 8, min_age_years: 70, max_age_years: 110,
    },
    {
      event_code: 'elder_last_adventure',
      life_stage: '老年期', category: 'fate',
      event_text: '社区组织了一次老年旅游团，目的地是你年轻时一直想去但没去成的地方。',
      options: [
        { option: '二话不说报名参加', result: '你在旅行中仿佛年轻了二十岁，这次旅程成了晚年最美好的回忆。', status_change: { mood: 10, health: -2, money: -150, charm: 2 } },
        { option: '觉得身体吃不消，遗憾放弃', result: '你虽然想去但还是选择了安全。有些梦想到老了也还是梦想。', status_change: { mood: -2, stress: -3 } },
      ],
      trigger_weight: 8, min_age_years: 65, max_age_years: 85,
    },
    {
      event_code: 'elder_garden_zen',
      life_stage: '老年期', category: 'daily',
      event_text: '你在阳台上种了一些花草。每天早上浇浇水、看看它们长得怎么样，成了你最享受的时光。',
      options: [
        { option: '精心照料，把阳台变成了小花园', result: '你的阳台成了小区一景，邻居们都来参观。你还送了不少花苗给别人。', status_change: { mood: 5, health: 1, charm: 2 } },
        { option: '随性打理，享受过程不求结果', result: '有几株活了，有几株枯了——生活也是一样，你比年轻时更懂得顺其自然。', status_change: { mood: 3, stress: -3 } },
      ],
      trigger_weight: 7, min_age_years: 63, max_age_years: 95,
    },
    {
      event_code: 'elder_old_photo_album',
      life_stage: '老年期', category: 'emotional',
      event_text: '翻出了尘封多年的老相册。每一张照片背后都是一段被遗忘的时光。',
      options: [
        { option: '把照片整理成电子相册，分享给家人', result: '家人们第一次看到你年轻时的样子，惊呼不已。这些照片串联起了家族的记忆。', status_change: { charm: 3, mood: 5 } },
        { option: '独自翻看，沉浸在回忆里', result: '你一个人看了一下午，时而微笑时而感慨。回忆是老了以后最珍贵的财富。', status_change: { mood: 4, stress: -5 } },
      ],
      trigger_weight: 7, min_age_years: 68, max_age_years: 100,
    },
    {
      event_code: 'elder_community_leader',
      life_stage: '老年期', category: 'relation',
      event_text: '小区里的老人们推举你做他们的"代表"，和物业沟通小区事务。',
      options: [
        { option: '欣然接受，发挥余热', result: '你用几十年的社会经验为大家解决了不少实际问题。你在小区的威望越来越高。', status_change: { charm: 4, mood: 4, intelligence: 1 } },
        { option: '推辞了，想过清闲日子', result: '你觉得该歇歇了。不过偶尔还是会有人来请教你的意见。', status_change: { stress: -3, mood: 1 } },
      ],
      trigger_weight: 7, min_age_years: 65, max_age_years: 90,
    },
    {
      event_code: 'elder_hospice_visit',
      life_stage: '老年期', category: 'health',
      event_text: '你去看望了一位住院的老朋友。他握着你的手，有很多话想说。',
      options: [
        { option: '坐在床边，认真听他说话', result: '你们聊了一下午，从年轻时的荒唐事到如今的身体状况。告别时你眼眶有些湿润。', status_change: { mood: -2, charm: 3, stress: 2 } },
        { option: '说些轻松的话题，不想气氛太沉重', result: '你讲了几个笑话逗他开心。有时候最好的陪伴就是不说难过的话。', status_change: { mood: 2, charm: 2 } },
      ],
      trigger_weight: 7, min_age_years: 70, max_age_years: 100,
    },
    {
      event_code: 'elder_tech_adoption',
      life_stage: '老年期', category: 'daily',
      event_text: '孙子教你用智能手机。你看着屏幕上那些花花绿绿的图标，觉得头大。',
      options: [
        { option: '认真学习，每天练习一点点', result: '你学会了视频通话、刷短视频、拍照修图。你和家人的距离因为科技而拉近了。', status_change: { intelligence: 2, mood: 4 } },
        { option: '学不会，还是用老人机方便', result: '虽然有些遗憾，但你选择保持自己的节奏。简单也有简单的快乐。', status_change: { stress: -3, mood: 0 } },
      ],
      trigger_weight: 7, min_age_years: 68, max_age_years: 95,
    },
    {
      event_code: 'elder_final_arrangements',
      life_stage: '老年期', category: 'emotional',
      event_text: '你开始认真思考身后事。不是害怕死亡，而是想把该交代的都交代清楚。',
      options: [
        { option: '平静地立好遗嘱，安排好一切', result: '你把一切安排得井井有条。做完这一切，你反而感到前所未有的轻松。', status_change: { stress: -8, mood: 3, intelligence: 1 } },
        { option: '觉得太沉重了，暂时不想面对', result: '你把这件事推了又推。人都不想面对自己的终点，这很正常。', status_change: { stress: 2, mood: -1 } },
      ],
      trigger_weight: 7, min_age_years: 72, max_age_years: 110,
    },
  ],
};

// ── Category labels ──
const CATEGORY_LABELS = {
  fate: '命运转折',
  daily: '日常琐事',
  relation: '人际关系',
  career: '职业机遇',
  health: '健康危机',
  emotional: '情感波折',
  education: '学业教育',
  family: '家庭事件',
};

// ── Event selection ──

/**
 * Select events for a quarter, with a cooldown on recently seen events.
 * @param {object} character - current character state
 * @param {number} quarterNumber - current quarter
 * @param {string[]} recentEventCodes - event codes seen in recent quarters (last ~8)
 * @param {object} extra - extra context (npcRelations, inventory)
 * @returns {object[]} selected events (1-2)
 */
function selectEventsForQuarter(character, quarterNumber, recentEventCodes = [], extra = {}) {
  const age = parseFloat(((quarterNumber) / 4).toFixed(1));
  const { getLifeStage } = require('./lifeStageService');
  const stage = getLifeStage(age);
  const pool = EVENT_POOL[stage.nameCN] || [];

  if (pool.length === 0) return [];

  const { npcRelations = [], inventory = [], milestoneFlags = [] } = extra;
  const inventorySet = new Set(inventory.map(i => i.item_code));
  const npcStageMap = {};
  for (const r of npcRelations) {
    npcStageMap[r.npc_id] = r.relationship_stage || 'stranger';
  }
  const triggeredMilestones = new Set(milestoneFlags);

  // Filter eligible events
  const eligible = pool.filter(e => {
    if (age < (e.min_age_years || 0) || age > (e.max_age_years || 120)) return false;
    if (e.requires_job && character.job !== e.requires_job) return false;
    if (e.requires_job_level && character.job_level !== e.requires_job_level) return false;
    if (e.requires_min_money && (character.money || 0) < e.requires_min_money) return false;
    // requires_npc_stage: event triggers only if any NPC has this stage
    if (e.requires_npc_stage) {
      const stages = Object.values(npcStageMap);
      if (!stages.includes(e.requires_npc_stage)) return false;
    }
    // consumes_item: only show event if player has the required item
    if (e.consumes_item && !inventorySet.has(e.consumes_item)) return false;
    // isMilestone: skip if this milestone already triggered for this character
    if (e.isMilestone && triggeredMilestones.has(e.event_code)) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  // Build weighted list with cooldown penalty for recently seen events
  const recentSet = new Set(recentEventCodes.slice(-8));
  const weighted = eligible.map(e => {
    const baseWeight = e.trigger_weight || 10;
    // Slash weight by 80% if seen in recent 8 quarters
    const adjustedWeight = recentSet.has(e.event_code) ? baseWeight * 0.2 : baseWeight;
    return { event: e, weight: adjustedWeight };
  });

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * totalWeight;
  const selected = [];
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) {
      selected.push(w.event);
      break;
    }
  }

  // Small chance (10%) of a second event in stage-transition-like quarters
  if (selected.length === 1 && Math.random() < 0.1) {
    const remaining = weighted.filter(w => w.event.event_code !== selected[0].event_code);
    if (remaining.length > 0) {
      const total2 = remaining.reduce((sum, w) => sum + w.weight, 0);
      let roll2 = Math.random() * total2;
      for (const w of remaining) {
        roll2 -= w.weight;
        if (roll2 <= 0) {
          selected.push(w.event);
          break;
        }
      }
    }
  }

  return selected;
}

function getStageEventCount(stageName) {
  return (EVENT_POOL[stageName] || []).length;
}

function getAllStageEventCounts() {
  const counts = {};
  for (const [stage, events] of Object.entries(EVENT_POOL)) {
    counts[stage] = events.length;
  }
  return counts;
}

module.exports = {
  EVENT_POOL,
  CATEGORY_LABELS,
  ITEM_EFFECTS,
  ITEM_TYPES,
  selectEventsForQuarter,
  getStageEventCount,
  getAllStageEventCounts,
};
