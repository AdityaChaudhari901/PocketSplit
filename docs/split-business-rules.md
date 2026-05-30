# Split Feature Business Rules

Status: Locked for MVP
Last updated: 2026-05-30

## Canonical Flow

1. User creates a group with a name and optional description.
2. The group is created immediately. The creator becomes the first admin and first member.
3. User is routed to Add members.
4. After adding members, user continues to Add split expense.
5. If user chooses Skip for now, route to group detail and show a persistent nudge until a second active member exists.

## Members

- A group can exist with only the creator.
- Adding a split expense requires at least two active members.
- Active member means any member, including placeholder contacts, excluding archived or removed members.
- Contacts without the app become placeholder members tracked by name, phone, or email.
- Placeholder members can owe and be owed money, and they count toward the two-member minimum.
- App friends can become linked members with full access.
- Duplicate members must be blocked by app user ID, email, phone, or the same name plus contact detail.

## Splitting

- Equal split recalculates automatically when members are excluded.
- Excluded members owe zero for that expense.
- Exact, custom, and itemized splits must total exactly the bill amount.
- Percentage split must total exactly 100%.
- Shares must be positive.
- Only members of the selected group can appear in a split.
- All money calculations use minor units. Do not use floating point for internal money logic.

## Balances

- Balances are derived from group expenses and confirmed settlements only.
- For each expense, the payer is credited the full amount.
- Each included participant is debited their share.
- Pending and disputed settlements do not affect balances.
- Debt simplification is on demand from Settle Up. It is not automatic.

When settlement confirmation ships, balances should be recalculated from source data: expenses plus confirmed settlements. Do not apply settlements incrementally on top of previously cached balances.

## Settlement Lifecycle

```text
pending -> confirmed
pending -> disputed
disputed -> pending
disputed -> deleted
```

- Pending means the payer claims payment happened.
- Confirmed means the receiver confirmed receipt and the balance can be reduced.
- Disputed means the receiver rejected the claim and the balance remains unchanged.
- Disputed settlements can be resubmitted or deleted by the payer.
- One-sided paid marking never clears a balance.
- UPI, bank transfer, QR payment, and real money movement are out of scope.

## Admin

- The creator is the first admin.
- A group must always have at least one admin.
- Admin transfer rules are deferred until remove member or leave group is implemented.
- When leave/remove exists, the only admin must transfer admin first or the longest-standing active member must be promoted automatically.

## Invite Links

- Share link is available after group creation because the group needs an ID first.
- Current implementation is a shareable deep-link placeholder. It does not automatically add members.
- UI copy must not imply automatic join until backend join acceptance exists.
- Production invite links need backend link creation, expiry, revocation, and accept/reject tracking.

## MVP Cleanup Order

1. Add Skip for now on Add members.
2. Show group-detail nudge if the group has only one active member.
3. Block Add expense unless the group has at least two active members.
4. Add settlement confirmation and reject flow.
5. Update balance calculation to apply confirmed settlements.
6. Add admin transfer rules when leave/remove member ships.

## Out Of Scope

- UPI, bank sync, QR payments, or any real payment movement.
- Real-time sync across devices.
- Recurring group bills.
- Push reminders for unpaid balances.
- True app-friend discovery.
- Automatic debt simplification.
