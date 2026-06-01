import PaidView from "@/components/PaidView";
import { getMetaDays } from "@/lib/realData";

export default async function PaidPage() {
  const meta = await getMetaDays();
  return <PaidView meta={meta} />;
}
