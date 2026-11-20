"use client";

import { useT } from "@/i18n/locale";
import { useState } from "react";
import { Button, Card, Field, Input, Select } from "@kalachakra/ui";
import { checkDate, checkMobile, checkName } from "@/lib/validate";
import { newId, type Client } from "@/stores/practitioner";

/** Add or edit a client: the person's details, mobiles and notes. */
export function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Client;
  onSave: (c: Client) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const p = initial?.person;
  const [name, setName] = useState(p?.name ?? "");
  const [birthName, setBirthName] = useState(
    p?.other_names?.find((n) => n.kind === "birth_certificate")?.name ?? "",
  );
  const [dob, setDob] = useState(p?.dob ?? "");
  const [gender, setGender] = useState<"male" | "female" | "unspecified">(
    p?.gender ?? "unspecified",
  );
  const [kuaBasis, setKuaBasis] = useState<"" | "male" | "female">(p?.kua_basis ?? "");
  const [time, setTime] = useState(p?.birth_time ?? "");
  const [mobiles, setMobiles] = useState((initial?.mobiles ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tried, setTried] = useState(false);

  const errors = {
    name: checkName(name),
    dob: checkDate(dob),
    mobiles: mobiles
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
      .map(checkMobile)
      .find(Boolean),
    kua: gender === "unspecified" && !kuaBasis ? "Choose a Kua basis." : undefined,
  };
  const ok = !Object.values(errors).some(Boolean);

  const save = () => {
    setTried(true);
    if (!ok) return;
    onSave({
      id: initial?.id ?? newId(),
      created: initial?.created ?? new Date().toISOString(),
      reports: initial?.reports ?? [],
      notes,
      mobiles: mobiles
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      person: {
        name: name.trim(),
        other_names: birthName.trim()
          ? [{ kind: "birth_certificate", name: birthName.trim() }]
          : [],
        dob,
        gender,
        ...(gender === "unspecified" && kuaBasis ? { kua_basis: kuaBasis } : {}),
        ...(time ? { birth_time: time } : {}),
      },
    });
  };
  const err = (k: keyof typeof errors) => (tried || k !== "name" ? errors[k] : undefined);

  return (
    <Card className="grid gap-4 sm:grid-cols-2">
      <Field id="c-name" label={t("Name in daily use")} error={tried ? errors.name : undefined}>
        <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id="c-birth" label={t("Birth certificate name (optional)")}>
        <Input id="c-birth" value={birthName} onChange={(e) => setBirthName(e.target.value)} />
      </Field>
      <Field id="c-dob" label={t("Date of birth")} error={tried ? errors.dob : undefined}>
        <Input id="c-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </Field>
      <Field id="c-gender" label={t("Gender")} error={tried ? errors.kua : undefined}>
        <div className="flex gap-2">
          <Select
            id="c-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as typeof gender)}
          >
            <option value="male">{t("Male")}</option>
            <option value="female">{t("Female")}</option>
            <option value="unspecified">{t("Choose a Kua basis")}</option>
          </Select>
          {gender === "unspecified" ? (
            <Select
              aria-label={t("Kua basis")}
              value={kuaBasis}
              onChange={(e) => setKuaBasis(e.target.value as typeof kuaBasis)}
            >
              <option value="">{t("Kua basis…")}</option>
              <option value="male">{t("Male formula")}</option>
              <option value="female">{t("Female formula")}</option>
            </Select>
          ) : null}
        </div>
      </Field>
      <Field id="c-time" label={t("Time of birth (optional)")}>
        <Input id="c-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field
        id="c-mobiles"
        label={t("Mobile numbers (optional, comma-separated)")}
        error={err("mobiles")}
      >
        <Input id="c-mobiles" value={mobiles} onChange={(e) => setMobiles(e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <Field id="c-notes" label={t("Notes")}>
          <textarea
            id="c-notes"
            className="min-h-24 w-full rounded-xl border border-sand p-3 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="button" onClick={save}>
          {t("Save client")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      </div>
    </Card>
  );
}
