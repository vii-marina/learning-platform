import { describe, expect, it, vi } from "vitest";

import { dedupeRequest } from "./requestDedup";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("dedupeRequest", () => {
  it("shares one in-flight request between concurrent callers of the same key", async () => {
    const pending = deferred<string>();
    const loader = vi.fn(() => pending.promise);

    const first = dedupeRequest("courses", loader);
    const second = dedupeRequest("courses", loader);

    expect(loader).toHaveBeenCalledTimes(1);
    pending.resolve("payload");
    await expect(Promise.all([first, second])).resolves.toEqual(["payload", "payload"]);
  });

  it("keeps different keys independent", async () => {
    const loader = vi.fn((value: string) => Promise.resolve(value));

    const [courses, modules] = await Promise.all([
      dedupeRequest("courses", () => loader("courses")),
      dedupeRequest("modules", () => loader("modules")),
    ]);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(courses).toBe("courses");
    expect(modules).toBe("modules");
  });

  // No caching by design: once a request settles the entry is dropped, so a later
  // refetch really does hit the network and cannot serve stale data.
  it("does not cache a settled request", async () => {
    const loader = vi.fn(() => Promise.resolve("payload"));

    await dedupeRequest("courses", loader);
    await dedupeRequest("courses", loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("propagates a rejection to every concurrent caller", async () => {
    const pending = deferred<string>();
    const loader = vi.fn(() => pending.promise);

    const first = dedupeRequest("courses", loader);
    const second = dedupeRequest("courses", loader);

    pending.reject(new Error("network down"));

    await expect(first).rejects.toThrow("network down");
    await expect(second).rejects.toThrow("network down");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  // A failed request must not poison the key — otherwise a retry would resolve
  // from the rejected promise forever.
  it("clears a failed request so a retry can run", async () => {
    const failing = vi.fn(() => Promise.reject(new Error("network down")));
    await expect(dedupeRequest("courses", failing)).rejects.toThrow("network down");

    const succeeding = vi.fn(() => Promise.resolve("payload"));
    await expect(dedupeRequest("courses", succeeding)).resolves.toBe("payload");
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});
