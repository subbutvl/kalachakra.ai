"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { Button } from "@kalachakra/ui";
import { Steps } from "@/components/steps";
import { api, ApiError, type ReportRequest } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { toRequest, useCustomer } from "@/stores/customer";

/** The fictional benchmark person used for the sample preview. */
const SAMPLE: ReportRequest = {
  person: { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" },
  audience: "adult",
  language: "en",
  modules: { mobile: { numbers: ["9876524310"] } },
};

function ReportScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const sample = useSearchParams().get("sample") === "1";
  const { base, addOns, details, reset } = useCustomer();
  const request = useMemo(
    () => (sample ? { ...SAMPLE, language: locale } : toRequest(base, addOns, details)),
    [sample, base, addOns, details, locale],
  );
  const ready = sample || Boolean(details.name && details.dob);
  const frame = useRef<HTMLIFrameElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();

  const summary = useQuery({
    queryKey: ["report", request],
    queryFn: () => api.report(request),
    enabled: ready,
  });
  const html = useQuery({
    queryKey: ["report-html", request],
    queryFn: () => api.reportHtml(request),
    enabled: ready,
  });

  if (!ready) {
    return (
      <div>
        <p>{t("Please enter your details first.")}</p>
        <Button className="mt-4" onClick={() => router.push("/choose")}>
          {t("Start")}
        </Button>
      </div>
    );
  }

  const download = async () => {
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const blob = await api.reportPdf(request);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = summary.data?.file_name ?? "Kalachakra_report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : t("The PDF could not be made."));
    } finally {
      setDownloading(false);
    }
  };
  const jump = (id: string) =>
    frame.current?.contentDocument?.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const error = summary.error ?? html.error;

  return (
    <div>
      {!sample ? <Steps current={3} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl">{sample ? t("Sample report") : t("Your report")}</h1>
          <p className="mt-1 text-muted">{request.person.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" onClick={download} disabled={!summary.data || downloading}>
            {downloading ? t("Preparing PDF…") : t("Download PDF")}
          </Button>
          <Button
            variant="outline"
            onClick={() => frame.current?.contentWindow?.print()}
            disabled={!html.data}
          >
            {t("Print")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              router.push("/");
            }}
          >
            {t("Start again")}
          </Button>
        </div>
      </div>
      {downloadError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {downloadError}
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="mt-8 rounded-card border border-danger/40 bg-white p-6">
          <p className="font-medium text-danger">{t("The report could not be made.")}</p>
          <p className="mt-1 text-sm text-muted">
            {error instanceof ApiError ? error.message : String(error)}
          </p>
        </div>
      ) : null}

      {!error && (!summary.data || !html.data) ? (
        <p className="mt-10 text-muted" aria-live="polite">
          {t("Working out your numbers…")}
        </p>
      ) : null}

      {summary.data && html.data ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <nav aria-label={t("Report contents")} className="lg:sticky lg:top-6 lg:self-start">
            <h2 className="mb-3 border-b border-gold pb-1 font-label text-sm font-medium text-gold-700">
              {t("Contents")}
            </h2>
            <ol className="max-h-48 space-y-1 overflow-y-auto pr-2 text-sm lg:max-h-[70vh]">
              {summary.data.sections.map((s) => (
                <li key={`${s.id}-${s.number}`}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1 text-left hover:bg-sand-50"
                    onClick={() => jump(`s-${s.id}-${s.number}`)}
                  >
                    <span className="mr-2 font-label text-gold-700">{s.number}</span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-4 font-label text-xs text-muted">
              {t("Engine {e}, rules {r}, texts {x}", {
                e: summary.data.meta.engine,
                r: summary.data.meta.rules,
                x: summary.data.meta.texts,
              })}
            </p>
          </nav>
          <iframe
            ref={frame}
            title={t("Your report")}
            srcDoc={html.data}
            className="h-[80vh] w-full rounded-card border border-sand bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportScreen />
    </Suspense>
  );
}
