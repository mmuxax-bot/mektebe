// Nibras AI provayderləri: söhbət (api/chat.js) və tərcümə mühərriki (api/_translate-engine.js) eyni kodu istifadə edir.
// Yeni provayder və ya açar yoxdur: yalnız köhnə funksiyalar buraya köçürülüb.
// Sistem mətni, token, temperatur və vaxt həddi sorğu daxilində (AsyncLocalStorage) verilir: aiConfig.run({system, tokens(), timeout(base), temperature?}, fn).
import { AsyncLocalStorage } from "node:async_hooks";

export const aiConfig = new AsyncLocalStorage();
const DEFAULT_CFG = { system: "", tokens: () => 700, timeout: (base) => AbortSignal.timeout(base) };
function cfg() { return aiConfig.getStore() || DEFAULT_CFG; }
function tokenLimit() { return cfg().tokens(); }
function timeoutFor(base) { return cfg().timeout(base); }

// Provayder adı -> açar dəyişənləri (yalnız açarı olanlar "sağlam" sayılır)
export const PROVIDER_KEYS = {
  groq: ["GROQ_API_KEY"],
  xai: ["XAI_API_KEY"],
  mistral: ["MISTRAL_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  hf: ["HF_TOKEN"],
  gemini: ["GEMINI_API_KEY"],
  github: ["GITHUB_MODELS_TOKEN", "GH_MODELS_TOKEN", "GITHUB_TOKEN"],
  deepseek: ["DEEPSEEK_API_KEY"],
  nvidia: ["NVIDIA_API_KEY", "NGC_API_KEY"],
  cerebras: ["CEREBRAS_API_KEY"],
  sambanova: ["SAMBANOVA_API_KEY"],
  scaleway: ["SCALEWAY_SECRET_KEY", "SCALEWAY_API_KEY"],
  ollama: ["OLLAMA_API_KEY"],
  llm7: ["LLM7_API_KEY"],
  airforce: ["AIRFORCE_API_KEY"],
};
export function configuredProviders() {
  return Object.keys(PROVIDER_KEYS).filter((name) => PROVIDER_KEYS[name].some((k) => env(k)));
}

export async function askProvider(name, history, message) {
  if (name === "groq" || name === "groq-reason") return askGroq(history);
  if (name === "xai") return askXai(history);
  if (name === "mistral") return askMistral(history, ["mistral-small-latest", "codestral-latest"]);
  if (name === "mistral-code") return askMistral(history, ["codestral-latest", "mistral-small-latest"]);
  if (name === "openrouter") return askOpenRouter(history);
  if (name === "hf") return askHf(history);
  if (name === "gemini") return askGemini(message);
  if (name === "github") return askGithub(history);
  if (name === "deepseek") return askDeepSeek(history);
  if (name === "nvidia") return askNvidia(history);
  if (name === "cerebras") return askCerebras(history);
  if (name === "sambanova") return askSambaNova(history);
  if (name === "scaleway") return askScaleway(history);
  if (name === "ollama") return askOllama(history);
  if (name === "llm7") return askLlm7(history);
  if (name === "airforce") return askAirforce(history);
  return { skipped: true };
}

export function env(name) {
  const hit = Object.keys(process.env).find((key) => key.toUpperCase() === name.toUpperCase());
  return hit ? String(process.env[hit] || "").trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") : "";
}

const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
let groqCached = "";

async function askGroq(history) {
  const apiKey = env("GROQ_API_KEY");
  if (!apiKey) return { skipped: true };
  const models = groqCached ? [groqCached, ...GROQ_MODELS] : GROQ_MODELS;
  const seen = new Set();
  let last = { ok: false, detail: "Groq cavab vermədi." };
  for (const model of models) {
    if (seen.has(model)) continue;
    seen.add(model);
    last = await complete({
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey,
      model,
      history,
    });
    if (last.ok) {
      groqCached = model;
      return last;
    }
    if (!/does not exist|not have access|decommissioned|model/i.test(last.detail || "")) return last;
  }
  return last;
}

async function askXai(history) {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) return { skipped: true };
  const modern = await xaiResponses(apiKey, history);
  if (modern.ok) return modern;
  for (const model of ["grok-4.7", "grok-4.5", "grok-3-mini", "grok-3"]) {
    const result = await complete({
      url: "https://api.x.ai/v1/chat/completions",
      apiKey,
      model,
      history,
    });
    if (result.ok) return result;
    if (!/model|not found|does not exist|unsupported/i.test(result.detail || "")) return result;
  }
  return { ok: false, detail: "xAI cavab vermədi." };
}

async function xaiResponses(apiKey, history) {
  const upstream = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    signal: timeoutFor(8000),
    body: JSON.stringify({
      model: "grok-4.7",
      input: [
        { role: "system", content: cfg().system },
        ...history.map((item) => ({ role: item.role, content: item.text })),
      ],
    }),
  });
  const data = await upstream.json().catch(() => ({}));
  const reply = stripThink(responseText(data));
  if (upstream.ok && reply) return { ok: true, reply };
  return { ok: false, detail: "xAI responses" };
}

function responseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = Array.isArray(data.output) ? data.output : [];
  return parts
    .map((item) => (Array.isArray(item.content) ? item.content.map((part) => part.text || "").join("") : item.text || ""))
    .join("");
}

