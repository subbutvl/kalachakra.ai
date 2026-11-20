"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Label, RadioGroup, RadioItem } from "@kalachakra/ui";
import { Steps } from "@/components/steps";
import { useCustomer, type AddOn, type BaseReport } from "@/stores/customer";

const BASES: { id: BaseReport; title: string; text: string }[] = [
  {
    id: "complete",
    title: "Complete report",
    text: "Your full profile: Vedic core, name, Lo Shu and Kua, Pythagorean, life areas and timing.",
  },
  {
    id: "child",
    title: "Child report (for parents)",
    text: "The same depth, written for parents: learning style instead of career, spelling choices for records.",
  },
];

const ADD_ONS: { id: AddOn; title: string; text: string }[] = [
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
];

export default function Choose() {
  const router = useRouter();
  const { base, addOns, setBase, toggleAddOn } = useCustomer();
  return (
    <div>
      <Steps current={0} />
      <h1 className="text-2xl sm:text-3xl">Choose a report</h1>
      <p className="mt-2 text-muted">
        Pick one report, then add anything you would like included. Everything goes into one PDF.
      </p>

      <RadioGroup
        value={base}
        onValueChange={(v) => setBase(v as BaseReport)}
        className="mt-8 sm:grid-cols-2"
        aria-label="Report"
      >
        {BASES.map((b) => (
          <Label key={b.id} htmlFor={`base-${b.id}`} className="cursor-pointer">
            <Card className={base === b.id ? "border-gold ring-2 ring-gold/30" : ""}>
              <div className="flex items-start gap-3">
                <RadioItem id={`base-${b.id}`} value={b.id} className="mt-1" />
                <div>
                  <div className="font-heading text-lg">{b.title}</div>
                  <p className="mt-1 font-body text-sm font-normal text-muted">{b.text}</p>
                </div>
              </div>
            </Card>
          </Label>
        ))}
      </RadioGroup>

      <h2 className="mt-10 text-xl">Add to your report</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {ADD_ONS.map((a) => (
          <Label key={a.id} htmlFor={`addon-${a.id}`} className="cursor-pointer">
            <Card className={addOns.includes(a.id) ? "border-gold ring-2 ring-gold/30" : ""}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`addon-${a.id}`}
                  checked={addOns.includes(a.id)}
                  onCheckedChange={() => toggleAddOn(a.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-heading text-lg">{a.title}</div>
                  <p className="mt-1 font-body text-sm font-normal text-muted">{a.text}</p>
                </div>
              </div>
            </Card>
          </Label>
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <Button asChild variant="ghost">
          <Link href="/">Back</Link>
        </Button>
        <Button onClick={() => router.push("/details")}>Continue</Button>
      </div>
    </div>
  );
}
