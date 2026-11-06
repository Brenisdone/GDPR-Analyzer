import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Info,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
} from "lucide-react";

import {
  CertificateTimeline,
  DonutChart,
  ProtocolMatrix,
  StackedBarChart,
  VerticalBarChart,
} from "./AssessmentCharts";

const GRADE_COPY = {
  A: "Lowest penalty band",
  B: "Low penalty band",
  C: "Moderate penalty band",
  D: "Elevated penalty band",
  E: "High penalty band",
  F: "Highest penalty band",
};

const GRADE_STYLES = {
  A: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  B: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  C: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  D: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  E: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  F: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

const PROTOCOL_LABELS = {
  SSLv2: "SSL 2",
  SSLv3: "SSL 3",
  TLSv1: "TLS 1.0",
  TLSv1_1: "TLS 1.1",
  TLSv1_2: "TLS 1.2",
  TLSv1_3: "TLS 1.3",
};

function valueOrFallback(value, fallback = "Not available") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function GradeBadge({ grade }) {
  const value = String(grade || "").toUpperCase();
  const style = GRADE_STYLES[value] || "border-slate-700 bg-slate-800 text-slate-300";

  return (
    <span className={`inline-flex min-w-10 items-center justify-center rounded-lg border px-3 py-1.5 text-lg font-semibold ${style}`}>
      {value || "—"}
    </span>
  );
}

function Panel({ title, description, icon: Icon, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-white/[0.08] bg-[#0e1627] p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300">
            <Icon size={18} />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function SmallStat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-100">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function DetailDisclosure({ title, count, children }) {
  return (
    <details className="group rounded-xl border border-white/[0.07] bg-[#080d18]/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-cyan-200 hover:text-cyan-100">
        <span>{title}{count !== undefined ? ` (${count})` : ""}</span>
        <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/[0.06] px-4 py-4">{children}</div>
    </details>
  );
}

function cookieRecords(result) {
  const details = result?.cookies?.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];

  return Object.entries(details).map(([key, value]) => ({
    key,
    ...(value && typeof value === "object" ? value : {}),
  }));
}

function beaconRecords(result) {
  const records = result?.web_beacons?.url;
  return Array.isArray(records) ? records : [];
}

function cipherRecords(security) {
  const groups = security?.cipher;
  if (!groups || typeof groups !== "object") return [];

  return Object.entries(groups).flatMap(([protocol, suites]) => {
    if (protocol === "score" || !Array.isArray(suites)) return [];

    return suites.flatMap((suite) => {
      if (!suite || typeof suite !== "object") return [];

      return Object.entries(suite).map(([name, details]) => ({
        protocol,
        name,
        ...(details && typeof details === "object" ? details : {}),
      }));
    });
  });
}

function protocolLabel(protocol) {
  return PROTOCOL_LABELS[protocol] || protocol.replace(/_/g, " ");
}

function certificateType(value) {
  const types = {
    "domain-validated": "Domain validated",
    "organization-validated": "Organization validated",
    "extended-validation": "Extended validation",
    "UNKNOW": "Not classified by analyzer",
  };
  return types[value] || valueOrFallback(value);
}

function ModuleSummary({ title, grade, summary }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <GradeBadge grade={grade} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {GRADE_COPY[String(grade || "").toUpperCase()] || "No grade returned"}
      </p>
      <p className="mt-3 text-sm leading-5 text-slate-400">{summary}</p>
    </div>
  );
}

export default function AssessmentDetails({ result }) {
  if (!result) {
    return <p className="text-sm text-slate-400">No assessment result available.</p>;
  }

  const cookies = cookieRecords(result);
  const beacons = beaconRecords(result);
  const security = result.security_transmission || {};
  const certificate = security.certificate || {};
  const keyInfo = security.key || {};
  const protocols = Object.entries(security.protocol || {}).filter(
    ([name, value]) => name !== "score" && typeof value !== "object"
  );
  const enabledProtocols = protocols.filter(
    ([, value]) => String(value).toUpperCase() === "YES"
  );
  const legacyProtocols = enabledProtocols.filter(([name]) =>
    ["SSLv2", "SSLv3", "TLSv1", "TLSv1_1"].includes(name)
  );
  const suites = cipherRecords(security);
  const cipherClasses = ["recommended", "secure", "weak", "insecure"];
  const cipherCounts = Object.fromEntries(
    cipherClasses.map((classification) => [
      classification,
      suites.filter(
        (suite) => String(suite.security || "").toLowerCase() === classification
      ).length,
    ])
  );
  const unclassifiedCount = suites.length - Object.values(cipherCounts).reduce(
    (total, count) => total + count,
    0
  );
  const cipherTotal = suites.length;

  const cookieCounts = {
    secure: cookies.filter((cookie) => cookie.secure === true).length,
    httpOnly: cookies.filter((cookie) => cookie.http_only === true).length,
    thirdParty: cookies.filter((cookie) => cookie.third_party === true).length,
    missingSecure: cookies.filter((cookie) => cookie.secure === false).length,
    missingHttpOnly: cookies.filter((cookie) => cookie.http_only === false).length,
    unknownSecure: cookies.filter((cookie) => typeof cookie.secure !== "boolean").length,
    unknownHttpOnly: cookies.filter((cookie) => typeof cookie.http_only !== "boolean").length,
    notThirdParty: cookies.filter((cookie) => cookie.third_party === false).length,
    unknownThirdParty: cookies.filter((cookie) => typeof cookie.third_party !== "boolean").length,
    session: cookies.filter((cookie) =>
      String(cookie.expiration || "").toLowerCase().includes("session")
    ).length,
  };

  const beaconCounts = {
    hidden: beacons.filter((beacon) => beacon && typeof beacon === "object" && beacon.hidden === true).length,
    position: beacons.filter((beacon) => beacon && typeof beacon === "object" && beacon.position === true).length,
    size: beacons.filter((beacon) => beacon && typeof beacon === "object" && beacon.size === true).length,
    blacklist: beacons.filter((beacon) => beacon && typeof beacon === "object" && beacon.blacklist === true).length,
  };

  const now = Date.now();
  const expiryDate = certificate.not_after ? new Date(certificate.not_after) : null;
  const expiryTimestamp = expiryDate ? expiryDate.getTime() : Number.NaN;
  const certificateExpired = Number.isFinite(expiryTimestamp)
    ? expiryTimestamp < now
    : null;
  const certificateStartTimestamp = certificate.not_before
    ? Date.parse(certificate.not_before)
    : Number.NaN;
  const hasCertificateWindow = Number.isFinite(certificateStartTimestamp)
    && Number.isFinite(expiryTimestamp)
    && expiryTimestamp > certificateStartTimestamp;
  const certificateDateStatus = hasCertificateWindow
    ? now < certificateStartTimestamp
      ? "Not yet valid"
      : certificateExpired
        ? "Expired"
        : "Within date window"
    : certificateExpired === null
      ? "Unknown"
      : certificateExpired
        ? "Expired"
        : "Expiry date not passed";
  const cipherProtocolCounts = Object.entries(
    suites.reduce((counts, suite) => {
      counts[suite.protocol] = (counts[suite.protocol] || 0) + 1;
      return counts;
    }, {})
  ).map(([protocol, value]) => ({
    label: protocolLabel(protocol),
    value,
    color: "#22d3ee",
  }));

  const cookieSummary = !result.cookies
    ? "The scan did not return a cookie-analysis result."
    : cookies.length === 0
      ? "No cookie records were returned for this page load. This does not prove that the website never uses cookies."
      : `${cookies.length} cookies were observed. ${cookieCounts.thirdParty} were identified as third-party, and ${cookieCounts.missingSecure + cookieCounts.missingHttpOnly} missing-attribute observations were recorded.`;

  const beaconSummary = !result.web_beacons
    ? "The scan did not return a web-beacon result."
    : beacons.length === 0
      ? "No image URLs matched the analyzer's current beacon heuristics. This is not proof that the page has no tracking."
      : `${beacons.length} image URL${beacons.length === 1 ? " was" : "s were"} flagged by one or more checks. Review the reasons below; some patterns can also occur in legitimate images.`;

  const securitySummary = protocols.length === 0
    ? "The scan did not return protocol support details."
    : `${enabledProtocols.length} of ${protocols.length} listed protocols were reported as supported.${legacyProtocols.length > 0 ? ` ${legacyProtocols.length} legacy protocol version(s) were also enabled.` : " No legacy TLS/SSL versions were reported as enabled."}`;

  const cookieModuleSummary = !result.cookies
    ? "No cookie-analysis result returned."
    : cookies.length > 0
      ? `${cookies.length} cookies observed; ${cookieCounts.thirdParty} third-party.`
      : "No cookie records returned.";
  const beaconModuleSummary = !result.web_beacons
    ? "No web-beacon result returned."
    : beacons.length > 0
      ? `${beacons.length} potential beacon URL(s) flagged.`
      : "No beacon URLs flagged by current checks.";
  const securityModuleSummary = !result.security_transmission
    ? "No connection-security result returned."
    : `${enabledProtocols.length} supported protocol(s); ${cipherTotal} cipher suite(s) listed.`;

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Assessment results
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
            Results, explained
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            The charts summarize observed cookie attributes, tracking signals, protocol support,
            and cipher-suite classifications. Open additional information for individual records.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <ModuleSummary
            title="Cookies"
            grade={result.cookies?.grade}
            summary={cookieModuleSummary}
          />
          <ModuleSummary
            title="Potential tracking signals"
            grade={result.web_beacons?.grade}
            summary={beaconModuleSummary}
          />
          <ModuleSummary
            title="Connection security"
            grade={security.grade}
            summary={securityModuleSummary}
          />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-3 text-xs leading-5 text-slate-400">
          <Info size={15} className="mt-0.5 shrink-0 text-cyan-300" />
          <p>
            Grades are produced by this analyzer's scoring rules. They are technical indicators,
            not a GDPR compliance score, legal opinion, or certification. A result also reflects
            only what the scanner could observe during this scan.
          </p>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-5">
        <Panel
          title="Cookie review"
          description="A plain-language view of the cookies returned by the browser during the scan."
          icon={ShieldCheck}
        >
          <p className="mb-4 text-sm leading-6 text-slate-300">{cookieSummary}</p>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SmallStat label="Observed cookies" value={cookies.length} />
            <SmallStat label="Third-party" value={cookieCounts.thirdParty} />
            <SmallStat label="Session cookies" value={cookieCounts.session} />
          </div>

          {cookies.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200">Cookie attributes</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Secure means HTTPS-only delivery; HttpOnly prevents page scripts from reading a cookie.
                  Third-party means the cookie belongs to another domain. Rows can overlap.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <DonutChart
                  title="Cookie domain classification"
                  description="Based on the analyzer's third-party-domain flag; ‘not flagged’ is not a legal first-party determination."
                  total={cookies.length}
                  segments={[
                    { label: "Flagged third-party", value: cookieCounts.thirdParty, color: "#fbbf24" },
                    { label: "Not flagged third-party", value: cookieCounts.notThirdParty, color: "#22d3ee" },
                    { label: "Not reported", value: cookieCounts.unknownThirdParty, color: "#64748b" },
                  ]}
                />
                <StackedBarChart
                  title="Cookie attribute coverage"
                  description="Each row adds up to the observed cookie count. Missing means the returned flag was false; unknown means no boolean value was returned."
                  rows={[
                    {
                      label: "Secure",
                      total: cookies.length,
                      segments: [
                        { label: "Present", value: cookieCounts.secure, className: "bg-emerald-400" },
                        { label: "Missing", value: cookieCounts.missingSecure, className: "bg-rose-400" },
                        { label: "Unknown", value: cookieCounts.unknownSecure, className: "bg-slate-500" },
                      ],
                    },
                    {
                      label: "HttpOnly",
                      total: cookies.length,
                      segments: [
                        { label: "Present", value: cookieCounts.httpOnly, className: "bg-emerald-400" },
                        { label: "Missing", value: cookieCounts.missingHttpOnly, className: "bg-rose-400" },
                        { label: "Unknown", value: cookieCounts.unknownHttpOnly, className: "bg-slate-500" },
                      ],
                    },
                  ]}
                  legend={[
                    { label: "Present", className: "bg-emerald-400" },
                    { label: "Missing", className: "bg-rose-400" },
                    { label: "Unknown", className: "bg-slate-500" },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4 text-sm text-slate-500">
              There is no cookie-level data to chart for this scan.
            </div>
          )}
        </Panel>

        <Panel
          title="Potential tracking signals"
          description="The analyzer checks image elements for patterns that can be associated with web beacons."
          icon={RadioTower}
        >
          <p className="mb-4 text-sm leading-6 text-slate-300">{beaconSummary}</p>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <SmallStat label="Flagged image URLs" value={beacons.length} />
            <SmallStat
              label="Signal types found"
              value={Object.values(beaconCounts).filter((count) => count > 0).length}
              hint="Out of 4 checks"
            />
          </div>

          {beacons.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200">Why an image was flagged</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Counts are per URL record. A single URL can match more than one check.
                </p>
              </div>
              <VerticalBarChart
                title="Detection signals by type"
                description="Number of flagged URL records matching each signal. One URL may contribute to multiple bars, so totals can exceed the number of URLs."
                items={[
                  { label: "Hidden", value: beaconCounts.hidden, color: "#fbbf24" },
                  { label: "Off-screen", value: beaconCounts.position, color: "#f59e0b" },
                  { label: "Very small", value: beaconCounts.size, color: "#fb7185" },
                  { label: "Blocklist", value: beaconCounts.blacklist, color: "#f43f5e" },
                ]}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4 text-sm text-slate-500">
              No potential beacon URLs were returned, so there are no signal counts to chart.
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Connection security"
        description="A summary of supported transport protocols, the certificate expiry date, and the cipher suites reported by the analyzer."
        icon={LockKeyhole}
      >
        {!result.security_transmission ? (
          <p className="text-sm text-slate-400">No transmission-security result was returned.</p>
        ) : (
          <>
            <p className="mb-4 text-sm leading-6 text-slate-300">{securitySummary}</p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SmallStat label="Supported protocols" value={enabledProtocols.length} hint={`Of ${protocols.length} listed`} />
              <SmallStat label="Cipher suites listed" value={cipherTotal} />
              <SmallStat
                label="Recommended suites"
                value={cipherCounts.recommended}
                hint={cipherTotal ? `Of ${cipherTotal} listed` : "No cipher data"}
              />
              <SmallStat
                label="Certificate expiry"
                value={certificateDateStatus}
                hint={certificate.not_after || "Expiry date not returned"}
              />
            </div>

            <div className="mt-4">
              <ProtocolMatrix protocols={protocols} />
            </div>

            <CertificateTimeline
              start={certificate.not_before}
              end={certificate.not_after}
              now={now}
            />

            {legacyProtocols.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <p>
                  Legacy protocol support was reported: {legacyProtocols.map(([name]) => protocolLabel(name)).join(", ")}.
                  These versions should be reviewed and disabled where they are no longer required.
                </p>
              </div>
            )}

            {legacyProtocols.length === 0 && enabledProtocols.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3 text-xs leading-5 text-slate-400">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                <p>No legacy TLS/SSL version was reported as enabled. Some protocol entries may still be marked as not tested.</p>
              </div>
            )}

            {cipherTotal > 0 && (
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-200">Cipher-suite classification</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    A cipher suite is a set of settings used to protect a connection. This shows the analyzer's classification of the suites it listed.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <DonutChart
                    title="Classification mix"
                    description="Distribution of cipher suites returned by the analyzer."
                    total={cipherTotal}
                    segments={[
                      { label: "Recommended", value: cipherCounts.recommended, color: "#34d399" },
                      { label: "Secure", value: cipherCounts.secure, color: "#22d3ee" },
                      { label: "Weak", value: cipherCounts.weak, color: "#fbbf24" },
                      { label: "Insecure", value: cipherCounts.insecure, color: "#fb7185" },
                      { label: "Unclassified", value: unclassifiedCount, color: "#64748b" },
                    ]}
                  />
                  <VerticalBarChart
                    title="Suites by protocol"
                    description="How many suites the analyzer enumerated for each TLS version. This is availability, not a quality score."
                    items={cipherProtocolCounts}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      <div className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500">
        <CircleHelp size={14} className="mt-0.5 shrink-0" />
        <p>
          The summaries describe observations, not intent. For example, a third-party cookie or a small image is a reason to inspect a site further, not by itself proof of unlawful tracking.
        </p>
      </div>
    </div>
  );
}
