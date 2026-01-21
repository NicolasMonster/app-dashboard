import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Create a guest user when OAuth is not configured
function createGuestUser(): User {
  return {
    id: 0,
    openId: "guest",
    name: "Guest User",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // If OAuth is not configured and user is null, create a guest user
  if (!user && !ENV.oAuthServerUrl) {
    user = createGuestUser();
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
