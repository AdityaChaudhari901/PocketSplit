declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type AiTask = "categorize" | "insight" | "receipt_parse" | "assistant";
type AiProvider = "bedrock" | "mock";

interface AiRequest {
  task: AiTask;
  payload: Record<string, unknown>;
}

interface AuthContext {
  userId?: string;
}

class HttpError extends Error {
  status: number;
  publicMessage: string;

  constructor(status: number, publicMessage: string) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

const AI_TASKS: AiTask[] = ["categorize", "insight", "receipt_parse", "assistant"];
const MAX_BODY_BYTES = 40_000;
const BEDROCK_TIMEOUT_MS = 20_000;
const AUTH_TIMEOUT_MS = 8_000;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json",
      "x-content-type-options": "nosniff"
    }
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAiTask = (value: unknown): value is AiTask => typeof value === "string" && AI_TASKS.includes(value as AiTask);

const readBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const appEnv = (): string => Deno.env.get("APP_ENV") ?? Deno.env.get("ENVIRONMENT") ?? "development";

const isProduction = (): boolean => appEnv() === "production";

const isAuthRequired = (): boolean => readBoolean(Deno.env.get("AI_REQUIRE_AUTH"), isProduction());

const areMocksAllowed = (): boolean => readBoolean(Deno.env.get("AI_ALLOW_MOCKS"), !isProduction());

const mockResponse = (task: AiTask, payload: Record<string, unknown> = {}): Record<string, unknown> => {
  switch (task) {
    case "categorize":
      return {
        category: "Food",
        subcategory: "Food Delivery",
        confidence: 0.88,
        reason: "Merchant appears to be a food delivery or restaurant transaction."
      };
    case "insight":
      return {
        title: "Food spending increased",
        summary: "You spent more on food this week compared with your weekly average.",
        mainDrivers: ["Restaurant visits", "Food delivery"],
        suggestions: ["Set a daily food limit for the next 10 days."],
        riskLevel: "medium"
      };
    case "receipt_parse":
      return {
        merchant: "Cafe Demo",
        date: new Date().toISOString(),
        items: [
          { label: "Paneer Pizza", quantity: 1, amountMinor: 48000 },
          { label: "Coke", quantity: 2, amountMinor: 12000 }
        ],
        taxAmountMinor: 3600,
        serviceChargeMinor: 9600,
        totalAmountMinor: 699600,
        suggestedCategory: "Food",
        confidence: 0.64
      };
    case "assistant":
      if (typeof payload.question === "string" && /^(hi|hey|hello|hii|yo)\b/i.test(payload.question.trim())) {
        return {
          answer:
            "Hi, I can help with safe daily spend, upcoming bills, subscriptions, savings goals, receipts, and split balances. Ask me what you want to decide next.",
          suggestedActions: ["Check safe daily spend", "Review upcoming bills", "Find subscriptions"],
          confidence: 0.72,
          disclaimer: "Educational spending insight, not financial advice."
        };
      }
      return {
        answer:
          "Based on your budget and upcoming bills, this may put pressure on your monthly spending limit. Review your available balance, expected bills, and savings goal before deciding.",
        suggestedActions: ["Check upcoming bills", "Compare with daily budget", "Set a spending limit"],
        confidence: 0.72,
        disclaimer: "Educational spending insight, not financial advice."
      };
  }
};

const systemPrompts: Record<AiTask, string> = {
  categorize:
    "You categorize personal finance transactions. Return only JSON with category, subcategory, confidence, and reason. Never provide financial advice.",
  insight:
    "You generate educational spending insights from expense data. Return only JSON with title, summary, mainDrivers, suggestions, and riskLevel.",
  receipt_parse:
    "You parse receipt OCR/image metadata into structured JSON. Use integer minor units for money. Return only JSON.",
  assistant:
    "You answer expense-analysis questions. You are not a certified financial advisor. Return only JSON with answer, suggestedActions, confidence, and disclaimer exactly 'Educational spending insight, not financial advice.'"
};

const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer | Uint8Array): string =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

const hmac = async (key: ArrayBuffer | Uint8Array, value: string): Promise<Uint8Array> => {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
};

