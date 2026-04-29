const express = require('express');
const { nanoid } = require('nanoid');
const { get, all, run } = require('../db/sqlite');
const { quartersToAge, getLifeStageByQuarters, getLifeStage, getNextStage, isStageTransition, quarterToSeasonLabel, getPassiveStatEffects, FAMILY_BACKGROUNDS, applyFamilyBackground, BABY_STATS } = require('../services/lifeStageService');
const { rollForDeath, getDeathWarning } = require('../services/deathService');
const { selectEventsForQuarter } = require('../services/eventContentService');
const { calculateLifeScore, determineTier, generateTitle, generateReviewNarrative } = require('../services/reviewService');
const { clampStatus } = require('../services/fallbackService');

const router = express.Router();

// Grant item to character after event option (item_bonus from event options)
async function grantItemBonus(characterId, bonus) {
  const { item_code, bonus: statBonus } = bonus;
  if (!item_code) return null;

  const ITEM_DEFINITIONS = {
    book_001: { name: '入门手册', type: 'skill' },
    book_002: { name: '进阶指南', type: 'skill' },
    book_003: { name: '大师之路', type: 'skill' },
    charm_item_001: { name: '魅力配饰', type: 'social' },
    charm_item_002: { name: '高级魅力套装', type: 'social' },
  };

  const def = ITEM_DEFINITIONS[item_code];
  if (!def) return null;

  const existing = await get(`SELECT id, qty FROM inventory_items WHERE character_id = ? AND item_code = ?`, [characterId, item_code]);
  const now = new Date().toISOString();

  if (existing) {
    await run(`UPDATE inventory_items SET qty = qty + 1, updated_at = ? WHERE id = ?`, [now, existing.id]);
  } else {
    await run(
      `INSERT INTO inventory_items (id, character_id, item_code, item_name, item_type, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), characterId, item_code, def.name, def.type, 1, now, now]
    );
  }

  // Also apply stat bonus immediately
  if (statBonus && Object.keys(statBonus).length > 0) {
    const char = await get(`SELECT mood, health, stress, money, charm, intelligence FROM characters WHERE id = ?`, [characterId]);
    if (char) {
      const next = {
        mood: Math.min(100, Math.max(0, (char.mood || 0) + (statBonus.mood || 0))),
        health: Math.min(100, Math.max(0, (char.health || 0) + (statBonus.health || 0))),
        stress: Math.min(100, Math.max(0, (char.stress || 0) + (statBonus.stress || 0))),
        money: Math.max(0, (char.money || 0) + (statBonus.money || 0)),
        charm: Math.min(100, Math.max(0, (char.charm || 0) + (statBonus.charm || 0))),
        intelligence: Math.min(100, Math.max(0, (char.intelligence || 0) + (statBonus.intelligence || 0))),
      };
      await run(
        `UPDATE characters SET mood=?, health=?, stress=?, money=?, charm=?, intelligence=?, updated_at=? WHERE id=?`,
        [next.mood, next.health, next.stress, next.money, next.charm, next.intelligence, now, characterId]
      );
    }
  }

  return { item_code, item_name: def.name };
}

// POST /api/life/advance — advance one quarter
router.post('/advance', async (req, res) => {
  const { characterId, choiceIndex } = req.body || {};
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }
    if (!character.is_alive) {
      return res.status(400).json({ code: 400, message: 'character is already deceased', data: null });
    }

    // If choiceIndex provided, it means we're resolving a pending event from a previous advance
    // For now, we handle this in a simpler way — events are resolved within the same advance

    const prevQuarters = character.quarters_lived || 0;
    const newQuarters = prevQuarters + 1;
    const ageYears = quartersToAge(newQuarters);
    const lifeStage = getLifeStageByQuarters(newQuarters);
    const prevStage = getLifeStageByQuarters(prevQuarters);
    const transitioning = prevStage.key !== lifeStage.key;
    const now = new Date().toISOString();

    // Apply passive stat effects
    const passive = getPassiveStatEffects(ageYears, character);
    const passiveDelta = {};
    for (const [key, val] of Object.entries(passive)) {
      if (val !== 0) passiveDelta[key] = val;
    }

    // Apply passive effects
    let currentStats = clampStatus(character, passiveDelta);

    // Update peaks
    const peakMood = Math.max(character.peak_mood || 0, currentStats.mood);
    const peakHealth = Math.max(character.peak_health || 0, currentStats.health);
    const peakMoney = Math.max(character.peak_money || 0, currentStats.money);
    const peakIntelligence = Math.max(character.peak_intelligence || 0, currentStats.intelligence);
    const peakCharm = Math.max(character.peak_charm || 0, currentStats.charm);

    // Fetch recent event codes for cooldown
    const recentLogs = await all(
      `SELECT event_code FROM quarter_logs WHERE character_id = ? ORDER BY quarter_number DESC LIMIT 10`,
      [characterId]
    );
    const recentEventCodes = (recentLogs || []).map(l => l.event_code).filter(Boolean);

    // Fetch NPC relations, inventory, and milestone flags for event filtering
    const [npcRelations, inventoryItems, milestoneRows] = await Promise.all([
      all(`SELECT npc_id, relationship_stage FROM npc_relations WHERE character_id = ?`, [characterId]),
      all(`SELECT item_code, item_name, item_type, qty FROM inventory_items WHERE character_id = ? AND qty > 0`, [characterId]),
      all(`SELECT milestone_key FROM milestone_flags WHERE character_id = ?`, [characterId]),
    ]);
    const triggeredMilestones = milestoneRows.map(r => r.milestone_key);

    // Select events for this quarter with social/career/item context
    const events = selectEventsForQuarter(
      { ...character, ...currentStats },
      newQuarters,
      recentEventCodes,
      { npcRelations, inventory: inventoryItems, milestoneFlags: triggeredMilestones }
    );
    const selectedEvents = events.slice(0, 2); // max 2 events per quarter

    // If stage transition, add a milestone event
    if (transitioning) {
      selectedEvents.push({
        event_code: 'stage_transition',
        category: 'fate',
        event_text: `🎉 你进入了${lifeStage.nameCN}！${lifeStage.description}`,
        options: [
          { option: '拥抱新的人生阶段', result: `你满怀期待地迎接${lifeStage.nameCN}的到来。`, status_change: { mood: 5 } },
        ],
        isMilestone: true,
      });
    }

    // Death check
    const deathResult = rollForDeath(ageYears, currentStats.health, currentStats.stress, currentStats.mood);
    const deathWarning = deathResult.died ? null : getDeathWarning(ageYears, currentStats.health, currentStats.stress, currentStats.mood);

    // Update character
    await run(
      `UPDATE characters SET
        quarters_lived = ?, age = ?, life_stage = ?, is_alive = ?,
        death_age = ?, death_cause = ?,
        mood = ?, health = ?, stress = ?, money = ?, charm = ?, intelligence = ?,
        peak_mood = ?, peak_health = ?, peak_money = ?, peak_intelligence = ?, peak_charm = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        newQuarters,
        ageYears,
        lifeStage.nameCN,
        deathResult.died ? 0 : 1,
        deathResult.died ? ageYears : null,
        deathResult.died ? (deathResult.cause ? deathResult.cause.label : null) : null,
        currentStats.mood, currentStats.health, currentStats.stress, currentStats.money, currentStats.charm, currentStats.intelligence,
        peakMood, peakHealth, peakMoney, peakIntelligence, peakCharm,
        now,
        characterId,
      ]
    );

    // Collect event codes for this quarter (for cooldown tracking)
    const eventCodes = selectedEvents.map(e => e.event_code).filter(Boolean);

    // Save quarter log
    const logId = nanoid();
    await run(
      `INSERT INTO quarter_logs (id, character_id, quarter_number, age_years, life_stage, mood, health, stress, money, charm, intelligence, job, job_level, event_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId, characterId, newQuarters, ageYears, lifeStage.nameCN,
        currentStats.mood, currentStats.health, currentStats.stress, currentStats.money, currentStats.charm, currentStats.intelligence,
        character.job || 'unemployed', character.job_level || 'entry',
        eventCodes.join(','),
        now,
      ]
    );

    // If died, trigger ending flow
    if (deathResult.died) {
      const achievements = await all(`SELECT code FROM achievements WHERE character_id = ?`, [characterId]);
      const relations = await all(
        `SELECT r.npc_id, r.favorability, n.name FROM npc_relations r LEFT JOIN npcs n ON n.id = r.npc_id WHERE r.character_id = ?`,
        [characterId]
      );

      const scoreData = calculateLifeScore([], { ...character, death_age: ageYears }, achievements, relations);
      const tier = determineTier(scoreData.total);
      const title = generateTitle(scoreData, tier, character);

      // Save life review
      const reviewId = nanoid();
      await run(
        `INSERT INTO life_reviews (id, character_id, character_name, total_quarters, death_age_years, death_cause,
         peak_stats_json, achievements_unlocked, events_experienced, total_score, tier, title, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reviewId, characterId, character.name || '无名者', newQuarters, ageYears,
          deathResult.cause ? deathResult.cause.label : '寿终正寝',
          JSON.stringify({ peakMood, peakHealth, peakMoney, peakIntelligence, peakCharm }),
          achievements.length, newQuarters, scoreData.total, tier.label, title, now,
        ]
      );

      return res.json({
        code: 200,
        message: 'ok',
        data: {
          quarterNumber: newQuarters,
          ageYears,
          lifeStage: lifeStage.nameCN,
          events: selectedEvents,
          passiveDelta,
          statSnapshot: currentStats,
          dead: true,
          deathInfo: {
            age: ageYears,
            cause: deathResult.cause,
            warning: null,
          },
          reviewId,
        },
      });
    }

    return res.json({
      code: 200,
      message: 'ok',
      data: {
        quarterNumber: newQuarters,
        ageYears,
        lifeStage: lifeStage.nameCN,
        transitioning,
        events: selectedEvents,
        passiveDelta,
        statSnapshot: currentStats,
        dead: false,
        deathWarning,
      },
    });
  } catch (err) {
    console.error('[life/advance]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// POST /api/life/resolve-event — resolve event choice
router.post('/resolve-event', async (req, res) => {
  const { characterId, quarterNumber, eventCode, optionIndex, eventText, options: requestOptions } = req.body || {};
  if (!characterId || optionIndex === undefined) {
    return res.status(400).json({ code: 400, message: 'characterId and optionIndex required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const { EVENT_POOL } = require('../services/eventContentService');
    let event = null;
    for (const pool of Object.values(EVENT_POOL)) {
      const found = pool.find(e => e.event_code === eventCode);
      if (found) { event = found; break; }
    }

    // Custom/generated events may not be in the static pool; allow client-provided options.
    if (!event && Array.isArray(requestOptions) && requestOptions.length > 0) {
      event = {
        event_code: eventCode,
        event_text: eventText || '自定义事件',
        options: requestOptions,
      };
    }

    if (!event) {
      return res.status(400).json({ code: 400, message: 'event not found', data: null });
    }

    const option = Array.isArray(event.options) ? event.options[optionIndex] : null;
    if (!option) {
      return res.status(400).json({ code: 400, message: 'invalid optionIndex', data: null });
    }

    // Apply event stat changes
    const delta = option.status_change || {};
    const nextStats = clampStatus(character, delta);
    const now = new Date().toISOString();

    await run(
      `UPDATE characters SET mood=?, health=?, stress=?, money=?, charm=?, intelligence=?, updated_at=? WHERE id=?`,
      [nextStats.mood, nextStats.health, nextStats.stress, nextStats.money, nextStats.charm, nextStats.intelligence, now, characterId]
    );

    // Record milestone flag if this option has one
    if (option.milestone_key) {
      const flagId = nanoid();
      await run(
        `INSERT OR IGNORE INTO milestone_flags (id, character_id, milestone_key, created_at) VALUES (?, ?, ?, ?)`,
        [flagId, characterId, option.milestone_key, now]
      );
    }

    // Grant item bonus if the option includes one
    const grantedItem = option.item_bonus ? await grantItemBonus(characterId, option.item_bonus) : null;

    // Update quarter log with choice
    await run(
      `UPDATE quarter_logs SET event_text=?, player_choice=?, result_text=?, event_code=? WHERE character_id=? AND quarter_number=?`,
      [event.event_text, option.option, option.result, eventCode, characterId, quarterNumber || character.quarters_lived]
    );

    return res.json({
      code: 200, message: 'ok',
      data: { event, option, statDelta: delta, statSnapshot: nextStats, grantedItem },
    });
  } catch (err) {
    console.error('[life/resolve-event]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// GET /api/life/timeline — get quarter logs
router.get('/timeline', async (req, res) => {
  const { characterId, limit, offset } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const rows = await all(
      `SELECT * FROM quarter_logs WHERE character_id = ? ORDER BY quarter_number DESC LIMIT ? OFFSET ?`,
      [characterId, Number(limit) || 40, Number(offset) || 0]
    );
    const total = await get(
      `SELECT COUNT(*) as cnt FROM quarter_logs WHERE character_id = ?`,
      [characterId]
    );
    return res.json({ code: 200, message: 'ok', data: { logs: rows, total: total ? total.cnt : 0 } });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// POST /api/life/review — generate life review
router.post('/review', async (req, res) => {
  const { characterId } = req.body || {};
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const quarterLogs = await all(`SELECT * FROM quarter_logs WHERE character_id = ? ORDER BY quarter_number`, [characterId]);
    const achievements = await all(`SELECT code FROM achievements WHERE character_id = ?`, [characterId]);
    const relations = await all(
      `SELECT r.npc_id, r.favorability, n.name FROM npc_relations r LEFT JOIN npcs n ON n.id = r.npc_id WHERE r.character_id = ?`,
      [characterId]
    );

    const scoreData = calculateLifeScore(quarterLogs, character, achievements, relations);
    const tier = determineTier(scoreData.total);
    const title = generateTitle(scoreData, tier, character);
    const deathCause = { label: character.death_cause || '寿终正寝' };
    const narrative = generateReviewNarrative(scoreData, tier, character, deathCause, quarterLogs);

    return res.json({
      code: 200, message: 'ok',
      data: {
        characterName: character.name,
        deathAge: character.death_age || character.age,
        deathCause: character.death_cause || '寿终正寝',
        totalQuarters: quarterLogs.length,
        scoreData, tier, title, narrative,
        peakStats: {
          mood: character.peak_mood, health: character.peak_health,
          money: character.peak_money, intelligence: character.peak_intelligence,
          charm: character.peak_charm,
        },
        careerSummary: { job: character.job, level: character.job_level },
        relationshipCount: relations.length,
        achievementsUnlocked: achievements.length,
        eventsExperienced: quarterLogs.length,
        quarterLogs: quarterLogs.slice(-50), // last 50 for the frontend
      },
    });
  } catch (err) {
    console.error('[life/review]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// GET /api/life/reviews — past life reviews
router.get('/reviews', async (req, res) => {
  const { characterId } = req.query;
  try {
    let rows;
    if (characterId) {
      rows = await all(`SELECT * FROM life_reviews WHERE character_id = ? ORDER BY generated_at DESC LIMIT 20`, [characterId]);
    } else {
      rows = await all(`SELECT * FROM life_reviews ORDER BY generated_at DESC LIMIT 20`);
    }
    return res.json({ code: 200, message: 'ok', data: rows });
  } catch (err) {
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// POST /api/life/reincarnate — reincarnation
router.post('/reincarnate', async (req, res) => {
  const { characterId, inheritKey, familyBackground } = req.body || {};
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const old = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!old) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    // Generate review for old character if not already dead
    if (old.is_alive) {
      await run(`UPDATE characters SET is_alive = 0, death_age = age, death_cause = '转世重生', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), characterId]);
    }

    const now = new Date().toISOString();
    const newId = nanoid();
    const bgKey = familyBackground || 'ordinary';

    let stats = applyFamilyBackground(BABY_STATS, bgKey);

    // Inherit bonus from previous life
    if (inheritKey && ['mood', 'health', 'money', 'charm', 'intelligence'].includes(inheritKey)) {
      const bonusMap = { mood: 8, health: 8, money: 300, charm: 5, intelligence: 5 };
      const bonus = bonusMap[inheritKey] || 0;
      if (stats[inheritKey] !== undefined) {
        stats[inheritKey] = Math.min(100, stats[inheritKey] + bonus);
      }
    }

    const birthSeason = ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)];
    const generation = (old.generation || 1) + 1;

    await run(
      `INSERT INTO characters (id, name, gender, avatar, personality, mood, health, stress, money, charm, intelligence,
        job, job_level, age, quarters_lived, life_stage, is_alive, birth_season, generation,
        peak_mood, peak_health, peak_money, peak_intelligence, peak_charm, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        `${old.name || '玩家'}·第${generation}世`,
        old.gender || '', old.avatar || '', old.personality || '',
        stats.mood, stats.health, stats.stress, stats.money, stats.charm, stats.intelligence,
        'unemployed', 'entry', 0, 0, '婴幼儿期', 1, birthSeason, generation,
        stats.mood, stats.health, stats.money, stats.intelligence, stats.charm,
        now, now,
      ]
    );

    // Bootstrap items for new character (expanded)
    const STARTER_ITEMS = [
      { item_code: 'med_001', item_name: '基础药品', item_type: 'consumable', qty: 2 },
      { item_code: 'med_002', item_name: '高级补品', item_type: 'consumable', qty: 1 },
      { item_code: 'gift_001', item_name: '小礼物', item_type: 'social', qty: 2 },
      { item_code: 'gift_002', item_name: '精致礼品', item_type: 'social', qty: 1 },
      { item_code: 'book_001', item_name: '入门手册', item_type: 'skill', qty: 1 },
      { item_code: 'food_001', item_name: '美食券', item_type: 'consumable', qty: 2 },
      { item_code: 'stress_relief_001', item_name: '减压香薰', item_type: 'consumable', qty: 1 },
      { item_code: 'charm_item_001', item_name: '魅力配饰', item_type: 'social', qty: 1 },
    ];
    for (const item of STARTER_ITEMS) {
      await run(
        `INSERT INTO inventory_items (id, character_id, item_code, item_name, item_type, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nanoid(), newId, item.item_code, item.item_name, item.item_type, item.qty, now, now]
      );
    }

    // Base NPC relations — multiple NPCs with different starting favorability
    // to create a more dynamic social environment from birth
    const BASE_NPCS = [
      { npc_id: 'coworker_01', favorability: 0, stage: 'stranger' },
      { npc_id: 'friend_01', favorability: 0, stage: 'stranger' },
      { npc_id: 'neighbor_01', favorability: 5, stage: 'stranger' },
      { npc_id: 'classmate_01', favorability: 0, stage: 'stranger' },
      { npc_id: 'mentor_01', favorability: -5, stage: 'hostile' },
      { npc_id: 'partner_01', favorability: -10, stage: 'hostile' },
      { npc_id: 'rival_01', favorability: -5, stage: 'hostile' },
    ];
    for (const { npc_id, favorability, stage } of BASE_NPCS) {
      await run(
        `INSERT INTO npc_relations (id, character_id, npc_id, favorability, relationship_stage, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [nanoid(), newId, npc_id, favorability, stage, now]
      );
    }

    // Create initial quarter log
    await run(
      `INSERT INTO quarter_logs (id, character_id, quarter_number, age_years, life_stage, mood, health, stress, money, charm, intelligence, job, job_level, event_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), newId, 0, 0, '婴幼儿期', stats.mood, stats.health, stats.stress, stats.money, stats.charm, stats.intelligence,
        'unemployed', 'entry', '一个新生命诞生了。', now]
    );

    return res.json({
      code: 200, message: 'ok',
      data: {
        newCharacterId: newId,
        name: `${old.name || '玩家'}·第${generation}世`,
        generation,
        inheritKey: inheritKey || null,
        familyBackground: bgKey,
        initialStats: stats,
      },
    });
  } catch (err) {
    console.error('[life/reincarnate]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// GET /api/life/events-pool-info — debug endpoint for event counts
router.get('/events-pool-info', async (req, res) => {
  const { getAllStageEventCounts } = require('../services/eventContentService');
  return res.json({ code: 200, message: 'ok', data: getAllStageEventCounts() });
});

// POST /api/life/custom-event — accept external LLM or player-generated event
router.post('/custom-event', async (req, res) => {
  const { characterId, event_text, category, options, auto_resolve } = req.body || {};
  if (!characterId || !event_text) {
    return res.status(400).json({ code: 400, message: 'characterId and event_text required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const now = new Date().toISOString();
    const eventCode = `custom_${Date.now()}`;
    const eventCategory = category || 'fate';

    // If no options provided, auto-apply the event
    if (!options || !Array.isArray(options) || options.length === 0 || auto_resolve) {
      const delta = req.body.status_change || {};
      const nextStats = clampStatus(character, delta);

      await run(
        `UPDATE characters SET mood=?, health=?, stress=?, money=?, charm=?, intelligence=?, updated_at=? WHERE id=?`,
        [nextStats.mood, nextStats.health, nextStats.stress, nextStats.money, nextStats.charm, nextStats.intelligence, now, characterId]
      );

      // Update latest quarter log
      await run(
        `UPDATE quarter_logs SET event_text=?, event_code=?, player_choice=?, result_text=? WHERE character_id=? AND quarter_number=?`,
        [event_text, eventCode, '(自定义事件)', req.body.result_text || event_text, characterId, character.quarters_lived || 0]
      );

      return res.json({
        code: 200, message: 'ok',
        data: {
          event_code: eventCode,
          category: eventCategory,
          event_text,
          applied: true,
          statSnapshot: nextStats,
        },
      });
    }

    // Otherwise, return the event for the player to choose (like a normal event)
    const parsedOptions = options.map((op, idx) => ({
      option: op.option || `选项${idx + 1}`,
      result: op.result || '',
      status_change: op.status_change || {},
    }));

    return res.json({
      code: 200, message: 'ok',
      data: {
        event_code: eventCode,
        category: eventCategory,
        event_text,
        options: parsedOptions,
        is_custom: true,
        applied: false,
      },
    });
  } catch (err) {
    console.error('[life/custom-event]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

// GET /api/life/llm-context — provide character state context for external LLM
router.get('/llm-context', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) {
    return res.status(400).json({ code: 400, message: 'characterId required', data: null });
  }
  try {
    const character = await get(`SELECT * FROM characters WHERE id = ?`, [characterId]);
    if (!character) {
      return res.status(400).json({ code: 400, message: 'character not found', data: null });
    }

    const recentLogs = await all(
      `SELECT * FROM quarter_logs WHERE character_id = ? ORDER BY quarter_number DESC LIMIT 10`,
      [characterId]
    );

    // Build a structured context object suitable for LLM prompting
    const context = {
      character: {
        name: character.name,
        age: character.age,
        gender: character.gender,
        personality: character.personality,
        life_stage: character.life_stage,
        generation: character.generation || 1,
        quarters_lived: character.quarters_lived || 0,
        is_alive: !!character.is_alive,
      },
      current_stats: {
        mood: character.mood,
        health: character.health,
        stress: character.stress,
        money: character.money,
        charm: character.charm,
        intelligence: character.intelligence,
      },
      career: {
        job: character.job || 'unemployed',
        job_level: character.job_level || 'entry',
      },
      recent_events: (recentLogs || []).map(l => ({
        quarter: l.quarter_number,
        age: l.age_years,
        stage: l.life_stage,
        event: l.event_text,
        choice: l.player_choice,
        result: l.result_text,
      })),
      suggested_event_format: {
        description: '请根据以上角色状态生成一个符合当前人生阶段的随机事件。返回JSON格式。',
        schema: {
          event_text: '事件描述文本（100字以内）',
          category: 'fate|daily|relation|career|health|emotional|education|family',
          options: [
            {
              option: '选项文本（15字以内）',
              result: '选择后的结果描述（50字以内）',
              status_change: { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 },
            },
          ],
        },
      },
    };

    return res.json({ code: 200, message: 'ok', data: context });
  } catch (err) {
    console.error('[life/llm-context]', err);
    return res.status(500).json({ code: 500, message: 'db error', data: null });
  }
});

module.exports = router;
