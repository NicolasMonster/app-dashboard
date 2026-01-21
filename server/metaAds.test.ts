import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("metaAds.saveCredentials", () => {
  it("should save credentials successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.metaAds.saveCredentials({
      accountId: "123456789",
      accessToken: "test-token-abc123",
    });

    expect(result).toEqual({ success: true });
  });

  it("should reject empty account ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.metaAds.saveCredentials({
        accountId: "",
        accessToken: "test-token",
      })
    ).rejects.toThrow();
  });

  it("should reject empty access token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.metaAds.saveCredentials({
        accountId: "123456789",
        accessToken: "",
      })
    ).rejects.toThrow();
  });
});

describe("metaAds.getCredentials", () => {
  it("should return null when no credentials exist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First, delete any existing credentials
    await caller.metaAds.deleteCredentials();

    const result = await caller.metaAds.getCredentials();
    expect(result).toBeNull();
  });

  it("should return credentials after saving", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.metaAds.saveCredentials({
      accountId: "987654321",
      accessToken: "test-token-xyz789",
    });

    const result = await caller.metaAds.getCredentials();

    expect(result).toMatchObject({
      accountId: "987654321",
      hasToken: true,
    });
  });

  it("should not expose the full access token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.metaAds.saveCredentials({
      accountId: "111222333",
      accessToken: "secret-token-should-not-be-exposed",
    });

    const result = await caller.metaAds.getCredentials();

    expect(result).not.toHaveProperty("accessToken");
    expect(result).toHaveProperty("hasToken", true);
  });
});

describe("metaAds.deleteCredentials", () => {
  it("should delete credentials successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First save credentials
    await caller.metaAds.saveCredentials({
      accountId: "555666777",
      accessToken: "test-token-delete",
    });

    // Then delete them
    const deleteResult = await caller.metaAds.deleteCredentials();
    expect(deleteResult).toEqual({ success: true });

    // Verify they're gone
    const getResult = await caller.metaAds.getCredentials();
    expect(getResult).toBeNull();
  });
});
