import { Estimator } from "@/components/estimator";

export default function Home() {
  return (
    <main>
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="CloudGauge home">
          <span className="brandMark" aria-hidden="true">CG</span>
          <span>CloudGauge</span>
        </a>
        <span className="navNote">Public pricing · No cloud credentials</span>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> Plan before you provision</div>
        <h1>Know the cloud bill<br />before it becomes one.</h1>
        <p>
          Configure AWS, Azure, and Google Cloud services side-by-side. See the assumptions,
          pricing meters, and monthly impact—not just a mystery total.
        </p>
        <div className="heroFacts" aria-label="Product facts">
          <span>3 providers</span><i />
          <span>5 service categories</span><i />
          <span>USD on-demand rates</span>
        </div>
      </section>

      <Estimator />

      <footer>
        <span>CloudGauge</span>
        <p>Estimates are directional. Verify final prices with each cloud provider before purchasing.</p>
      </footer>
    </main>
  );
}
