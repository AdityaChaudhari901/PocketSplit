import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";

import { CategorySelector } from "@/components/categories/CategorySelector";
import { CategoryPill } from "@/components/forms/CategoryPill";
import { TagSelector } from "@/components/tags/TagSelector";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { getLocalExportData, type ExportFormat, type ExportParams, type ExportScope } from "@/features/export/exportService";
import { useExport } from "@/features/export/hooks";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  initialParams?: Partial<ExportParams>;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

const defaultMonthRange = (date = new Date()): { fromDate: string; toDate: string } => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const end = new Date(year, month + 1, 0);
  return {
    fromDate: `${year}-${pad2(month + 1)}-01`,
    toDate: `${year}-${pad2(month + 1)}-${pad2(end.getDate())}`
  };
};

const scopeLabels: { label: string; value: ExportScope }[] = [
  { label: "Personal", value: "personal" },
  { label: "Group", value: "group" },
  { label: "All", value: "all" }
];

const formatLabels: { label: string; value: ExportFormat }[] = [
  { label: "CSV", value: "csv" },
  { label: "PDF", value: "pdf" }
];

export const ExportSheet = ({ visible, onClose, initialParams }: ExportSheetProps) => {
  const theme = useAppTheme();
  const profile = useAppStore((state) => state.profile);
  const transactions = useAppStore((state) => state.transactions);
  const categories = useAppStore((state) => state.categories);
  const tags = useAppStore((state) => state.tags);
  const expenseTags = useAppStore((state) => state.expenseTags);
  const groups = useAppStore((state) => state.groups);
  const groupExpenses = useAppStore((state) => state.groupExpenses);
  const settlements = useAppStore((state) => state.settlements);
  const exportMutation = useExport();
  const resetExportMutation = exportMutation.reset;
  const initialScope = initialParams?.scope;
  const initialFormat = initialParams?.format;
  const initialFromDate = initialParams?.fromDate;
  const initialToDate = initialParams?.toDate;
  const initialCategoryIds = initialParams?.categoryIds;
  const initialTagIds = initialParams?.tagIds;
  const initialGroupId = initialParams?.groupId;
  const initialIncludeSettlements = initialParams?.includeSettlements;

  const [scope, setScope] = useState<ExportScope>(initialScope ?? "personal");
  const [format, setFormat] = useState<ExportFormat>(initialFormat ?? "csv");
  const [fromDate, setFromDate] = useState<string>(() => initialFromDate ?? defaultMonthRange().fromDate);
  const [toDate, setToDate] = useState<string>(() => initialToDate ?? defaultMonthRange().toDate);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds ?? []);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds ?? []);
  const [groupId, setGroupId] = useState<string | undefined>(initialGroupId);
  const [includeSettlements, setIncludeSettlements] = useState<boolean>(Boolean(initialIncludeSettlements));

  useEffect(() => {
    if (!visible) {
      return;
    }

    const range = defaultMonthRange();
    setScope(initialScope ?? "personal");
    setFormat(initialFormat ?? "csv");
    setFromDate(initialFromDate ?? range.fromDate);
    setToDate(initialToDate ?? range.toDate);
    setCategoryIds(initialCategoryIds ?? []);
    setTagIds(initialTagIds ?? []);
    setGroupId(initialGroupId);
    setIncludeSettlements(Boolean(initialIncludeSettlements));
    resetExportMutation();
  }, [
    initialCategoryIds,
    initialFormat,
    initialFromDate,
    initialGroupId,
    initialIncludeSettlements,
    initialScope,
    initialTagIds,
    initialToDate,
    resetExportMutation,
    visible
  ]);

  const params: ExportParams = useMemo(
    () => ({
      scope,
      format,
      fromDate: fromDate.trim() || undefined,
      toDate: toDate.trim() || undefined,
      categoryIds,
      tagIds,
      groupId,
      includeSettlements: scope === "group" || scope === "all" ? includeSettlements : false
    }),
    [categoryIds, format, fromDate, groupId, includeSettlements, scope, tagIds, toDate]
  );

  const estimatedRows = useMemo(() => {
    if (!profile.id) {
      return 0;
    }

    const data = getLocalExportData(profile.id, params, {
      transactions,
      categories,
      tags,
      expenseTags,
      groups,
      groupExpenses,
      settlements
    });
    return data.summary.transactionCount;
  }, [categories, expenseTags, groupExpenses, groups, params, profile.id, settlements, tags, transactions]);

  const showGroupControls = scope === "group" || scope === "all";
  const activeGroups = groups.filter((group) => !group.deletedAt);
  const error = exportMutation.error instanceof Error ? exportMutation.error.message : null;

  const startExport = () => {
    exportMutation.mutate(params, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close export options" />
      <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText variant="title">Export data</AppText>
              <AppText muted>
                {estimatedRows} {estimatedRows === 1 ? "transaction" : "transactions"} will be exported.
              </AppText>
            </View>
            <Button variant="ghost" size="compact" icon="close" onPress={onClose} accessibilityLabel="Close export options" />
          </View>

          <View style={styles.section}>
            <AppText variant="label" muted>
              Scope
            </AppText>
            <View style={styles.pills}>
              {scopeLabels.map((item) => (
                <CategoryPill
                  key={item.value}
                  label={item.label}
                  selected={scope === item.value}
                  onPress={() => {
                    setScope(item.value);
                    if (item.value === "personal") {
                      setGroupId(undefined);
                      setIncludeSettlements(false);
                    }
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="label" muted>
              Format
            </AppText>
            <View style={styles.pills}>
              {formatLabels.map((item) => (
                <CategoryPill key={item.value} label={item.label} selected={format === item.value} onPress={() => setFormat(item.value)} />
              ))}
            </View>
          </View>

          <View style={styles.twoColumn}>
            <TextField label="From date" value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            <TextField label="To date" value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>

          {scope !== "group" ? (
            <>
              <CategorySelector
                categories={categories}
                selectedCategoryIds={categoryIds}
                mode="multiple"
                onChange={setCategoryIds}
              />
              <TagSelector tags={tags} selectedTagIds={tagIds} onChange={setTagIds} />
            </>
          ) : null}

          {showGroupControls ? (
            <View style={styles.section}>
              <AppText variant="label" muted>
                Group
              </AppText>
              {activeGroups.length > 0 ? (
                <View style={styles.pills}>
                  <CategoryPill label="All groups" selected={!groupId} onPress={() => setGroupId(undefined)} />
                  {activeGroups.map((group) => (
                    <CategoryPill key={group.id} label={group.name} selected={groupId === group.id} onPress={() => setGroupId(group.id)} />
                  ))}
                </View>
              ) : (
                <AppText variant="caption" muted>
                  No groups available for export.
                </AppText>
              )}
              <View style={[styles.toggleRow, { borderColor: theme.colors.border }]}>
                <View style={styles.toggleCopy}>
                  <AppText>Include settlements</AppText>
                  <AppText variant="caption" muted>
                    Add settlement rows to group exports.
                  </AppText>
                </View>
                <Switch value={includeSettlements} onValueChange={setIncludeSettlements} />
              </View>
            </View>
          ) : null}

          {exportMutation.isPending ? (
            <AppText muted>Generating your export...</AppText>
          ) : null}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerBorder }]}>
              <AppText style={{ color: theme.colors.danger }}>Export failed - please try again.</AppText>
              <AppText variant="caption" style={{ color: theme.colors.danger }}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button icon={format === "csv" ? "document-text" : "document"} loading={exportMutation.isPending} disabled={exportMutation.isPending} onPress={startExport}>
            Export as {format.toUpperCase()}
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.38)"
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "88%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: spacing.md
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: radius.pill
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  section: {
    gap: spacing.sm
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  twoColumn: {
    gap: spacing.md
  },
  toggleRow: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  toggleCopy: {
    flex: 1
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs
  }
});
