import PolicyPage, { policyMeta } from "@/components/PolicyPage";

export const dynamic = "force-dynamic";
export const metadata = policyMeta("shipping-policy");
export default function Page() { return <PolicyPage k="shipping-policy" />; }
