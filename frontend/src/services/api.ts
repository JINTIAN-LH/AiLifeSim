import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
});

export async function createCharacter(payload: { name: string; gender?: string; avatar?: string; personality?: string }) {
  const res = await api.post('/api/character/create', payload);
  return res.data;
}

export async function getStatus(characterId: string) {
  const res = await api.get('/api/character/status', { params: { characterId } });
  return res.data;
}

export async function doAction(payload: { characterId: string; actionType: 'work' | 'social' | 'leisure' | 'study' | 'free' }) {
  const res = await api.post('/api/action/do', payload);
  return res.data;
}

export async function getRandomEvent(characterId: string) {
  const res = await api.get('/api/event/random', { params: { characterId } });
  return res.data;
}

export async function chooseEvent(payload: { characterId: string; eventId: string; optionIndex: number }) {
  const res = await api.post('/api/event/choose', payload);
  return res.data;
}

export async function listNpcs(characterId: string) {
  const res = await api.get('/api/npc/list', { params: { characterId } });
  return res.data;
}

export async function chatNpc(payload: { characterId: string; npcId: string; message: string }) {
  const res = await api.post('/api/npc/chat', payload);
  return res.data;
}

export async function giftNpc(payload: { characterId: string; npcId: string; itemId: string }) {
  const res = await api.post('/api/npc/gift', payload);
  return res.data;
}

export async function repairNpc(payload: { characterId: string; npcId: string; method: 'apology' | 'help' | 'talk' }) {
  const res = await api.post('/api/npc/repair', payload);
  return res.data;
}

export async function useItem(payload: { characterId: string; itemId: string }) {
  const res = await api.post('/api/action/use-item', payload);
  return res.data;
}

export async function getCareerInfo(characterId: string) {
  const res = await api.get('/api/career/info', { params: { characterId } });
  return res.data;
}

export async function switchCareer(payload: { characterId: string; job: string }) {
  const res = await api.post('/api/career/switch', payload);
  return res.data;
}

export async function runCareerExam(payload: { characterId: string }) {
  const res = await api.post('/api/career/exam', payload);
  return res.data;
}

export async function generateEnding(payload: { characterId: string }) {
  const res = await api.post('/api/character/ending', payload);
  return res.data;
}

export async function restartLife(payload: {
  characterId: string;
  inheritKey: 'money' | 'intelligence' | 'charm' | 'mood' | 'health';
}) {
  const res = await api.post('/api/character/restart', payload);
  return res.data;
}

export async function listEndings(characterId: string) {
  const res = await api.get('/api/character/endings', { params: { characterId } });
  return res.data;
}
