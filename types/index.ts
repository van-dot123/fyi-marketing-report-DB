export type MetaProduct = "April" | "K-Tuvi" | "Job-page";

export type CampaignType = "salary" | "job";

export const SALARY_PRODUCTS: MetaProduct[] = ["April"];
export const JOB_PRODUCTS: MetaProduct[] = ["K-Tuvi", "Job-page"];

export const ALLOWED_META_PRODUCTS: MetaProduct[] = [
  ...SALARY_PRODUCTS,
  ...JOB_PRODUCTS,
];

export function campaignTypeOf(product: MetaProduct): CampaignType {
  return SALARY_PRODUCTS.includes(product) ? "salary" : "job";
}

export type SNSPlatform = "facebook" | "instagram" | "threads";

export interface MetaRow {
  date: string;
  isoWeek: number;
  product: MetaProduct;
  campaignType: CampaignType;
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
  campaignType: CampaignType;
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
  views: number;
  reach: number;
  impressions: number;
  engagement: number;
  interactions: number;
}

export interface GA4Row {
  date: string;
  isoWeek: number;
  source: string;
  campaign: string;
  landingPage: string;
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
