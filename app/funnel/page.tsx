import FunnelView from "@/components/FunnelView";
import { getGa4Days, getMetaDays } from "@/lib/realData";

export default async function FunnelPage() {
  const [meta, ga4] = await Promise.all([getMetaDays(), getGa4Days()]);
  return <FunnelView meta={meta} ga4={ga4} />;
}
