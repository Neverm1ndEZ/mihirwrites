import MemoryGraph from "@/components/MemoryGraph";

export const metadata = { title: "Memory Graph · mihir writes" };
export const dynamic = "force-dynamic";

export default function GraphPage() {
  return <MemoryGraph />;
}
