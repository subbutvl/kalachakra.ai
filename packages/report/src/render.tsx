import { renderToStaticMarkup } from "react-dom/server";
import type { Block, ReportDocument, Section } from "./document.js";
import { Visual } from "./visuals.js";
import { PRINT_CSS } from "./print.js";

function BlockView({ block, labels }: { block: Block; labels: ReportDocument["labels"] }) {
  switch (block.kind) {
    case "p":
      if (block.source === "practitioner") {
        return (
          <div className={`kc-practitioner${block.note ? " kc-note" : ""}`} data-block={block.id}>
            <span className="kc-badge">{block.note ? labels.practitioner_note : labels.practitioner_words}</span>
            <p>{block.text}</p>
          </div>
        );
      }
      return <p data-block={block.id}>{block.text}</p>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "facts":
      return (
        <dl className="kc-facts">
          {block.rows.map((r, i) => (
            <div key={i} className="kc-fact">
              <dt>{r.label}</dt>
              <dd>
                <span className="kc-num">{r.value}</span>
                {r.detail ? <small>{r.detail}</small> : null}
              </dd>
            </div>
          ))}
        </dl>
      );
    case "list":
      return (
        <ul>
          {block.items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table>
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "visual":
      return (
        <figure className="kc-figure">
          <Visual visual={block.visual} data={block.data} />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case "how":
      return <p className="kc-how">{block.text}</p>;
  }
}

function SectionView({ section, labels }: { section: Section; labels: ReportDocument["labels"] }) {
  return (
    <section className={`kc-section kc-${section.id}`} id={`s-${section.id}-${section.number}`} data-section={section.id}>
      <header>
        <span className="kc-part">{section.part}</span>
        <h2>
          <span className="kc-secnum">{section.number}</span> {section.title}
        </h2>
      </header>
      {section.blocks.map((b, i) => (
        <BlockView key={i} block={b} labels={labels} />
      ))}
    </section>
  );
}

/** The whole report as one React tree, used on screen (web app) and for the PDF. */
export function ReportView({ doc }: { doc: ReportDocument }) {
  const [cover, ...rest] = doc.sections;
  return (
    <article className="kc-report" lang={doc.meta.language} data-audience={doc.meta.audience}>
      <div className="kc-cover">
        {doc.branding?.logo ? <img className="kc-logo" src={doc.branding.logo} alt="" /> : <div className="kc-mark">KalaChakra</div>}
        <h1>{doc.title}</h1>
        <p className="kc-subtitle">{doc.subtitle}</p>
        <p className="kc-dob">{doc.person.dob}</p>
        {cover ? cover.blocks.map((b, i) => <BlockView key={i} block={b} labels={doc.labels} />) : null}
        {doc.branding?.name ? (
          <div className="kc-branding">
            <strong>{doc.branding.name}</strong>
            {doc.branding.title ? <span>{doc.branding.title}</span> : null}
            {[doc.branding.phone, doc.branding.email, doc.branding.website].filter(Boolean).join(" · ")}
          </div>
        ) : null}
      </div>
      <nav className="kc-contents">
        <h2>{doc.labels.contents}</h2>
        <ol>
          {rest.map((s) => (
            <li key={`${s.id}-${s.number}`}>
              <a href={`#s-${s.id}-${s.number}`}>
                <span className="kc-secnum">{s.number}</span> {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {rest.map((s) => (
        <SectionView key={`${s.id}-${s.number}`} section={s} labels={doc.labels} />
      ))}
      <footer className="kc-footer">
        {doc.branding?.signature ? <p className="kc-signature">{doc.branding.signature}</p> : null}
        <p>{doc.disclaimer}</p>
        <p className="kc-small">
          {doc.labels.calculated_with} · {doc.meta.engine} · {doc.meta.rules} · {doc.meta.texts}
        </p>
      </footer>
    </article>
  );
}

export interface HtmlOptions {
  /** CSS @font-face rules (embedded fonts for the PDF, or links on screen). */
  fontCss?: string;
}

/** A complete, self-contained HTML page for the report. */
export function renderReportHtml(doc: ReportDocument, options: HtmlOptions = {}): string {
  const body = renderToStaticMarkup(<ReportView doc={doc} />);
  return `<!doctype html><html lang="${doc.meta.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(doc.title)}: ${escapeHtml(doc.person.name)}</title><style>${options.fontCss ?? ""}${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
