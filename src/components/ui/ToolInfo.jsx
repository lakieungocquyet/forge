import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Cite } from "@citation-js/core";
import Divider from "./Divider"
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-ris";
import "@citation-js/plugin-csl";

const C = {
    accent: "#ff7f50",
    link: "#b23c12",
    text: "#1f1410",
    muted: "#5c4a42",
    border: "#e5ddd8",
    hairline: "#efe7e2",
    control: "#d9cfc9",
    surface: "#ffffff",
};

/* ------------------------------------------------------------------ */
/* Citation parsing (Citation.js)                                      */
/* ------------------------------------------------------------------ */

// Fields that make the displayed APA/BibTeX noisy (long abstract, duplicate URL…).
const DROP_FIELDS = ["abstract", "URL", "ISSN", "note", "keyword", "language"];

const familyName = (a) => a.family ?? a.literal ?? a.name ?? "";

function leadAuthor(authors = []) {
  if (authors.length === 0) return "";
  if (authors.length === 1) return familyName(authors[0]);
  if (authors.length === 2) return `${familyName(authors[0])} & ${familyName(authors[1])}`;
  return `${familyName(authors[0])} et al.`;
}

function normalizeSource(source) {
    const text = String(source)
        .trim()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .join("\n");
    return /^TY\s*-/.test(text) ? text.replace(/^([A-Z][A-Z0-9])\s*-\s?/gm, "$1  - ") : text;
}

/** Parse one BibTeX entry into the strings the UI needs. */
function parseCitation(source) {
  const [item] = new Cite(normalizeSource(source)).data; // CSL-JSON
  if (!item) throw new Error("No citation found in the given source");

  const data = { ...item };

  // BibTeX keeps article numbers like "giab008" in `note`; CSL styles print them from `page`.
  if (!data.page && /^[A-Za-z]{2,}\d+$/.test(data.note ?? "")) data.page = data.note;
  for (const field of DROP_FIELDS) delete data[field];

  const cite = new Cite(data);

  const year = data.issued?.["date-parts"]?.[0]?.[0];
  const journal = data["container-title-short"] || data["container-title"];
  const volume = [data.volume, data.issue && `(${data.issue})`].filter(Boolean).join("");
  const tail = [journal, volume, data.page].filter(Boolean).join(", ");

  return {
    id: String(data.id ?? data.DOI ?? source.slice(0, 40)),
    short: `${leadAuthor(data.author)}${year ? ` (${year})` : ""}. ${tail}.`,
    apa: cite.format("bibliography", { format: "text", template: "apa", lang: "en-US" }).trim(),
    bibtex: cite.format("bibtex").trim(),
    doi: data.DOI,
  };
}

/** Parse many entries; entries that fail to parse are skipped (and logged). */
function parseCitations(sources = []) {
    return sources.flatMap((source) => {
        try {
            return [parseCitation(source)];
        } catch (err) {
            console.warn("ToolInfo: could not parse citation starting with:", String(source).trim().slice(0, 60), err);
            return [];
        }
    });
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const FORMATS = [
  { id: "apa", label: "APA" },
  { id: "bibtex", label: "BibTeX" },
];

function Icon({ children }) {
  return (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);
const CheckIcon = () => (
  <Icon>
    <path d="M5 12l5 5 9-10" />
  </Icon>
);
const ChevronIcon = () => (
  <Icon>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

/** Text for screen readers only. */
function SrOnly({ children, ...rest }) {
  return (
    <span
      {...rest}
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function ExternalLink({ href, children }) {
  return (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
            color: C.link, 
            fontWeight: 600, 
            textDecoration: "none",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "5px"
        }}
    >
        {children}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="14px" width="14px" fill="#b23c12"><path d="M5,21q-0.83,0-1.41-0.59T3,19V5Q3,4.17 3.59,3.59T5,3h7V5H5V19H19V12h2v7q0,0.82-0.59,1.41T19,21H5Zm4.7-5.3L8.3,14.3L17.6,5H14V3h7v7H19V6.4L9.7,15.7Z"/></svg>
        <SrOnly>(opens in a new tab)</SrOnly>
    </a>
  );
}

/** A small uppercase label above its value. */
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <dt
            style={{
                color: C.muted,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
            }}
        >
            {label}
        </dt>
        <dd style={{ margin: 0 , fontSize: 13,}}>{children}</dd>
    </div>
  );
}

/** Turns URLs inside plain text (e.g. the DOI at the end of an APA reference) into links. */
function Linkified({ text }) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: C.link, textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        {part.replace(/^https?:\/\//, "")}
      </a>
    ) : (
      part
    )
  );
}

