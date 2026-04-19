// @ts-nocheck
// Local stand-in for the base44 SDK.
//
// - Entities are persisted in localStorage so list/create/update/bulkCreate
//   behave like a tiny database for the demo.
// - Auth is stubbed with a demo admin user; swap in Auth0 later if needed.
// - integrations.Core.InvokeLLM calls Gemini directly from the browser when
//   VITE_GEMINI_API_KEY is set; otherwise it returns a canned offline reply.
//
// All API keys are read from import.meta.env (see .env.example).

const STORAGE_PREFIX = 'orbis:entity:';

const readCollection = (name) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCollection = (name, rows) => {
  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(rows));
};

const makeId = () =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const stamp = () => new Date().toISOString();

const sortRows = (rows, sortSpec) => {
  if (!sortSpec) return rows;
  const desc = sortSpec.startsWith('-');
  const key = desc ? sortSpec.slice(1) : sortSpec;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av < bv ? -1 : 1) * (desc ? -1 : 1);
  });
};

const makeEntity = (name) => ({
  async list(sortSpec, limit) {
    const rows = sortRows(readCollection(name), sortSpec);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async get(id) {
    return readCollection(name).find((r) => r.id === id) ?? null;
  },
  async create(data) {
    const rows = readCollection(name);
    const row = { id: makeId(), created_date: stamp(), updated_date: stamp(), ...data };
    rows.push(row);
    writeCollection(name, rows);
    return row;
  },
  async bulkCreate(items) {
    const rows = readCollection(name);
    const created = items.map((item) => ({
      id: makeId(),
      created_date: stamp(),
      updated_date: stamp(),
      ...item,
    }));
    writeCollection(name, [...rows, ...created]);
    return created;
  },
  async update(id, patch) {
    const rows = readCollection(name);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`${name} ${id} not found`);
    rows[idx] = { ...rows[idx], ...patch, updated_date: stamp() };
    writeCollection(name, rows);
    return rows[idx];
  },
  async delete(id) {
    writeCollection(name, readCollection(name).filter((r) => r.id !== id));
    return { ok: true };
  },
});

const demoUser = {
  id: 'demo-admin',
  email: 'demo@oceanguard.local',
  full_name: 'Demo Analyst',
  role: 'admin',
  clearance: 'top_secret',
};

// --- Gemini integration -----------------------------------------------------

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const extractJsonObject = (text) => {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try { return JSON.parse(candidate.slice(first, last + 1)); } catch { /* noop */ }
    }
    return null;
  }
};

const cannedReport = (region) => ({
  title: `Impact Report: ${region?.name ?? 'Region'}`,
  summary: `Automated offline summary for ${region?.name ?? 'this region'}. Add a Gemini API key in .env to enable live analysis.`,
  content: `## Executive Summary\n\nLocally-generated placeholder report. Set VITE_GEMINI_API_KEY in .env to produce real analyses.\n\n## Key Risk Factors\n\n- Fishing intensity, ecosystem fragility, and anomalous vessel counts drive the current risk score.\n\n## Recommendations\n\n1. Expand satellite monitoring cadence.\n2. Coordinate enforcement sweeps during peak activity windows.\n3. Evaluate seasonal closure zones.`,
  recommendations: [
    'Expand satellite monitoring cadence',
    'Coordinate enforcement sweeps',
    'Evaluate seasonal closure zones',
  ],
});

const cannedChat = (prompt) =>
  `**Offline AI response**\n\nNo \`VITE_GEMINI_API_KEY\` is configured, so this reply is a placeholder. Add a key to \`.env\` and restart \`npm run dev\` to get real answers.\n\n> ${prompt.split('\n').slice(-3).join(' ').slice(0, 280)}`;

const callGemini = async ({ prompt, response_json_schema }) => {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };
  if (response_json_schema) {
    body.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: response_json_schema,
    };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') ?? '';
  if (response_json_schema) {
    return extractJsonObject(text) ?? cannedReport({});
  }
  return text;
};

const invokeLLM = async ({ prompt = '', response_json_schema } = {}) => {
  if (!GEMINI_API_KEY) {
    await new Promise((r) => setTimeout(r, 200));
    if (response_json_schema) {
      const nameMatch = prompt.match(/Region:\s*(.+)/);
      return cannedReport({ name: nameMatch?.[1]?.trim() });
    }
    return cannedChat(prompt);
  }

  try {
    return await callGemini({ prompt, response_json_schema });
  } catch (err) {
    console.error('Gemini call failed, falling back to canned response:', err);
    if (response_json_schema) {
      const nameMatch = prompt.match(/Region:\s*(.+)/);
      return cannedReport({ name: nameMatch?.[1]?.trim() });
    }
    return `**AI request failed**\n\n\`\`\`\n${String(err.message || err)}\n\`\`\``;
  }
};

// --- Public SDK surface -----------------------------------------------------

export const base44 = {
  entities: {
    OceanRegion: makeEntity('OceanRegion'),
    VesselAlert: makeEntity('VesselAlert'),
    ConservationReport: makeEntity('ConservationReport'),
  },
  integrations: {
    Core: { InvokeLLM: invokeLLM },
  },
  auth: {
    async me() {
      return demoUser;
    },
    logout() {
      // no-op locally
    },
    redirectToLogin() {
      // no-op locally
    },
  },
};
