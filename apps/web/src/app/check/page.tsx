"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@kalachakra/ui";
import { Steps } from "@/components/steps";
import { lettersOnly, longDate } from "@/lib/validate";
import { useT } from "@/i18n/locale";
import { useCustomer } from "@/stores/customer";

const ADD_ON_NAMES: Record<string, string> = /* i18n */ {
  compatibility: "Compatibility",
  business: "Business name",
  mobile: "Mobile numbers",
  vehicle_house: "Vehicle and house",
} as const;

/** Shows the name exactly as it will be scored, so spelling mistakes are caught (phase 1 spec 5.1). */
export default function Check() {
  const router = useRouter();
  const { t, locale } = useT();
  const { details: d, base, addOns } = useCustomer();
  if (!d.name || !d.dob) {
    return (
      <div>
        <p>{t("Please enter your details first.")}</p>
        <Button asChild className="mt-4">
          <Link href="/details">{t("Your details")}</Link>
        </Button>
      </div>
    );
  }
  const rows: [string, string][] = [
    [
      t("Report"),
      `${base === "child" ? t("Child report") : t("Complete report")}${addOns.length ? ` + ${addOns.map((a) => t(ADD_ON_NAMES[a]!)).join(", ")}` : ""}`,
    ],
    [t("Name to be scored"), lettersOnly(d.name)],
    ...(d.birthName
      ? ([[t("Birth certificate name"), lettersOnly(d.birthName)]] as [string, string][])
      : []),
    [t("Date of birth"), longDate(d.dob, locale)],
    [
      t("Kua basis"),
      t((d.gender === "unspecified" ? d.kuaBasis : d.gender) === "female" ? "Female formula" : "Male formula"),
    ],
    [t("Report language"), d.language === "ta" ? "தமிழ்" : "English"],
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <Steps current={2} />
      <h1 className="text-2xl sm:text-4xl">{t("Check your details")}</h1>
      <p className="mt-2 text-muted">
        {t("Only the letters A to Z are counted. If a name looks wrong, go back and correct the spelling.")}
      </p>
      <Card className="mt-8">
        <dl className="divide-y divide-sand">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-3">
              <dt className="font-label text-sm text-muted">{k}</dt>
              <dd className="font-heading text-lg tracking-wide [overflow-wrap:anywhere] sm:col-span-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="mt-10 flex justify-between">
        <Button asChild variant="ghost">
          <Link href="/details">{t("Edit details")}</Link>
        </Button>
        <Button variant="gold" onClick={() => router.push("/report")}>
          {t("Generate report")}
        </Button>
      </div>
    </div>
  );
}