function CopyButton({ id, status, onCopy }) {
  const result = status?.key === id ? status.ok : null; // true | false | null
  return (
    <button
        type="button"
        onClick={onCopy}
        style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 30,
            padding: "0 10px",
            border: `1px solid ${C.control}`,
            borderRadius: 8,
            background: C.surface,
            color: C.text,
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
        }}
    >
      {result ? <CheckIcon /> : <CopyIcon />}
      {result === null ? "Copy" : result ? "Copied" : "Couldn’t copy"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Info block shown under a tool's description.
 *
 * @param {object}   props
 * @param {string}   [props.toolName]     Used in the heading: "Cite {toolName}".
 * @param {string}   [props.github]       Source-code URL.
 * @param {string}   [props.docs]         Documentation URL.
 * @param {string|{name: string, url?: string}} [props.license]
 * @param {string[]} [props.authors]      Display names. Collapsed view shows the first `maxAuthors`.
 * @param {string[]} [props.citations]    One BibTeX entry per item. The first one is the primary
 *                                        citation shown in the collapsed view.
 *                                        Define this array outside the component (or memoize it)
 *                                        so it isn't re-parsed on every render.
 * @param {number}   [props.maxAuthors=2]
 * @param {object}   [props.style]        Extra inline styles for the outer box (e.g. margin).
 */
export default function ToolInfo({
    toolName,
    github,
    docs,
    license,
    authors = [],
    citations = [],
    maxAuthors = 2,
    style,
}) {
    const [open, setOpen] = useState(false);
    const [format, setFormat] = useState("apa");
    const [status, setStatus] = useState(null); // { key, ok }
    const timer = useRef(null);
    const panelId = useId();

    const parsed = useMemo(() => parseCitations(citations), [citations]);

    useEffect(() => () => clearTimeout(timer.current), []);

    async function copy(text, key) {
        let ok = true;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            ok = false;
        }
        setStatus({ key, ok });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus(null), 2000);
    }

    const licenseInfo = typeof license === "string" ? { name: license } : license;
    const extraAuthors = Math.max(0, authors.length - maxAuthors);
    const hasMore = parsed.length > 0 || extraAuthors > 0;
    const showCollapsed = !open || !hasMore;

    if (!github && !docs && !licenseInfo && authors.length === 0 && parsed.length === 0) return null;

    const primary = parsed[0];
    const citeName = toolName ? `Cite ${toolName}` : "Cite this tool";
    const citeHint = `If you use ${toolName ?? "this tool"} in your work, please cite ${
        parsed.length > 1 ? "these papers" : "this paper"
    }.`;

    return (
        <section
            aria-label="Tool information"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 15,
                boxSizing: "border-box",
                padding: "20px 24px",
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                background: C.surface,
                color: C.text,
                fontSize: 15,
                minWidth: "calc(100% - 50px * 2)",
                padding: "25px 25px",
                ...style,
            }}
        >
        {/* Always-visible row */}
        <dl style={{ margin: 0, display: "flex", flexDirection:"row", flexWrap: "wrap", gap: "100px" }}>
            {github && (
            <Field label="Source code">
                <ExternalLink href={github}>GitHub</ExternalLink>
            </Field>
            )}
            {docs && (
            <Field label="Documentation">
                <ExternalLink href={docs}>Docs</ExternalLink>
            </Field>
            )}
            {licenseInfo && (
            <Field label="License">
                {licenseInfo.url ? (
                <a
                    href={licenseInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                    color: "inherit",
                    textDecoration: "underline",
                    textDecorationColor: C.accent,
                    textUnderlineOffset: 4,
                    }}
                >
                    {licenseInfo.name}
                </a>
                ) : (
                licenseInfo.name
                )}
            </Field>
            )}
            {showCollapsed && authors.length > 0 && (
            <Field label="Authors">
                {authors.slice(0, maxAuthors).join(", ")}
                {extraAuthors > 0 && ` +${extraAuthors}`}
            </Field>
            )}
        </dl>
        
        {/* One-line citation (collapsed only) */}
        {!open && primary && (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "start",
                    gap: "15px",
                    boxSizing: "border-box",
                }}            
            >
                < Divider color={C.hairline}/>
                <span
                    style={{
                       fontSize: "15px", 
                       fontWeight: 700,
                       display: "flex",
                       flexDirection: "row",
                       alignItems: "start",
                       gap: "10px"
                    }}
                >
                    <svg height="13px" width="13px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 191.029 191.029" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style={{fill:"#b23c12",}} d="M44.33,88.474v15.377h38.417v82.745H0v-82.745h0.002V88.474c0-31.225,8.984-54.411,26.704-68.918 C38.964,9.521,54.48,4.433,72.824,4.433v44.326C62.866,48.759,44.33,48.759,44.33,88.474z M181.107,48.759V4.433 c-18.343,0-33.859,5.088-46.117,15.123c-17.72,14.507-26.705,37.694-26.705,68.918v15.377h0v82.745h82.744v-82.745h-38.417V88.474 C152.613,48.759,171.149,48.759,181.107,48.759z"></path> </g></svg>
                    {citeName}:
                </span>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        boxSizing: "border-box",
                        width: "100%",
                        backgroundColor: "#FFF8F4",
                        borderRadius: "10px",
                        padding: "10px 15px"
                    }}
                >
                    <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.5 }}>
                        {primary.short}
                    </p>
                    <CopyButton 
                        id="primary" status={status} 
                        onCopy={() => copy(primary[format], "primary")} 
                    />
                </div>
            </div>
        )}

        {/* Expandable panel */}
        {hasMore && (
            <div
                id={panelId}
                hidden={!open}
                style={{ 
                    display: open ? "flex" : "none", 
                    flexDirection: "column", 
                    gap: 14 
                }}
            >
            {authors.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 15,
                    }}
                >
                    < Divider color={C.hairline}/>
                    <span
                        style={{
                            fontSize: "15px", 
                            fontWeight: 700,
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "start",
                            gap: "10px"
                        }}
                    >
                        <svg fill="#B23C12" height="14px" width="14px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 511.999 511.999" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path d="M421.578,190.264l-99.847-99.847c-2.439-2.439-6.391-2.439-8.829,0L82.824,320.495c-2.439,2.439-2.439,6.392,0,8.829 l99.847,99.847c2.439,2.439,6.391,2.439,8.829,0l230.078-230.078C424.017,196.655,424.017,192.703,421.578,190.264z"></path> </g> </g> <g> <g> <path d="M506.511,87.672L424.323,5.484c-7.308-7.31-19.175-7.315-26.488,0l-49.616,49.616c-2.439,2.439-2.439,6.391,0,8.829 l99.847,99.847c2.439,2.437,6.391,2.437,8.829,0l49.616-49.616C513.826,106.847,513.826,94.987,506.511,87.672z"></path> </g> </g> <g> <g> <path d="M508.133,491.11c-1.054-9.556-9.489-16.599-19.104-16.599H111.633l36.058-15.163c4.088-1.719,5.131-7.034,1.994-10.17 l-86.854-86.854c-3.137-3.135-8.451-2.094-10.17,1.994C52.224,365.359,2.052,484.66,1.627,485.707 c-5.815,13.208,4.855,27.01,18.107,26.263H489.52C500.566,511.97,509.379,502.408,508.133,491.11z"></path> </g> </g> </g></svg>
                        Authors:
                    </span>
                    <p style={{ margin: 0, lineHeight: 1.5, fontSize: "14px" }}>{authors.join(", ")}</p>
                </div>
            )}

            {parsed.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 15,
                    }}
                >
                    < Divider color={C.hairline}/>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 15,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "start",
                                flexDirection: "column",
                                gap: "5px",
                            }}
                        >
                        <span
                            style={{
                                fontSize: "15px", 
                                fontWeight: 700,
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "start",
                                gap: "10px"
                            }}
                        >
                            <svg height="13px" width="13px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 191.029 191.029" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style={{fill:"#b23c12",}} d="M44.33,88.474v15.377h38.417v82.745H0v-82.745h0.002V88.474c0-31.225,8.984-54.411,26.704-68.918 C38.964,9.521,54.48,4.433,72.824,4.433v44.326C62.866,48.759,44.33,48.759,44.33,88.474z M181.107,48.759V4.433 c-18.343,0-33.859,5.088-46.117,15.123c-17.72,14.507-26.705,37.694-26.705,68.918v15.377h0v82.745h82.744v-82.745h-38.417V88.474 C152.613,48.759,171.149,48.759,181.107,48.759z"></path> </g></svg>
                            {citeName}:
                        </span>
                            <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 14 }}>{citeHint}</p>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <div role="group" aria-label="Citation format" style={{ display: "flex", gap: 8 }}>
                            {FORMATS.map((f) => {
                            const active = format === f.id;
                            return (
                                <button
                                key={f.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setFormat(f.id)}
                                style={{
                                    minHeight: 40,
                                    padding: "0 14px",
                                    border: `1px solid ${active ? C.accent : C.control}`,
                                    borderRadius: 999,
                                    background: active ? C.accent : C.surface,
                                    color: C.text,
                                    fontFamily: "inherit",
                                    fontSize: 13,
                                    fontWeight: active ? 700 : 500,
                                    cursor: "pointer",
                                }}
                                >
                                {f.label}
                                </button>
                            );
                            })}
                        </div>
                        <CopyButton
                            id="all"
                            status={status}
                            onCopy={() => copy(parsed.map((c) => c[format]).join("\n\n"), "all")}
                        />
                        </div>
                    </div>

                    <ol
                        style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        border: `1px solid ${C.hairline}`,
                        borderRadius: 8,
                        }}
                    >
                        {parsed.map((c, i) => (
                        <li
                            key={c.id}
                                style={{
                                display: "grid",
                                gridTemplateColumns: "24px minmax(0, 1fr)",
                                gap: 8,
                                padding: "14px 16px",
                                borderTop: i > 0 ? `1px solid ${C.hairline}` : "none",
                                alignItems: "start",
                                overflowX: "auto"
                            }}
                        >
                            <span aria-hidden="true" style={{ color: C.muted, fontSize: 11, lineHeight: 1.5, }}>
                            {i + 1}
                            </span>
                            {format === "apa" ? (
                                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                                    <Linkified text={c.apa} />
                                </p>
                            ) : (
                                <pre
                                    style={{
                                        margin: 0,
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                                        fontSize: 11,
                                        lineHeight: 1.5,
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {c.bibtex}
                                </pre>
                            )}
                        </li>
                        ))}
                    </ol>
                </div>
            )}
            </div>
        )}

        {/* Show more / less */}
        {hasMore && (
            <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            style={{
                display: "inline-flex",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 6,
                minHeight: 40,
                padding: 0,
                border: 0,
                background: "none",
                color: C.link,
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
            }}
            >
            {open ? "Show less" : "Show details and citations"}
            <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none" }}>
                <ChevronIcon />
            </span>
            </button>
        )}

        <SrOnly role="status">
            {status ? (status.ok ? "Citation copied" : "Couldn’t copy the citation") : ""}
        </SrOnly>
        </section>
    );
}

