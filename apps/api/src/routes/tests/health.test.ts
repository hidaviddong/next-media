import { testClient } from "hono/testing";
import { describe, test, expect } from "vitest";
import app from "../../index.js";

describe("health", () => {
  const client = testClient(app);
  test("should return 200 OK", async () => {
    const res = await client.api.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "OK" });
  });
});
