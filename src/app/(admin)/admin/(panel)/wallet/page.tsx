import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getWalletSettings } from "@/lib/wallet";
import { likeEscape } from "@/lib/arabic";
import Badge from "@/components/admin/Badge";
import Field from "@/components/admin/Field";
import { adjustWallet, refundOrderAction, saveWalletConfig, setAccountFlag } from "@/app/(admin)/admin/wallet-actions";

const MSG: Record<string, string> = {
  limits: "Limits: minimum at least 1.000 BHD, minimum ≤ maximum ≤ daily limit.", currency: "The card pay currency must be a provider currency code such as usdttrc20.",
  template: "The card link template must be an https link and may only use {address} {amount_usd} {amount_crypto} {currency} {ref} {email}.",
  email: "Set up email first (customers must verify their email). See Admin → Emails.", payments: "Set up the payment provider first (Admin → Payment settings).",
  adjust: "Enter the account email, a non-zero amount (use - for a debit) and a reason of at least 3 characters.", noaccount: "No account with that email.",
  insufficient: "That would take the balance below zero.", ref: "Enter a valid order reference.", refund: "The refund was not possible.",
};
const bhd = (m: string | number) => (Number(m) / 1000).toFixed(3);
const f = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

export default async function WalletAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; m?: string; q?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const ws = await getWalletSettings();
  const search = (q.q ?? "").trim().slice(0, 80);
  const like = `%${likeEscape(search)}%`;

  const [t] = await sql<{ accounts: string; liability: string; today: string; mismatches: string }[]>`
    select (select count(*) from accounts) as accounts,
           (select coalesce(sum(balance_minor), 0) from wallets) as liability,
           (select coalesce(sum(amount_minor), 0) from wallet_deposits where status = 'paid' and credited_at > now() - interval '24 hours') as today,
           (select count(*) from wallets w where w.balance_minor <> coalesce((select sum(amount_minor) from wallet_transactions x where x.account_id = w.account_id), 0)) as mismatches`;
  const flagged = await sql<{ ref: string; email: string; amount_minor: string; status: string; note: string | null; created_at: Date }[]>`
    select d.ref, a.email, d.amount_minor, d.status, d.note, d.created_at from wallet_deposits d join accounts a on a.id = d.account_id
    where d.flagged order by d.created_at desc limit 20`;
  const accounts = await sql<{ id: string; email: string; full_name: string; verified: boolean; status: string; balance: string }[]>`
    select a.id, a.email, a.full_name, (a.email_verified_at is not null) as verified, a.status, coalesce(w.balance_minor, 0) as balance
    from accounts a left join wallets w on w.account_id = a.id
    where (${search} = '' or a.email ilike ${like} or a.full_name ilike ${like}) order by a.created_at desc limit 25`;
  const deposits = await sql<{ ref: string; email: string; amount_minor: string; method: string; status: string; created_at: Date }[]>`
    select d.ref, a.email, d.amount_minor, d.method, d.status, d.created_at from wallet_deposits d join accounts a on a.id = d.account_id
    order by d.created_at desc limit 20`;
  const ledger = await sql<{ email: string; kind: string; amount_minor: string; note: string | null; created_at: Date }[]>`
    select a.email, t.kind, t.amount_minor, t.note, t.created_at from wallet_transactions t join accounts a on a.id = t.account_id
    order by t.created_at desc, t.id desc limit 20`;

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Customers</p>
        <h1 className="text-3xl font-semibold mt-1">Wallet &amp; accounts</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">Customer balances are store credit: they can only be spent in your store. Holding customer money may be regulated where you operate, so get advice before switching this on.</p>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Could not save."}{q.m ? ` ${q.m}` : ""}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {([["Accounts", t.accounts], ["Total customer balances (BHD, what you owe)", bhd(t.liability)], ["Credited in the last 24 h (BHD)", bhd(t.today)],
          ["Ledger check", Number(t.mismatches) === 0 ? "OK" : `${t.mismatches} MISMATCH`]] as [string, string][]).map(([k, v]) => (
          <div key={k} className={`a-card border-t-4 p-5 ${k === "Ledger check" && v !== "OK" ? "border-t-red-600" : "border-t-[#c9a96e]"}`}>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500 leading-4">{k}</p><p className="text-3xl font-semibold mt-3 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <form action={saveWalletConfig} className="a-card p-5 mb-6 space-y-4">
        <h2 className="font-semibold">Settings</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={ws.enabled} className="w-4 h-4 accent-[#a8864a]" /> Wallet and customer accounts are ON (needs email and payments set up)</label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum deposit (BHD)"><input name="min" defaultValue={bhd(ws.min_minor)} dir="ltr" className="a-input" /></Field>
          <Field label="Maximum per deposit (BHD)"><input name="max" defaultValue={bhd(ws.max_minor)} dir="ltr" className="a-input" /></Field>
          <Field label="Maximum per customer per 24 h (BHD)"><input name="daily" defaultValue={bhd(ws.daily_max_minor)} dir="ltr" className="a-input" /></Field>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="card_enabled" defaultChecked={ws.card_enabled} className="w-4 h-4 accent-[#a8864a]" /> Offer card deposits through an on-ramp provider</label>
          <p className="text-xs text-neutral-500">The customer pays by card at a third-party provider that sends crypto to the deposit address; the deposit is credited when that crypto arrives. Take the link format from your provider&apos;s documentation and use only these placeholders: {"{address} {amount_usd} {amount_crypto} {currency} {ref} {email}"}. If your payment provider already offers card on its own checkout page, you do not need this.</p>
          <Field label="Provider link template (https)"><input name="card_url_template" defaultValue={ws.card_url_template} dir="ltr" className="a-input font-mono text-xs" /></Field>
          <Field label="Crypto the on-ramp should deliver (provider currency code)" hint="Example: usdttrc20. Must be a coin your payment provider can receive."><input name="card_pay_currency" defaultValue={ws.card_pay_currency} dir="ltr" className="a-input !w-56" /></Field>
        </div>
        <button className="a-btn">Save settings</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <form action={adjustWallet} className="a-card p-5 space-y-3">
          <h2 className="font-semibold">Manual adjustment</h2>
          <Field label="Account email"><input name="email" type="email" required dir="ltr" className="a-input" /></Field>
          <Field label="Amount in BHD (use - to deduct)"><input name="amount" required dir="ltr" placeholder="10.000 or -5.000" className="a-input" /></Field>
          <Field label="Reason (kept in the ledger)"><input name="reason" required maxLength={200} className="a-input" /></Field>
          <button className="a-btn">Apply</button>
        </form>
        <form action={refundOrderAction} className="a-card p-5 space-y-3">
          <h2 className="font-semibold">Refund a wallet-paid order to the wallet</h2>
          <p className="text-xs text-neutral-500">Only for orders the customer paid from the wallet. The money returns to the same wallet, stock is released if the order has not shipped, and the order becomes Refunded. Works once per order.</p>
          <Field label="Order reference"><input name="ref" required dir="ltr" placeholder="LU-XXXX-XXXX-XXXX" className="a-input" /></Field>
          <button className="a-btn">Refund to wallet</button>
        </form>
      </div>

      {flagged.length > 0 && (
        <section className="a-card mb-6 overflow-hidden border-l-4 border-l-red-600">
          <h2 className="px-5 py-4 font-semibold">Deposits that need your review</h2>
          <div className="overflow-x-auto"><table className="a-table"><thead><tr><th>Ref</th><th>Account</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead><tbody>
            {flagged.map((d) => <tr key={d.ref}><td className="font-mono text-xs">{d.ref}</td><td dir="ltr">{d.email}</td><td className="tabular-nums">{bhd(d.amount_minor)}</td><td><Badge value={d.status} /></td><td className="text-xs whitespace-pre-line max-w-md">{d.note}</td></tr>)}
          </tbody></table></div>
        </section>
      )}

      <section className="a-card mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-semibold">Accounts</h2>
          <form className="flex gap-2"><input name="q" defaultValue={search} placeholder="Search email or name" className="a-input !w-56" /><button className="a-btn-ghost">Search</button></form>
        </div>
        <div className="overflow-x-auto"><table className="a-table"><thead><tr><th>Email</th><th>Name</th><th>Balance (BHD)</th><th>Status</th><th></th></tr></thead><tbody>
          {accounts.length === 0 && <tr><td colSpan={5} className="text-neutral-500">No accounts yet.</td></tr>}
          {accounts.map((a) => (
            <tr key={a.id}>
              <td dir="ltr">{a.email}{!a.verified && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">UNVERIFIED</span>}</td>
              <td dir="auto">{a.full_name}</td><td className="tabular-nums">{bhd(a.balance)}</td><td><Badge value={a.status === "blocked" ? "failed" : "paid"} /></td>
              <td><div className="flex gap-2">
                {!a.verified && <form action={setAccountFlag}><input type="hidden" name="id" value={a.id} /><button name="action" value="verify" className="a-btn-ghost">Mark verified</button></form>}
                <form action={setAccountFlag}><input type="hidden" name="id" value={a.id} /><button name="action" value={a.status === "blocked" ? "unblock" : "block"} className="a-btn-ghost">{a.status === "blocked" ? "Unblock" : "Block"}</button></form>
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="a-card overflow-hidden"><h2 className="px-5 py-4 font-semibold">Recent deposits</h2>
          <div className="overflow-x-auto"><table className="a-table"><thead><tr><th>Time (UTC)</th><th>Account</th><th>BHD</th><th>Method</th><th>Status</th></tr></thead><tbody>
            {deposits.map((d) => <tr key={d.ref}><td className="whitespace-nowrap">{f(d.created_at)}</td><td dir="ltr">{d.email}</td><td className="tabular-nums">{bhd(d.amount_minor)}</td><td>{d.method}</td><td><Badge value={d.status} /></td></tr>)}
            {deposits.length === 0 && <tr><td colSpan={5} className="text-neutral-500">No deposits yet.</td></tr>}
          </tbody></table></div></section>
        <section className="a-card overflow-hidden"><h2 className="px-5 py-4 font-semibold">Recent ledger entries</h2>
          <div className="overflow-x-auto"><table className="a-table"><thead><tr><th>Time (UTC)</th><th>Account</th><th>Type</th><th>BHD</th></tr></thead><tbody>
            {ledger.map((l, i) => <tr key={i}><td className="whitespace-nowrap">{f(l.created_at)}</td><td dir="ltr">{l.email}</td><td className="capitalize">{l.kind}</td><td className={`tabular-nums ${Number(l.amount_minor) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(l.amount_minor) > 0 ? "+" : ""}{bhd(l.amount_minor)}</td></tr>)}
            {ledger.length === 0 && <tr><td colSpan={4} className="text-neutral-500">Nothing yet.</td></tr>}
          </tbody></table></div></section>
      </div>
    </>
  );
}
