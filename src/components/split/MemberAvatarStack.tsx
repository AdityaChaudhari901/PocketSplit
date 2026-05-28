import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/lib/theme";
import type { SplitMember } from "@/types/domain";

interface MemberAvatarStackProps {
  members: SplitMember[];
}

export const MemberAvatarStack = ({ members }: MemberAvatarStackProps) => {
  const theme = useAppTheme();
  return (
    <View style={styles.stack}>
      {members.slice(0, 4).map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.avatar,
            {
              backgroundColor: theme.colors.primarySoft,
              borderColor: theme.colors.surface,
              marginLeft: index === 0 ? 0 : -8
            }
          ]}
        >
          <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: "900" }}>
            {member.displayName.slice(0, 1).toUpperCase()}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    flexDirection: "row"
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  }
});