async function askChain(history, keys, url, models) {
  const apiKey = keys.map((name) => env(name)).find(Boolean);
  if (!apiKey) return { skipped: true };
  let last = { ok: false, detail: "cavab vermədi." };
  for (const model of models) {
    last = await complete({ url, apiKey, model, history });
    if (last.ok) return last;
    if (!/model|not found|does not exist|unknown|invalid|unavailable|no longer|not supported/i.test(String(last.detail || ""))) {
      return last;
    }
  }
  return last;
}

function askDeepSeek(history) {
  return askChain(history, ["DEEPSEEK_API_KEY"], "https://api.deepseek.com/chat/completions", [
    "deepseek-v4-flash",
    "deepseek-flash",
    "deepseek-chat",
  ]);
}

function askNvidia(history) {
  return askChain(history, ["NVIDIA_API_KEY", "NGC_API_KEY"], "https://integrate.api.nvidia.com/v1/chat/completions", [
    // meta/llama-3.3-70b-instruct NVIDIA tərəfindən 2026-08-26-da söndürülüb (HTTP 410), ona görə siyahıdan çıxarıldı
    "mistralai/mistral-large-2-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "google/gemma-3-12b-it",
  ]);
}

function askCerebras(history) {
  return askChain(history, ["CEREBRAS_API_KEY"], "https://api.cerebras.ai/v1/chat/completions", [
    "gpt-oss-120b",
    "qwen-3.8-27b",
  ]);
}

function askSambaNova(history) {
  return askChain(history, ["SAMBANOVA_API_KEY"], "https://api.sambanova.ai/v1/chat/completions", [
    "Meta-Llama-3.3-70B-Instruct",
    "gpt-oss-120b",
  ]);
}

function askScaleway(history) {
  return askChain(history, ["SCALEWAY_SECRET_KEY", "SCALEWAY_API_KEY"], "https://api.scaleway.ai/v1/chat/completions", [
    "llama-3.3-70b-instruct",
    "gemma-4-26b-a4b-it",
  ]);
}

function askOllama(history) {
  return askChain(history, ["OLLAMA_API_KEY"], "https://ollama.com/v1/chat/completions", ["gemma4:31b", "gpt-oss:20b"]);
}

function askLlm7(history) {
  return askChain(history, ["LLM7_API_KEY"], "https://api.llm7.io/v1/chat/completions", ["fast", "default"]);
}

function askAirforce(history) {
  return askChain(history, ["AIRFORCE_API_KEY"], "https://api.airforce/v1/chat/completions", ["gpt-4.1-mini", "gpt-4o-mini"]);
}

async function askMistral(history, models) {
  const apiKey = env("MISTRAL_API_KEY");
  if (!apiKey) return { skipped: true };
  let last = { ok: false, detail: "Mistral cavab vermədi." };
  for (const model of models) {
    last = await complete({
      url: "https://api.mistral.ai/v1/chat/completions",
      apiKey,
      model,
      history,
    });
    if (last.ok) return last;
    if (!/model|not found|unknown|invalid/i.test(last.detail || "")) return last;
  }
  return last;
}

async function askOpenRouter(history) {
  const apiKey = env("OPENROUTER_API_KEY");
  if (!apiKey) return { skipped: true };
  return complete({
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey,
    model: "meta-llama/llama-3.3-70b-instruct",
    history,
    extraHeaders: {
      "HTTP-Referer": "https://www.nibrascode.com",
      "X-Title": "Nibras AI",
    },
  });
}

async function askHf(history) {
  const apiKey = env("HF_TOKEN");
  if (!apiKey) return { skipped: true };
  return complete({
    url: "https://router.huggingface.co/v1/chat/completions",
    apiKey,
    model: "meta-llama/Llama-3.3-70B-Instruct",
    history,
  });
}

async function askGithub(history) {
  const apiKey = env("GITHUB_MODELS_TOKEN") || env("GH_MODELS_TOKEN") || env("GITHUB_TOKEN");
  if (!apiKey) return { skipped: true };
  return complete({
    url: "https://models.github.ai/inference/chat/completions",
    apiKey,
    model: "openai/gpt-4.1-mini",
    history,
  });
}

async function askGemini(message) {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return { skipped: true };
  const models = ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-flash-latest"];
  let detail = "Gemini cavab vermədi.";
  for (const model of models) {
    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: timeoutFor(6000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: cfg().system }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: cfg().temperature ?? 0.5, maxOutputTokens: tokenLimit() },
        }),
      },
    );
    const data = await upstream.json().catch(() => ({}));
    const reply = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("").trim();
    if (upstream.ok && reply) return { ok: true, reply };
    detail = String(data.error?.message || detail);
    if (!/high demand|unavailable|not found|no longer available|overloaded|quota/i.test(detail)) break;
  }
  return { ok: false, detail };
}

async function complete({ url, apiKey, model, history, extraHeaders }) {
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
      ...(extraHeaders || {}),
    },
    signal: timeoutFor(8000),
    body: JSON.stringify({
      model,
      temperature: cfg().temperature ?? 0.4,
      max_tokens: tokenLimit(),
      messages: [
        { role: "system", content: cfg().system },
        ...history.map((item) => ({ role: item.role, content: item.text })),
      ],
    }),
  });
  const data = await upstream.json().catch(() => ({}));
  const reply = stripThink(String(data.choices?.[0]?.message?.content || ""));
  if (upstream.ok && reply) return { ok: true, reply };
  const detail = data.error?.message || data.error || data.message || data.detail || upstream.status;
  return { ok: false, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
}

function stripThink(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
