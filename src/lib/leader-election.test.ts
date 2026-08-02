import { describe, expect, it, vi } from "vitest";
import { LEADER_LOCK_NAME } from "@/constants/channels.constants";
import { runIfLeader } from "@/lib/leader-election";

describe("runIfLeader", () => {
  it("runs the callback when Web Locks are unavailable", async () => {
    const fn = vi.fn();
    const ran = await runIfLeader(fn);
    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("runs the callback when the leader lock is available", async () => {
    const request = vi.fn(async (_name: string, _options: unknown, callback: (lock: unknown) => Promise<void>) => {
      await callback({});
    });
    vi.stubGlobal("navigator", { locks: { request } });

    const fn = vi.fn();
    const ran = await runIfLeader(fn);

    expect(ran).toBe(true);
    expect(request).toHaveBeenCalledWith(LEADER_LOCK_NAME, { ifAvailable: true }, expect.any(Function));
    expect(fn).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("skips the callback when the leader lock is already held", async () => {
    const request = vi.fn(async (_name: string, _options: unknown, callback: (lock: null) => Promise<void>) => {
      await callback(null);
    });
    vi.stubGlobal("navigator", { locks: { request } });

    const fn = vi.fn();
    const ran = await runIfLeader(fn);

    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