const hmacHex = async (key: ArrayBuffer | Uint8Array, value: string): Promise<string> => toHex(await hmac(key, value));

const getSignatureKey = async (secretAccessKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> => {
  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
};

const toAmzDate = (date: Date): string =>
  date
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "");

const fetchWithTimeout = async (url: string | URL, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseJsonFromText = (text: string): Record<string, unknown> => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch (_error) {
    const stripped = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new HttpError(502, "AI provider returned invalid JSON.");
  }
};

const buildConverseBody = (request: AiRequest): string =>
  JSON.stringify({
    system: [{ text: systemPrompts[request.task] }],
    messages: [
      {
        role: "user",
        content: [
          {
            text: JSON.stringify(request.payload)
          }
        ]
      }
    ],
    inferenceConfig: {
      maxTokens: 1200,
      temperature: 0.2
    }
  });

const getConverseText = (data: unknown): string => {
  const content = (data as { output?: { message?: { content?: Array<{ text?: unknown }> } } }).output?.message?.content;
  const text = content?.find((item) => typeof item.text === "string")?.text;
  if (typeof text !== "string") {
    throw new HttpError(502, "AI provider returned an invalid response.");
  }

  return text;
};

const assertString = (value: unknown, field: string, minLength = 1, maxLength = 1200): void => {
  if (typeof value !== "string" || value.length < minLength || value.length > maxLength) {
    throw new HttpError(400, `Invalid ${field}.`);
  }
};

const assertNumberRange = (value: unknown, field: string, min: number, max: number): void => {
  if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
    throw new HttpError(502, `AI provider returned invalid ${field}.`);
  }
};

const assertStringArray = (value: unknown, field: string, maxItems: number): void => {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string" || item.length < 1)) {
    throw new HttpError(502, `AI provider returned invalid ${field}.`);
  }
};

const validatePayload = (request: AiRequest): void => {
  switch (request.task) {
    case "categorize":
      assertString(request.payload.description, "description", 1, 500);
      return;
    case "assistant":
      assertString(request.payload.question, "question", 1, 1200);
      return;
    case "receipt_parse":
      assertString(request.payload.imagePath, "imagePath", 1, 2000);
      return;
    case "insight":
      if (JSON.stringify(request.payload).length > 10_000) {
        throw new HttpError(400, "Insight payload is too large.");
      }
  }
};

