import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

import { DayDot } from "@/components/calendar/DayDot";
import { AppText } from "@/components/ui/AppText";
import type { DayExpenseSummary } from "@/features/calendar/calendarService";
import { radius, spacing, useAppTheme } from "@/lib/theme";

interface MonthCalendarProps {
  year: number;
  month: number;
  summaries: DayExpenseSummary[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

interface DayCellProps {
  date?: DateData;
  state?: string;
}

const monthTitle = (year: number, month: number): string =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));

const todayKey = new Date().toISOString().slice(0, 10);

export const MonthCalendar = memo(({ year, month, summaries, selectedDate, onSelectDate, onPreviousMonth, onNextMonth }: MonthCalendarProps) => {
  const theme = useAppTheme();
  const summaryByDate = useMemo(() => new Map(summaries.map((summary) => [summary.date, summary])), [summaries]);
  const current = `${year}-${`${month}`.padStart(2, "0")}-01`;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPreviousMonth}
          style={({ pressed }) => [styles.navButton, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.pressed : null]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <AppText variant="subtitle" style={styles.monthTitle}>
          {monthTitle(year, month)}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={onNextMonth}
          style={({ pressed }) => [styles.navButton, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.pressed : null]}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <Calendar
        key={current}
        current={current}
        hideArrows
        hideExtraDays
        firstDay={1}
        renderHeader={() => null}
        theme={{
          calendarBackground: theme.colors.surface,
          dayTextColor: theme.colors.text,
          monthTextColor: theme.colors.text,
          textDisabledColor: theme.colors.subtext,
          textSectionTitleColor: theme.colors.subtext,
          textDayFontWeight: "700",
          textMonthFontWeight: "900",
          textDayHeaderFontWeight: "800",
          todayTextColor: theme.colors.primary
        }}
        dayComponent={({ date, state }: DayCellProps) => {
          if (!date) {
            return <View style={styles.dayCell} />;
          }

          const summary = summaryByDate.get(date.dateString);
          const selected = selectedDate === date.dateString;
          const isToday = date.dateString === todayKey;
          const disabled = state === "disabled";
          const hasIncome = Boolean(summary && summary.totalIncomeMinor > 0);
          const hasExpense = Boolean(summary && summary.totalExpenseMinor > 0);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${date.dateString}`}
              accessibilityState={{ selected }}
              disabled={disabled}
              onPress={() => onSelectDate(date.dateString)}
              style={({ pressed }) => [
                styles.dayCell,
                selected ? { backgroundColor: theme.colors.primary } : null,
                !selected && isToday ? { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder, borderWidth: 1 } : null,
                pressed ? styles.pressed : null
              ]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.dayText,
                  {
                    color: selected ? theme.colors.onPrimary : disabled ? theme.colors.subtext : isToday ? theme.colors.primary : theme.colors.text
                  }
                ]}
              >
                {date.day}
              </AppText>
              <View style={styles.dots}>
                {hasIncome ? <DayDot tone="income" /> : null}
                {hasExpense ? <DayDot tone="expense" /> : null}
              </View>
            </Pressable>
          );
        }}
        style={styles.calendar}
      />
    </View>
  );
});

MonthCalendar.displayName = "MonthCalendar";

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.md,
    overflow: "hidden"
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  monthTitle: {
    flex: 1,
    textAlign: "center"
  },
  calendar: {
    borderRadius: radius.lg
  },
  dayCell: {
    width: 38,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  dayText: {
    fontWeight: "900"
  },
  dots: {
    minHeight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  pressed: {
    opacity: 0.72
  }
});
