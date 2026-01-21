import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  metaAds: router({
    // Save or update Meta Ads credentials
    saveCredentials: protectedProcedure
      .input(
        z.object({
          accountId: z.string().min(1, "Account ID is required"),
          accessToken: z.string().min(1, "Access Token is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { saveMetaAdsCredentials } = await import("./db");
        await saveMetaAdsCredentials(ctx.user.id, input.accountId, input.accessToken);
        return { success: true };
      }),

    // Get user's Meta Ads credentials
    getCredentials: protectedProcedure.query(async ({ ctx }) => {
      const { getMetaAdsCredentials } = await import("./db");
      const credentials = await getMetaAdsCredentials(ctx.user.id);
      
      if (!credentials) {
        return null;
      }

      // Return credentials without exposing the full access token
      return {
        accountId: credentials.accountId,
        hasToken: true,
      };
    }),

    // Delete credentials
    deleteCredentials: protectedProcedure.mutation(async ({ ctx }) => {
      const { deleteMetaAdsCredentials } = await import("./db");
      await deleteMetaAdsCredentials(ctx.user.id);
      return { success: true };
    }),

    // Fetch insights with caching
    getInsights: protectedProcedure
      .input(
        z.object({
          datePreset: z.string().optional(),
          timeRange: z
            .object({
              since: z.string(),
              until: z.string(),
            })
            .optional(),
          level: z.enum(["account", "campaign", "adset", "ad"]).default("ad"),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMetaAdsCredentials, getCachedData, setCachedData } = await import("./db");
        const { fetchMetaAdsInsights } = await import("./metaAdsApi");

        // Get credentials
        const credentials = await getMetaAdsCredentials(ctx.user.id);
        if (!credentials) {
          throw new Error("No Meta Ads credentials found. Please configure your credentials first.");
        }

        // Create cache key
        const cacheKey = `insights_${input.level}_${input.datePreset || ""}_${JSON.stringify(input.timeRange || {})}`;

        // Check cache first
        const cachedData = await getCachedData(ctx.user.id, cacheKey);
        if (cachedData) {
          return cachedData;
        }

        // Fetch from API with daily granularity for timeline data
        const insights = await fetchMetaAdsInsights({
          accountId: credentials.accountId,
          accessToken: credentials.accessToken,
          datePreset: input.datePreset,
          timeRange: input.timeRange,
          level: input.level,
          timeGranularity: input.timeRange ? "daily" : undefined,
        });

        // Cache the result for 30 minutes
        await setCachedData(ctx.user.id, cacheKey, insights, 30);

        return insights;
      }),

    // Get aggregated metrics
    getMetrics: protectedProcedure
      .input(
        z.object({
          datePreset: z.string().optional(),
          timeRange: z
            .object({
              since: z.string(),
              until: z.string(),
            })
            .optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMetaAdsCredentials, getCachedData, setCachedData } = await import("./db");
        const { fetchMetaAdsInsights } = await import("./metaAdsApi");

        const credentials = await getMetaAdsCredentials(ctx.user.id);
        if (!credentials) {
          throw new Error("No Meta Ads credentials found. Please configure your credentials first.");
        }

        const cacheKey = `metrics_${input.datePreset || ""}_${JSON.stringify(input.timeRange || {})}`;

        const cachedData = await getCachedData(ctx.user.id, cacheKey);
        if (cachedData) {
          return cachedData;
        }

        const insights = await fetchMetaAdsInsights({
          accountId: credentials.accountId,
          accessToken: credentials.accessToken,
          datePreset: input.datePreset,
          timeRange: input.timeRange,
          level: "account",
          timeGranularity: input.timeRange ? "daily" : undefined,
        });

        // Aggregate metrics
        const metrics = {
          totalSpend: 0,
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          avgCTR: 0,
          avgCPC: 0,
          avgCPM: 0,
        };

        insights.forEach((insight) => {
          metrics.totalSpend += parseFloat(insight.spend || "0");
          metrics.totalImpressions += parseInt(insight.impressions || "0", 10);
          metrics.totalReach += parseInt(insight.reach || "0", 10);
          metrics.totalClicks += parseInt(insight.clicks || "0", 10);
        });

        // Calculate averages
        if (insights.length > 0) {
          const totalCTR = insights.reduce((sum, i) => sum + parseFloat(i.ctr || "0"), 0);
          const totalCPC = insights.reduce((sum, i) => sum + parseFloat(i.cpc || "0"), 0);
          const totalCPM = insights.reduce((sum, i) => sum + parseFloat(i.cpm || "0"), 0);

          metrics.avgCTR = totalCTR / insights.length;
          metrics.avgCPC = totalCPC / insights.length;
          metrics.avgCPM = totalCPM / insights.length;
        }

        await setCachedData(ctx.user.id, cacheKey, metrics, 30);

        return metrics;
      }),

    // Get rankings
    getRankings: protectedProcedure
      .input(
        z.object({
          datePreset: z.string().optional(),
          timeRange: z
            .object({
              since: z.string(),
              until: z.string(),
            })
            .optional(),
          sortBy: z.enum(["ctr", "cpc", "conversions", "roas"]).default("ctr"),
          limit: z.number().default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMetaAdsCredentials, getCachedData, setCachedData } = await import("./db");
        const { fetchMetaAdsInsights, calculateROAS, getConversionCount } = await import("./metaAdsApi");

        const credentials = await getMetaAdsCredentials(ctx.user.id);
        if (!credentials) {
          throw new Error("No Meta Ads credentials found. Please configure your credentials first.");
        }

        const cacheKey = `rankings_${input.sortBy}_${input.datePreset || ""}_${JSON.stringify(input.timeRange || {})}`;

        const cachedData = await getCachedData(ctx.user.id, cacheKey);
        if (cachedData) {
          return cachedData;
        }

        const insights = await fetchMetaAdsInsights({
          accountId: credentials.accountId,
          accessToken: credentials.accessToken,
          datePreset: input.datePreset,
          timeRange: input.timeRange,
          level: "ad",
        });

        // Add calculated fields
        const enrichedInsights = insights.map((insight) => ({
          ...insight,
          roas: calculateROAS(insight),
          conversions: getConversionCount(insight),
        }));

        // Sort based on criteria
        let sorted = [...enrichedInsights];
        switch (input.sortBy) {
          case "ctr":
            sorted.sort((a, b) => parseFloat(b.ctr || "0") - parseFloat(a.ctr || "0"));
            break;
          case "cpc":
            sorted.sort((a, b) => parseFloat(a.cpc || "999999") - parseFloat(b.cpc || "999999"));
            break;
          case "conversions":
            sorted.sort((a, b) => b.conversions - a.conversions);
            break;
          case "roas":
            sorted.sort((a, b) => b.roas - a.roas);
            break;
        }

        const topAds = sorted.slice(0, input.limit);

        await setCachedData(ctx.user.id, cacheKey, topAds, 30);

        return topAds;
      }),

    // Get ad creative
    getAdCreative: protectedProcedure
      .input(
        z.object({
          adId: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMetaAdsCredentials, getCachedData, setCachedData } = await import("./db");
        const { fetchAdCreative } = await import("./metaAdsApi");

        const credentials = await getMetaAdsCredentials(ctx.user.id);
        if (!credentials) {
          throw new Error("No Meta Ads credentials found.");
        }

        const cacheKey = `creative_${input.adId}`;

        const cachedData = await getCachedData(ctx.user.id, cacheKey);
        if (cachedData) {
          return cachedData;
        }

        const creative = await fetchAdCreative(input.adId, credentials.accessToken);

        // Cache for 24 hours (creatives don't change often)
        await setCachedData(ctx.user.id, cacheKey, creative, 1440);

        return creative;
      }),
  }),
});

export type AppRouter = typeof appRouter;
