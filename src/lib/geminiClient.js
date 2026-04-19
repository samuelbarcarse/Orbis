// @ts-nocheck
// Gemini client for Orbis — illegal-fishing impact summaries + chat assistant.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

async function callGemini(prompt, { temperature = 0.3, maxTokens = 900 } = {}) {
  if (!GEMINI_API_KEY) throw new Error('NO_API_KEY');
  const res = await fetch(GEMINI_URL(GEMINI_API_KEY), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function hotspotContextBlock(h) {
  if (!h) return 'No hotspot selected.';
  return [
    `- Vessels detected in area: ${h.vessel_count}`,
    `- DBSCAN density score: ${h.density_score}`,
    `- Severity: ${h.severity}`,
    `- Avg SAR confidence: ${h.avg_confidence ?? 'n/a'}`,
    `- Nearest MPA: ${h.nearest_mpa ?? 'none'} (${h.proximity_to_mpa_km} km, inside=${!!h.in_mpa})`,
    `- Distance to coast: ${h.proximity_to_coast_km} km`,
    `- Coordinates: ${h.latitude?.toFixed?.(3) ?? '?'}, ${h.longitude?.toFixed?.(3) ?? '?'}`,
  ].join('\n');
}

function buildTemplateThreatAnalysis(h) {
  const catchEst = Math.round((h?.vessel_count || 3) * 4.2 * 24);
  const mpaLine = h?.in_mpa
    ? `Activity inside ${h?.nearest_mpa || 'a protected area'} compounds the damage — MPAs concentrate spawning biomass and fragile benthic habitat.`
    : `Activity sits ${h?.proximity_to_mpa_km ?? '—'} km from the nearest MPA; spill-over effects on protected populations are plausible.`;
  return {
    reasons: [
      {
        headline: 'High vessel density',
        detail: `${h?.vessel_count || 'Multiple'} vessels concentrated in a small zone stresses local fish populations, disrupts feeding grounds, and increases the risk of habitat damage.`,
      },
      {
        headline: h?.in_mpa ? 'Activity inside a protected area' : 'Proximity to protected waters',
        detail: mpaLine,
      },
      {
        headline: 'Cumulative ecosystem pressure',
        detail: `Dense, sustained vessel activity in one area can tip a local ecosystem past its recovery threshold — effects on the food web can persist for years even after vessels leave.`,
      },
    ],
    impact: `## Estimated Catch Impact
Roughly **${catchEst} tonnes/day** if the ${h?.vessel_count || 'detected'} vessels are operating as trawlers. This is indicative only; true volume depends on vessel class and gear type.

## Ecosystem Impact
${mpaLine} Loss of apex predators and bycatch of non-target species are the most likely consequences, with cascading effects across the food web.

## Economic Impact on Local Communities
High vessel density displaces catch from local fishing communities and strains fisheries management resources. Small-scale fishers nearby can lose 10–25% of projected seasonal income when persistent vessel pressure goes unchecked.

## Long-term Outlook
If activity continues at this intensity, localised depletion of key species is likely within 6–12 months. Full ecosystem recovery — even if pressure stops today — typically takes 5–20 years depending on species and habitat type.`,
    actions: [
      {
        title: 'Monitor vessel activity globally',
        detail: 'Global Fishing Watch lets the public track fishing vessels worldwide and flag areas of high activity to conservation organisations.',
        org: 'Global Fishing Watch',
        search: 'Global Fishing Watch map',
      },
      {
        title: 'Choose sustainable seafood',
        detail: 'Look for the MSC blue label. Certified seafood comes from fisheries independently verified to be sustainable.',
        org: 'Marine Stewardship Council',
        search: 'Marine Stewardship Council sustainable seafood',
      },
      {
        title: 'Support ocean conservation',
        detail: 'Organisations like Oceana and WWF Ocean fund research and advocacy that directly address overfishing and habitat loss.',
        org: 'Oceana · WWF Ocean',
        search: 'Oceana ocean conservation',
      },
    ],
  };
}

function extractSection(text, tag) {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseDelimitedResponse(text) {
  const reasonsRaw = extractSection(text, 'reasons');
  const impact     = extractSection(text, 'impact');
  const actionsRaw = extractSection(text, 'actions');
  if (!reasonsRaw || !impact || !actionsRaw) return null;

  const reasons = reasonsRaw.split(/\n---\n/).map((block) => {
    const h = block.match(/headline:\s*(.+)/i)?.[1]?.trim() ?? '';
    const d = block.match(/detail:\s*([\s\S]+)/i)?.[1]?.trim() ?? '';
    return h ? { headline: h, detail: d } : null;
  }).filter(Boolean);

  const actions = actionsRaw.split(/\n---\n/).map((block) => {
    const t  = block.match(/title:\s*(.+)/i)?.[1]?.trim() ?? '';
    const d  = block.match(/detail:\s*(.+)/i)?.[1]?.trim() ?? '';
    const o  = block.match(/org:\s*(.+)/i)?.[1]?.trim() ?? '';
    const s  = block.match(/search:\s*(.+)/i)?.[1]?.trim() ?? '';
    return t ? { title: t, detail: d, org: o, search: s } : null;
  }).filter(Boolean);

  return reasons.length && actions.length ? { reasons, impact, actions } : null;
}

// Persists for the browser session — re-clicking the same hotspot returns instantly.
// Only successful Gemini results are stored; fallbacks are never cached.
const _threatCache = new Map();

export function getCachedThreatAnalysis(id) {
  return _threatCache.get(String(id)) ?? null;
}

async function fetchFullHotspot(id, token) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/hotspots/${id}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function vesselListBlock(detections) {
  if (!detections?.length) return 'No individual vessel data available.';
  const rows = detections.slice(0, 20).map((d, i) => {
    const name = d.vessel_name && d.vessel_name !== 'Unknown' ? d.vessel_name : `Vessel ${i + 1}`;
    const mmsi = d.mmsi ? ` (MMSI: ${d.mmsi})` : '';
    const ts = d.timestamp ? ` — last seen ${new Date(d.timestamp).toUTCString()}` : '';
    const pos = `${(+d.latitude).toFixed(3)}°, ${(+d.longitude).toFixed(3)}°`;
    return `- ${name}${mmsi} at ${pos}${ts}`;
  });
  if (detections.length > 20) rows.push(`…and ${detections.length - 20} more vessels`);
  return rows.join('\n');
}

export async function generateThreatAnalysis(hotspot, token) {
  const cacheKey = String(hotspot?.id);
  if (_threatCache.has(cacheKey)) return _threatCache.get(cacheKey);

  const full = await fetchFullHotspot(hotspot.id, token);
  const detections = full?.detections ?? [];

  const timeRange = full?.time_range?.from && full?.time_range?.to
    ? `${new Date(full.time_range.from).toDateString()} – ${new Date(full.time_range.to).toDateString()}`
    : 'unknown';

  const prompt = `You are a marine ecologist analysing a vessel activity hotspot for a conservation audience.

CLUSTER SUMMARY:
${hotspotContextBlock(hotspot)}
- Activity time range: ${timeRange}

INDIVIDUAL VESSELS IN THIS CLUSTER (${detections.length} total):
${vesselListBlock(detections)}

Reply using EXACTLY this structure with the XML tags and --- separators. No other text outside the tags.

<reasons>
headline: [unique headline naming the specific ocean region]
detail: [2 sentences — concrete wildlife consequence specific to THIS location and vessel mix]
---
headline: [second reason]
detail: [2 sentences]
---
headline: [third reason]
detail: [2 sentences]
</reasons>

<impact>
## Estimated Catch Impact
[2–3 sentences. Base estimate on actual vessel names/flags — reason from what fishery is typical here, not a fixed formula. Be explicit about your assumptions.]

## Ecosystem Impact
[3–4 sentences. Name the 2–3 specific species or habitats most at risk at these exact coordinates. Explain why they are vulnerable here — no generic "apex predator" filler.]

## Economic Impact on Local Communities
[2–3 sentences. Name the actual nearest coastal nations or port cities. Describe the specific livelihoods affected.]

## Long-term Outlook
[2–3 sentences. Concrete projection for this cluster's size and location. Recovery timeline for the species you named above.]
</impact>

<actions>
title: [action title tailored to this region]
detail: [1–2 sentences on why this helps specifically here, referencing vessel flags/names if relevant]
org: [specific organisation name]
search: [Google-searchable string to find org]
---
title: [second action]
detail: [...]
org: [...]
search: [...]
---
title: [third action]
detail: [...]
org: [...]
search: [...]
</actions>`;

  try {
    const text = await callGemini(prompt, { temperature: 0.4, maxTokens: 1600 });
    const parsed = parseDelimitedResponse(text);

    if (parsed) {
      _threatCache.set(cacheKey, parsed);
      return parsed;
    }

    console.warn('[geminiClient] delimiter parse failed, raw text:', text?.slice(0, 200));
    return buildTemplateThreatAnalysis(hotspot); // not cached — will retry
  } catch (err) {
    if (err.message === 'NO_API_KEY') return buildTemplateThreatAnalysis(hotspot);
    console.error('[geminiClient] threat analysis error:', err.message);
    return buildTemplateThreatAnalysis(hotspot); // not cached — will retry
  }
}

// ── Species Forecast ─────────────────────────────────────────────────────────

export function computePressureScore(h) {
  const vesselFactor  = Math.min((h?.vessel_count || 0) / 15, 1) * 40;
  const mpaFactor     = h?.in_mpa
    ? 30
    : Math.max(0, (50 - (h?.proximity_to_mpa_km || 50)) / 50) * 20;
  const densityFactor = Math.min((h?.density_score || 0) / 2, 1) * 20;
  const severityMap   = { high: 10, medium: 5, low: 2 };
  const severityFactor = severityMap[h?.severity] ?? 5;
  return Math.round(vesselFactor + mpaFactor + densityFactor + severityFactor);
}

function buildTemplateForecast(h) {
  const score = computePressureScore(h);
  return {
    score,
    markdown: `## Species at Risk
**Yellowfin Tuna** — High risk. A prime target for fishing fleets in open water; population already stressed by heavy vessel pressure.
**Bigeye Tuna** — High risk. Deep-water feeding patterns make them especially vulnerable to undetected long-line activity.
**Shark (mixed species)** — High risk. Finning bycatch is common in unmonitored fleets; slow reproduction means populations recover over decades.
**Mahi-Mahi** — Medium risk. Fast-breeding but heavily targeted as bycatch in tuna operations.

## 1-Year Projection
If this activity continues at current intensity, localised depletion of commercially targeted species is likely within 6–12 months. Legal fishing yields in the surrounding area may drop 10–20% as fish populations shift away from the pressure zone.

## 5-Year Projection
Sustained undetected fishing pressure over five years risks a tipping point where target species can no longer reproduce at replacement rate. Cascading effects on apex predators and the broader food web are probable, with recovery timelines of 10–30 years even after fishing stops.

## Recovery Outlook
If illegal activity ceased today, partial recovery could be expected within **3–5 years** for fast-breeding species. Apex predators such as sharks and large tuna may require **15–25 years** to return to pre-depletion levels.`,
  };
}

const _speciesCache = new Map();

export function getCachedSpeciesImpact(id) {
  return _speciesCache.get(String(id)) ?? null;
}

export async function generateSpeciesImpact(hotspot) {
  const cacheKey = String(hotspot?.id);
  if (_speciesCache.has(cacheKey)) return _speciesCache.get(cacheKey);

  const score = computePressureScore(hotspot);

  const prompt = `You are a marine ecologist analysing the impact of vessel activity on local fish populations. Use the hotspot data below to identify species at risk and project population trends in plain English — no scientific jargon.

HOTSPOT DATA:
${hotspotContextBlock(hotspot)}
ECOSYSTEM PRESSURE SCORE (0–100): ${score}

Write exactly four markdown sections. No preamble, no closing remarks:

## Species at Risk
List 4 specific species likely present in this ocean region (based on coordinates). For each: name, risk level (High / Medium / Low), and one sentence on why they are vulnerable here.

## 1-Year Projection
2–3 sentences on what happens to local populations over the next 12 months if this activity continues unchecked.

## 5-Year Projection
2–3 sentences on the long-term population trend and any ecological tipping points that may be crossed.

## Recovery Outlook
1–2 sentences on how long populations would take to recover if vessel activity in this area stopped today.

Keep all language plain and accessible to a non-scientist reader.`;

  try {
    const text = await callGemini(prompt, { temperature: 0.4, maxTokens: 900 });
    if (text?.trim()) {
      const result = { score, markdown: text.trim() };
      _speciesCache.set(cacheKey, result);
      return result;
    }
    return buildTemplateForecast(hotspot); // not cached — will retry
  } catch (err) {
    if (err.message === 'NO_API_KEY') return buildTemplateForecast(hotspot);
    console.error('[geminiClient] species impact error:', err.message);
    return buildTemplateForecast(hotspot); // not cached — will retry
  }
}

export async function askAssistant({ question, hotspot }) {
  const prompt = `You are Orbis AI, a plain-language marine-intelligence assistant. Answer questions about vessel activity, wildlife impact, MPAs, marine ecosystems, and ocean conservation. Keep answers under 150 words. Use short paragraphs or a tight bullet list where useful.

CURRENT HOTSPOT CONTEXT (may be empty):
${hotspotContextBlock(hotspot)}

USER QUESTION:
${question}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.5, maxTokens: 500 });
    return text.trim() || "I couldn't generate a response. Try selecting a hotspot on the globe first.";
  } catch (err) {
    if (err.message === 'NO_API_KEY') {
      return "The Gemini API key isn't configured. Set `VITE_GEMINI_API_KEY` in your environment to enable the assistant.";
    }
    throw err;
  }
}
