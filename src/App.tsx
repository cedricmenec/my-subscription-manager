function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Abos, accueil">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>Abos</span>
        </a>
        <span className="usage-label">Espace personnel</span>
      </header>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="section-label">Vue principale</p>
            <h1>Abonnements</h1>
          </div>
          <p className="item-count" aria-label="Nombre d'abonnements">
            0 abonnement
          </p>
        </header>

        <section className="empty-state" aria-labelledby="empty-state-title">
          <span className="empty-state-icon" aria-hidden="true">
            <span />
          </span>
          <div>
            <h2 id="empty-state-title">Aucun abonnement enregistré</h2>
            <p>Vos abonnements apparaîtront ici.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
