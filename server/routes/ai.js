const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
require('dotenv').config();
const { CONFIG } = require('../config.js');

const OPENAI_KEY = process.env.OPENAI_API_KEY || CONFIG.OPENAI?.API_KEY;
if (!OPENAI_KEY) {
  console.warn('OPENAI_API_KEY not set - AI compute disabled');
}

const OPENAI_API = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // adjust if you prefer another model

function buildPrompt(features) {
  // Create a concise prompt that asks for JSON only.
  // We're explicit about price units: assume on-chain integer unit (e.g., price scaled by 1e8).
  return `
You are an assistant producing a single JSON object (no surrounding text).
Given a list of trade intents with fields {requestId, side, amount, limitPrice, marketId}, compute a fair uniform clearing price that minimizes imbalance between buys and sells.

Input:
${JSON.stringify(features)}

Return exactly:
{
  "clearingPrice": "<integer_as_string>",  // integer price in the same units as limitPrice (no decimals)
  "confidence": <float_between_0_and_1>,
  "explanation": "<one-line explanation>"
}

Do not return any other text. If you cannot compute, return confidence 0 and clearingPrice "0".
`;
}

router.post('/compute', async (req, res) => {
  try {
    if (!OPENAI_KEY) return res.status(503).json({ error: 'AI not configured' });

    const features = req.body;
    if (!features || !Array.isArray(features.intents)) {
      return res.status(400).json({ error: 'Invalid payload, requires intents array' });
    }

    // Build prompt
    const prompt = buildPrompt(features);

    // Prepare ChatCompletion request — using messages style
    const body = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a precise numeric assistant. Reply only with JSON." },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.0,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.AI.TIMEOUT_MS || 10000);

    const resp = await fetch(`${OPENAI_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `OpenAI error: ${text}` });
    }

    // The response may contain assistant text; parse out JSON string
    let parsedJson = null;
    // Try to parse the content as JSON robustly.
    try {
      const j = JSON.parse(text);
      // In ChatCompletions the JSON has structure choices[].message.content
      const content = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : null;
      if (content) {
        parsedJson = JSON.parse(content);
      } else {
        // fallback: raw text may be JSON already
        parsedJson = j;
      }
    } catch (e) {
      // fallback: try to extract JSON substring from raw text (best-effort)
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (ex) {
        parsedJson = null;
      }
    }

    if (!parsedJson) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: text });
    }

    // validate shape
    if (!parsedJson.clearingPrice || typeof parsedJson.confidence === 'undefined') {
      return res.status(500).json({ error: 'AI response missing fields', parsed: parsedJson });
    }

    // Normalize: return string price and numeric confidence
    return res.json({
      clearingPrice: String(parsedJson.clearingPrice),
      confidence: Number(parsedJson.confidence),
      explanation: parsedJson.explanation || ''
    });
  } catch (err) {
    console.error('AI compute error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;


// const express = require('express')
// const router = express.Router()
// const { CONFIG } = require('../config.js')

// // POST /api/ai/compute
// router.post('/compute', async (req, res) => {
//   try {
//     const upstream = CONFIG.AI.UPSTREAM_URL
//     if (!upstream) return res.status(501).json({ error: 'AI upstream not configured' })

//     const controller = new AbortController()
//     const timeout = setTimeout(() => controller.abort(), CONFIG.AI.TIMEOUT_MS)

//     const r = await fetch(upstream, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(req.body),
//       signal: controller.signal
//     })

//     clearTimeout(timeout)
//     const text = await r.text()
//     if (!r.ok) return res.status(r.status).json({ error: `Upstream error ${r.status}`, body: text })
//     try {
//       const j = JSON.parse(text)
//       return res.json(j)
//     } catch {
//       return res.type('application/json').send(text)
//     }
//   } catch (e) {
//     return res.status(504).json({ error: e.message || 'AI compute timeout' })
//   }
// })

// module.exports = router


