import { useMemo, useState } from "react";

const documentationSections = [
  {
    id: "report-basics",
    title: "Reading the report",
    intro:
      "This section explains the summary fields and how to interpret grades and scores produced by GDPR Analyzer.",
    items: [
      {
        term: "Target",
        description:
          "The website or URL that was submitted for analysis. Findings apply to the page and scan conditions tested, not automatically to every page or subdomain on the site.",
      },
      {
        term: "Generated",
        description:
          "The date the report was created. It is a record of when the scan ran, not necessarily the date on which every certificate or website setting was last changed.",
      },
      {
        term: "Overall grade",
        description:
          "A summary grade calculated using this project's grading rules. In this analyzer, the overall grade reflects the weakest module grade, so one weaker category can determine the overall result.",
        note:
          "A grade is the analyzer's technical assessment, not an official GDPR compliance rating.",
      },
      {
        term: "Analysis summary / module grade",
        description:
          "The table lists the individual checks that ran, such as Cookies, Web beacons, and Transmission security. Each module has its own grade and score.",
      },
      {
        term: "Score",
        description:
          "Points assigned by the analyzer's implemented rules for a module or sub-check. In this analyzer, more points generally mean more flags or a less favorable result; the exact thresholds are defined by the project, not by a universal standard.",
        note:
          "A subsection score and its parent module score may not add up unless the implementation explicitly defines them as additive.",
      },
      {
        term: "Grades A–F",
        description:
          "Letter grades group score ranges using the analyzer's configured thresholds. Read a grade together with the findings and criteria that produced it; do not treat it as a standardized security rating.",
      },
      {
        term: "No items detected",
        description:
          "This means the analyzer did not find items matching its current detection rules during that scan. It does not prove that the website never uses that technology or that no related risk exists.",
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookies",
    intro:
      "Cookies are small pieces of data that a website asks a browser to store and send with later requests. They can support sessions, preferences, analytics, and advertising.",
    items: [
      {
        term: "Cookie analysis",
        description:
          "This module inspects cookies observed during the scan. The analyzer's described scoring rules focus on cookie lifetime and whether a cookie is third-party.",
      },
      {
        term: "Cookie lifetime",
        description:
          "How long a cookie can persist. A cookie with an Expires or Max-Age attribute can persist for a specified period; a session cookie is intended to expire when the browser session ends, although browser session-restoration behavior can affect this.",
      },
      {
        term: "Third-party cookie",
        description:
          "A cookie associated with a site or context different from the site the user is currently viewing. Third-party cookies are commonly associated with embedded content, cross-site tracking, or advertising, though context matters.",
      },
      {
        term: "Cookie score",
        description:
          "The points assigned by this module's cookie rules. A score of 0 and grade A mean no penalties were recorded by the implemented checks for this scan; they do not establish that the site has a compliant consent process.",
      },
      {
        term: "No cookies detected",
        description:
          "No cookies were observed by the analyzer during the tested visit. Cookies that appear only after clicking, signing in, accepting a banner, or visiting another route may not be seen in a basic scan.",
      },
    ],
  },
  {
    id: "web-beacons",
    title: "Web beacons",
    intro:
      "A web beacon (sometimes called a tracking pixel) is a resource, often a very small image, that can notify a server when a page or message is viewed. The presence of a tiny image alone does not prove tracking; the report applies its own detection criteria.",
    items: [
      {
        term: "Web beacon detection",
        description:
          "The module checks page resources and styles for patterns that match the analyzer's beacon criteria, including image dimensions, positioning, hidden styling, and a host-block list.",
      },
      {
        term: "Size",
        description:
          "Flags an image smaller than the analyzer's configured threshold (the report describes a threshold below 3 pixels). Very small dimensions can make an image difficult for a person to notice.",
      },
      {
        term: "Position",
        description:
          "Flags an image positioned outside the visible page, for example with a negative left or top coordinate. This can make the resource less visible to the user.",
      },
      {
        term: "Hidden",
        description:
          "Flags styling that hides an image or its rendered content, based on the rules implemented by the analyzer.",
      },
      {
        term: "Blacklist",
        description:
          "Flags a resource when its host appears in the host-block list used by the analyzer. Results depend on the list's contents and update date; absence from the list does not mean a host is trustworthy.",
      },
      {
        term: "No web beacons detected",
        description:
          "No resources matched the current beacon checks during this scan. This is not a guarantee that the site performs no analytics or tracking; tracking can use scripts, network calls, or techniques outside these checks.",
      },
    ],
  },
  {
    id: "transmission-security",
    title: "Transmission security and protocols",
    intro:
      "Transport Layer Security (TLS) protects data sent between a browser and a server by providing encryption and integrity checks, and by helping authenticate the server. The report lists protocol versions the checker says are enabled and scores its findings.",
    items: [
      {
        term: "Transmission security score",
        description:
          "The module's score is based on the protocol, certificate, key, and cipher-related checks implemented by this analyzer. Review the detailed findings rather than interpreting the score alone.",
      },
      {
        term: "Protocol check score",
        description:
          "The points assigned to the protocol-version checks. It is a component of the analyzer's scoring system and is not a score defined by the TLS standards.",
      },
      {
        term: "SSLv2 and SSLv3",
        description:
          "Legacy SSL protocol versions with serious known security weaknesses. They should not be enabled. A result of UNKNOWN/UNKNOW means the checker could not determine their state, not that they are safely disabled.",
      },
      {
        term: "TLS 1.0 and TLS 1.1",
        description:
          "Older TLS versions that are deprecated. A report value of YES means the checker reports that the server supports that version; it is not a positive security signal. Modern configurations should disable TLS 1.0 and 1.1.",
      },
      {
        term: "TLS 1.2",
        description:
          "A widely deployed TLS version that can be configured securely with modern cipher suites. Its security depends on the full server configuration, not simply whether it is enabled.",
      },
      {
        term: "TLS 1.3",
        description:
          "A newer TLS version with a streamlined handshake and a modern set of cipher suites. Prefer it where client and server compatibility allows; supporting TLS 1.3 does not by itself guarantee every other setting is correct.",
      },
      {
        term: "YES / NO / UNKNOWN (shown as UNKNOW in some reports)",
        description:
          "YES means the check reported support or presence; NO means it reported no support or presence; UNKNOWN means the checker could not establish the state. Treat an unknown result as inconclusive, not as a pass. The spelling UNKNOW is likely a display or source-data typo.",
      },
    ],
  },
  {
    id: "certificate",
    title: "Certificate and key quality",
    intro:
      "A TLS certificate binds a public key to a domain or organization identity. The browser uses the certificate chain and validity checks as part of deciding whether it can trust the server identity.",
    items: [
      {
        term: "Certificate score",
        description:
          "Points assigned by the analyzer's certificate checks. Consult the individual certificate fields to understand what affected the score.",
      },
      {
        term: "Issued to",
        description:
          "The identity named by the certificate, usually a domain name or a subject identity. A valid certificate should match the hostname being visited; modern hostname matching commonly relies on Subject Alternative Names (SANs), which may not be shown in this report.",
      },
      {
        term: "Issued by",
        description:
          "The certificate authority (CA) that issued the certificate, or the issuer named in the certificate chain. A familiar issuer name alone does not prove the certificate is valid; chain and hostname checks also matter.",
      },
      {
        term: "Extended validation (EV)",
        description:
          "Indicates whether the checker classified the certificate as Extended Validation. EV involves additional identity checks by the issuing CA, but it does not mean the website's content, business practices, or GDPR compliance have been verified.",
      },
      {
        term: "Certificate type",
        description:
          "The certificate category inferred by the checker. UNKNOWN/UNKNOW means the analyzer did not classify this field; by itself, that value does not prove the certificate is invalid.",
      },
      {
        term: "Signature algorithm",
        description:
          "The algorithm used to sign the certificate, such as ecdsa-with-SHA256. The signature helps the client verify that the certificate was issued by the stated issuer and has not been altered; trust also depends on the certificate chain and validation rules.",
      },
      {
        term: "Valid from / Valid until",
        description:
          "The certificate's validity window. The current time should fall within this interval, but the certificate must also match the hostname and chain to validate successfully.",
      },
      {
        term: "Key score, key type, and key size",
        description:
          "The key score is the analyzer's assessment of the public key. Key type names the algorithm family—for example, EC means elliptic-curve cryptography—and key size is the reported number of bits. Bit lengths from different algorithm families are not directly equivalent measures of strength.",
        note:
          "For example, an EC key size of 256 is not the same kind of measurement as a 256-bit AES cipher key.",
      },
    ],
  },
  {
    id: "cipher-suites",
    title: "Cipher suite details",
    intro:
      "A cipher suite describes cryptographic algorithms used by a TLS connection. The report may list several suites for each protocol version; this indicates the checker observed or enumerated those options, not that every visitor's connection uses all of them.",
    items: [
      {
        term: "Cipher score",
        description:
          "The points assigned by the analyzer's cipher checks. It reflects the project's own rules and may not capture every factor relevant to modern TLS security.",
      },
      {
        term: "Protocol",
        description:
          "The TLS version under which the listed cipher suite is reported, such as TLSv1, TLSv1_1, or TLSv1_2. The same suite name may appear under more than one protocol version.",
      },
      {
        term: "Name",
        description:
          "The standardized cipher-suite name. For example, ECDHE_RSA_WITH_AES_128_CBC_SHA indicates ECDHE key agreement, RSA authentication, AES encryption with a 128-bit key in CBC mode, and a SHA-1-based message authentication code in the legacy suite naming scheme.",
      },
      {
        term: "Security: secure / recommended",
        description:
          "The label assigned by this analyzer's classification rules. 'Recommended' means the tool's rules prefer that suite; 'secure' is not a guarantee that the complete server configuration is modern or safe. In particular, a legacy suite can be labelled secure by a simple rule even when its protocol version is deprecated.",
      },
      {
        term: "Key exchange",
        description:
          "How the client and server establish shared secret material. ECDHE is ephemeral elliptic-curve Diffie–Hellman key agreement and can provide forward secrecy when correctly configured. Static RSA key transport does not provide forward secrecy.",
      },
      {
        term: "Auth. (authentication)",
        description:
          "The algorithm used to authenticate the server or handshake in the cipher-suite naming scheme. RSA and ECDSA are common examples. This field is separate from the symmetric algorithm that encrypts application data.",
      },
      {
        term: "Cipher type and key size",
        description:
          "The encryption algorithm and the reported cipher-key length. AES and ChaCha20 are examples of encryption algorithms. A value such as 128 or 256 refers to key length in bits for that algorithm; strength also depends on the algorithm and mode.",
      },
      {
        term: "Mode: CBC, GCM, or AEAD",
        description:
          "CBC is a block-cipher mode used by older suites. GCM is an authenticated-encryption mode. AEAD means Authenticated Encryption with Associated Data: it provides confidentiality and integrity together. Modern guidance prefers AEAD suites and advises against CBC-based suites where possible.",
      },
      {
        term: "MAC type and MAC size",
        description:
          "For traditional cipher suites, the Message Authentication Code (MAC) algorithm and output length help protect message integrity; SHA-1, SHA-256, and SHA-384 may appear in these fields. In AEAD suites, integrity is built into the authenticated-encryption algorithm, so a report's separate MAC columns may be inapplicable or reflect the tool's output format.",
      },
      {
        term: "Reading the cipher table as a whole",
        description:
          "Do not judge a connection by key size alone. Protocol version, key exchange, authentication, cipher mode, integrity protection, certificate validation, and the server's actual negotiated settings all matter. TLS 1.3 also uses a different cipher-suite naming structure from TLS 1.2 and earlier.",
      },
    ],
  },
  {
    id: "scope-and-limitations",
    title: "Scope and limitations",
    intro:
      "Use the report as a technical snapshot of the checks implemented in this project, not as a complete security audit or a legal opinion.",
    items: [
      {
        term: "What a passing result means",
        description:
          "A good grade means the tested checks did not assign many negative points. It does not prove that the site has appropriate consent, a lawful basis for processing, a sufficient privacy notice, suitable retention periods, or compliant data-subject-rights processes.",
      },
      {
        term: "Why results can be incomplete",
        description:
          "Results depend on the URL tested, scan timing, network access, the pages and interactions visited, the rules in the code, and the version of the analyzer's host-block list. Dynamic content and login-only behavior may not be covered.",
      },
      {
        term: "Report footer / personal-use notice",
        description:
          "A message such as 'Generate only for personal purpose. Do not publish this report. Generated for yourname.' is report-template text and a usage notice. It is not a technical finding about the target website.",
      },
    ],
  },
];

const referenceLinks = [
  {
    label: "OWASP Transport Layer Security Cheat Sheet",
    href: "https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html",
    description: "Current practical guidance on TLS protocols and cipher suites.",
  },
  {
    label: "MDN: Third-party cookies",
    href: "https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies",
    description: "How first-party and third-party cookies are distinguished.",
  },
  {
    label: "MDN: HTTP cookies",
    href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies",
    description: "Cookie lifetime and common cookie attributes.",
  },
];

export default function Documentation() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return documentationSections;

    return documentationSections.flatMap((section) => {
      const sectionMatches = `${section.title} ${section.intro}`
        .toLowerCase()
        .includes(normalizedQuery);

      const items = sectionMatches
        ? section.items
        : section.items.filter((item) =>
            `${item.term} ${item.description} ${item.note ?? ""}`
              .toLowerCase()
              .includes(normalizedQuery),
          );

      return items.length ? [{ ...section, items }] : [];
    });
  }, [normalizedQuery]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#080d18] text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-8 border-b border-white/[0.07] pb-8">
          <p className="mb-3 text-sm text-cyan-300">HELP CENTER</p>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Documentation
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Understand the fields, scores, and technical terms shown in a
                website analysis report.
              </p>
            </div>

            <div className="w-full md:max-w-sm">
              <label htmlFor="documentation-search" className="sr-only">
                Search documentation
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e1627] px-4 focus-within:border-cyan-400/50">
                <span aria-hidden="true" className="text-slate-500">
                  ⌕
                </span>
                <input
                  id="documentation-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search terms, e.g. ECDHE or cookie lifetime"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Grades",
              text: "A–F labels are assigned using this project's thresholds. They are not official GDPR ratings.",
            },
            {
              title: "Scores",
              text: "Scores represent points from implemented rules. Read the detailed findings to see what contributed to them.",
            },
            {
              title: "Scan coverage",
              text: "A result only describes the checks and page behavior observed during that scan.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <p className="text-sm font-semibold text-slate-100">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.text}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-5 py-4 text-sm leading-6 text-amber-200">
          <span className="font-semibold">Important:</span> This tool provides a
          limited technical assessment. A high grade does not establish GDPR
          compliance or guarantee that a website is secure.
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0b1120] p-4 lg:sticky lg:top-20">
              <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                On this page
              </p>
              <nav aria-label="Documentation sections" className="space-y-1">
                {filteredSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    {section.title}
                  </a>
                ))}
                {!normalizedQuery && (
                  <a
                    href="#references"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    Further reading
                  </a>
                )}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-10">
            {filteredSections.map((section) => (
              <section
                id={section.id}
                key={section.id}
                className="scroll-mt-20"
                aria-labelledby={`${section.id}-heading`}
              >
                <div className="mb-4">
                  <h2
                    id={`${section.id}-heading`}
                    className="text-xl font-semibold tracking-tight sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                    {section.intro}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {section.items.map((item) => (
                    <article
                      key={item.term}
                      className="rounded-2xl border border-white/[0.07] bg-[#0e1627] p-5"
                    >
                      <h3 className="text-sm font-semibold text-cyan-200">
                        {item.term}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {item.description}
                      </p>
                      {item.note && (
                        <p className="mt-3 rounded-lg border border-white/[0.07] bg-[#080d18] px-3 py-2 text-xs leading-5 text-slate-400">
                          <span className="font-semibold text-slate-200">
                            Note:{" "}
                          </span>
                          {item.note}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {filteredSections.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1627] px-6 py-12 text-center">
                <h2 className="text-lg font-semibold">No matching terms</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Try another search, such as “certificate”, “TLS 1.2”, “MAC”,
                  or “beacon”.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Clear search
                </button>
              </div>
            )}

            {!normalizedQuery && (
              <section id="references" className="scroll-mt-20">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Further reading
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  These references provide additional background on cookie
                  behavior and current TLS configuration guidance.
                </p>
                <div className="mt-4 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-[#0e1627] px-5">
                  {referenceLinks.map((reference) => (
                    <div
                      key={reference.href}
                      className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <div>
                        <a
                          href={reference.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-cyan-200 underline decoration-cyan-400/30 underline-offset-4 hover:text-white"
                        >
                          {reference.label}
                        </a>
                        <p className="mt-1 text-sm text-slate-400">
                          {reference.description}
                        </p>
                      </div>
                      <span aria-hidden="true" className="text-slate-600">
                        ↗
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="mt-12 border-t border-white/[0.06] pt-5 text-xs leading-5 text-slate-600">
          Documentation describes the current analyzer's output fields.
          Detection coverage and scoring may change as the implementation
          evolves.
        </footer>
      </div>
    </main>
  );
}