/*
 * Example usage
 *
 * // Keep this outside the component so the BibTeX is parsed once.
 * const citations = [
 *   // Primary citation (shown in the collapsed view). The long `abstract` field is ignored.
 *   `@article{10.1093/gigascience/giab008,
 *     author = {Danecek, Petr and Bonfield, James K and Liddle, Jennifer and Marshall, John and Ohan, Valeriu and Pollard, Martin O and Whitwham, Andrew and Keane, Thomas and McCarthy, Shane A and Davies, Robert M and Li, Heng},
 *     title = "{Twelve years of SAMtools and BCFtools}",
 *     journal = {GigaScience},
 *     volume = {10},
 *     number = {2},
 *     year = {2021},
 *     doi = {10.1093/gigascience/giab008},
 *     note = {giab008},
 *   }`,
 *   // Check this entry against the publisher/Crossref BibTeX before using it.
 *   `@article{Li2009,
 *     author = {Li, Heng and Handsaker, Bob and Wysoker, Alec and Fennell, Tim and Ruan, Jue and Homer, Nils and Marth, Gabor and Abecasis, Goncalo and Durbin, Richard and {1000 Genome Project Data Processing Subgroup}},
 *     title = {The Sequence Alignment/Map format and SAMtools},
 *     journal = {Bioinformatics},
 *     volume = {25},
 *     number = {16},
 *     pages = {2078--2079},
 *     year = {2009},
 *     doi = {10.1093/bioinformatics/btp352},
 *   }`,
 * ];
 *
 * <ToolInfo
 *   toolName="Samtools"
 *   github="https://github.com/samtools/samtools"
 *   docs="http://www.htslib.org/doc/samtools.html"
 *   license={{ name: "MIT/Expat", url: "https://github.com/samtools/samtools/blob/develop/LICENSE" }}
 *   authors={["Heng Li", "Petr Danecek", "James K. Bonfield", "contributors"]}
 *   citations={citations}
 *   style={{ marginTop: 24 }}
 * />
 */