import Link from "next/link";
import { Badge, Button, Card, CardText, CardTitle } from "@kalachakra/ui";

const COVERS = [
  ["Vedic core", "Mulank and Bhagyank, how they work together, your planets and lucky set."],
  [
    "Your name",
    "Chaldean name number and compound, fit with your birth numbers, and better spellings.",
  ],
  [
    "Lo Shu and Kua",
    "Your grid, the eight planes, missing numbers with remedies, and your eight directions.",
  ],
  ["Pythagorean", "Life path, expression, soul urge, personality, inner layers and birth chart."],
  ["Timing", "This year in depth, twelve months ahead, life cycles and the next ten years."],
  [
    "Daily life",
    "Mobile, vehicle and house numbers, lucky dates and colours, and every remedy in one list.",
  ],
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="rounded-[2rem] border border-gold bg-gradient-to-b from-white to-sand-50 px-6 py-12 text-center sm:px-12 sm:py-16">
        <Badge>English and தமிழ்</Badge>
        <h1 className="mt-6 text-3xl leading-tight sm:text-5xl">Your numbers, explained</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
          A complete numerology report from your name and date of birth, read in three systems and
          worked out step by step, so every number can be checked.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/choose">Get your report</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/report?sample=1">See a sample report</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="covers">
        <h2 id="covers" className="text-2xl">
          What the report covers
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COVERS.map(([title, text]) => (
            <Card key={title}>
              <CardTitle>{title}</CardTitle>
              <CardText>{text}</CardText>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Add-ons: compatibility with a partner or child, business names, mobile numbers, vehicles
          and your home. A child edition is written for parents.
        </p>
      </section>
    </div>
  );
}
