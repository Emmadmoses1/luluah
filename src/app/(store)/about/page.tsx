import PolicyPage, { policyMeta } from "@/components/PolicyPage";

export const dynamic = "force-dynamic";
export const metadata = policyMeta("about");
export default function Page() { return <PolicyPage k="about" />; }
