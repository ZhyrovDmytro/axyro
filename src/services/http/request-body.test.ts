import { describe, expect, it, vi } from "vitest";
import { readRequestText } from "./request-body";

describe("bounded request bodies", () => {
  it("counts UTF-8 bytes rather than characters", async () => {
    const request = new Request("https://axyro.test", {
      method: "POST",
      body: "éé",
    });
    await expect(readRequestText(request, 3)).rejects.toMatchObject({
      status: 413,
    });
  });

  it.each([undefined, "1"])(
    "stops an oversized stream with content-length %s",
    async (length) => {
      const cancel = vi.fn();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("123"));
          controller.enqueue(new TextEncoder().encode("456"));
        },
        cancel,
      });
      const request = new Request("https://axyro.test", {
        method: "POST",
        body: stream,
        duplex: "half",
        headers: length ? { "content-length": length } : {},
      } as RequestInit);
      await expect(readRequestText(request, 4)).rejects.toMatchObject({
        status: 413,
      });
      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it("rejects a declared oversized body before reading it", async () => {
    const request = new Request("https://axyro.test", {
      method: "POST",
      body: "small",
      headers: { "content-length": "100" },
    });
    await expect(readRequestText(request, 10)).rejects.toMatchObject({
      status: 413,
    });
    expect(request.bodyUsed).toBe(false);
  });

  it("preserves chunk-split unicode at the exact limit", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xc3]));
        controller.enqueue(new Uint8Array([0xa9]));
        controller.close();
      },
    });
    const request = new Request("https://axyro.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readRequestText(request, 2)).toBe("é");
    expect(await readRequestText(new Request("https://axyro.test"), 2)).toBe(
      "",
    );
  });
});
