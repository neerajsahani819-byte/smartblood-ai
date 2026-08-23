import { GoogleGenAI } from '@google/genai';

const AI_DISCLAIMER =
  'AI-generated information is for prioritization assistance only. Final donor eligibility, compatibility, and donation decisions must be confirmed by qualified healthcare professionals or an authorized blood bank.';

let aiClient = null;

function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

/**
 * Generate AI non-medical insights for an emergency request.
 * Strictly uses non-sensitive data and never performs medical diagnosis.
 * @param {object} requestDetails 
 * @param {Array<object>} matches 
 * @returns {Promise<object>}
 */
export async function generateAiMatchInsights(requestDetails, matches = []) {
  const reqAgeMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(requestDetails.created_at).getTime()) / 60000)
  );

  const availableCount = matches.filter(m => m.availability).length;
  const verifiedCount = matches.filter(m => m.verified).length;
  const closestDistance = matches.length > 0 ? `${matches[0].distance_km} km` : 'None in range';

  // Build anonymous candidate summary without names or exact coordinates
  const candidateSummary = matches.slice(0, 5).map((m, idx) => ({
    rank: idx + 1,
    blood_group: m.donor_blood_group,
    distance: `${m.distance_km} km`,
    available: m.availability ? 'Yes' : 'No',
    verified: m.verified ? 'Yes' : 'No',
    score: `${m.total_score}%`
  }));

  const systemInstruction = `You are the SmartBlood AI Operational Prioritization Assistant.
Your role is to provide operational logistics guidance for hospital staff coordinating blood donor outreach.

CRITICAL RULES:
- You must NOT diagnose the patient.
- You must NOT recommend medical treatments.
- You must NOT determine biological blood compatibility or medical donor eligibility (that is handled deterministically by the backend).
- Focus purely on logistics: donor contact sequence, urgency level explanation, distance considerations, and outreach efficiency.
- Always output a valid JSON object matching the requested schema.`;

  const prompt = `Analyze this emergency blood request logistics:
- Urgency: ${requestDetails.urgency}
- Blood Group Required: ${requestDetails.blood_group}
- Component: ${requestDetails.component}
- Units Required: ${requestDetails.units_required}
- Elapsed Time: ${reqAgeMinutes} minutes
- Total Compatible Candidates in Registry: ${matches.length}
- Immediately Available Candidates: ${availableCount}
- Verified Donors: ${verifiedCount}
- Closest Candidate Distance: ${closestDistance}

Top Anonymized Candidates:
${JSON.stringify(candidateSummary, null, 2)}

Provide an operational outreach plan as a JSON object with keys:
- "priority_level": string (e.g. "CRITICAL EMERGENCY" | "URGENT LOGISTICS" | "STANDARD DISPATCH")
- "summary": string (1-2 sentences summarizing donor density and reachability)
- "contact_strategy": string (recommended notification wave or sequence, e.g. "Contact top 3 closest available donors in Wave 1")
- "urgency_rationale": string (why this request is ranked at this urgency level from a supply perspective)
- "estimated_response_window": string (e.g. "15-30 minutes recommended response window")
- "key_considerations": array of strings (2-3 operational tips, e.g. "2 donors within 5 km can reduce transit time")`;

  const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  const ai = getAiClient();

  if (ai) {
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            source: 'gemini',
            model_used: modelName,
            priority_level: parsed.priority_level || requestDetails.urgency,
            summary: parsed.summary || 'Prioritization analysis generated based on active registry status.',
            contact_strategy: parsed.contact_strategy || 'Notify highest ranked donors first.',
            urgency_rationale: parsed.urgency_rationale || `Emergency request for ${requestDetails.units_required} unit(s) of ${requestDetails.blood_group}.`,
            estimated_response_window: parsed.estimated_response_window || '15-45 minutes',
            key_considerations: parsed.key_considerations || [
              `${availableCount} available candidate(s) detected.`,
              `Closest candidate is ${closestDistance} away.`
            ],
            available_candidates_count: availableCount,
            total_candidates_count: matches.length,
            request_age_minutes: reqAgeMinutes,
            disclaimer: AI_DISCLAIMER
          };
        }
      } catch (err) {
        // If 503 (high demand) or 429/temporary error, attempt next candidate model
        const isTransient = err.message?.includes('503') || err.message?.includes('429') || err.status === 'UNAVAILABLE';
        if (isTransient) {
          console.info(`[GeminiService] Model ${modelName} unavailable/busy, trying next candidate...`);
          continue;
        } else {
          console.warn(`[GeminiService] AI generation note with ${modelName}:`, err.message);
          break;
        }
      }
    }
  }

  // Deterministic fallback if Gemini is offline or experiencing temporary spikes
  return generateDeterministicFallback(requestDetails, matches, reqAgeMinutes, availableCount, closestDistance);
}

function generateDeterministicFallback(requestDetails, matches, reqAgeMinutes, availableCount, closestDistance) {
  const isCritical = requestDetails.urgency === 'CRITICAL';
  const isHigh = requestDetails.urgency === 'HIGH';

  let strategy = 'Broadcast notifications to top ranked available donors.';
  if (availableCount > 0) {
    strategy = `Notify top ${Math.min(3, availableCount)} closest donors immediately via rapid dispatch.`;
  } else {
    strategy = 'Expand search radius or request secondary emergency blood bank transfer.';
  }

  return {
    source: 'deterministic_engine',
    priority_level: isCritical ? 'CRITICAL EMERGENCY' : isHigh ? 'HIGH PRIORITY' : 'STANDARD LOGISTICS',
    summary: `${availableCount} available compatible donor(s) located within operational radius. Closest donor is ${closestDistance}.`,
    contact_strategy: strategy,
    urgency_rationale: `Emergency demand for ${requestDetails.units_required} unit(s) of ${requestDetails.blood_group} (${requestDetails.component}). Status: ${requestDetails.status}.`,
    estimated_response_window: isCritical ? '10-20 minutes' : '30-60 minutes',
    key_considerations: [
      `Deterministic match score considers 50% Compatibility, 20% Distance, 20% Availability, 10% Urgency.`,
      `Closest verified donor is located ${closestDistance} from facility.`,
      availableCount === 0 ? 'Warning: No immediate active donors. Consider contacting standby reserves.' : 'Sufficient initial donor pool available for wave-1 notification.'
    ],
    available_candidates_count: availableCount,
    total_candidates_count: matches.length,
    request_age_minutes: reqAgeMinutes,
    disclaimer: AI_DISCLAIMER
  };
}
