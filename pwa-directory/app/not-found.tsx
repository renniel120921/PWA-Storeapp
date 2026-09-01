import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
      style={
        {
          "--paper": "#F6F4EC",
          "--card": "#FFFFFF",
          "--ink": "#122A2C",
          "--ink-soft": "#EEEAD9",
          "--body": "#4C5652",
          "--body-dim": "#7A8480",
          "--line": "#DBD5C3",
          "--coral": "#FF6A4D",
        } as React.CSSProperties
      }
    >
      <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-(--ink)/5 flex items-center justify-center mb-6">
          <BookOpen className="w-6 h-6 text-(--body)" />
        </div>

        <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-2">
          catalog entry not found
        </span>

        <h1 className="font-display text-3xl font-medium text-(--ink) tracking-tight mb-3">
          404 — Shelf Missing
        </h1>

        <p className="text-sm text-(--body) leading-relaxed mb-8">
          The progressive web app you are looking for does not exist in the directory or has been removed.
        </p>

        <Link href="/">
          <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to directory</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

