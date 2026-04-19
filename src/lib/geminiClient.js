// @ts-nocheck
// Gemini client for Orbis — illegal-fishing impact summaries + chat assistant.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`;

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
    `- Dark vessels detected: ${h.vessel_count}`,
    `- DBSCAN density score: ${h.density_score}`,
    `- Severity: ${h.severity}`,
    `- Avg SAR confidence: ${h.avg_confidence ?? 'n/a'}`,
    `- Nearest MPA: ${h.nearest_mpa ?? 'none'} (${h.proximity_to_mpa_km} km, inside=${!!h.in_mpa})`,
    `- Distance to coast: ${h.proximity_to_coast_km} km`,
    `- Coordinates: ${h.latitude?.toFixed?.(3) ?? '?'}, ${h.longitude?.toFixed?.(3) ?? '?'}`,
  ].join('\n');
}

function buildTemplateImpact(h) {
  const catchEst = Math.round((h?.vessel_count || 3) * 4.2 * 24);
  const mpaLine = h?.in_mpa
    ? `Activity inside ${h?.nearest_mpa || 'a protected area'} compounds the damage — MPAs concentrate spawning biomass and fragile benthic habitat.`
    : `Activity sits ${h?.proximity_to_mpa_km ?? '—'} km from the nearest MPA; spill-over effects on protected populations are plausible.`;
  return `## Estimated Illegal Catch
Roughly **${catchEst} tonnes/day** of un-reported catch if the ${h?.vessel_count || 'detected'} dark vessels are operating as trawlers. This figure is indicative only; true volume depends on vessel class and gear.

## Ecosystem Impact
${mpaLine} Loss of top predators and bycatch of non-target species are the most likely consequences, with cascading effects on the food web.

## Economic Impact on Local Communities
Unreported landings displace legal catch revenue and erode the tax base that funds local fisheries management. Small-scale fishers nearby typically lose 10–25% of projected seasonal income when persistent dark-vessel activity goes unchecked.`;
}

export async function generateImpactSummary(hotspot) {
  const prompt = `You are an ocean-intelligence analyst writing for a marine enforcement audience. Produce a concise environmental-impact brief for the following illegal fishing hotspot.

HOTSPOT CONTEXT:
${hotspotContextBlock(hotspot)}

Write exactly three markdown sections — no preamble, no closing remarks:
## Estimated Illegal Catch
(2–3 sentences with a rough tonnage range and the assumptions behind it)

## Ecosystem Impact
(2–3 sentences on biodiversity loss, bycatch, and MPA / habitat consequences)

## Economic Impact on Local Communities
(2–3 sentences on lost revenue, displaced small-scale fishers, and tax-base effects)

Be specific, plain-language, and quantitative where reasonable. Do not use bullet points inside sections.`;

  try {
    const text = await callGemini(prompt, { temperature: 0.4, maxTokens: 700 });
    return text.trim() || buildTemplateImpact(hotspot);
  } catch (err) {
    if (err.message === 'NO_API_KEY') return buildTemplateImpact(hotspot);
    console.error('[geminiClient] impact summary error:', err);
    return buildTemplateImpact(hotspot);
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
**Yellowfin Tuna** — High risk. A prime target for dark-vessel fleets in open water; population already stressed by overfishing.
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

export async function generateSpeciesImpact(hotspot) {
  const score = computePressureScore(hotspot);

  const prompt = `You are a marine ecologist analysing the impact of illegal fishing on local fish populations. Use the hotspot data below to identify species at risk and project population trends in plain English — no scientific jargon.

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
1–2 sentences on how long populations would take to recover if illegal fishing stopped today.

Keep all language plain and accessible to a non-scientist reader.`;

  try {
    const text = await callGemini(prompt, { temperature: 0.4, maxTokens: 900 });
    return { score, markdown: text.trim() || buildTemplateForecast(hotspot).markdown };
  } catch (err) {
    if (err.message === 'NO_API_KEY') return buildTemplateForecast(hotspot);
    console.error('[geminiClient] species impact error:', err);
    return buildTemplateForecast(hotspot);
  }
}

export async function askAssistant({ question, hotspot }) {
  const prompt = `You are Orbis AI, a plain-language marine-intelligence assistant. Answer questions about illegal fishing, dark vessels, SAR detections, MPAs, and environmental impact. Keep answers under 150 words. Use short paragraphs or a tight bullet list where useful.

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
