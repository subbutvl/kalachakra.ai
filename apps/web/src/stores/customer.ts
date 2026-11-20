"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersonInput } from "@kalachakra/engine";
import type { ReportRequest } from "@/lib/api";

/**
 * Customer mode state. It stays in this browser tab only (sessionStorage),
 * and "Start again" clears it (phase 1 spec 5.2). Nothing is saved on a server.
 */
export type BaseReport = "complete" | "child";
export type AddOn = "compatibility" | "business" | "mobile" | "vehicle_house";

export interface Details {
  name: string;
  birthName: string;
  nickname: string;
  marriedName: string;
  dob: string;
  gender: "male" | "female" | "unspecified";
  kuaBasis: "" | "male" | "female";
  birthTime: string;
  birthPlace: string;
  language: "en" | "ta";
  mobiles: string[];
  goals: string[];
  vehicles: string[];
  flat: string;
  building: string;
  door: string;
  partnerName: string;
  partnerDob: string;
  partnerGender: "male" | "female" | "unspecified";
  relationship: "couple" | "business_partners" | "parent_child";
  businessNames: string[];
  trade: string;
  incorporationDate: string;
  businessPartners: { name: string; dob: string }[];
}

export const emptyDetails: Details = {
  name: "",
  birthName: "",
  nickname: "",
  marriedName: "",
  dob: "",
  gender: "unspecified",
  kuaBasis: "",
  birthTime: "",
  birthPlace: "",
  language: "en",
  mobiles: [""],
  goals: [],
  vehicles: [""],
  flat: "",
  building: "",
  door: "",
  partnerName: "",
  partnerDob: "",
  partnerGender: "unspecified",
  relationship: "couple",
  businessNames: [""],
  trade: "",
  incorporationDate: "",
  businessPartners: [],
};

interface CustomerState {
  base: BaseReport;
  addOns: AddOn[];
  details: Details;
  setBase: (b: BaseReport) => void;
  toggleAddOn: (a: AddOn) => void;
  setDetails: (d: Partial<Details>) => void;
  reset: () => void;
}

export const useCustomer = create<CustomerState>()(
  persist(
    (set) => ({
      base: "complete",
      addOns: [],
      details: emptyDetails,
      setBase: (base) => set({ base }),
      toggleAddOn: (a) =>
        set((s) => ({
          addOns: s.addOns.includes(a) ? s.addOns.filter((x) => x !== a) : [...s.addOns, a],
        })),
      setDetails: (d) => set((s) => ({ details: { ...s.details, ...d } })),
      reset: () => set({ base: "complete", addOns: [], details: emptyDetails }),
    }),
    { name: "kalachakra-customer", storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Turns the form into the API's report request. */
export function toRequest(base: BaseReport, addOns: AddOn[], d: Details): ReportRequest {
  const other: PersonInput["other_names"] = [];
  if (d.birthName.trim()) other.push({ kind: "birth_certificate", name: d.birthName.trim() });
  if (d.nickname.trim()) other.push({ kind: "nickname", name: d.nickname.trim() });
  if (d.marriedName.trim()) other.push({ kind: "married", name: d.marriedName.trim() });
  const person: PersonInput = {
    name: d.name.trim(),
    other_names: other,
    dob: d.dob,
    gender: d.gender,
    ...(d.gender === "unspecified" && d.kuaBasis ? { kua_basis: d.kuaBasis } : {}),
    ...(d.birthTime ? { birth_time: d.birthTime } : {}),
    ...(d.birthPlace.trim() ? { birth_place: { label: d.birthPlace.trim() } } : {}),
  };
  const modules: ReportRequest["modules"] = {};
  const mobiles = d.mobiles.map((m) => m.trim()).filter(Boolean);
  if (addOns.includes("mobile") && mobiles.length)
    modules.mobile = { numbers: mobiles, ...(d.goals.length ? { goals: d.goals } : {}) };
  const vehicles = d.vehicles.map((v) => v.trim()).filter(Boolean);
  if (addOns.includes("vehicle_house")) {
    if (vehicles.length) modules.vehicle = { registrations: vehicles };
    if (d.flat.trim() || d.building.trim()) {
      modules.house = {
        ...(d.flat.trim() ? { flat: d.flat.trim() } : {}),
        ...(d.building.trim() ? { building: d.building.trim() } : {}),
        ...(d.door ? { door: d.door } : {}),
      };
    }
  }
  if (addOns.includes("compatibility") && d.partnerName.trim() && d.partnerDob) {
    modules.compatibility = {
      partner: { name: d.partnerName.trim(), dob: d.partnerDob, gender: d.partnerGender },
      relationship: d.relationship,
    };
  }
  const names = d.businessNames.map((n) => n.trim()).filter(Boolean);
  if (addOns.includes("business") && names.length) {
    modules.business = {
      names,
      ...(d.trade ? { trade: d.trade } : {}),
      ...(d.incorporationDate ? { incorporation_date: d.incorporationDate } : {}),
      partners: d.businessPartners
        .filter((p) => p.name.trim() && p.dob)
        .map((p) => ({ name: p.name.trim(), dob: p.dob, gender: "unspecified" as const })),
    };
  }
  return { person, audience: base === "child" ? "child" : "adult", language: d.language, modules };
}
