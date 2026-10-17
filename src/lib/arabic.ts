import { sql } from "./db";

export function normAr(s: string): string {
  return s.toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/ؤ/g, "و").replace(/ئ/g, "ي");
}

/** SQL fragment applying the same normalisation to a column, e.g. nsql("p.name_ar"). */
export function nsql(col: string) {
  return sql`translate(regexp_replace(lower(${sql(col)}), '[\u064B-\u0652\u0640]', '', 'g'), 'أإآٱىةؤئ', 'اااايهوي')`;
}

export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export const westernDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
