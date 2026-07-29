interface AdvancedSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  dateMin: string
  onDateMinChange: (value: string) => void
  dateMax: string
  onDateMaxChange: (value: string) => void
  renewalDateMin: string
  onRenewalDateMinChange: (value: string) => void
  renewalDateMax: string
  onRenewalDateMaxChange: (value: string) => void
  amountMin: string
  onAmountMinChange: (value: string) => void
  amountMax: string
  onAmountMaxChange: (value: string) => void
  categoryFilter: string | 'ALL'
  onCategoryFilterChange: (value: string | 'ALL') => void
  categories: Array<{ id: string; name: string }>
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

export default function AdvancedSearchBar({
  search,
  onSearchChange,
  dateMin,
  onDateMinChange,
  dateMax,
  onDateMaxChange,
  renewalDateMin,
  onRenewalDateMinChange,
  renewalDateMax,
  onRenewalDateMaxChange,
  amountMin,
  onAmountMinChange,
  amountMax,
  onAmountMaxChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  showAdvanced,
  onToggleAdvanced,
}: AdvancedSearchBarProps) {
  return (
    <div className="advanced-search" role="search" aria-label="Recherche avancée">
      <div className="search-basic-row">
        <div className="search-field">
          <label htmlFor="search-name" className="search-label">Recherche</label>
          <input
            id="search-name"
            type="search"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Nom, fournisseur, notes…"
            className="search-input"
          />
        </div>
        <button
          type="button"
          className="search-toggle-btn"
          onClick={onToggleAdvanced}
          aria-expanded={showAdvanced}
          aria-label={showAdvanced ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'}
        >
          {showAdvanced ? '▲ Filtres avancés' : '▼ Filtres avancés'}
        </button>
      </div>

      {showAdvanced && (
        <div className="search-advanced-grid">
          <div className="search-field">
            <label htmlFor="search-category" className="search-label">Catégorie</label>
            <select
              id="search-category"
              value={categoryFilter}
              onChange={e => onCategoryFilterChange(e.target.value)}
              className="search-input"
            >
              <option value="ALL">Toutes</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="search-field">
            <label htmlFor="search-date-min" className="search-label">Échéance min</label>
            <input
              id="search-date-min"
              type="date"
              value={dateMin}
              onChange={e => onDateMinChange(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="search-field">
            <label htmlFor="search-date-max" className="search-label">Échéance max</label>
            <input
              id="search-date-max"
              type="date"
              value={dateMax}
              onChange={e => onDateMaxChange(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="search-field">
            <label htmlFor="search-renewal-min" className="search-label">Renouvellement min</label>
            <input
              id="search-renewal-min"
              type="date"
              value={renewalDateMin}
              onChange={e => onRenewalDateMinChange(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="search-field">
            <label htmlFor="search-renewal-max" className="search-label">Renouvellement max</label>
            <input
              id="search-renewal-max"
              type="date"
              value={renewalDateMax}
              onChange={e => onRenewalDateMaxChange(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="search-field">
            <label htmlFor="search-amount-min" className="search-label">Montant min</label>
            <input
              id="search-amount-min"
              type="number"
              min="0"
              step="0.01"
              value={amountMin}
              onChange={e => onAmountMinChange(e.target.value)}
              className="search-input"
              placeholder="0.00"
            />
          </div>

          <div className="search-field">
            <label htmlFor="search-amount-max" className="search-label">Montant max</label>
            <input
              id="search-amount-max"
              type="number"
              min="0"
              step="0.01"
              value={amountMax}
              onChange={e => onAmountMaxChange(e.target.value)}
              className="search-input"
              placeholder="0.00"
            />
          </div>
        </div>
      )}
    </div>
  )
}
