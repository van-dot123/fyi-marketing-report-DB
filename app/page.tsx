import Overview from "@/components/Overview";
import { getGa4Days, getMetaDays, getSnsPosts } from "@/lib/realData";

export default async function Home() {
  const [meta, ga4, sns] = await Promise.all([
    getMetaDays(),
    getGa4Days(),
    getSnsPosts(),
  ]);
  return (
    <Overview
      meta={meta}
      ga4={ga4}
      sns={sns}
      missingKey={!process.env.GOOGLE_SHEETS_API_KEY}
    />
  );
}
