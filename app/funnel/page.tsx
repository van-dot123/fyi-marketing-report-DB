import FunnelView from "@/components/FunnelView";
import { getGa4Days, getMetaDays, getSnsPosts } from "@/lib/realData";

export default async function FunnelPage() {
  const [meta, ga4, sns] = await Promise.all([getMetaDays(), getGa4Days(), getSnsPosts()]);
  return <FunnelView meta={meta} ga4={ga4} sns={sns} />;
}
