import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { spacing, useAppTheme } from "@/lib/theme";
import { askMoneyAssistant, type AiAssistantMessageContext } from "@/services/ai.service";
import { canUseFeature, getPlanLimits } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";

const PROMPTS = [
  "Can I afford this?",
  "Budget check",
  "Find subscriptions",
  "Safe daily spend",
  "Split balances"
] as const;

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  actions?: string[];
  disclaimer?: string;
  tone?: "default" | "error";
}

const createMessageId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getUsageLabel = (entitlement: ReturnType<typeof useAppStore.getState>["entitlement"]): string => {
  const limit = getPlanLimits(entitlement.planId).aiAssistantQuestions;
  if (limit === "unlimited") {
    return "Premium";
  }

  return `${entitlement.usage.ai_assistant ?? 0}/${limit}`;
};

const getConversationContext = (messages: ChatMessage[]): AiAssistantMessageContext[] =>
  messages
    .filter((message) => message.tone !== "error")
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.disclaimer ? `${message.content}\n${message.disclaimer}` : message.content
    }));

export const AIAssistantScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const profile = useAppStore((state) => state.profile);
  const entitlement = useAppStore((state) => state.entitlement);
  const consumeFeatureUsage = useAppStore((state) => state.consumeFeatureUsage);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const canAsk = canUseFeature(entitlement, "ai_assistant");
  const usageLabel = useMemo(() => getUsageLabel(entitlement), [entitlement]);
  const avatarInitial = profile.displayName.trim().charAt(0).toUpperCase() || "M";

  const submit = async (overrideQuestion?: string) => {
    const trimmedQuestion = (overrideQuestion ?? question).trim();
    if (!trimmedQuestion || loading) {
      return;
    }

    if (!canAsk) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: "AI chat is available on Pro and Premium. Upgrade to continue this conversation.",
          actions: ["View plans"],
          tone: "error"
        }
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedQuestion
    };
    const context = getConversationContext([...messages, userMessage]);

    setQuestion("");
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await askMoneyAssistant(trimmedQuestion, context);
      consumeFeatureUsage("ai_assistant");
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          actions: response.suggestedActions,
          disclaimer: response.disclaimer
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: error instanceof Error ? error.message : "I could not connect to the AI service. Please try again.",
          actions: ["Try again"],
          tone: "error"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const hasMessages = messages.length > 0;
  const onPrimaryText = theme.colors.onPrimary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.canvas }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="arrow-back" size={21} color={theme.colors.text} />
          </Pressable>

          <View style={[styles.usagePill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="diamond" size={13} color={theme.colors.primary} />
            <AppText style={[styles.usageText, { color: theme.colors.text }]}>{usageLabel}</AppText>
          </View>

          <View
            accessibilityLabel={`${profile.displayName} profile`}
            style={[styles.avatar, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder }]}
          >
            <AppText style={[styles.avatarText, { color: theme.colors.text }]}>{avatarInitial}</AppText>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, hasMessages ? styles.contentWithMessages : null]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {!hasMessages ? (
            <View style={styles.hero}>
              <View style={[styles.heroMark, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
                <Ionicons name="pulse-outline" size={28} color={theme.colors.primary} />
              </View>
              <View style={[styles.heroRule, { backgroundColor: theme.colors.border }]} />
              <AppText style={[styles.heroTitle, { color: theme.colors.text }]}>Hello, how can I help?</AppText>
              <AppText style={[styles.heroCopy, { color: theme.colors.subtext }]}>Ask about spending, bills, budgets, savings, receipts, or shared expenses.</AppText>
            </View>
          ) : null}

          <View style={[styles.thread, hasMessages ? styles.threadActive : null]}>
            {messages.map((message) => (
              <View key={message.id} style={[styles.messageRow, message.role === "user" ? styles.userRow : styles.assistantRow]}>
                {message.role === "assistant" ? (
                  <View style={[styles.assistantMark, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="pulse-outline" size={15} color={theme.colors.primary} />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.messageBubble,
                    message.role === "user"
                      ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
                      : [styles.assistantBubble, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }],
                    message.tone === "error" ? [styles.errorBubble, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warningBorder }] : null
                  ]}
                >
                  <AppText style={[styles.messageText, { color: message.role === "user" ? onPrimaryText : theme.colors.text }]}>
                    {message.content}
                  </AppText>
                  {message.disclaimer ? <AppText style={[styles.disclaimerText, { color: theme.colors.subtext }]}>{message.disclaimer}</AppText> : null}
                  {message.actions?.length ? (
                    <View style={styles.actionRow}>
                      {message.actions.map((action) => (
                        <Pressable
                          key={action}
                          accessibilityRole="button"
                          accessibilityLabel={action}
                          onPress={() => setQuestion(action)}
                          style={({ pressed }) => [
                            styles.actionChip,
                            { backgroundColor: pressed ? theme.colors.primaryBorder : theme.colors.primarySoft }
                          ]}
                        >
                          <AppText style={[styles.actionChipText, { color: theme.colors.primary }]}>{action}</AppText>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ))}

            {loading ? (
              <View style={[styles.messageRow, styles.assistantRow]}>
                <View style={[styles.assistantMark, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="pulse-outline" size={15} color={theme.colors.primary} />
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
                  <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.typingDot, styles.typingDotMuted, { backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.typingDot, styles.typingDotFaint, { backgroundColor: theme.colors.primary }]} />
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.bottomDock}>
          {!hasMessages ? (
            <View style={styles.chips}>
              {PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  accessibilityRole="button"
                  accessibilityLabel={prompt}
                  onPress={() => void submit(prompt)}
                  style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surfaceMuted }]}
                >
                  <AppText style={[styles.chipText, { color: theme.colors.text }]}>{prompt}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!canAsk ? (
            <View style={[styles.lockedBanner, { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warningBorder }]}>
              <Ionicons name="lock-closed" size={13} color={theme.colors.warning} />
              <AppText style={[styles.lockedText, { color: theme.colors.warning }]}>Upgrade to Pro or Premium to chat with PocketSplit AI.</AppText>
            </View>
          ) : null}

          <View style={[styles.composer, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Message PocketSplit"
              placeholderTextColor={theme.colors.subtext}
              multiline
              maxLength={280}
              returnKeyType="send"
              style={[styles.input, { color: theme.colors.text }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Voice input" style={styles.voiceButton}>
              <Ionicons name="mic-outline" size={20} color={theme.colors.subtext} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={loading || !question.trim()}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: loading || !question.trim() ? 0.48 : pressed ? 0.84 : 1
                }
              ]}
            >
              {loading ? <ActivityIndicator color={onPrimaryText} size="small" /> : <Ionicons name="send" size={17} color={onPrimaryText} />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  keyboard: {
    flex: 1
  },
  header: {
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  usagePill: {
    minHeight: 36,
    minWidth: 102,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  usageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 68,
    paddingBottom: 212
  },
  contentWithMessages: {
    paddingTop: spacing.lg,
    paddingBottom: 104
  },
  hero: {
    alignItems: "center"
  },
  heroMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6
  },
  heroRule: {
    marginTop: spacing.lg,
    width: "76%",
    height: 1
  },
  heroTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center"
  },
  heroCopy: {
    marginTop: spacing.sm,
    maxWidth: 270,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center"
  },
  thread: {
    marginTop: spacing.xl,
    gap: spacing.md
  },
  threadActive: {
    marginTop: 0
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  assistantRow: {
    justifyContent: "flex-start"
  },
  userRow: {
    justifyContent: "flex-end"
  },
  assistantMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center"
  },
  messageBubble: {
    maxWidth: "84%",
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  assistantBubble: {
    borderBottomLeftRadius: 8,
    borderWidth: 1
  },
  userBubble: {
    borderBottomRightRadius: 8
  },
  errorBubble: {},
  messageText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  disclaimerText: {
    marginTop: spacing.sm,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600"
  },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  actionChip: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  actionChipText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800"
  },
  typingBubble: {
    minWidth: 68,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  typingDotMuted: {
    opacity: 0.62
  },
  typingDotFaint: {
    opacity: 0.34
  },
  bottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.md,
    gap: spacing.sm
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm
  },
  chip: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  chipText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800"
  },
  lockedBanner: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1
  },
  lockedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  composer: {
    minHeight: 54,
    maxHeight: 102,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1
  },
  input: {
    flex: 1,
    minHeight: 34,
    maxHeight: 64,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    paddingTop: Platform.OS === "ios" ? 8 : 6,
    paddingBottom: 6
  },
  voiceButton: {
    width: 32,
    height: 34,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  }
});
