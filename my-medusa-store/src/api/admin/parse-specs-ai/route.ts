import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as { text?: string; fields?: any[] }
  const { text, fields } = body

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" })
  }

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ error: "fields schema array is required" })
  }

  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || process.env.OPENAI_ALT_MODEL || "gpt-4o-mini"

  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured in backend environment." })
  }

  // Construct a description of each field for the model to parse.
  // We include keys, labels, types, options, and units.
  const fieldsDesc = fields.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type,
    options: f.options || undefined,
    unit: f.unit || undefined
  }))

  const systemPrompt = `You are a structured technical specifications parser. Your job is to extract technical specs from the raw text provided by the user and map them to the requested keys.
Here is the schema of allowed fields to parse:
${JSON.stringify(fieldsDesc, null, 2)}

Instructions:
1. Return a JSON object whose keys EXACTLY match the field keys in the schema.
2. **Smart Select Matching for Dropdowns (type: 'select')**:
   - If the raw text mentions multiple values for a select field (e.g., multiple RAM variants like '8GB or 12GB', storage variants like '256GB / 512GB', or multiple colors/sensors), you MUST look at the allowed 'options' array in the schema.
   - Match each separate value to its exact option in the schema and join them with a comma and space. For example, if options is ["8GB RAM", "12GB RAM", "16GB RAM"] and text says "8GB/12GB RAM", output "8GB RAM, 12GB RAM". Do NOT output a single custom combined string like "8GB/12GB RAM" or "8GB, 12GB RAM" (where RAM is missing from one part), as that creates duplicate or polluted options in the template.
   - If a value is mentioned in the specs but is not in the options list, clean it up to match the format/style of existing options and output it.
3. **Boolean Parsing**: For 'boolean' type fields, return true if the feature is explicitly or implicitly present/supported (e.g. 5G bands listed implies 5G Support is true; "PTA approved" or local certification listed implies PTA Approved is true), false if explicitly absent/unsupported, or do not include the key if there is no mention or inference possible.
4. **Number & Text Parsing**: For 'number' type fields, extract the numeric value as a number. For 'text' type fields, extract the clean value.
5. **Date Parsing (CRITICAL — output ISO only)**: For 'date' type fields (e.g. launch_date / release date), output a STRICT ISO date string in "YYYY-MM-DD" format (e.g. "2026-10-01"). The admin uses an HTML date input that ONLY accepts YYYY-MM-DD — a human-readable string like "October 2026" is silently rejected and the field stays EMPTY. If only a month + year are known, use the 1st of that month ("October 2026" → "2026-10-01"); if only a year is known, use Jan 1 ("2026" → "2026-01-01"). ALWAYS extract the launch/release/availability date whenever it appears anywhere in the text — do not skip it.
6. **PUBG FPS Estimation Guide (pubg_fps field)**:
   Raw specs sheets rarely explicitly mention PUBG performance. You must estimate the PUBG FPS dropdown value ("30FPS", "40FPS", "50FPS", "60FPS", "90FPS", "120FPS") based on the device's chipset or GPU:
   - Flagships (Snapdragon 8 Elite Gen 5, Snapdragon 8 Gen 3, Apple A20 Pro, Apple A18 Pro, Google Tensor G5, Dimensity 9300/9400) -> Output "120FPS" or "90FPS".
   - Premium Mid-range (Dimensity 8500 Ultra, Dimensity 8300 Ultra, Snapdragon 8 Gen 2, Snapdragon 8 Gen 1, Snapdragon 7+ Gen 3) -> Output "90FPS".
   - Mid-range (Helio G100 Ultimate, Helio G200, Dimensity 7200, Snapdragon 7 Gen 3, Exynos 1480, Unisoc T7250) -> Output "60FPS".
   - Budget/Entry (Helio G99, Unisoc T616, lower-end Snapdragon/Helio) -> Output "40FPS" or "30FPS".
7. **Exhaustive Completion**: Fill out 100% of all fields in the schema. Do not leave fields blank or omit keys if they can be found or inferred from the text.
8. Do not invent any keys not listed in the schema. Only extract/deduce details matching facts in the raw specifications.
9. Output ONLY a valid JSON object matching this structure. No explanation, no markdown backticks, no wrap.`

  try {
    const isGpt5 = /^gpt-5/i.test(model) || /^o[0-9]/i.test(model)

    const requestBody: Record<string, any> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    }

    if (!isGpt5) {
      // gpt-4o family — supports temperature; give a generous output cap.
      requestBody.temperature = 0.1
      requestBody.max_tokens = 4000
    } else {
      // gpt-5 family (e.g. gpt-5-mini). CRITICAL: gpt-5 spends part of
      // `max_completion_tokens` on internal REASONING before it emits any
      // visible output. With the old 2000 cap + default (medium) reasoning,
      // the reasoning ate the budget and the JSON was truncated/empty —
      // that's the "errors / fills only a few specs" the user saw. Fix:
      //   • reasoning_effort:"low" — this is structured extraction, not a
      //     hard reasoning task, so keep reasoning cheap and leave the
      //     budget for the actual JSON.
      //   • a much larger cap (8000) so a big spec template fully fits.
      // gpt-5 also rejects a custom `temperature`, so we don't send one.
      requestBody.max_completion_tokens = 8000
      requestBody.reasoning_effort = "low"
    }

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!apiRes.ok) {
      const errorText = await apiRes.text()
      let cleanError = errorText
      try {
        const parsed = JSON.parse(errorText)
        if (parsed.error && parsed.error.message) {
          cleanError = parsed.error.message
        }
      } catch (e) {}
      return res.status(400).json({ error: `OpenAI API returned error: ${apiRes.status} ${apiRes.statusText} - ${cleanError}` })
    }

    const result = await apiRes.json()
    const choice = result.choices?.[0]
    const content = choice?.message?.content
    if (!content) {
      // finish_reason "length" = the model hit the token cap (usually
      // reasoning) before producing JSON. Give a clear, actionable error
      // instead of a blank failure.
      const finish = choice?.finish_reason
      return res.status(400).json({
        error:
          finish === "length"
            ? "The AI ran out of token budget before finishing. Try generating with a smaller spec template (fewer fields) or shorter source text."
            : "Empty response from OpenAI Chat Completion",
      })
    }

    // Strip accidental markdown fences (```json … ```) before parsing —
    // models occasionally wrap JSON despite response_format.
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    const specs = JSON.parse(cleaned)
    return res.json({ specs })
  } catch (err: any) {
    return res.status(400).json({ error: `Failed to parse specifications: ${err.message}` })
  }
}
