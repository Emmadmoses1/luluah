import PolicyPage, { policyMeta } from "@/components/PolicyPage";

export const dynamic = "force-dynamic";
export const metadata = policyMeta("returns");
export default function Page() { return <PolicyPage k="returns" />; }
