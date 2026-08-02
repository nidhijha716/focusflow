import { SYNC_CHANNEL_NAME } from "@/constants/channels.constants";
import { createTypedBroadcastChannel, type TypedBroadcastChannel } from "@/lib/broadcast-channel";
import type { TimerEvent, TimerSnapshot } from "@/types/timer.types";

/**
 * Cross-tab message contract (02_Technical_Architecture §6): commands and
 * authoritative snapshots travel over the same channel. Consumers apply
 * `snapshot` messages directly and treat `command` messages as intents to
 * replay through the local FSM — completion handling must stay idempotent
 * regardless of which tab is leader (see lib/leader-election.ts).
 */
export type SyncMessage =
  | { kind: "command"; event: TimerEvent; sentAt: number }
  | { kind: "snapshot"; snapshot: TimerSnapshot; sentAt: number };

let channel: TypedBroadcastChannel<SyncMessage> | null | undefined;

function getChannel(): TypedBroadcastChannel<SyncMessage> | null {
  if (channel === undefined) {
    channel = createTypedBroadcastChannel<SyncMessage>(SYNC_CHANNEL_NAME);
  }
  return channel;
}

export function broadcastCommand(event: TimerEvent): void {
  getChannel()?.postMessage({ kind: "command", event, sentAt: Date.now() });
}

export function broadcastSnapshot(snapshot: TimerSnapshot): void {
  getChannel()?.postMessage({ kind: "snapshot", snapshot, sentAt: Date.now() });
}

export function subscribeToSync(listener: (message: SyncMessage) => void): () => void {
  const activeChannel = getChannel();
  if (!activeChannel) return () => {};
  return activeChannel.subscribe(listener);
}

export function closeSyncChannel(): void {
  channel?.close();
  channel = null;
}
