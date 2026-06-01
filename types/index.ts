export type MetaProduct = "April" | "K-Tuvi" | "Job-page";

export const ALLOWED_META_PRODUCTS: MetaProduct[] = [
  "April",
  "K-Tuvi",
  "Job-page",
];

export type SNSPlatform = "facebook" | "instagram" | "threads";

export interface MetaRow {
  date: string;
  isoWeek: number;
  product: MetaProduct;
  adName: string;
  audience: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
}

export interface WeeklyMeta {
  isoWeek: number;
  product: MetaProduct;
  audience: string[];
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  cpl: number;
  ctr: number;
}

export interface SNSPost {
  platform: SNSPlatform;
  date: string;
  isoWeek: number;
  pillar: string;
  reach: number;
  impressions: number;
  engagement: number;
}

export interface GA4Row {
  date: string;
  isoWeek: number;
  source: string;
  sessions: number;
  conversions: number;
}

export interface WoWResult {
  isoWeek: number;
  value: number;
  previous: number;
  pctChange: number;
  flag: boolean;
}
