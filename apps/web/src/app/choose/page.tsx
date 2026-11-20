"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Label, RadioGroup, RadioItem, cn } from "@kalachakra/ui";
import { Steps } from "@/components/steps";
import { useT } from "@/i18n/locale";
import { useCustomer, type AddOn, type BaseReport } from "@/stores/customer";

const BASES = /* i18n */ [
  {
    id: "complete",
    title: "Complete report",
    text: "Your full profile: Vedic core, name, Lo Shu and Kua, Pythagorean, life areas and timing.",
    who: "For yourself or another adult",
  },
  {
    id: "child",
    title: "Child report",
    text: "The same depth, written for parents: learning style instead of career, and spelling choices for school records.",
    who: "For parents, about a child",
  },
] as const satisfies readonly { id: BaseReport; title: string; text: string; who: string }[];

const ADD_ONS = /* i18n */ [
  {
    id: "compatibility",
    title: "Compatibility",
    text: "With a partner, business partner or child: a score out of 100 with every part shown.",
  },
  {
    id: "business",
    title: "Business name",
    text: "Up to five names, ranked against the owner and partners, with spelling ideas and domains.",
  },
  {
    id: "mobile",
    title: "Mobile numbers",
    text: "Fit, element flow and a score for each number, with better endings if needed.",
  },
  {
    id: "vehicle_house",
    title: "Vehicle and house",
    text: "Registrations and house or flat numbers, and the main door checked against your Kua.",
  },
] as const satisfies readonly { id: AddOn; title: string; text: string }[];

export default function Choose() {
  const router = useRouter();
  const { t } = useT();
  const { base, addOns, setBase, toggleAddOn } = useCustomer();
  return (
    <div className="mx-auto max-w-4xl">
      <Steps current={0} />
      <h1 className="text-2xl sm:text-4xl">{t("Choose a report")}</h1>
      <p className="mt-3 max-w-2xl text-muted">
        {t("Pick one report, then add anything you would like included. Everything goes into one PDF.")}
      </p>

      <RadioGroup value={base} onValueChange={(v) => setBase(v as BaseReport)} className="mt-8 gap-4 sm:grid-cols-2" aria-label={t("Report")}>
        {BASES.map((b) => (
          <Label
            key={b.id}
            htmlFor={`base-${b.id}`}
            className={cn(
              "flex cursor-pointer gap-4 rounded-card border p-5 transition-colors sm:p-6",
              base === b.id ? "border-ink bg-ink text-white" : "border-sand bg-white hover:border-gold",
            )}
          >
            <RadioItem id={`base-${b.id}`} value={b.id} className="mt-1.5" />
            <span>
              <span className={cn("block font-label text-xs font-normal", base === b.id ? "text-gold" : "text-gold-700")}>{t(b.who)}</span>
              <span className="mt-1 block font-heading text-xl">{t(b.title)}</span>
              <span className={cn("mt-2 block font-body text-sm font-normal leading-relaxed", base === b.id ? "text-sand" : "text-muted")}>{t(b.text)}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>

      <h2 className="mt-12 text-xl sm:text-2xl">{t("Add to your report")}</h2>
      <p className="mt-2 text-sm text-muted">{t("Optional. Each one adds its own section, and asks for a few more details.")}</p>
      <ul className="mt-5 divide-y divide-sand border-y border-sand">
        {ADD_ONS.map((a) => (
          <li key={a.id}>
            <Label htmlFor={`addon-${a.id}`} className="flex cursor-pointer items-start gap-4 py-4 hover:bg-sand-50/60 sm:px-2">
              <Checkbox id={`addon-${a.id}`} checked={addOns.includes(a.id)} onCheckedChange={() => toggleAddOn(a.id)} className="mt-1" />
              <span className="grid flex-1 gap-1 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <span className="font-heading text-lg">{t(a.title)}</span>
                <span className="font-body text-sm font-normal leading-relaxed text-muted">{t(a.text)}</span>
              </span>
            </Label>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-between">
        <Button asChild variant="ghost">
          <Link href="/">{t("Back")}</Link>
        </Button>
        <Button onClick={() => router.push("/details")}>{t("Continue")}</Button>
      </div>
    </div>
  );
}