const parseAiRequest = async (req: Request): Promise<AiRequest> => {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request body is too large.");
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request body is too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (_error) {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  if (!isRecord(parsed) || !isAiTask(parsed.task) || !isRecord(parsed.payload)) {
    throw new HttpError(400, "Invalid AI request.");
  }

  const request = {
    task: parsed.task,
    payload: parsed.payload
  };
  validatePayload(request);
  return request;
};

const validateAiResponse = (task: AiTask, result: Record<string, unknown>): Record<string, unknown> => {
  switch (task) {
    case "categorize":
      assertString(result.category, "category", 1, 80);
      assertNumberRange(result.confidence, "confidence", 0, 1);
      assertString(result.reason, "reason", 8, 500);
      if (result.subcategory !== undefined) {
        assertString(result.subcategory, "subcategory", 1, 80);
      }
      return result;
    case "insight":
      assertString(result.title, "title", 3, 80);
      assertString(result.summary, "summary", 12, 600);
      assertStringArray(result.mainDrivers, "mainDrivers", 6);
      assertStringArray(result.suggestions, "suggestions", 6);
      if (result.riskLevel !== "low" && result.riskLevel !== "medium" && result.riskLevel !== "high") {
        throw new HttpError(502, "AI provider returned invalid riskLevel.");
      }
      return result;
    case "receipt_parse":
      if (!Array.isArray(result.items)) {
        throw new HttpError(502, "AI provider returned invalid receipt items.");
      }
      for (const item of result.items) {
        if (!isRecord(item)) {
          throw new HttpError(502, "AI provider returned invalid receipt item.");
        }
        assertString(item.label, "receipt item label", 1, 160);
        assertNumberRange(item.quantity, "receipt item quantity", 0.01, 10_000);
        if (typeof item.amountMinor !== "number" || !Number.isInteger(item.amountMinor) || item.amountMinor < 0) {
          throw new HttpError(502, "AI provider returned invalid receipt item amount.");
        }
      }
      assertNumberRange(result.confidence, "confidence", 0, 1);
      assertString(result.suggestedCategory, "suggestedCategory", 1, 80);
      if (typeof result.totalAmountMinor !== "number" || !Number.isInteger(result.totalAmountMinor) || result.totalAmountMinor <= 0) {
        throw new HttpError(502, "AI provider returned invalid totalAmountMinor.");
      }
      return result;
    case "assistant":
      assertString(result.answer, "answer", 16, 1200);
      assertStringArray(result.suggestedActions, "suggestedActions", 5);
      assertNumberRange(result.confidence, "confidence", 0, 1);
      if (result.disclaimer !== "Educational spending insight, not financial advice.") {
        throw new HttpError(502, "AI provider returned invalid disclaimer.");
      }
      return result;
  }
};

const getBearerToken = (req: Request): string | null => {
  const authorization = req.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

const authenticateRequest = async (req: Request): Promise<AuthContext> => {
  if (!isAuthRequired()) {
    return {};
  }

  const token = getBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Authentication is required.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProduction()) {
      throw new HttpError(500, "Auth verification is not configured.");
    }
    return {};
  }

  const response = await fetchWithTimeout(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`
      }
    },
    AUTH_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new HttpError(401, "Authentication is required.");
  }

  const user = await response.json();
  if (!isRecord(user) || typeof user.id !== "string") {
    throw new HttpError(401, "Authentication is required.");
  }

  return { userId: user.id };
};

const signBedrockRequest = async ({
  accessKeyId,
  secretAccessKey,
  sessionToken,
  region,
  endpoint,
  body
}: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  endpoint: URL;
  body: string;
}): Promise<Headers> => {
  const service = "bedrock";
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const canonicalHeaders: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };

  if (sessionToken) {
    canonicalHeaders["x-amz-security-token"] = sessionToken;
  }

  const signedHeaderNames = Object.keys(canonicalHeaders).sort();
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    "POST",
    endpoint.pathname,
    "",
    signedHeaderNames.map((name) => `${name}:${canonicalHeaders[name] ?? ""}`).join("\n") + "\n",
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  const headers = new Headers(canonicalHeaders);
  headers.set(
    "authorization",
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  );
  return headers;
};

const callBedrockProvider = async (request: AiRequest): Promise<Record<string, unknown>> => {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const sessionToken = Deno.env.get("AWS_SESSION_TOKEN") || undefined;
  const bearerToken = Deno.env.get("AWS_BEARER_TOKEN_BEDROCK");
  const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
  const modelId = Deno.env.get("BEDROCK_MODEL_ID");

  if (!modelId || (!bearerToken && (!accessKeyId || !secretAccessKey))) {
    if (areMocksAllowed()) {
      return mockResponse(request.task, request.payload);
    }
    throw new HttpError(503, "AI provider is not configured.");
  }

  const body = buildConverseBody(request);
  const endpoint = new URL(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`);
  const headers = bearerToken
    ? new Headers({
        accept: "application/json",
        authorization: `Bearer ${bearerToken}`,
        "content-type": "application/json"
      })
    : await signBedrockRequest({
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
        sessionToken,
        region,
        endpoint,
        body
      });

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers,
      body
    },
    BEDROCK_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new HttpError(502, "AI provider request failed.");
  }

  const data = await response.json();
  return parseJsonFromText(getConverseText(data));
};

const callAiProvider = async (request: AiRequest): Promise<Record<string, unknown>> => {
  const provider = (Deno.env.get("AI_PROVIDER") ?? "bedrock").toLowerCase() as AiProvider;
  if (provider === "mock") {
    if (!areMocksAllowed()) {
      throw new HttpError(503, "Mock AI provider is disabled in production.");
    }
    return mockResponse(request.task, request.payload);
  }

  return callBedrockProvider(request);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({}, 204);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    await authenticateRequest(req);
    const body = await parseAiRequest(req);
    const result = validateAiResponse(body.task, await callAiProvider(body));
    return json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.publicMessage : "AI request failed.";
    return json({ error: message }, status);
  }
});
