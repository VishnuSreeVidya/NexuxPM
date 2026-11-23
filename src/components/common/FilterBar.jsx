import { RotateCcw, Search } from 'lucide-react'

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  resultCount,
  resultLabel = 'results',
  onReset,
  hasActiveFilters = false,
}) {
  return (
    <div className="filter-bar" role="search">
      <label className="filter-bar__search">
        <span className="sr-only">{searchPlaceholder}</span>
        <Search size={15} aria-hidden="true" />
        <input
          className="input"
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {filters.length ? (
        <div className="filter-bar__filters">
          {filters.map((filter) => (
            <label key={filter.key}>
              <span className="sr-only">{filter.label}</span>
              <select
                className="select"
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {hasActiveFilters && onReset ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
      ) : null}

      {typeof resultCount === 'number' ? (
        <span className="filter-bar__count">
          {resultCount} {resultLabel}
        </span>
      ) : null}
    </div>
  )
}

export default FilterBar
