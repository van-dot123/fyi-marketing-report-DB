import SnsView from "@/components/SnsView";
import { getGa4Days, getSnsData } from "@/lib/realData";

export default async function SnsPage() {
  const [{ posts, followers }, ga4] = await Promise.all([getSnsData(), getGa4Days()]);
  return <SnsView posts={posts} followers={followers} ga4={ga4} />;
}
