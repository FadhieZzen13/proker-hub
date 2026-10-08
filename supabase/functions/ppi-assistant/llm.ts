// OpenAI-compatible chat completions client (rootsys.cloud serves Kimi this way).

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[]; reasoning_content?: string }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolDef {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface LlmReply {
  content: string | null;
  tool_calls?: ToolCall[];
  /** Thinking models (Kimi K2.x) return their reasoning separately; used only as a parsing fallback. */
  reasoning?: string;
  finishReason?: string;
}

export type Llm = (messages: ChatMessage[], opts?: { tools?: ToolDef[]; temperature?: number; maxTokens?: number }) => Promise<LlmReply>;

export function openAiCompatible(baseUrl: string, apiKey: string, model: string, fetchImpl: typeof fetch = fetch): Llm {
  return async (messages, opts = {}) => {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 4096, // thinking models spend tokens reasoning before answering
        ...(opts.tools?.length ? { tools: opts.tools, tool_choice: "auto" } : {}),
      }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const choice = data?.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error("llm: empty response");
    return {
      content: msg.content ?? null,
      tool_calls: msg.tool_calls?.length ? msg.tool_calls : undefined,
      reasoning: msg.reasoning_content ?? msg.reasoning ?? undefined,
      finishReason: choice.finish_reason,
    };
  };
}
