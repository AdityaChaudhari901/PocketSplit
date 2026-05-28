import {
  aiAssistantResponseSchema,
  aiCategorizationSchema,
  aiReceiptParseSchema,
  aiSpendingInsightSchema,
  type AiAssistantResponse,
  type AiCategorization,
  type AiReceiptParse,
  type AiSpendingInsight
} from "@/schemas/ai.schema";
import { isDemoModeEnabled } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase";

type AiTask = "categorize" | "insight" | "receipt_parse" | "assistant";

export interface AiAssistantMessageContext {
  role: "user" | "assistant";
  content: string;
}

const invokeAiFunction = async <T>(task: AiTask, payload: Record<string, unknown>): Promise<T | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke("ai-insights", {
    body: { task, payload }
  });

  if (error && isDemoModeEnabled()) {
    return null;
  }

  if (error) {
    throw new Error("AI service is temporarily unavailable. Please try again.");
  }

  return data as T;
};

export const categorizeTransaction = async (description: string): Promise<AiCategorization> => {
  const response = await invokeAiFunction<AiCategorization>("categorize", { description });
  if (response) {
    return aiCategorizationSchema.parse(response);
  }

  const lower = description.toLowerCase();
  const category = lower.includes("swiggy") || lower.includes("restaurant") ? "Food" : "Other";
  return aiCategorizationSchema.parse({
    category,
    subcategory: category === "Food" ? "Food Delivery" : "General",
    confidence: category === "Food" ? 0.88 : 0.52,
    reason: "Local development fallback used because no server-side AI function is configured."
  });
};

export const getSpendingInsight = async (payload: Record<string, unknown>): Promise<AiSpendingInsight> => {
  const response = await invokeAiFunction<AiSpendingInsight>("insight", payload);
  if (response) {
    return aiSpendingInsightSchema.parse(response);
  }

  return aiSpendingInsightSchema.parse({
    title: "Food spending increased",
    summary: "You spent more on restaurants and delivery than your current weekly average.",
    mainDrivers: ["Restaurant visits", "Food delivery"],
    suggestions: ["Set a daily food limit for the next 10 days.", "Move one delivery meal to groceries."],
    riskLevel: "medium"
  });
};

export const parseReceipt = async (imagePath: string): Promise<AiReceiptParse> => {
  const response = await invokeAiFunction<AiReceiptParse>("receipt_parse", { imagePath });
  if (response) {
    return aiReceiptParseSchema.parse(response);
  }

  return aiReceiptParseSchema.parse({
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
  });
};

const buildLocalAssistantResponse = (question: string): AiAssistantResponse => {
  const normalizedQuestion = question.trim().toLowerCase();
  if (/^(hi|hey|hello|hii|yo)\b/.test(normalizedQuestion)) {
    return aiAssistantResponseSchema.parse({
      answer:
        "Hi, I can help you understand cash flow, upcoming bills, safe daily spend, subscriptions, savings goals, and split expenses. Ask me what you want to decide next.",
      suggestedActions: ["Check safe daily spend", "Review upcoming bills", "Find subscriptions"],
      confidence: 0.7,
      disclaimer: "Educational spending insight, not financial advice."
    });
  }

  if (normalizedQuestion.includes("afford") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("spend")) {
    return aiAssistantResponseSchema.parse({
      answer:
        "Before spending, compare the purchase against available balance, upcoming bills, and savings goals. If the purchase lowers your remaining daily budget below your comfort level, delay it or reduce another flexible category.",
      suggestedActions: ["Check upcoming bills", "Compare with daily budget", "Set a spending limit"],
      confidence: 0.68,
      disclaimer: "Educational spending insight, not financial advice."
    });
  }

  if (normalizedQuestion.includes("subscription") || normalizedQuestion.includes("recurring")) {
    return aiAssistantResponseSchema.parse({
      answer:
        "Look for repeat merchants, fixed monthly charges, and low-usage services. Cancel or pause anything that does not support your current priorities before cutting essential spending.",
      suggestedActions: ["Review recurring bills", "Mark unused subscriptions", "Set renewal reminders"],
      confidence: 0.66,
      disclaimer: "Educational spending insight, not financial advice."
    });
  }

  if (normalizedQuestion.includes("split") || normalizedQuestion.includes("owe") || normalizedQuestion.includes("friend")) {
    return aiAssistantResponseSchema.parse({
      answer:
        "For shared expenses, record who paid, who participated, and each person's share. Then settle the smallest number of transfers so everyone reaches a zero balance cleanly.",
      suggestedActions: ["Create split expense", "Review balances", "Send settlement reminder"],
      confidence: 0.65,
      disclaimer: "Educational spending insight, not financial advice."
    });
  }

  return aiAssistantResponseSchema.parse({
    answer:
      "I can help turn your money question into a next step. Share the amount, timing, category, or goal you are considering, and I will compare it against your budget context.",
    suggestedActions: ["Ask about a purchase", "Check savings progress", "Review this month's budget"],
    confidence: 0.62,
    disclaimer: "Educational spending insight, not financial advice."
  });
};

export const askMoneyAssistant = async (
  question: string,
  conversation: AiAssistantMessageContext[] = []
): Promise<AiAssistantResponse> => {
  const response = await invokeAiFunction<AiAssistantResponse>("assistant", {
    question,
    conversation: conversation.slice(-8)
  });
  if (response) {
    return aiAssistantResponseSchema.parse(response);
  }

  return buildLocalAssistantResponse(question);
};
