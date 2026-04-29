import axios from 'axios';
import { GameEngine } from './gameEngine';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

// Track whether backend is reachable
let backendAvailable = true;
let backendChecked = false;
let lastBackendCheckAt = 0;
let offlineLogged = false;
const BACKEND_RECHECK_MS = 30_000;

function markBackendOffline() {
  backendAvailable = false;
  backendChecked = true;
  lastBackendCheckAt = Date.now();
  if (!offlineLogged) {
    console.log('[api] 后端不可用，使用本地游戏引擎。');
    offlineLogged = true;
  }
}

function markBackendOnline() {
  backendAvailable = true;
  backendChecked = true;
  lastBackendCheckAt = Date.now();
  offlineLogged = false;
}

function isBackendUnavailableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true;
  // No HTTP response typically means CORS/network/timeout/DNS issues.
  if (!error.response) return true;
  const status = Number(error.response.status || 0);
  return status >= 500;
}

async function checkBackend(): Promise<boolean> {
  const now = Date.now();
  if (backendChecked && now - lastBackendCheckAt < BACKEND_RECHECK_MS) return backendAvailable;
  try {
    await api.get('/health', {
      timeout: 6000,
      withCredentials: false,
      headers: { 'Cache-Control': 'no-cache' },
    });
    markBackendOnline();
  } catch {
    markBackendOffline();
  }
  return backendAvailable;
}

// Helper: try backend, fall back to local engine or graceful empty
async function withFallback<T>(backendCall: () => Promise<T>, fallbackCall: () => T): Promise<T> {
  if (!(await checkBackend())) return fallbackCall();
  try {
    return await backendCall();
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      markBackendOffline();
    } else {
      // 4xx is treated as backend reachable business error; keep connectivity online.
      markBackendOnline();
    }
    return fallbackCall();
  }
}

// ── 角色 API ──

export async function createCharacter(payload: { name: string; gender?: string; avatar?: string; personality?: string; familyBackground?: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/character/create', payload); return r.data; },
    () => GameEngine.createCharacter(payload),
  );
}

export async function getStatus(characterId: string) {
  return withFallback(
    async () => { const r = await api.get('/api/character/status', { params: { characterId } }); return r.data; },
    () => GameEngine.getStatus(characterId),
  );
}

export async function generateEnding(payload: { characterId: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/character/ending', payload); return r.data; },
    () => ({ code: 200, data: { ending: { title: '离线结局', description: '后端不可用，请在设置中连接后端服务。' } } }),
  );
}

export async function restartLife(payload: { characterId: string; inheritKey: 'money' | 'intelligence' | 'charm' | 'mood' | 'health' }) {
  return withFallback(
    async () => { const r = await api.post('/api/character/restart', payload); return r.data; },
    () => GameEngine.reincarnate(payload.characterId, payload.inheritKey),
  );
}

export async function listEndings(characterId: string) {
  return withFallback(
    async () => { const r = await api.get('/api/character/endings', { params: { characterId } }); return r.data; },
    () => ({ code: 200, data: [] }),
  );
}

// ── 动作 API（遗留，保留向后兼容） ──

export async function doAction(payload: { characterId: string; actionType: 'work' | 'social' | 'leisure' | 'study' | 'free' }) {
  return withFallback(
    async () => { const r = await api.post('/api/action/do', payload); return r.data; },
    () => ({ code: 200, data: { message: '离线模式：请使用时光推进系统。' } }),
  );
}

export async function getRandomEvent(characterId: string) {
  return withFallback(
    async () => { const r = await api.get('/api/event/random', { params: { characterId } }); return r.data; },
    () => ({ code: 200, data: null }),
  );
}

export async function chooseEvent(payload: { characterId: string; eventId: string; optionIndex: number }) {
  return withFallback(
    async () => { const r = await api.post('/api/event/choose', payload); return r.data; },
    () => ({ code: 200, data: null }),
  );
}

// ── NPC API ──

export async function listNpcs(characterId: string) {
  return withFallback(
    async () => { const r = await api.get('/api/npc/list', { params: { characterId } }); return r.data; },
    () => ({ code: 200, data: [] }),
  );
}

export async function chatNpc(payload: { characterId: string; npcId: string; message: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/npc/chat', payload); return r.data; },
    () => ({ code: 200, data: { reply: '（离线模式无法对话）' } }),
  );
}

export async function giftNpc(payload: { characterId: string; npcId: string; itemId: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/npc/gift', payload); return r.data; },
    () => ({ code: 200, data: { message: '离线模式：送礼功能暂不可用。' } }),
  );
}

export async function repairNpc(payload: { characterId: string; npcId: string; method: 'apology' | 'help' | 'talk' }) {
  return withFallback(
    async () => { const r = await api.post('/api/npc/repair', payload); return r.data; },
    () => ({ code: 200, data: { message: '离线模式：关系修复暂不可用。' } }),
  );
}

// ── 道具 API ──

export async function useItem(payload: { characterId: string; itemId: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/action/use-item', payload); return r.data; },
    () => ({ code: 200, data: { message: '离线模式：物品使用暂不可用。' } }),
  );
}

// ── 职业 API ──

