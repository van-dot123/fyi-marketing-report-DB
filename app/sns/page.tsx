import SnsView from "@/components/SnsView";
import { getGa4Days, getSnsPosts } from "@/lib/realData";

export default async function SnsPage() {
  const [posts, ga4] = await Promise.all([getSnsPosts(), getGa4Days()]);
  return <SnsView posts={posts} ga4={ga4} />;
}
