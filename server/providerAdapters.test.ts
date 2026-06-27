import { describe, expect, it } from "vitest";
import { defaultRoles } from "../src/data/defaultCabinet";
import { invokeRoleProvider, resolveSecretAlias, validateProviderConfig } from "./providerAdapters";

describe("provider adapters", () => {
  it("rejects raw-looking secret aliases", () => {
    const result = resolveSecretAlias(
      {
        ...defaultRoles[0].provider,
        apiKeyAlias: "sk-live-raw-key"
      },
      {}
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("environment variable name");
  });

  it("skips protected providers when the secret alias is not available", async () => {
    const result = await invokeRoleProvider({
      role: defaultRoles[0],
      mission: "Test mission",
      context: [],
      env: {}
    });

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain(defaultRoles[0].provider.apiKeyAlias);
  });

  it("skips local providers when an explicit token alias is not available", async () => {
    const fakeFetch = async () => {
      throw new Error("local provider should not be called without its token alias");
    };
    const result = await invokeRoleProvider({
      role: defaultRoles[5],
      mission: "Test mission",
      context: [],
      env: {},
      fetchImpl: fakeFetch as typeof fetch
    });

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain(defaultRoles[5].provider.apiKeyAlias);
  });

  it("accepts session-only secrets for provider validation without persisting them", () => {
    const result = validateProviderConfig(defaultRoles[0].provider, {}, "session-secret");

    expect(result.ok).toBe(true);
    expect(result.secretReady).toBe(true);
    expect(result.message).toContain("one-off gateway test");
  });

  it("calls OpenAI Responses with normalized input when a secret exists", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          output_text: "Provider artifact",
          usage: { total_tokens: 123 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await invokeRoleProvider({
      role: defaultRoles[0],
      mission: "Test mission",
      context: [],
      env: { [defaultRoles[0].provider.apiKeyAlias]: "test-secret" },
      fetchImpl: fakeFetch as typeof fetch
    });

    expect(result.status).toBe("called");
    expect(result.text).toBe("Provider artifact");
    expect(result.tokensUsed).toBe(123);
    expect(requests[0].url).toBe("https://api.openai.com/v1/responses");
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: "Bearer test-secret"
    });
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({
      model: defaultRoles[0].provider.model
    });
  });

  it("calls Aliyun DashScope through the OpenAI-compatible chat endpoint with a small model config", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const role = {
      ...defaultRoles[0],
      provider: {
        provider: "aliyun" as const,
        endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        model: "qwen-turbo",
        apiKeyAlias: "DASHSCOPE_API_KEY",
        temperature: 0.2,
        maxTokens: 256
      }
    };
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "{\"decision\":\"approve\"}" } }],
          usage: { total_tokens: 42 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await invokeRoleProvider({
      role,
      mission: "省额度地测试阿里云 role call",
      context: [],
      env: { DASHSCOPE_API_KEY: "test-secret" },
      fetchImpl: fakeFetch as typeof fetch
    });

    expect(result.status).toBe("called");
    expect(result.provider).toBe("aliyun");
    expect(result.tokensUsed).toBe(42);
    expect(requests[0].url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: "Bearer test-secret"
    });
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({
      model: "qwen-turbo",
      max_tokens: 256
    });
  });

  it("keeps separated OpenAI role identities in consecutive provider calls", async () => {
    const openAiRoles = defaultRoles.filter((role) => role.provider.provider === "openai").slice(0, 2);
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({ output_text: `Artifact ${requests.length}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    await invokeRoleProvider({
      role: openAiRoles[0],
      mission: "Build the separated cabinet API proof",
      context: [],
      env: { [openAiRoles[0].provider.apiKeyAlias]: "test-secret" },
      fetchImpl: fakeFetch as typeof fetch
    });
    await invokeRoleProvider({
      role: openAiRoles[1],
      mission: "Build the separated cabinet API proof",
      context: [],
      env: { [openAiRoles[1].provider.apiKeyAlias]: "test-secret" },
      fetchImpl: fakeFetch as typeof fetch
    });

    expect(requests).toHaveLength(2);

    const firstBody = JSON.parse(String(requests[0].init?.body)) as {
      input: Array<{ role: string; content: string }>;
    };
    const secondBody = JSON.parse(String(requests[1].init?.body)) as {
      input: Array<{ role: string; content: string }>;
    };

    expect(firstBody.input[0]).toEqual({
      role: "developer",
      content: openAiRoles[0].systemPrompt
    });
    expect(firstBody.input[1].content).toContain(
      `Cabinet role: ${openAiRoles[0].name} / ${openAiRoles[0].ministry}`
    );
    expect(secondBody.input[0]).toEqual({
      role: "developer",
      content: openAiRoles[1].systemPrompt
    });
    expect(secondBody.input[1].content).toContain(
      `Cabinet role: ${openAiRoles[1].name} / ${openAiRoles[1].ministry}`
    );
  });
});
