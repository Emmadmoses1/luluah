import { translationProvider } from "@/lib/translate";

export default function TranslationNotice() {
  const p = translationProvider();
  return p ? (
    <p className="rounded-xl bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">
      Automatic translation is on ({p === "google" ? "Google Cloud Translation" : "Claude"}). Write in English: the Arabic text shown to customers is created when you save. You can edit it afterwards.
    </p>
  ) : (
    <p className="rounded-xl bg-amber-50 text-amber-900 px-4 py-3 text-sm">
      Automatic translation is not set up yet. Until you add <b>GOOGLE_TRANSLATE_API_KEY</b> or <b>ANTHROPIC_API_KEY</b> in Render, type the Arabic text yourself in the Arabic fields.
    </p>
  );
}

export const TRANSLATE_ERRORS: Record<string, string> = {
  translate: "Automatic translation is not set up, so please type the Arabic text yourself in the Arabic fields.",
  translate_failed: "The translation service did not answer. Try again, or type the Arabic text yourself.",
};
