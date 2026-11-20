"use client";

import { useT } from "@/i18n/locale";
import { Card, Field, Input, Select } from "@kalachakra/ui";
import { PROFILE_OPTIONS } from "@/lib/engine";
import { usePractitioner } from "@/stores/practitioner";

/** One-time practitioner settings: printed on report headers and footers (phase 1 spec 6.1). */
export default function Settings() {
  const { t } = useT();
  const { settings, setSettings, setProfile } = usePractitioner();
  const text = (
    key: "name" | "title" | "phone" | "email" | "website" | "signature",
    label: string,
  ) => (
    <Field id={`s-${key}`} label={label}>
      <Input
        id={`s-${key}`}
        value={settings[key]}
        onChange={(e) => setSettings({ [key]: e.target.value })}
      />
    </Field>
  );
  const onLogo = (f: File) => {
    if (f.size > 500_000) return alert("Please use a logo under 500 KB.");
    const r = new FileReader();
    r.onload = () => setSettings({ logo: String(r.result) });
    r.readAsDataURL(f);
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-4xl">{t("Practitioner settings")}</h1>
      <p className="text-muted">
        {t(
          "These replace the KalaChakra header and footer on your reports. A small line saying the report was calculated with KalaChakra stays. Saved as you type.",
        )}
      </p>
      <Card className="grid gap-4 sm:grid-cols-2">
        {text("name", "Your name")}
        {text("title", "Title")}
        {text("phone", "Phone")}
        {text("email", "Email")}
        {text("website", "Website")}
        {text("signature", "Signature line")}
        <Field id="s-logo" label={t("Logo (PNG or JPEG)")}>
          <input
            id="s-logo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
          />
        </Field>
        {settings.logo ? (
          <div className="flex items-center gap-3">
            <img src={settings.logo} alt={t("Your logo")} className="h-12" />
            <button
              type="button"
              className="text-sm text-danger"
              onClick={() => setSettings({ logo: "" })}
            >
              {t("Remove")}
            </button>
          </div>
        ) : null}
        <Field id="s-profile" label={t("Default rule profile")}>
          <Select
            id="s-profile"
            value={settings.defaultProfile}
            onChange={(e) => {
              setSettings({ defaultProfile: e.target.value });
              setProfile({ kind: "id", id: e.target.value });
            }}
          >
            {PROFILE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
    </div>
  );
}
