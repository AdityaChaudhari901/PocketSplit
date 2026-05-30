import { create } from "zustand";

export type GroupInviteMemberSource = "friends" | "contacts";

export interface GroupInviteMember {
  id: string;
  displayName: string;
  detail?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  source: GroupInviteMemberSource;
}

interface GroupInviteDraftState {
  selectedMembers: GroupInviteMember[];
  toggleMember: (member: GroupInviteMember) => void;
  removeMember: (memberId: string) => void;
  clearMembers: () => void;
}

export const useGroupInviteDraftStore = create<GroupInviteDraftState>((set) => ({
  selectedMembers: [],
  toggleMember: (member) =>
    set((state) => {
      if (state.selectedMembers.some((item) => item.id === member.id)) {
        return {
          selectedMembers: state.selectedMembers.filter((item) => item.id !== member.id)
        };
      }

      return {
        selectedMembers: [...state.selectedMembers, member]
      };
    }),
  removeMember: (memberId) =>
    set((state) => ({
      selectedMembers: state.selectedMembers.filter((item) => item.id !== memberId)
    })),
  clearMembers: () => set({ selectedMembers: [] })
}));
