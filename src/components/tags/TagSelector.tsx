import { StyleSheet, View } from "react-native";

import { TagPill } from "@/components/tags/TagPill";
import { AppText } from "@/components/ui/AppText";
import { isTagArchived } from "@/features/tags/tagService";
import { spacing } from "@/lib/theme";
import type { Tag } from "@/types/domain";

interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export const TagSelector = ({ tags, selectedTagIds, onChange }: TagSelectorProps) => {
  const selected = new Set(selectedTagIds);
  const visibleTags = tags.filter((tag) => !isTagArchived(tag) || selected.has(tag.id)).sort((left, right) => left.name.localeCompare(right.name));

  const toggle = (tagId: string) => {
    if (selected.has(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }
    onChange([...selectedTagIds, tagId]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="label" muted>
          Tags
        </AppText>
        <AppText variant="caption" muted>
          {selectedTagIds.length} selected
        </AppText>
      </View>
      {visibleTags.length > 0 ? (
        <View style={styles.pills}>
          {visibleTags.map((tag) => (
            <TagPill key={tag.id} tag={{ ...tag, name: isTagArchived(tag) ? `${tag.name} (archived)` : tag.name }} selected={selected.has(tag.id)} muted={isTagArchived(tag)} onPress={() => toggle(tag.id)} />
          ))}
        </View>
      ) : (
        <AppText variant="caption" muted>
          Create tags from Settings to label expenses.
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
