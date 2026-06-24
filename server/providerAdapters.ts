import type { CabinetArtifact, CabinetRole, ProviderConfig } from "../src/domain/types";

export interface ProviderInvocationInput {
  role: CabinetRole;
  mission: string;
  context: CabinetArtifact[];
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

export interface ProviderInvocationResult {
  status: "skipped" | "called" | "failed";
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
  detail: string;
}

interface SecretResolution {
  ok: boolean;
  value?: string;
  detail: string;
}

type JsonObject = Record<string, unknown>;

export async function invokeRoleProvider(input: ProviderInvocationInput): Promise<ProviderInvocationResult> {
  const started = Date.now();
  const secret = resolveSecretAlias(input.role.provider, input.env || process.env);
  const fetcher = input.fetchImpl || fetch;

  if (!input.role.provider.endpoint || !input.role.provider.model) {
    return skipped(input.role.provider, started, "Provider endpoint or model is missing.");
  }

  if (!secret.ok) {
    return skipped(input.role.provider, started, secret.detail);
  }

  try {
    const prompt = buildRolePrompt(input.role, input.mission, input.context);
    const result = await callProvider({
      provider: input.role.provider,
      systemPrompt: input.role.systemPrompt,
      prompt,
      secret: secret.value,
      fetcher
    });

    return {
      status: "called",
      text: result.text,
      provider: input.role.provider.provider,
      model: input.role.provider.model,
      latencyMs: Date.now() - started,
      tokensUsed: result.tokensUsed,
      detail: result.detail
    };
  } catch (error) {
    return {
      status: "failed",
      text: "",
      provider: input.role.provider.provider,
      model: input.role.provider.model,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : "Provider call failed."
    };
  }
}

export function resolveSecretAlias(config: ProviderConfig, env: NodeJS.ProcessEnv = process.env): SecretResolution {
  const alias = config.apiKeyAlias.trim();

  if (!alias) {
    return {
      ok: config.provider === "local" || config.provider === "custom",
      detail: "No API key alias configured."
    };
  }

  if (!isEnvAlias(alias)) {
    return {
      ok: false,
      detail: "API key alias must be an environment variable name, not a raw secret."
    };
  }

  const value = env[alias];
  return value
    ? { ok: true, value, detail: `Resolved ${alias}.` }
    : { ok: false, detail: `Environment variable ${alias} is not set.` };
}

export function validateProviderConfig(
  config: ProviderConfig,
  env: NodeJS.ProcessEnv = process.env,
  sessionSecret?: string
) {
  const secret = resolveSecretAlias(config, env);
  const structurallyValid = Boolean(config.endpoint && config.model);
  const alias = config.apiKeyAlias.trim();
  const hasInvalidAlias = Boolean(alias && !isEnvAlias(alias));
  const sessionSecretReady = Boolean(sessionSecret?.trim()) && !hasInvalidAlias;

  return {
    ok: structurallyValid,
    provider: config.provider,
    model: config.model,
    endpoint: config.endpoint,
    secretReady: secret.ok || sessionSecretReady,
    message: structurallyValid
      ? secret.ok
        ? secret.detail
        : sessionSecretReady
          ? "Session secret provided for one-off gateway test; it will not be persisted."
          : secret.detail
      : "Provider endpoint or model is missing."
  };
}

function isEnvAlias(alias: string) {
  return /^[A-Z][A-Z0-9_]*$/.test(alias);
}

function buildRolePrompt(role: CabinetRole, mission: string, context: CabinetArtifact[]) {
  const contextText = context.length
    ? context
        .map((artifact) => `- ${artifact.title}\n${artifact.body}`)
        .join("\n\n")
    : "No prior artifacts.";

  return [
    `Mission: ${mission}`,
    `Cabinet role: ${role.name} / ${role.ministry}`,
    `Mandate: ${role.mandate}`,
    "Prior artifacts:",
    contextText,
    "Return a concise, auditable artifact for this stage. Include decisions, risks, and next actions."
  ].join("\n\n");
}

async function callProvider({
  provider,
  systemPrompt,
  prompt,
  secret,
  fetcher
}: {
  provider: ProviderConfig;
  systemPrompt: string;
  prompt: string;
  secret?: string;
  fetcher: typeof fetch;
}) {
  if (provider.provider === "openai") {
    return callOpenAiResponses(provider, systemPrompt, prompt, secret || "", fetcher);
  }

  if (provider.provider === "anthropic") {
    return callAnthropicMessages(provider, systemPrompt, prompt, secret || "", fetcher);
  }

  if (provider.provider === "openrouter") {
    return callOpenAiCompatibleChat(provider, systemPrompt, prompt, secret || "", fetcher, {
      "HTTP-Referer": "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
      "X-Title": "Naikaku AI Togo System"
    });
  }

  if (provider.provider === "google") {
    return callGeminiGenerateContent(provider, systemPrompt, prompt, secret || "", fetcher);
  }

  return callCustomJsonProvider(provider, systemPrompt, prompt, secret, fetcher);
}

async function callOpenAiResponses(
  provider: ProviderConfig,
  systemPrompt: string,
  prompt: string,
  secret: string,
  fetcher: typeof fetch
) {
  const json = await postJson(fetcher, responseEndpoint(provider.endpoint, "/responses"), {
    headers: bearerHeaders(secret),
    body: {
      model: provider.model,
      input: [
        { role: "developer", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: provider.temperature,
      max_output_tokens: provider.maxTokens
    }
  });

  return {
    text: extractText(json),
    tokensUsed: extractUsage(json),
    detail: "OpenAI Responses API call completed."
  };
}

async function callAnthropicMessages(
  provider: ProviderConfig,
  systemPrompt: string,
  prompt: string,
  secret: string,
  fetcher: typeof fetch
) {
  const json = await postJson(fetcher, responseEndpoint(provider.endpoint, "/v1/messages"), {
    headers: {
      "x-api-key": secret,
      "anthropic-version": "2023-06-01"
    },
    body: {
      model: provider.model,
      max_tokens: provider.maxTokens,
      temperature: provider.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    }
  });

  return {
    text: extractText(json),
    tokensUsed: extractUsage(json),
    detail: "Anthropic Messages API call completed."
  };
}

async function callOpenAiCompatibleChat(
  provider: ProviderConfig,
  systemPrompt: string,
  prompt: string,
  secret: string,
  fetcher: typeof fetch,
  extraHeaders: Record<string, string> = {}
) {
  const json = await postJson(fetcher, responseEndpoint(provider.endpoint, "/chat/completions"), {
    headers: {
      ...bearerHeaders(secret),
      ...extraHeaders
    },
    body: {
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: provider.temperature,
      max_tokens: provider.maxTokens
    }
  });

  return {
    text: extractText(json),
    tokensUsed: extractUsage(json),
    detail: "OpenAI-compatible chat completion call completed."
  };
}

async function callGeminiGenerateContent(
  provider: ProviderConfig,
  systemPrompt: string,
  prompt: string,
  secret: string,
  fetcher: typeof fetch
) {
  const endpoint = provider.endpoint.includes(":generateContent")
    ? provider.endpoint
    : `${provider.endpoint.replace(/\/$/, "")}/${provider.model}:generateContent`;
  const json = await postJson(fetcher, endpoint, {
    headers: { "x-goog-api-key": secret },
    body: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: provider.temperature,
        maxOutputTokens: provider.maxTokens
      }
    }
  });

  return {
    text: extractText(json),
    tokensUsed: extractUsage(json),
    detail: "Gemini generateContent call completed."
  };
}

async function callCustomJsonProvider(
  provider: ProviderConfig,
  systemPrompt: string,
  prompt: string,
  secret: string | undefined,
  fetcher: typeof fetch
) {
  const json = await postJson(fetcher, provider.endpoint, {
    headers: secret ? bearerHeaders(secret) : {},
    body: {
      provider: provider.provider,
      model: provider.model,
      system: systemPrompt,
      input: prompt,
      temperature: provider.temperature,
      maxTokens: provider.maxTokens
    }
  });

  return {
    text: extractText(json),
    tokensUsed: extractUsage(json),
    detail: "Custom JSON provider call completed."
  };
}

async function postJson(
  fetcher: typeof fetch,
  endpoint: string,
  options: { headers: Record<string, string>; body: JsonObject }
) {
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    body: JSON.stringify(options.body)
  });

  const raw = await response.text();
  const json = raw ? (JSON.parse(raw) as JsonObject) : {};

  if (!response.ok) {
    const message = extractError(json) || `Provider returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return json;
}

function responseEndpoint(endpoint: string, suffix: string) {
  const trimmed = endpoint.replace(/\/$/, "");
  if (trimmed.endsWith(suffix) || trimmed.includes(`${suffix}?`)) {
    return trimmed;
  }
  return `${trimmed}${suffix}`;
}

function bearerHeaders(secret: string) {
  return {
    Authorization: `Bearer ${secret}`
  };
}

function skipped(provider: ProviderConfig, started: number, detail: string): ProviderInvocationResult {
  return {
    status: "skipped",
    text: "",
    provider: provider.provider,
    model: provider.model,
    latencyMs: Date.now() - started,
    detail
  };
}

function extractText(json: JsonObject): string {
  if (typeof json.output_text === "string") return json.output_text;
  if (typeof json.text === "string") return json.text;
  if (typeof json.output === "string") return json.output;
  if (typeof json.content === "string") return json.content;

  const choices = Array.isArray(json.choices) ? json.choices : [];
  const firstChoice = choices[0] as JsonObject | undefined;
  const message = firstChoice?.message as JsonObject | undefined;
  if (typeof message?.content === "string") return message.content;

  const content = Array.isArray(json.content) ? json.content : [];
  const anthropicText = content
    .map((part) => (part as JsonObject).text)
    .filter((text): text is string => typeof text === "string")
    .join("\n");
  if (anthropicText) return anthropicText;

  const output = Array.isArray(json.output) ? json.output : [];
  const responseText = output
    .flatMap((item) => {
      const outputItem = item as JsonObject;
      return Array.isArray(outputItem.content) ? outputItem.content : [];
    })
    .map((part) => (part as JsonObject).text)
    .filter((text): text is string => typeof text === "string")
    .join("\n");
  if (responseText) return responseText;

  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const geminiText = candidates
    .flatMap((candidate) => {
      const contentItem = (candidate as JsonObject).content as JsonObject | undefined;
      return Array.isArray(contentItem?.parts) ? contentItem.parts : [];
    })
    .map((part) => (part as JsonObject).text)
    .filter((text): text is string => typeof text === "string")
    .join("\n");
  if (geminiText) return geminiText;

  return JSON.stringify(json, null, 2);
}

function extractUsage(json: JsonObject) {
  const usage = json.usage as JsonObject | undefined;
  const usageMetadata = json.usageMetadata as JsonObject | undefined;
  const direct = json.total_tokens;
  const total = usage?.total_tokens || usageMetadata?.totalTokenCount || direct;
  return typeof total === "number" ? total : undefined;
}

function extractError(json: JsonObject) {
  const error = json.error as JsonObject | string | undefined;
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (typeof json.message === "string") return json.message;
  return "";
}
