import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "./stripe";
describe("Stripe webhook boundary", () => {
  const body = '{"id":"evt_test"}';
  const secret = "test-secret";
  const timestamp = 1700000000;
  const signature = createHmac("sha256",secret).update(`${timestamp}.${body}`).digest("hex");
  it("accepts valid signatures including rotated keys", () => {
    expect(verifyWebhook(body,`t=${timestamp},v1=${"0".repeat(64)},v1=${signature}`,secret,timestamp*1000)).toBe(true);
  });
  it("rejects forged, modified and replayed payloads", () => {
    expect(verifyWebhook(body,`t=${timestamp},v1=bad`,secret,timestamp*1000)).toBe(false);
    expect(verifyWebhook(body+" ",`t=${timestamp},v1=${signature}`,secret,timestamp*1000)).toBe(false);
    expect(verifyWebhook(body,`t=${timestamp},v1=${signature}`,secret,(timestamp+301)*1000)).toBe(false);
    expect(verifyWebhook(body,`t=nope,v1=${signature}`,secret,timestamp*1000)).toBe(false);
  });
});
