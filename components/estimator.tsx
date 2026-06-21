"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CatalogOption,
  Category,
  EstimateResponse,
  Provider,
  RuntimeSchedule,
} from "@/lib/types";
import { inputUnitLabel } from "@/lib/units";

type DraftLine = {
  id: string;
  provider: Provider;
  category: Category;
  meterId: string;
  quantity: number;
  usageAmount: number;
  scheduleKind: "one_time" | "recurring";
  totalHours: number;
  hoursPerDay: number;
  daysPerWeek: number;
  confirmed: boolean;
};

type CatalogPayload = {
  options: CatalogOption[];
  source: "database" | "fallback" | "mixed";
  effectiveAt: string;
  total: number;
};

type CatalogFacets = {
  services: Array<{ code: string; name: string; provider: Provider }>;
  regions: Array<{ id: string; name: string; provider: Provider }>;
};

const PROVIDER_META: Record<Provider, { name: string; short: string; color: string }> = {
  aws: { name: "Amazon Web Services", short: "AWS", color: "#ff9d48" },
  azure: { name: "Microsoft Azure", short: "Azure", color: "#5aa9ff" },
  gcp: { name: "Google Cloud", short: "GCP", color: "#66d5a5" },
};

const CATEGORY_LABELS: Record<Category, string> = {
  compute: "Compute",
  block_storage: "Block storage",
  object_storage: "Object storage",
  database: "PostgreSQL",
  egress: "Internet egress",
  other: "Other services",
};

function newLine(provider: Provider, options: CatalogOption[], category?: Category): DraftLine {
  const first = options.find((option) => option.provider === provider && (!category || option.category === category));
  const selectedCategory = category ?? first?.category ?? "compute";
  const selected = first ?? options.find((option) => option.provider === provider);
  return {
    id: crypto.randomUUID(),
    provider,
    category: selectedCategory,
    meterId: selected?.meterId ?? "",
    quantity: 1,
    usageAmount: 100,
    scheduleKind: "recurring",
    totalHours: 24,
    hoursPerDay: 8,
    daysPerWeek: 5,
    confirmed: true,
  };
}

