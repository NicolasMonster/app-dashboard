import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Meta Ads Credentials helpers
export async function saveMetaAdsCredentials(userId: number, accountId: string, accessToken: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { metaAdsCredentials } = await import("../drizzle/schema");

  await db.insert(metaAdsCredentials).values({
    userId,
    accountId,
    accessToken,
  }).onDuplicateKeyUpdate({
    set: {
      accountId,
      accessToken,
      updatedAt: new Date(),
    },
  });
}

export async function getMetaAdsCredentials(userId: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const { metaAdsCredentials } = await import("../drizzle/schema");
  const result = await db.select().from(metaAdsCredentials).where(eq(metaAdsCredentials.userId, userId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function deleteMetaAdsCredentials(userId: number) {
  const db = await getDb();
  if (!db) {
    return;
  }

  const { metaAdsCredentials } = await import("../drizzle/schema");
  await db.delete(metaAdsCredentials).where(eq(metaAdsCredentials.userId, userId));
}

// Meta Ads Cache helpers
export async function getCachedData(userId: number, cacheKey: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const { metaAdsCache } = await import("../drizzle/schema");
  const { and, gt } = await import("drizzle-orm");

  const result = await db.select().from(metaAdsCache)
    .where(
      and(
        eq(metaAdsCache.userId, userId),
        eq(metaAdsCache.cacheKey, cacheKey),
        gt(metaAdsCache.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length > 0 && result[0]) {
    try {
      return JSON.parse(result[0].data);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export async function setCachedData(userId: number, cacheKey: string, data: unknown, ttlMinutes: number = 30) {
  const db = await getDb();
  if (!db) {
    return;
  }

  const { metaAdsCache } = await import("../drizzle/schema");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await db.insert(metaAdsCache).values({
    userId,
    cacheKey,
    data: JSON.stringify(data),
    expiresAt,
  }).onDuplicateKeyUpdate({
    set: {
      data: JSON.stringify(data),
      expiresAt,
    },
  });
}

export async function clearExpiredCache() {
  const db = await getDb();
  if (!db) {
    return;
  }

  const { metaAdsCache } = await import("../drizzle/schema");
  const { lt } = await import("drizzle-orm");

  await db.delete(metaAdsCache).where(lt(metaAdsCache.expiresAt, new Date()));
}