export async function getCareerInfo(characterId: string) {
  return withFallback(
    async () => { const r = await api.get('/api/career/info', { params: { characterId } }); return r.data; },
    () => ({ code: 200, data: { job: 'unemployed', level: 'entry', careerEvents: [] } }),
  );
}

export async function switchCareer(payload: { characterId: string; job: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/career/switch', payload); return r.data; },
    () => ({ code: 200, data: { message: '离线模式：职业切换暂不可用。' } }),
  );
}

export async function runCareerExam(payload: { characterId: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/career/exam', payload); return r.data; },
    () => ({ code: 200, data: { message: '离线模式：职业考试暂不可用。' } }),
  );
}

// ── 人生系统 API ──

export async function advanceQuarter(payload: { characterId: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/life/advance', payload); return r.data; },
    () => GameEngine.advanceQuarter(payload.characterId),
  );
}

export async function resolveEvent(payload: { characterId: string; quarterNumber: number; eventCode: string; optionIndex: number }) {
  return withFallback(
    async () => { const r = await api.post('/api/life/resolve-event', payload); return r.data; },
    () => GameEngine.resolveEvent(payload.characterId, payload.quarterNumber, payload.eventCode, payload.optionIndex),
  );
}

export async function getTimeline(characterId: string, limit = 40, offset = 0) {
  return withFallback(
    async () => { const r = await api.get('/api/life/timeline', { params: { characterId, limit, offset } }); return r.data; },
    () => GameEngine.getTimeline(characterId, limit, offset),
  );
}

export async function generateLifeReview(payload: { characterId: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/life/review', payload); return r.data; },
    () => GameEngine.generateReview(payload.characterId),
  );
}

export async function getLifeReviews(characterId?: string) {
  return withFallback(
    async () => { const r = await api.get('/api/life/reviews', { params: characterId ? { characterId } : {} }); return r.data; },
    () => GameEngine.getReviews(characterId),
  );
}

export async function reincarnate(payload: { characterId: string; inheritKey?: string; familyBackground?: string }) {
  return withFallback(
    async () => { const r = await api.post('/api/life/reincarnate', payload); return r.data; },
    () => GameEngine.reincarnate(payload.characterId, payload.inheritKey, payload.familyBackground),
  );
}

// ── 大语言模型 / 自定义事件 API ──

export interface CustomEventOption {
  option: string;
  result: string;
  status_change?: Record<string, number>;
}

export async function submitCustomEvent(payload: {
  characterId: string;
  event_text: string;
  category?: string;
  options?: CustomEventOption[];
  auto_resolve?: boolean;
  status_change?: Record<string, number>;
  result_text?: string;
}) {
  return withFallback(
    async () => { const r = await api.post('/api/life/custom-event', payload); return r.data; },
    () => {
      // Client-side custom event: apply directly to character
      const charData = GameEngine.getStatus(payload.characterId);
      const char = (charData as any)?.data?.character;
      if (!char) return { code: 400, data: { message: '角色未找到' } };

      const eventCode = 'custom_' + Date.now();
      if (payload.auto_resolve || !payload.options?.length) {
        // Auto-apply status change
        const delta = payload.status_change || {};
        const chars = JSON.parse(localStorage.getItem('game_characters') || '{}');
        const c = chars[payload.characterId];
        if (c) {
          if (delta.mood) c.mood = Math.min(100, Math.max(0, c.mood + delta.mood));
          if (delta.health) c.health = Math.min(100, Math.max(0, c.health + delta.health));
          if (delta.stress) c.stress = Math.min(100, Math.max(0, c.stress + delta.stress));
          if (delta.money) c.money = Math.max(0, c.money + delta.money);
          if (delta.charm) c.charm = Math.min(100, Math.max(0, c.charm + delta.charm));
          if (delta.intelligence) c.intelligence = Math.min(100, Math.max(0, c.intelligence + delta.intelligence));
          c.updated_at = new Date().toISOString();
          localStorage.setItem('game_characters', JSON.stringify(chars));
        }
        return { code: 200, data: { applied: true, event_code: eventCode, event_text: payload.event_text } };
      }
      // Return as pending event for player to choose
      return {
        code: 200,
        data: {
          event_code: eventCode,
          category: payload.category || 'custom',
          event_text: payload.event_text,
          options: payload.options,
          applied: false,
        },
      };
    },
  );
}

export async function getLlmContext(characterId: string) {
  return withFallback(
    async () => { const r = await api.get('/api/life/llm-context', { params: { characterId } }); return r.data; },
    () => {
      const charData = GameEngine.getStatus(characterId);
      const char = (charData as any)?.data?.character;
      if (!char) return { code: 400, data: null };
      return {
        code: 200,
        data: {
          character: char,
          recentEvents: [],
          schema: {
            event_text: 'string - 描述这个季度发生的事件',
            category: 'string - fate|daily|social|career|health|emotional|education|family',
            options: [{ option: '选项描述', result: '结果描述', status_change: { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 } }],
            auto_resolve: 'boolean - 无选项时设为true',
            status_change: { mood: 0, health: 0, stress: 0, money: 0, charm: 0, intelligence: 0 },
            result_text: 'string - auto_resolve时的结果文本',
          },
        },
      };
    },
  );
}
