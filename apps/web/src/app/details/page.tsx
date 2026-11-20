"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Field, Input, Select } from "@kalachakra/ui";
import { Steps } from "@/components/steps";
import { checkDate, checkHouse, checkMobile, checkName, checkRegistration } from "@/lib/validate";
import { useCustomer, type Details } from "@/stores/customer";

const optionalName = z
  .string()
  .refine((v) => !v.trim() || !checkName(v), { message: "Use English letters, at least 2." });
const check = (fn: (v: string) => string | undefined) =>
  z.string().superRefine((v, ctx) => {
    const e = fn(v);
    if (e) ctx.addIssue({ code: "custom", message: e });
  });

const Schema = z
  .object({
    name: check(checkName),
    birthName: optionalName,
    nickname: optionalName,
    marriedName: optionalName,
    dob: check((v) => checkDate(v)),
    gender: z.enum(["male", "female", "unspecified"]),
    kuaBasis: z.enum(["", "male", "female"]),
    birthTime: z.string().refine((v) => !v || /^\d{2}:\d{2}$/.test(v), { message: "Use HH:MM." }),
    birthPlace: z.string(),
    language: z.enum(["en", "ta"]),
    mobiles: z.array(check(checkMobile)),
    goals: z.array(z.string()),
    vehicles: z.array(check(checkRegistration)),
    flat: check(checkHouse),
    building: check(checkHouse),
    door: z.string(),
    partnerName: z.string(),
    partnerDob: z.string(),
    partnerGender: z.enum(["male", "female", "unspecified"]),
    relationship: z.enum(["couple", "business_partners", "parent_child"]),
    businessNames: z.array(z.string()),
    trade: z.string(),
    incorporationDate: z.string().refine((v) => !v || !checkDate(v, "incorporation date"), {
      message: "That date does not exist.",
    }),
    businessPartners: z.array(z.object({ name: z.string(), dob: z.string() })),
  })
  .superRefine((d, ctx) => {
    if (d.gender === "unspecified" && !d.kuaBasis)
      ctx.addIssue({
        code: "custom",
        path: ["kuaBasis"],
        message: "Choose a basis for the Kua number.",
      });
  });

