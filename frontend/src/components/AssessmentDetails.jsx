const displayValue = (value) =>
  value === null || value === undefined || value === ""
    ? "Not available"
    : String(value);

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
      <h3 className="mb-3 text-lg font-semibold text-slate-100">{title}</h3>
      {children}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-800 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-100">
        {displayValue(value)}
      </p>
    </div>
  );
}

const modules = [
  {
    key: "cookies",
    title: "Cookie Analysis",
    description: "Cookie-related information reported by the analyzer.",
  },
  {
    key: "web_beacons",
    title: "Web Beacon Detection",
    description: "URLs reported as potential web beacons.",
  },
  {
    key: "security_transmission",
    title: "Transmission Security",
    description: "TLS protocols, cipher suites, key and certificate details.",
  },
];

export default function AssessmentDetails({ result }) {
  if (!result) {
    return <p className="text-sm text-slate-400">No assessment result available.</p>;
  }

  const security = result.security_transmission;

  const protocols = security?.protocol
    ? Object.entries(security.protocol).filter(
        ([key, value]) => key !== "score" && typeof value !== "object"
      )
    : [];

  const cipherGroups = security?.cipher
    ? Object.entries(security.cipher).filter(
        ([key, value]) => key !== "score" && Array.isArray(value)
      )
    : [];

  const cipherCount = cipherGroups.reduce(
    (total, [, suites]) => total + suites.length,
    0
  );

  const recommendedCount = cipherGroups.reduce(
    (total, [, suites]) =>
      total +
      suites.filter((suite) =>
        Object.values(suite).some((d) => d?.security === "recommended")
      ).length,
    0
  );

  const certificate = security?.certificate;
  const keyInfo = security?.key;
  const securityScores = [
    { label: "Protocol score", value: security?.protocol?.score },
    { label: "Key score", value: security?.key?.score },
    { label: "Cipher score", value: security?.cipher?.score },
    { label: "Certificate score", value: security?.certificate?.score },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Assessment Modules
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Module grades reflect the analyzer's scoring system, not a legal
          determination of GDPR compliance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => {
          const data = result[module.key];

          return (
            <Panel key={module.key} title={module.title}>
              {!data ? (
                <p className="text-sm text-slate-400">
                  No result returned for this module.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-slate-100">
                      {displayValue(data.grade)}
                    </span>
                    <span className="text-sm text-slate-400">
                      {module.key === "security_transmission"
                        ? "4 component scores"
                        : `Score: ${displayValue(data.score)}`}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {module.description}
                  </p>
                </>
              )}
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Cookie Analysis">
          {!result.cookies ? (
            <p className="text-slate-400">No result available.</p>
          ) : Object.keys(result.cookies.details ?? {}).length === 0 ? (
            <p className="text-sm text-slate-400">
              No cookie details were reported in this scan result. This does
              not independently prove that the website uses no cookies.
            </p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm text-slate-300">
              {JSON.stringify(result.cookies.details, null, 2)}
            </pre>
          )}
        </Panel>

        <Panel title="Web Beacon Detection">
          {!result.web_beacons ? (
            <p className="text-slate-400">No result available.</p>
          ) : (result.web_beacons.url ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">
              No beacon URLs were reported by the analyzer.
            </p>
          ) : (
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
              {result.web_beacons.url.map((url, index) => (
                <li key={`${url}-${index}`} className="break-all">
                  {typeof url === "string" ? url : JSON.stringify(url)}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Transmission Security">
        {!security ? (
          <p className="text-slate-400">No security result available.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="mb-3 font-medium text-slate-200">
                Security Component Scores
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {securityScores.map(({ label, value }) => (
                  <Metric key={label} label={label} value={value} />
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Hostname" value={security.hostname} />
              <Metric label="Module grade" value={security.grade} />
              <Metric label="Key type" value={keyInfo?.type} />
              <Metric
                label="Key size"
                value={keyInfo?.size ? `${keyInfo.size} bits` : null}
              />
              <Metric label="Cipher suites listed" value={cipherCount} />
              <Metric label="Recommended suites listed" value={recommendedCount} />
              <Metric label="Certificate issuer" value={certificate?.issued_by} />
              <Metric label="Certificate algorithm" value={certificate?.sign_algo} />
            </div>

            <div>
              <h4 className="mb-2 font-medium text-slate-200">Protocol Results</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="p-2">Protocol</th>
                      <th className="p-2">Analyzer result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocols.map(([protocol, value]) => (
                      <tr key={protocol} className="border-t border-slate-700">
                        <td className="p-2 text-slate-300">{protocol}</td>
                        <td className="p-2 text-slate-100">{displayValue(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Protocol labels and values are displayed as returned by the
                analyzer; their security implications should be assessed
                separately.
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-slate-200">Certificate Details</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Issued to" value={certificate?.issued_to} />
                <Metric label="Issued by" value={certificate?.issued_by} />
                <Metric label="Valid from" value={certificate?.not_before} />
                <Metric label="Valid until" value={certificate?.not_after} />
                <Metric label="Signature algorithm" value={certificate?.sign_algo} />
                <Metric label="Certificate type" value={certificate?.type} />
              </div>
            </div>

            <details className="rounded-lg border border-slate-700 p-3">
              <summary className="cursor-pointer font-medium text-slate-200">
                View cipher-suite details
              </summary>
              <div className="mt-3 space-y-4">
                {cipherGroups.map(([protocol, suites]) => (
                  <div key={protocol}>
                    <h5 className="mb-2 font-medium text-slate-300">
                      {protocol} ({suites.length})
                    </h5>
                    <ul className="space-y-2 text-sm text-slate-400">
                      {suites.map((suite, index) => (
                        <li
                          key={`${protocol}-${index}`}
                          className="break-words border-t border-slate-800 pt-2"
                        >
                          {Object.entries(suite).map(([name, details]) => (
                            <div key={name}>
                              <p className="text-slate-200">{name}</p>
                              <p>
                                {details?.cipher_type ?? "Unknown"}{" "}
                                {details?.cipher_key_size ?? ""} bits ·{" "}
                                {details?.cipher_mode ?? "Unknown mode"} ·{" "}
                                {details?.security ?? "Unclassified"}
                              </p>
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </Panel>

      <details className="rounded-xl border border-slate-700 p-4">
        <summary className="cursor-pointer font-medium text-slate-200">
          View complete analyzer response
        </summary>
        <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap break-words text-xs text-slate-400">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}