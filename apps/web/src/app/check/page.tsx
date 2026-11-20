"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@kalachakra/ui";
import { Steps } from "@/components/steps";
import { lettersOnly, longDate } from "@/lib/validate";
import { useCustomer } from "@/stores/customer";

const ADD_ON_NAMES: Record<string, string> = {
  compatibility: "Compatibility",
  business: "Business name",
  mobile: "Mobile numbers",
  vehicle_house: "Vehicle and house",
};

/** Shows the name exactly as it will be scored, so spelling mistakes are caught (phase 1 spec 5.1). */
export default function Check() {
  const router = useRouter();
  const { details: d, base, addOns } = useCustomer();
  if (!d.name || !d.dob) {
    return (
      <div>
        <p>Please enter your details first.</p>
        <Button asChild className="mt-4">
          <Link href="/details">Your details</Link>
        </Button>
      </div>
    );
  }
  const rows: [string, string][] = [
    [
      "Report",
      `${base === "child" ? "Child report" : "Complete report"}${addOns.length ? ` + ${addOns.map((a) => ADD_ON_NAMES[a]).join(", ")}` : ""}`,
    ],
    ["Name to be scored", lettersOnly(d.name)],
    ...(d.birthName
      ? ([["Birth certificate name", lettersOnly(d.birthName)]] as [string, string][])
      : []),
    ["Date of birth", longDate(d.dob)],
    ["Kua basis", d.gender === "unspecified" ? `${d.kuaBasis} formula` : d.gender],
    ["Language", d.language === "ta" ? "தமிழ் (Tamil)" : "English"],
  ];
  return (
    <div>
      <Steps current={2} />
      <h1 className="text-2xl sm:text-3xl">Check your details</h1>
      <p className="mt-2 text-muted">
        Only the letters A to Z are counted. If a name looks wrong, go back and correct the
        spelling.
      </p>
      <Card className="mt-8">
        <dl className="divide-y divide-sand">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-3">
              <dt className="font-label text-sm text-muted">{k}</dt>
              <dd className="font-heading text-lg tracking-wide sm:col-span-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="mt-10 flex justify-between">
        <Button asChild variant="ghost">
          <Link href="/details">Edit details</Link>
        </Button>
        <Button variant="gold" onClick={() => router.push("/report")}>
          Generate report
        </Button>
      </div>
    </div>
  );
}