const GOALS = [
  ["finance", "Finance"],
  ["business_growth", "Business growth"],
  ["career", "Career"],
  ["peace_of_mind", "Peace of mind"],
  ["relationships", "Relationships"],
] as const;
const TRADES = [
  ["", "Not specified"],
  ["leadership_government", "Leadership and government"],
  ["care_service", "Care and service"],
  ["education_advice", "Education and advice"],
  ["research_technology", "Research and technology"],
  ["trade_media", "Trade and media"],
  ["hospitality_design", "Hospitality and design"],
  ["manufacturing_long_term", "Manufacturing and long-term work"],
  ["engineering_sport", "Engineering and sport"],
] as const;
const DOORS = ["", "N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export default function DetailsPage() {
  const router = useRouter();
  const { details, addOns, base, setDetails } = useCustomer();
  const form = useForm<Details>({
    resolver: zodResolver(Schema),
    mode: "onChange",
    defaultValues: details,
  });
  const { register, handleSubmit, formState, setValue, control } = form;
  const e = formState.errors;
  const gender = useWatch({ control, name: "gender" });
  const mobiles = useWatch({ control, name: "mobiles" }) ?? [""];
  const vehicles = useWatch({ control, name: "vehicles" }) ?? [""];
  const businessNames = useWatch({ control, name: "businessNames" }) ?? [""];
  const goals = useWatch({ control, name: "goals" }) ?? [];
  const aria = (err: unknown, id: string) => ({
    "aria-invalid": err ? true : undefined,
    "aria-describedby": err ? `${id}-error` : undefined,
  });

  const onSubmit = handleSubmit((d) => {
    setDetails(d);
    router.push("/check");
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Steps current={1} />
      <h1 className="text-2xl sm:text-3xl">Your details</h1>
      <p className="mt-2 text-muted">
        {base === "child" ? "Enter your child's details." : "Enter the details as you use them."}{" "}
        Names in English letters, spelt as used.
      </p>

      <Card className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="name" label="Full name as used daily" error={e.name?.message}>
            <Input id="name" autoComplete="name" {...register("name")} {...aria(e.name, "name")} />
          </Field>
        </div>
        <Field
          id="birthName"
          label="Name on the birth certificate (optional)"
          error={e.birthName?.message}
        >
          <Input id="birthName" {...register("birthName")} {...aria(e.birthName, "birthName")} />
        </Field>
        <Field id="nickname" label="Nickname (optional)" error={e.nickname?.message}>
          <Input id="nickname" {...register("nickname")} />
        </Field>
        <Field id="marriedName" label="Married name (optional)" error={e.marriedName?.message}>
          <Input id="marriedName" {...register("marriedName")} />
        </Field>
        <Field id="dob" label="Date of birth" error={e.dob?.message}>
          <Input
            id="dob"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            {...register("dob")}
            {...aria(e.dob, "dob")}
          />
        </Field>
        <Field id="gender" label="Gender (used for the Kua number)">
          <Select id="gender" {...register("gender")}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unspecified">Choose a Kua basis</option>
          </Select>
        </Field>
        {gender === "unspecified" ? (
          <Field id="kuaBasis" label="Kua basis" error={e.kuaBasis?.message}>
            <Select id="kuaBasis" {...register("kuaBasis")} {...aria(e.kuaBasis, "kuaBasis")}>
              <option value="">Choose…</option>
              <option value="male">Male formula</option>
              <option value="female">Female formula</option>
            </Select>
          </Field>
        ) : null}
        <Field
          id="birthTime"
          label="Time of birth (optional)"
          hint="Helps only for births near the solar new year."
          error={e.birthTime?.message}
        >
          <Input id="birthTime" type="time" {...register("birthTime")} />
        </Field>
        <Field id="birthPlace" label="Place of birth (optional)">
          <Input id="birthPlace" {...register("birthPlace")} />
        </Field>
        <Field id="language" label="Report language">
          <Select id="language" {...register("language")}>
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
          </Select>
        </Field>
      </Card>

      {addOns.includes("mobile") ? (
        <Card className="mt-6 space-y-4">
          <h2 className="text-lg">Mobile numbers</h2>
          {mobiles.map((_, i) => (
            <Field
              key={i}
              id={`mobile-${i}`}
              label={`Mobile ${i + 1}`}
              error={e.mobiles?.[i]?.message}
            >
              <Input
                id={`mobile-${i}`}
                inputMode="tel"
                placeholder="98765 43210"
                {...register(`mobiles.${i}`)}
                {...aria(e.mobiles?.[i], `mobile-${i}`)}
              />
            </Field>
          ))}
          {mobiles.length < 5 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue("mobiles", [...mobiles, ""])}
            >
              Add another number
            </Button>
          ) : null}
          <fieldset>
            <legend className="font-label text-sm font-medium">Goals (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOALS.map(([id, label]) => (
                <label
                  key={id}
                  className="flex items-center gap-2 rounded-full border border-sand px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={goals.includes(id)}
                    onChange={() =>
                      setValue(
                        "goals",
                        goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id],
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
      ) : null}

      {addOns.includes("vehicle_house") ? (
        <Card className="mt-6 grid gap-5 sm:grid-cols-2">
          <h2 className="text-lg sm:col-span-2">Vehicle and house</h2>
          {vehicles.map((_, i) => (
            <Field
              key={i}
              id={`vehicle-${i}`}
              label={`Vehicle registration ${i + 1}`}
              error={e.vehicles?.[i]?.message}
            >
              <Input
                id={`vehicle-${i}`}
                placeholder="KA 05 MN 1234"
                {...register(`vehicles.${i}`)}
                {...aria(e.vehicles?.[i], `vehicle-${i}`)}
              />
            </Field>
          ))}
          {vehicles.length < 3 ? (
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue("vehicles", [...vehicles, ""])}
              >
                Add another vehicle
              </Button>
            </div>
          ) : null}
          <Field id="flat" label="Flat number" error={e.flat?.message}>
            <Input id="flat" placeholder="12B" {...register("flat")} {...aria(e.flat, "flat")} />
          </Field>
          <Field id="building" label="House or building number" error={e.building?.message}>
            <Input id="building" {...register("building")} {...aria(e.building, "building")} />
          </Field>
          <Field id="door" label="Main door faces">
            <Select id="door" {...register("door")}>
              {DOORS.map((d) => (
                <option key={d} value={d}>
                  {d || "Not sure"}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      ) : null}

      {addOns.includes("compatibility") ? (
        <Card className="mt-6 grid gap-5 sm:grid-cols-2">
          <h2 className="text-lg sm:col-span-2">Partner&apos;s details</h2>
          <Field id="partnerName" label="Partner's name">
            <Input id="partnerName" {...register("partnerName")} />
          </Field>
          <Field id="partnerDob" label="Partner's date of birth">
            <Input id="partnerDob" type="date" {...register("partnerDob")} />
          </Field>
          <Field id="partnerGender" label="Partner's gender">
            <Select id="partnerGender" {...register("partnerGender")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unspecified">Not specified</option>
            </Select>
          </Field>
          <Field id="relationship" label="Relationship">
            <Select id="relationship" {...register("relationship")}>
              <option value="couple">Couple</option>
              <option value="business_partners">Business partners</option>
              <option value="parent_child">Parent and child</option>
            </Select>
          </Field>
        </Card>
      ) : null}

      {addOns.includes("business") ? (
        <Card className="mt-6 grid gap-5 sm:grid-cols-2">
          <h2 className="text-lg sm:col-span-2">Business</h2>
          {businessNames.map((_, i) => (
            <Field key={i} id={`business-${i}`} label={`Business name ${i + 1}`}>
              <Input id={`business-${i}`} {...register(`businessNames.${i}`)} />
            </Field>
          ))}
          {businessNames.length < 5 ? (
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue("businessNames", [...businessNames, ""])}
              >
                Add another name
              </Button>
            </div>
          ) : null}
          <Field id="trade" label="Trade (optional)">
            <Select id="trade" {...register("trade")}>
              {TRADES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="incorporationDate"
            label="Incorporation date (optional)"
            error={e.incorporationDate?.message}
          >
            <Input id="incorporationDate" type="date" {...register("incorporationDate")} />
          </Field>
        </Card>
      ) : null}

      <div className="mt-10 flex justify-between">
        <Button asChild variant="ghost">
          <Link href="/choose">Back</Link>
        </Button>
        <Button type="submit">Check my details</Button>
      </div>
    </form>
  );
}
