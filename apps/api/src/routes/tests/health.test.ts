import { Hono } from "hono";
import { testClient } from "hono/testing";
import { describe, it, test, expect } from "vitest";
import app from "../../index.js";
import type { Variables } from "../../type.js";

describe("health", () => {
  const client = testClient(app);
  test("should return 200 OK", async () => {
    const res = await client.api.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "OK" });
  });
});
