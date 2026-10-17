import PolicyPage, { policyMeta } from "@/components/PolicyPage";

export const dynamic = "force-dynamic";
export const metadata = policyMeta("faq");
export default function Page() { return <PolicyPage k="faq" />; }
