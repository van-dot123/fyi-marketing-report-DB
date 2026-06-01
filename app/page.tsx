import Overview from "@/components/Overview";

export default function Home() {
  return <Overview missingKey={!process.env.GOOGLE_SHEETS_API_KEY} />;
}
