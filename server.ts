import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// The dev server in AI Studio must listen on port 3000
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with User-Agent
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Endpoint: /api/generate-daily-questions
 * Uses gemini-3.8-flash with googleSearch tool (Search Grounding)
 * Generates verified, grounded questions for today's date with a balanced mix of easy, medium, and hard.
 */
app.post('/api/generate-daily-questions', async (req: Request, res: Response) => {
  try {
    const ai = getAIClient();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server. Offline daily generator will be used.',
      });
    }
    const { dateStr, count = 20, category } = req.body;
    const today = dateStr || new Date().toISOString().split('T')[0];

    const categoryPrompt = category
      ? `Focus specifically on category: "${category}".`
      : `Distribute across:
         1. Quantitative Aptitude (arithmetic, percentages, speed-time, algebra)
         2. Logical & Verbal Reasoning (series, coding, puzzles, blood relations)
         3. Verbal Ability (grammar, vocab, idioms, sentence correction)
         4. General Knowledge & Current Affairs (grounded with real latest world & Indian facts)
         5. Technical & Programming (Python, JavaScript, SQL, DSA, OS, Web)`;

    const prompt = `You are a curriculum editor for an educational testing platform.
Generate ${count} distinct multiple-choice questions for today (${today}).
${categoryPrompt}

REQUIREMENTS:
1. Difficulty distribution: Include a balanced mix of "easy", "medium", and "hard" difficulty questions (NOT all of one difficulty).
2. For any current affairs, tech updates, science breakthroughs, or static facts, use your Google Search tool to verify exact accuracy.
3. Every question must have:
   - "id": string unique identifier (e.g. "daily-${today}-1", "daily-${today}-2", ...)
   - "categoryId": one of ["quant", "reasoning", "verbal", "gk", "tech", "interview"]
   - "topicId": matching standard topic (e.g. "percentages", "number-series", "grammar", "general-science", "indian-polity", "python", "sql", "dsa", "hr-interview", etc.)
   - "difficulty": "easy" | "medium" | "hard"
   - "question": clear question statement
   - "options": exactly 4 options with "id" ("A", "B", "C", "D") and "text"
   - "correctAnswer": "A" | "B" | "C" | "D"
   - "explanation": step-by-step verified explanation with reasoning
   - "hints": array of 1 short hint
   - "tags": array of 2-3 relevant tags
   - "groundedSource": optional short mention of verified fact/source

Output ONLY a valid JSON array of question objects, without markdown code fences or backticks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    let rawText = response.text || '';
    rawText = rawText.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const questions = JSON.parse(rawText);

    // Extract grounding sources if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    res.json({
      success: true,
      date: today,
      count: questions.length,
      questions,
      groundingSources: groundingMetadata?.groundingChunks?.map((c) => c.web?.title).filter(Boolean) || [],
    });
  } catch (error: any) {
    console.error('Error generating daily questions:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate grounded daily questions',
    });
  }
});

/**
 * Endpoint: /api/grounded-explain
 * Uses gemini-3.8-flash with googleSearch tool to provide up-to-date grounded clarification
 */
app.post('/api/grounded-explain', async (req: Request, res: Response) => {
  try {
    const ai = getAIClient();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }
    const { question, options, userAnswer } = req.body;

    const prompt = `Provide an authoritative, clear, and up-to-date explanation for the following multiple choice question.
Use Google Search grounding to verify the latest facts, definitions, or mathematical standards.

Question: ${question}
Options: ${JSON.stringify(options)}
User's Selection: ${userAnswer || 'None'}

Provide:
1. The exact correct answer
2. Detailed step-by-step explanation
3. Any common pitfalls or misconceptions
4. Verified factual references if applicable`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const searchChunks = groundingMetadata?.groundingChunks?.map((c) => ({
      title: c.web?.title,
      uri: c.web?.uri,
    })).filter((c) => c.uri) || [];

    res.json({
      success: true,
      explanation: response.text,
      sources: searchChunks,
    });
  } catch (error: any) {
    console.error('Error with grounded explanation:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get grounded explanation',
    });
  }
});

// Mount Vite in development or serve static assets in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
