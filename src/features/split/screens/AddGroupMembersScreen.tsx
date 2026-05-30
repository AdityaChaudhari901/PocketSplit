import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useGroupInviteDraftStore, type GroupInviteMember, type GroupInviteMemberSource } from "@/features/split/groupInviteDraftStore";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";
import type { SplitMember } from "@/types/domain";

type ContactChoice = "unset" | "always" | "once" | "declined";
type InviteStep = "choice" | "picker";

const FRIEND_CANDIDATES: GroupInviteMember[] = [
  { id: "friend-amit", displayName: "Amit Sharma", detail: "Friend on PocketSplit", email: "amit@pocketsplit.app", source: "friends" },
  { id: "friend-priya", displayName: "Priya Mehta", detail: "Friend on PocketSplit", email: "priya@pocketsplit.app", source: "friends" },
  { id: "friend-neha", displayName: "Neha Kapoor", detail: "Friend on PocketSplit", email: "neha@pocketsplit.app", source: "friends" }
];

const CONTACT_FIELDS = [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails];

const normalize = (value: string) => value.trim().toLowerCase();

const contactName = (contact: Contacts.Contact): string => {
  const fallbackName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return contact.name || fallbackName || "Unnamed contact";
};

const contactDetail = (contact: Contacts.Contact): Pick<GroupInviteMember, "detail" | "email" | "phoneNumber"> => {
  const phoneNumber = contact.phoneNumbers?.find((item) => item.number)?.number ?? null;
  const email = contact.emails?.find((item) => item.email)?.email ?? null;
  return {
    detail: phoneNumber ?? email ?? "Phone contact",
    email,
    phoneNumber
  };
};

const mapContact = (contact: Contacts.Contact, index: number): GroupInviteMember => {
  const details = contactDetail(contact);
  return {
    id: `contact-${contact.id ?? index}`,
    displayName: contactName(contact),
    source: "contacts",
    ...details
  };
};

