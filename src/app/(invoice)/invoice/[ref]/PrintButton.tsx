"use client";

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn-dark print:hidden">طباعة / حفظ كملف PDF</button>;
}