function isRuntime(option?: CatalogOption): boolean {
  return option?.dimension === "runtime" || Boolean(option && /hrs?|hours?/i.test(option.unit));
}

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function Estimator() {
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [providers, setProviders] = useState<Provider[]>(["aws"]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [facets, setFacets] = useState<CatalogFacets>({ services: [], regions: [] });
  const [explorerProvider, setExplorerProvider] = useState<Provider>("aws");
  const [explorerService, setExplorerService] = useState("");
  const [explorerRegion, setExplorerRegion] = useState("");
  const [explorerQuery, setExplorerQuery] = useState("");
  const [explorerResults, setExplorerResults] = useState<CatalogOption[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog/options").then((response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json() as Promise<CatalogPayload>;
      }),
      fetch("/api/ai/parse").then((response) => response.json() as Promise<{ enabled: boolean }>),
      fetch("/api/catalog/facets").then((response) => response.json() as Promise<CatalogFacets>),
    ])
      .then(([catalogPayload, aiStatus, catalogFacets]) => {
        setCatalog(catalogPayload);
        setAiEnabled(aiStatus.enabled);
        setFacets(catalogFacets);
        setLines([newLine("aws", catalogPayload.options)]);
      })
      .catch((reason: Error) => setCatalogError(reason.message));
  }, []);

  const catalogByMeter = useMemo(
    () => new Map(catalog?.options.map((option) => [option.meterId, option]) ?? []),
    [catalog],
  );

  async function toggleProvider(provider: Provider) {
    setResult(null);
    if (providers.includes(provider)) {
      if (providers.length === 1) return;
      setLines((all) => all.filter((line) => line.provider !== provider));
      setProviders((current) => current.filter((item) => item !== provider));
      return;
    }
    let options = catalog?.options ?? [];
    if (!options.some((option) => option.provider === provider)) {
      try {
        const response = await fetch(`/api/catalog/options?provider=${provider}&pageSize=100`);
        const payload = (await response.json()) as CatalogPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? `Unable to load ${provider}`);
        options = [...options, ...payload.options];
        setCatalog((current) => current ? {
          ...current,
          options: [...new Map([...current.options, ...payload.options].map((option) => [option.meterId, option])).values()],
        } : payload);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : `Unable to load ${provider}`);
        return;
      }
    }
    setLines((all) => [...all, newLine(provider, options)]);
    setProviders((current) => [...current, provider]);
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setResult(null);
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function changeCategory(line: DraftLine, category: Category) {
    const option = catalog?.options.find(
      (item) => item.provider === line.provider && item.category === category,
    );
    updateLine(line.id, { category, meterId: option?.meterId ?? "", confirmed: true });
  }

  function removeLine(id: string) {
    setResult(null);
    setLines((current) => current.filter((line) => line.id !== id));
  }

  async function searchCatalog() {
    setExplorerLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ provider: explorerProvider, pageSize: "100" });
      if (explorerService) params.set("service", explorerService);
      if (explorerRegion) params.set("region", explorerRegion);
      if (explorerQuery.trim()) params.set("query", explorerQuery.trim());
      const response = await fetch(`/api/catalog/options?${params}`);
      const payload = (await response.json()) as CatalogPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Catalog search failed");
      setExplorerResults(payload.options);
      setCatalog((current) => current ? {
        ...current,
        options: [...new Map([...current.options, ...payload.options].map((option) => [option.meterId, option])).values()],
      } : payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Catalog search failed");
    } finally {
      setExplorerLoading(false);
    }
  }

  function addCatalogOption(option: CatalogOption) {
    if (!catalog) return;
    if (!providers.includes(option.provider)) setProviders((current) => [...current, option.provider]);
    setLines((current) => [...current, {
      ...newLine(option.provider, [...catalog.options, option], option.category),
      meterId: option.meterId,
      category: option.category,
    }]);
    setResult(null);
  }

  async function calculate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: "USD",
          lines: lines.map((line) => {
            const schedule: RuntimeSchedule | undefined = isRuntime(catalogByMeter.get(line.meterId))
              ? line.scheduleKind === "one_time"
                ? { kind: "one_time", totalHours: line.totalHours }
                : { kind: "recurring", hoursPerDay: line.hoursPerDay, daysPerWeek: line.daysPerWeek }
              : undefined;
            return {
              id: line.id,
              meterId: line.meterId,
              quantity: line.quantity,
              usageAmount: line.usageAmount,
              schedule,
              confirmed: line.confirmed,
            };
          }),
        }),
      });
      const payload = (await response.json()) as EstimateResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to calculate estimate");
      setResult(payload);
      requestAnimationFrame(() => document.querySelector("#results")?.scrollIntoView({ behavior: "smooth" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to calculate estimate");
    } finally {
      setLoading(false);
    }
  }

  async function parseWorkload() {
    setAiLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const payload = (await response.json()) as {
        error?: string;
        lines?: Array<{
          provider: Provider;
          category: Category;
          region: string | null;
          searchTerms: string;
          quantity: number;
          usageAmount: number;
          schedule: null | {
            kind: "one_time" | "recurring";
            totalHours: number | null;
            hoursPerDay: number | null;
            daysPerWeek: number | null;
          };
        }>;
      };
      if (!response.ok || !payload.lines) throw new Error(payload.error ?? "Could not parse workload");
      const drafts = payload.lines.map((draft) => {
        const terms = draft.searchTerms.toLowerCase().split(/\s+/).filter(Boolean);
        const candidates = catalog?.options.filter(
          (option) =>
            option.provider === draft.provider &&
            option.category === draft.category &&
            (!draft.region || option.region === draft.region),
        ) ?? [];
        const option = candidates.find((candidate) => {
          const text = `${candidate.productName} ${candidate.sku} ${candidate.meterName}`.toLowerCase();
          return terms.some((term) => text.includes(term));
        }) ?? candidates[0];
        const line = newLine(draft.provider, catalog?.options ?? [], draft.category);
        return {
          ...line,
          meterId: option?.meterId ?? line.meterId,
          quantity: draft.quantity,
          usageAmount: draft.usageAmount,
          scheduleKind: draft.schedule?.kind ?? "recurring",
          totalHours: draft.schedule?.totalHours ?? 24,
          hoursPerDay: draft.schedule?.hoursPerDay ?? 8,
          daysPerWeek: draft.schedule?.daysPerWeek ?? 5,
          confirmed: false,
        };
      });
      setProviders([...new Set(drafts.map((line) => line.provider))]);
      setLines(drafts);
      setAiOpen(false);
      setResult(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not parse workload");
    } finally {
      setAiLoading(false);
    }
  }

  const hasUnconfirmed = lines.some((line) => !line.confirmed);
  const activeResultProviders = result
    ? (["aws", "azure", "gcp"] as Provider[]).filter((provider) =>
        result.lines.some((line) => line.provider === provider),
      )
    : [];
  const cheapest = result && activeResultProviders.length > 1
    ? activeResultProviders.reduce((best, provider) =>
        Number(result.providerTotals[provider]) < Number(result.providerTotals[best]) ? provider : best,
      )
    : null;

  return (
    <section className="estimatorShell" aria-label="Cloud cost estimator">
      <div className="estimatorHeader">
        <div>
          <span className="stepLabel">01 / Configure</span>
          <h2>Build your estimate</h2>
        </div>
        <div className="headerActions">
          {catalog && (
            <span className={`catalogBadge ${catalog.source}`}>
              <span /> {catalog.source === "fallback" ? "Fallback catalog" : catalog.source === "mixed" ? "Mixed catalog" : "Live catalog"}
            </span>
          )}
          {aiEnabled && (
            <button className="ghostButton" onClick={() => setAiOpen((open) => !open)} type="button">
              ✦ Describe with AI
            </button>
          )}
        </div>
      </div>

      {aiOpen && (
        <div className="aiPanel">
          <div>
            <span className="aiIcon">✦</span>
            <div><strong>Describe your workload</strong><p>We’ll draft the form. You confirm every selection.</p></div>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Example: Two AWS t3.medium servers in us-east-1, running 10 hours a day, five days a week, plus 250 GB of storage…"
          />
          <button className="primaryButton compact" disabled={aiPrompt.trim().length < 10 || aiLoading} onClick={parseWorkload}>
            {aiLoading ? "Drafting…" : "Create draft"}
          </button>
        </div>
      )}

      <div className="providerPicker">
        <div><label>Cloud providers</label><p>Select one or compare several</p></div>
        <div className="providerButtons">
          {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
            const active = providers.includes(provider);
            return (
              <button
                key={provider}
                type="button"
                className={active ? "providerButton active" : "providerButton"}
                onClick={() => void toggleProvider(provider)}
                style={{ "--provider": PROVIDER_META[provider].color } as React.CSSProperties}
                aria-pressed={active}
              >
                <span className="providerDot" />
                {PROVIDER_META[provider].short}
                <span className="check">{active ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="catalogExplorer">
        <div className="explorerTitle">
          <div><span className="stepLabel">Full catalog</span><h3>Find any service or pricing meter</h3></div>
          <span>{facets.services.length} services available</span>
        </div>
        <div className="explorerFilters">
          <label><span>Provider</span><select value={explorerProvider} onChange={(event) => {
            setExplorerProvider(event.target.value as Provider);
            setExplorerService(""); setExplorerRegion(""); setExplorerResults([]);
          }}>{(Object.keys(PROVIDER_META) as Provider[]).map((provider) => <option key={provider} value={provider}>{PROVIDER_META[provider].short}</option>)}</select></label>
          <label><span>Service</span><select value={explorerService} onChange={(event) => setExplorerService(event.target.value)}>
            <option value="">All services</option>
            {facets.services.filter((item) => item.provider === explorerProvider).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select></label>
          <label><span>Region</span><select value={explorerRegion} onChange={(event) => setExplorerRegion(event.target.value)}>
            <option value="">All regions</option>
            {facets.regions.filter((item) => item.provider === explorerProvider).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="explorerSearch"><span>SKU, product, or meter</span><input value={explorerQuery} onChange={(event) => setExplorerQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchCatalog(); }} placeholder="Search Lambda, GPU, requests…" /></label>
          <button className="searchButton" type="button" onClick={searchCatalog} disabled={explorerLoading}>{explorerLoading ? "Searching…" : "Search catalog"}</button>
        </div>
        {explorerResults.length > 0 && <div className="explorerResults">
          {explorerResults.slice(0, 20).map((option) => <article key={option.meterId}>
            <div><strong>{option.productName}</strong><span>{option.serviceName} · {option.region} · {option.meterName}</span></div>
            <div><small>{option.unit}</small><button type="button" onClick={() => addCatalogOption(option)}>+ Add</button></div>
          </article>)}
          {explorerResults.length > 20 && <p>Showing the first 20 matches. Refine the service, region, or search text.</p>}
        </div>}
      </section>

      {catalogError && <div className="errorBanner">{catalogError}</div>}
      {!catalog && !catalogError && <div className="loadingBlock">Loading pricing catalog…</div>}

      {catalog && (
        <div className="providerColumns">
          {providers.map((provider) => (
            <div className="providerColumn" key={provider}>
              <div className="columnTitle" style={{ "--provider": PROVIDER_META[provider].color } as React.CSSProperties}>
                <span className="providerLogo">{PROVIDER_META[provider].short.slice(0, 1)}</span>
                <div><h3>{PROVIDER_META[provider].short}</h3><p>{PROVIDER_META[provider].name}</p></div>
                <span className="lineCount">{lines.filter((line) => line.provider === provider).length} items</span>
              </div>

              <div className="lineList">
                {lines.filter((line) => line.provider === provider).map((line, index) => {
                  const selected = catalogByMeter.get(line.meterId);
                  const options = catalog.options.filter(
                    (option) => option.provider === provider && option.category === line.category,
                  );
                  const runtime = isRuntime(selected);
                  return (
                    <article className={`resourceCard ${line.confirmed ? "" : "unconfirmed"}`} key={line.id}>
                      <div className="resourceTop">
                        <span className="resourceNumber">{String(index + 1).padStart(2, "0")}</span>
                        <select value={line.category} onChange={(event) => changeCategory(line, event.target.value as Category)} aria-label="Service category">
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button className="iconButton" type="button" onClick={() => removeLine(line.id)} aria-label="Remove resource">×</button>
                      </div>

                      <label className="fieldLabel">Product and pricing meter</label>
                      <select className="wideSelect" value={line.meterId} onChange={(event) => updateLine(line.id, { meterId: event.target.value, confirmed: true })}>
                        {options.map((option) => (
                          <option value={option.meterId} key={option.meterId}>{option.productName} · {option.meterName}</option>
                        ))}
                      </select>
                      <div className="meterMeta"><span>{selected?.region}</span><span>{selected?.unit}</span><span>{selected?.sku}</span></div>

                      <div className="fieldGrid">
                        <label><span>Quantity</span><input type="number" min="0.01" step="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: numberValue(event.target.value) })} /></label>
                        {!runtime && (
                          <label><span>Monthly usage ({selected ? inputUnitLabel(selected.unit) : "units"})</span><input type="number" min="0" step="1" value={line.usageAmount} onChange={(event) => updateLine(line.id, { usageAmount: numberValue(event.target.value) })} /></label>
                        )}
                      </div>

                      {runtime && (
                        <div className="scheduleBlock">
                          <div className="segmented">
                            <button className={line.scheduleKind === "recurring" ? "active" : ""} onClick={() => updateLine(line.id, { scheduleKind: "recurring" })} type="button">Recurring</button>
                            <button className={line.scheduleKind === "one_time" ? "active" : ""} onClick={() => updateLine(line.id, { scheduleKind: "one_time" })} type="button">One-time</button>
                          </div>
                          {line.scheduleKind === "recurring" ? (
                            <div className="fieldGrid">
                              <label><span>Hours / day</span><input type="number" min="0.1" max="24" value={line.hoursPerDay} onChange={(event) => updateLine(line.id, { hoursPerDay: numberValue(event.target.value) })} /></label>
                              <label><span>Days / week</span><input type="number" min="0.1" max="7" value={line.daysPerWeek} onChange={(event) => updateLine(line.id, { daysPerWeek: numberValue(event.target.value) })} /></label>
                            </div>
                          ) : (
                            <label><span>Total runtime hours</span><input type="number" min="0.1" value={line.totalHours} onChange={(event) => updateLine(line.id, { totalHours: numberValue(event.target.value) })} /></label>
                          )}
                        </div>
                      )}

                      {!line.confirmed && (
                        <button className="confirmButton" type="button" onClick={() => updateLine(line.id, { confirmed: true })}>Review complete — confirm selection</button>
                      )}
                    </article>
                  );
                })}
              </div>
              <button className="addButton" type="button" onClick={() => setLines((current) => [...current, newLine(provider, catalog.options)])}>+ Add service</button>
            </div>
          ))}
        </div>
      )}

      <div className="calculateBar">
        <div>
          <strong>{lines.length} configured service{lines.length === 1 ? "" : "s"}</strong>
          <span>{providers.length > 1 ? `${providers.length}-cloud comparison` : "Single-cloud estimate"}</span>
        </div>
        <button className="primaryButton" type="button" disabled={loading || !lines.length || hasUnconfirmed} onClick={calculate}>
          {loading ? "Calculating…" : hasUnconfirmed ? "Confirm AI draft first" : "Calculate estimate →"}
        </button>
      </div>
      {error && <div className="errorBanner">{error}</div>}

      {result && (
        <section className="results" id="results">
          <div className="resultsHeader"><div><span className="stepLabel">02 / Compare</span><h2>Estimated monthly cost</h2></div><strong className="grandTotal">${result.grandTotal}<small> / month</small></strong></div>
          <div className="totalCards">
            {activeResultProviders.map((provider) => (
              <article className={`totalCard ${cheapest === provider ? "cheapest" : ""}`} key={provider} style={{ "--provider": PROVIDER_META[provider].color } as React.CSSProperties}>
                <div><span className="providerDot" />{PROVIDER_META[provider].short}{cheapest === provider && <em>Lowest</em>}</div>
                <strong>${result.providerTotals[provider]}</strong><span>estimated / month</span>
              </article>
            ))}
          </div>

          <div className="breakdown">
            <h3>Cost breakdown</h3>
            <div className="tableWrap">
              <table>
                <thead><tr><th>Provider / service</th><th>Usage</th><th>Hourly</th><th>Daily</th><th>Monthly</th></tr></thead>
                <tbody>{result.lines.map((line) => (
                  <tr key={line.id}>
                    <td><span className={`miniProvider ${line.provider}`}>{PROVIDER_META[line.provider].short.slice(0, 1)}</span><div><strong>{line.productName}</strong><small>{line.region} · {line.meterName}</small></div></td>
                    <td>{line.usageAmount} {line.unit}</td><td>${line.hourlyCost}</td><td>${line.dailyCost}</td><td><strong>${line.monthlyCost}</strong></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="resultNotes">
            <div><h3>Assumptions</h3>{result.assumptions.map((note) => <p key={note}>— {note}</p>)}</div>
            <div><h3>Important</h3>{result.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}<p>Catalog effective {new Date(result.catalog.effectiveAt).toLocaleDateString()}</p></div>
          </div>
        </section>
      )}
    </section>
  );
}
