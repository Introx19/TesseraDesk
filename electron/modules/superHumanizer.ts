import { ipcMain } from 'electron';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { GoogleGenAI } = require('@google/genai');

let ai: any = null;
let currentAiKey = '';

export function initSuperHumanizer() {
  ipcMain.on('update-ai-key', (event, key) => {
      currentAiKey = key;
      if (key) {
          try {
              ai = new GoogleGenAI({ apiKey: key });
          } catch (e) {
              console.error('Failed to init AI', e);
              ai = null;
          }
      } else {
          ai = null;
      }
  });

  async function callModelWithFallback(prompt: string, preferredModel: string, useWebSearch: boolean = false, isHumanizing: boolean = false) {
    if (!ai) throw new Error('API Key not set');

    let safeModel = preferredModel || 'gemini-3.6-flash';
    if (safeModel === 'gemini-3.1-pro' || safeModel === 'gemini-1.5-pro') safeModel = 'gemini-3.1-pro-preview';
    if (safeModel === 'gemini-1.5-flash-8b') safeModel = 'gemini-3.5-flash-lite';
    if (safeModel === 'gemini-2.0-flash' || safeModel === 'gemini-2.5-flash') safeModel = 'gemini-3.6-flash';

    const modelsToTry = [
      safeModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.1-pro-preview'
    ];
    
    const uniqueModels = [...new Set(modelsToTry)];
    let lastError = null;
    const searchModes = useWebSearch ? [true, false] : [false];
    const logs: string[] = [];

    for (const withSearch of searchModes) {
      for (const model of uniqueModels) {
        try {
          const timestamp = new Date().toLocaleTimeString();
          logs.push(`[${timestamp}] 🚀 Attempting model: ${model} (Web Search: ${withSearch ? 'ON' : 'OFF'})`);
          const options: any = {
            model,
            contents: prompt,
            config: {
              temperature: isHumanizing ? 1.05 : 0.4,
              topP: 0.95,
            }
          };

          if (withSearch) {
            options.config.tools = [{ googleSearch: {} }];
          }

          const generatePromise = ai.models.generateContent(options);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Model ${model} timed out after 12s`)), 12000)
          );

          const response: any = await Promise.race([generatePromise, timeoutPromise]);
          if (response && response.text) {
            logs.push(`[${new Date().toLocaleTimeString()}] ✅ Success using: ${model}`);
            return { text: response.text, usedModel: model, logs };
          }
        } catch (error: any) {
          logs.push(`[${new Date().toLocaleTimeString()}] ❌ Failed: ${error.message}`);
          lastError = error;
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
    throw new Error(logs.join('\n') + '\n\nAll models failed to respond.');
  }

  ipcMain.handle('analyze-text', async (event, { text, context, useWebSearch }) => {
    if (!ai) return { error: 'API Key not set' };
    
    try {
      const prompt = `You are an expert AI detector, literary editor, and academic writing critic.
Analyze the following text with extreme depth and accuracy.

CRITICAL REQUIREMENT: Write the entire analysis, headings, and explanations in Russian language!

Text Context / Target Schema (Provided by author):
${context ? `"${context}"` : 'None specified (General analysis)'}

Analyze and provide:
1. 📊 **Оценка / AI Score**: Probability of AI generation vs Human authorship, with nuanced breakdown.
2. ⚠️ **Признаки ИИ / AI Patterns**: Specific clichés, robotic structural artifacts, or natural human quirks.
3. 📝 **Анализ структуры и фактов / Content & Structure Review**: Check if the text fulfills the author's stated context/schema (e.g. SEE schema, IELTS requirements, logical consistency, fact strength).
4. 💡 **Практические рекомендации / Actionable Advice**: Exactly what to refine or add to make it sound authentically human and persuasive.

Text to analyze:
${text}`;
      
      const response = await callModelWithFallback(prompt, 'gemini-3.6-flash', useWebSearch, false);
      return { success: true, result: response.text, logs: response.logs };
    } catch (error: any) {
      return { error: error.message || 'Failed to analyze text' };
    }
  });

  function sanitizeHumanizedText(text: string): string {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/^(Here is|Sure|Here's|Below is)[^\n]*\n+/i, '');
    cleaned = cleaned.replace(/(^|\n+)(First off,?\s*|To begin with,?\s*|On top of that,?\s*|To wrap it up,?\s*|In conclusion,?\s*|Moreover,?\s*|Furthermore,?\s*|Additionally,?\s*|All in all,?\s*|At the same time,?\s*)/gim, '$1');
    cleaned = cleaned.replace(/(^|\n+)(Let['’]s be honest:?\s*|Let['’]s face it:?\s*|The best part\??\s*|At its core,?\s*|Here['’]s the thing:?\s*|Here['’]s the kicker:?\s*|It['’]s important to remember that\s*|It is worth noting that\s*|At the end of the day,?\s*)/gim, '$1');
    cleaned = cleaned.replace(/\s*—\s*/g, ', ');
    cleaned = cleaned.replace(/\s*–\s*/g, '-');
    let aBitCount = 0;
    cleaned = cleaned.replace(/\ba bit\b/gi, (match) => {
      aBitCount++;
      return aBitCount <= 2 ? match : 'somewhat';
    });
    let usuallyCount = 0;
    cleaned = cleaned.replace(/\b(usually|tends to|kind of|sort of)\b/gi, (match) => {
      usuallyCount++;
      return usuallyCount <= 3 ? match : '';
    });
    cleaned = cleaned.replace(/\b(Think about [\w\s]+ for a second[,.]?)/gi, '');
    cleaned = cleaned.replace(/\b(Then the (?:nineties|eighties|seventies|sixties|forties|thirties|twenty[- ]twenties|early \d{4}s?) hit[,.]?)/gi, 'By the $1,');
    cleaned = cleaned.replace(/\b([A-Z][\w\s]+ completely changed because of this( too)?[,.]?)/gi, '');
    cleaned = cleaned.replace(/\b(All that utility comes with [\w\s]+[,.]?)/gi, '');
    cleaned = cleaned.replace(/\b(What started as [\w\s]+ (roadblock|puzzle|problem) (grew|turned|evolved) into)/gi, 'That');
    cleaned = cleaned.replace(/  +/g, ' ');
    cleaned = cleaned.replace(/^\s+/gm, '');
    return cleaned.trim();
  }

  ipcMain.handle('humanize-text', async (event, { text, style, additionalInstructions, context, useWebSearch, strictLength, model = 'gemini-3.6-flash' }) => {
    if (!ai) return { error: 'API Key not set' };

    try {
      const prompt = `You are a master ghostwriter. Your ONLY job is to rewrite the given text so it passes Sapling, Copyleaks, ZeroGPT, QuillBot, and Scribbr at 0% AI — without sounding like AI trying to fake being human.

TARGET STYLE: ${style}
AUTHOR CONTEXT: ${context ? `"${context}"` : 'None specified'}
USER DIRECTIVES: ${additionalInstructions || 'None'}
SOURCE WORD COUNT: ${text.trim().split(/\s+/).length} words.
${strictLength 
  ? "CRITICAL RULE: Your output MUST be EXACTLY the same length or longer. Do NOT summarize or cut details. Expand on ideas slightly if necessary to match the word count exactly." 
  : `Your output MUST be between ${Math.round(text.trim().split(/\s+/).length * 0.88)} and ${Math.round(text.trim().split(/\s+/).length * 1.15)} words. Count as you write.`
}

=== THE TWO THINGS DETECTORS ACTUALLY MEASURE ===
1. PERPLEXITY (word predictability): AI always picks the most statistically "safe" word.
2. BURSTINESS (sentence length variance): AI produces sentences of nearly identical length.

=== CRITICAL WARNING: "HUMAN-LIKE PADDING" IS ALSO DETECTED ===
RULE: Use natural hedges SPARINGLY — maximum 2 per entire text, only where they fit organically.
RULE: Match the register to the style. Academic style = no "I think" or "kinda". Formal essay = no slang.

=== CONVERSATIONAL ENGAGEMENT HOOKS — BANNED IN ALL STYLES ===
- "Think about [X] for a second" — banned
- "Then the nineties hit" / "Then the eighties hit" — banned (use a specific year instead)

=== GEN Z THINKING MODE (UNIVERSAL BASELINE) ===
- Start mid-thought, not at the beginning of the topic. Real people don't open with a thesis.
- Thoughts connect by feeling/association, not by logical argument chain. One thing reminds you of another.
- Circle back. Mention something from paragraph 1 again in paragraph 3, slightly differently.
- Include one moment where the thought seems to correct itself or change direction mid-sentence.
- The most important point doesn't go first or last — it's buried somewhere in the middle, almost casually.

=== STYLE-SPECIFIC RULES ===
IF style is CASUAL / CONVERSATIONAL: First person is fine, short fragments allowed.
IF style is ACADEMIC / FORMAL / SCHOOL ESSAY: NO first-person casual hedges, use academic natural variation, BURSTINESS IS MANDATORY. BANNED BUREAUCRATIC VOCABULARY.

=== UNIVERSAL RULES (ALL STYLES) ===
1. PERPLEXITY: Choose the unexpected but clear word.
2. BURSTINESS: Include at least 2 sentences between 2 and 6 words AND at least 1 sentence over 28 words.
3. NO EM DASHES (—) OR EN DASHES (–).
4. NO PARALLEL PARAGRAPH OPENERS.
5. NO SUMMARY ENDINGS.
6. BREAK THE PREDICTABLE ESSAY ORDER.
7. IDIOM DENSITY LIMIT: Maximum 2.
8. NEUTRAL HEDGE LIMIT: Maximum 2-3 total.
9. PRESERVE 100% OF ORIGINAL CONTENT AND APPROXIMATE LENGTH.
10. BAN "THESIS → SCIENCE → EXAMPLE" TEMPLATE.
11. BAN RHYTHMIC RULE-OF-THREE LISTS: Never write 3 parallel items in a row. Drop one item or interrupt the list. DO NOT OUTPUT LISTS OF 3 ITEMS.
12. NO CLINICAL VOCABULARY WITHOUT PERSONAL TRANSLATION.
13. FIRST SENTENCE AND LAST PARAGRAPH ARE THE HIGHEST-RISK ZONES.

Return ONLY the humanized text. No intro, no quotes, no commentary.

Original Text:
${text}
`;

      const rawResponse = await callModelWithFallback(prompt, model, useWebSearch, true);
      const afterSanitize = sanitizeHumanizedText(rawResponse.text);
      let combinedLogs = [...rawResponse.logs];

      const critiquePrompt = `You are an expert AI text detector and editor. You will review a humanized text for any remaining AI detection signatures, then produce a corrected version.

TEXT TO REVIEW:
"""
${afterSanitize}
"""

WHAT TO CHECK FOR (be strict):
1. Em dashes (—) or en dashes (–) anywhere in the text
2. Any "thesis → science → example" 3-step paragraph pattern
3. Any "Rule of Three" rhythmic triplet
4. First sentence starting with a universal claim or "Subject is/are..." construction
5. Last paragraph ending with a motivational summary or call to action
6. Clinical vocabulary used without sensory grounding
7. "A bit", "usually", "tends to", "kind of" appearing more than 3 times total
8. Consecutive paragraphs starting with the same grammatical pattern
9. Any sentence from this banned list appearing verbatim: "furthermore", "moreover", "in conclusion", "this demonstrates"
10. Output that is significantly shorter than the original
11. SERVICE-BRIDGE TRANSITIONS (listicle glue)
12. CINEMATIC HYPERBOLE

OUTPUT FORMAT — follow exactly:
ISSUES: [list each problem you found, one per line, or write "None" if clean]
REVISED:
[the complete corrected text — if no issues, copy the original unchanged]`;

      let finalText = afterSanitize;
      try {
        const critiqueResponse = await callModelWithFallback(critiquePrompt, 'gemini-3.6-flash', false, false);
        combinedLogs.push(...critiqueResponse.logs);
        const revisedMatch = critiqueResponse.text.match(/REVISED:\s*([\s\S]+)$/i);
        if (revisedMatch && revisedMatch[1].trim().length > 50) {
          finalText = revisedMatch[1].trim();
        }
      } catch (critiqueError: any) {
        combinedLogs.push(`[${new Date().toLocaleTimeString()}] ⚠️ Critique pass failed: ${critiqueError.message}`);
        console.warn('Pass 2 self-critique failed, using Pass 1 result');
      }

      const result = sanitizeHumanizedText(finalText);
      return { success: true, result, logs: combinedLogs };

    } catch (error: any) {
      return { error: error.message || 'Failed to humanize text' };
    }
  });
}