export const AddGroupMembersScreen = () => {
  const router = useRouter();
  const { groupId, next } = useLocalSearchParams<{ groupId?: string; next?: string }>();
  const theme = useAppTheme();
  const group = useAppStore((state) => state.groups.find((item) => item.id === groupId && !item.deletedAt));
  const addGroupMembers = useAppStore((state) => state.addGroupMembers);
  const selectedMembers = useGroupInviteDraftStore((state) => state.selectedMembers);
  const toggleMember = useGroupInviteDraftStore((state) => state.toggleMember);
  const clearMembers = useGroupInviteDraftStore((state) => state.clearMembers);
  const [source, setSource] = useState<GroupInviteMemberSource>("friends");
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<ContactChoice>("unset");
  const [contactStatus, setContactStatus] = useState<Contacts.PermissionStatus | null>(null);
  const [contacts, setContacts] = useState<GroupInviteMember[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [step, setStep] = useState<InviteStep>("choice");

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    setContactsError(null);
    try {
      const available = await Contacts.isAvailableAsync();
      if (!available) {
        setContactsError("Contacts are not available on this device.");
        setContacts([]);
        return;
      }

      const response = await Contacts.getContactsAsync({
        fields: CONTACT_FIELDS,
        pageSize: 500,
        sort: Contacts.SortTypes.FirstName
      } as Parameters<typeof Contacts.getContactsAsync>[0]);
      setContacts(response.data.map(mapContact).filter((contact) => contact.displayName !== "Unnamed contact"));
    } catch {
      setContactsError("Could not load phone contacts.");
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      try {
        const permission = await Contacts.getPermissionsAsync();
        if (!mounted) return;
        setContactStatus(permission.status);
        if (permission.status === Contacts.PermissionStatus.GRANTED) {
          setChoice("always");
          await loadContacts();
        }
      } catch {
        if (mounted) {
          setContactsError("Could not check contacts permission.");
        }
      }
    };

    void checkPermission();
    return () => {
      mounted = false;
    };
  }, [loadContacts]);

  const requestContacts = async (nextChoice: Exclude<ContactChoice, "unset" | "declined">) => {
    setChoice(nextChoice);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      setContactStatus(permission.status);
      if (permission.status === Contacts.PermissionStatus.GRANTED) {
        await loadContacts();
        return;
      }

      setContacts([]);
      Alert.alert("Contacts not allowed", "You can still add app friends or share a group invite link.");
    } catch {
      setContactsError("Could not request contacts permission.");
    }
  };

  const declineContacts = () => {
    setChoice("declined");
    setContacts([]);
    setContactsError(null);
  };

  const visibleMembers = useMemo(() => {
    const members = source === "friends" ? FRIEND_CANDIDATES : contacts;
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return members;
    }

    return members.filter((member) => {
      const detail = member.detail ?? "";
      return normalize(member.displayName).includes(normalizedQuery) || normalize(detail).includes(normalizedQuery);
    });
  }, [contacts, query, source]);

  const hasContactsPermission = contactStatus === Contacts.PermissionStatus.GRANTED;
  const existingMemberNames = useMemo(() => new Set(group?.members.map((member) => member.displayName.trim().toLowerCase()) ?? []), [group?.members]);
  const shouldContinueToSplit = next === "split";
  const inviteLink = group ? `https://pocketsplit.app/join/${group.id.replace(/^group-/, "").slice(0, 8).toUpperCase()}` : null;

  const goBack = () => {
    if (step === "picker") {
      setStep("choice");
      return;
    }

    router.back();
  };

  const shareInviteLink = async () => {
    if (!group || !inviteLink) {
      Alert.alert("Create group first", "Create the group before sharing an invite link.");
      return;
    }

    try {
      await Share.share({
        title: `Join ${group.name} on PocketSplit`,
        message: `Join ${group.name} on PocketSplit: ${inviteLink}`,
        url: inviteLink
      });
    } catch {
      Alert.alert("Share failed", "Could not open the share sheet. Please try again.");
    }
  };

  const skipForNow = () => {
    if (groupId) {
      clearMembers();
      router.replace(`/modals/group-detail/${groupId}`);
      return;
    }

    router.back();
  };

  const done = () => {
    if (!groupId) {
      router.back();
      return;
    }

    if (shouldContinueToSplit && selectedMembers.length === 0) {
      Alert.alert("Add members first", "Add at least one member before creating the first split.");
      return;
    }

    if (selectedMembers.length > 0) {
      const now = Date.now();
      const members: SplitMember[] = selectedMembers
        .filter((member) => !existingMemberNames.has(member.displayName.trim().toLowerCase()))
        .map((member, index) => ({
          id: `member-${now}-${index}`,
          displayName: member.displayName,
          email: member.email ?? member.phoneNumber ?? null,
          role: "member"
        }));
      addGroupMembers(groupId, members);
      clearMembers();
    }

    if (shouldContinueToSplit) {
      router.replace(`/modals/add-split-expense?groupId=${groupId}`);
      return;
    }

    router.back();
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backControl,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              opacity: pressed ? 0.7 : 1
            }
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="hero">{step === "choice" ? "Invite members" : "Add members"}</AppText>
          <AppText muted>
            {step === "choice"
              ? "Add people directly or share the group link."
              : shouldContinueToSplit
                ? "Add members first. The split screen opens next."
                : "Search app friends or choose people from your phone contacts."}
          </AppText>
        </View>
      </View>

      {step === "choice" ? (
        <View style={styles.choiceStack}>
          <InviteChoice
            icon="person-add-outline"
            title="Add members"
            body="Choose friends or phone contacts"
            badge="Recommended"
            onPress={() => setStep("picker")}
          />
          <InviteChoice
            icon="link-outline"
            title="Share a link"
            body="Send the group invite URL"
            onPress={shareInviteLink}
          />
        </View>
      ) : null}

      {step === "picker" ? (
        <>
      <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Search name, phone, or email" leftIcon="search-outline" />

      <View style={[styles.segment, { backgroundColor: theme.colors.surfaceMuted }]}>
        <SegmentButton label="Friends" icon="people-outline" selected={source === "friends"} onPress={() => setSource("friends")} />
        <SegmentButton label="Contacts" icon="call-outline" selected={source === "contacts"} onPress={() => setSource("contacts")} />
      </View>

      {selectedMembers.length > 0 ? (
        <View style={styles.selectedWrap}>
          {selectedMembers.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${member.displayName}`}
              onPress={() => toggleMember(member)}
              style={[styles.memberChip, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder }]}
            >
              <AppText variant="caption" style={{ color: theme.colors.primary }}>
                {member.displayName}
              </AppText>
              <Ionicons name="close" size={14} color={theme.colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {source === "contacts" && !hasContactsPermission ? (
        <ContactsPermissionCard choice={choice} onAllowAlways={() => requestContacts("always")} onAllowOnce={() => requestContacts("once")} onDecline={declineContacts} />
      ) : null}

      {source === "contacts" && hasContactsPermission && loadingContacts ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <AppText muted>Loading contacts...</AppText>
        </Card>
      ) : null}

      {source === "contacts" && hasContactsPermission && contactsError ? (
        <EmptyState icon="alert-circle" title="Contacts unavailable" body={contactsError} actionLabel="Try again" onAction={loadContacts} />
      ) : null}

      {(source === "friends" || hasContactsPermission) && !loadingContacts && !contactsError ? (
        <Card style={styles.listCard}>
          <View style={styles.listHeader}>
            <AppText variant="subtitle">{source === "friends" ? "Friends on this app" : "Phone contacts"}</AppText>
            <AppText variant="caption" muted>
              {visibleMembers.length} results
            </AppText>
          </View>
          {visibleMembers.length > 0 ? (
            visibleMembers.map((member) => (
              <MemberRow key={member.id} member={member} selected={selectedMembers.some((item) => item.id === member.id)} onPress={() => toggleMember(member)} />
            ))
          ) : (
            <EmptyState icon="search" title="No members found" body="Try another name, phone number, or email." />
          )}
        </Card>
      ) : null}

      <View style={styles.footerActions}>
        {shouldContinueToSplit ? (
          <Button variant="secondary" icon="arrow-forward-circle-outline" onPress={skipForNow}>
            Skip for now
          </Button>
        ) : null}
        <Button icon="checkmark-circle" onPress={done}>
          {shouldContinueToSplit ? "Continue to split" : "Done"}
        </Button>
      </View>
        </>
      ) : null}
    </Screen>
  );
};

const InviteChoice = ({
  icon,
  title,
  body,
  badge,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  badge?: string;
  onPress: () => void;
}) => {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
          opacity: pressed ? 0.82 : 1
        }
      ]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name={icon} size={23} color={theme.colors.primary} />
      </View>
      <View style={styles.choiceCopy}>
        <View style={styles.choiceTitleRow}>
          <AppText variant="subtitle" style={{ color: theme.colors.text }} numberOfLines={1}>
            {title}
          </AppText>
          {badge ? (
            <View style={[styles.choiceBadge, { backgroundColor: theme.colors.primarySoft }]}>
              <AppText variant="caption" style={styles.choiceBadgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" muted numberOfLines={1}>
          {body}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={21} color={theme.colors.primary} />
    </Pressable>
  );
};

const ContactsPermissionCard = ({
  choice,
  onAllowAlways,
  onAllowOnce,
  onDecline
}: {
  choice: ContactChoice;
  onAllowAlways: () => void;
  onAllowOnce: () => void;
  onDecline: () => void;
}) => {
  const theme = useAppTheme();
  return (
    <Card style={styles.permissionCard}>
      <View style={[styles.permissionIcon, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.permissionCopy}>
        <AppText variant="subtitle">Allow contacts?</AppText>
        <AppText muted>PocketSplit uses contacts only to add people to this group. Your phone controls the final system permission dialog.</AppText>
      </View>
      <View style={styles.permissionActions}>
        <Button variant="secondary" icon="checkmark-circle-outline" onPress={onAllowAlways}>
          Allow always
        </Button>
        <Button variant="secondary" icon="time-outline" onPress={onAllowOnce}>
          Allow this time
        </Button>
        <Button variant="ghost" icon={choice === "declined" ? "close-circle" : "close-circle-outline"} onPress={onDecline}>
          Decline
        </Button>
      </View>
    </Card>
  );
};

const SegmentButton = ({ label, icon, selected, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; onPress: () => void }) => {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.segmentButton,
        {
          backgroundColor: selected ? theme.colors.surface : "transparent",
          shadowColor: selected ? theme.colors.shadow : "transparent"
        }
      ]}
    >
      <Ionicons name={icon} size={17} color={selected ? theme.colors.primary : theme.colors.subtext} />
      <AppText variant="caption" style={{ color: selected ? theme.colors.primary : theme.colors.subtext, fontWeight: "800" }}>
        {label}
      </AppText>
    </Pressable>
  );
};

const MemberRow = ({ member, selected, onPress }: { member: GroupInviteMember; selected: boolean; onPress: () => void }) => {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.memberRow,
        {
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.primaryBorder : theme.colors.border,
          opacity: pressed ? 0.76 : 1
        }
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: selected ? theme.colors.primary : theme.colors.surface }]}>
        <AppText variant="caption" style={{ color: selected ? theme.colors.onPrimary : theme.colors.primary }}>
          {member.displayName.slice(0, 1)}
        </AppText>
      </View>
      <View style={styles.memberCopy}>
        <AppText>{member.displayName}</AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {member.detail}
        </AppText>
      </View>
      <Ionicons name={selected ? "checkmark-circle" : "add-circle-outline"} size={23} color={selected ? theme.colors.primary : theme.colors.subtext} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 120
  },
  header: {
    gap: spacing.lg
  },
  backControl: {
    alignSelf: "flex-start",
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 3
  },
  headerCopy: {
    gap: spacing.xs
  },
  footerActions: {
    gap: spacing.sm
  },
  choiceStack: {
    gap: spacing.md
  },
  choiceRow: {
    height: 92,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 4
  },
  choiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  choiceCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs
  },
  choiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  choiceBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  choiceBadgeText: {
    color: "#1769E0",
    fontWeight: "800",
    fontSize: 11,
    lineHeight: 14
  },
  segment: {
    minHeight: 54,
    borderRadius: radius.lg,
    flexDirection: "row",
    padding: spacing.xs,
    gap: spacing.xs
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2
  },
  selectedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  memberChip: {
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md
  },
  permissionCard: {
    gap: spacing.md
  },
  permissionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center"
  },
  permissionCopy: {
    gap: spacing.xs
  },
  permissionActions: {
    gap: spacing.sm
  },
  loadingCard: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  listCard: {
    gap: spacing.md
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  memberRow: {
    minHeight: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  memberCopy: {
    flex: 1,
    minWidth: 0
  }
});
