import SnsView from "@/components/SnsView";
import { getSnsPosts } from "@/lib/realData";

export default async function SnsPage() {
  const posts = await getSnsPosts();
  return <SnsView posts={posts} />;
}
