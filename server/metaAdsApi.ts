import axios from "axios";

const META_API_VERSION = "v24.0";
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaAdsInsightsParams {
  accountId: string;
  accessToken: string;
  datePreset?: string;
  timeRange?: {
    since: string;
    until: string;
  };
  level?: "account" | "campaign" | "adset" | "ad";
  fields?: string[];
  timeGranularity?: "daily" | "monthly" | "all_days";
}

export interface MetaAdsInsight {
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  unique_clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  cpp?: string;
  video_p50_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p100_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  cost_per_action_type?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start?: string;
  date_stop?: string;
}

export interface MetaAdsCreative {
  id: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  video_id?: string;
  thumbnail_url?: string;
  object_story_spec?: {
    link_data?: {
      image_hash?: string;
      link?: string;
      message?: string;
      name?: string;
      picture?: string;
    };
    video_data?: {
      image_url?: string;
      video_id?: string;
      title?: string;
      message?: string;
    };
  };
}

/**
 * Fetch insights from Meta Ads API
 */
export async function fetchMetaAdsInsights(params: MetaAdsInsightsParams): Promise<MetaAdsInsight[]> {
  const {
    accountId,
    accessToken,
    datePreset = "last_30d",
    timeRange,
    level = "ad",
    fields = [
      "account_id",
      "account_name",
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "ad_id",
      "ad_name",
      "impressions",
      "reach",
      "frequency",
      "clicks",
      "unique_clicks",
      "spend",
      "ctr",
      "cpc",
      "cpm",
      "cpp",
      "video_p50_watched_actions",
      "video_p100_watched_actions",
      "actions",
      "action_values",
      "cost_per_action_type",
    ],
  } = params;

  const url = `${META_API_BASE_URL}/act_${accountId}/insights`;

  const queryParams: Record<string, string> = {
    access_token: accessToken,
    level,
    fields: fields.join(","),
  };

  if (timeRange) {
    queryParams.time_range = JSON.stringify(timeRange);
  } else {
    queryParams.date_preset = datePreset;
  }

  // Add time_granularity for daily breakdown
  if (params.timeGranularity) {
    queryParams.time_granularity = params.timeGranularity;
  } else if (timeRange) {
    // Default to daily when using custom date range
    queryParams.time_granularity = "daily";
  }

  try {
    const response = await axios.get(url, { params: queryParams });

    if (response.data && response.data.data) {
      return response.data.data as MetaAdsInsight[];
    }

    return [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Meta Ads API Error: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Fetch ad creative details
 */
export async function fetchAdCreative(adId: string, accessToken: string): Promise<MetaAdsCreative | null> {
  const url = `${META_API_BASE_URL}/${adId}`;

  const queryParams = {
    access_token: accessToken,
    fields: "creative{id,name,title,body,image_url,video_id,thumbnail_url,object_story_spec}",
  };

  try {
    const response = await axios.get(url, { params: queryParams });

    if (response.data && response.data.creative) {
      return response.data.creative as MetaAdsCreative;
    }

    return null;
  } catch (error) {
    console.error("Error fetching ad creative:", error);
    return null;
  }
}

/**
 * Fetch campaigns list
 */
export async function fetchCampaigns(accountId: string, accessToken: string) {
  const url = `${META_API_BASE_URL}/act_${accountId}/campaigns`;

  const queryParams = {
    access_token: accessToken,
    fields: "id,name,status,objective,daily_budget,lifetime_budget",
  };

  try {
    const response = await axios.get(url, { params: queryParams });

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Meta Ads API Error: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Calculate ROAS (Return on Ad Spend)
 */
export function calculateROAS(insight: MetaAdsInsight): number {
  const spend = parseFloat(insight.spend || "0");
  if (spend === 0) return 0;

  const purchaseValue = insight.action_values?.find((av) => av.action_type === "purchase" || av.action_type === "omni_purchase");

  if (purchaseValue) {
    const revenue = parseFloat(purchaseValue.value || "0");
    return revenue / spend;
  }

  return 0;
}

/**
 * Get conversion count from actions
 */
export function getConversionCount(insight: MetaAdsInsight): number {
  const conversion = insight.actions?.find(
    (action) =>
      action.action_type === "purchase" ||
      action.action_type === "omni_purchase" ||
      action.action_type === "offsite_conversion.fb_pixel_purchase"
  );

  return conversion ? parseFloat(conversion.value || "0") : 0;
}
