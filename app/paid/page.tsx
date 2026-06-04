import PaidView from "@/components/PaidView";
import { getGa4Days, getMetaDays } from "@/lib/realData";

export default async function PaidPage() {
  const [meta, ga4] = await Promise.all([getMetaDays(), getGa4Days()]);
  console.log(`[paid] meta_ad_raw_data parsed rows: ${meta.length}`);
  console.log(`[paid] GA4_raw_data parsed rows: ${ga4.length}`);
  return <PaidView meta={meta} ga4={ga4} />;
}
