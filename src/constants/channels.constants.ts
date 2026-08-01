/** BroadcastChannel name used to synchronize timer commands/snapshots across tabs. */
export const SYNC_CHANNEL_NAME = "pomodoro-sync";

/** Web Locks API lock name used for cross-tab leader election (see lib/leader-election.ts). */
export const LEADER_LOCK_NAME = "pomodoro-tab-leader";
