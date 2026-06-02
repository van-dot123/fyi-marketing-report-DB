import PaidView from "@/components/PaidView";
import { getGa4Days, getMetaDays } from "@/lib/realData";

export default async function PaidPage() {
  const [meta, ga4] = await Promise.all([getMetaDays(), getGa4Days()]);
  return <PaidView meta={meta} ga4={ga4} />;
}
