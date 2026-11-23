export function DataTable({ columns, rows, getRowKey, onRowClick, footer, rowLabel }) {
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.headerClassName ?? ''} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const key = getRowKey ? getRowKey(row) : index
              const clickable = Boolean(onRowClick)
              return (
                <tr
                  key={key}
                  className={clickable ? 'data-table__row--clickable' : ''}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={column.className ?? ''}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {footer ? <div className="table-footer">{footer}</div> : null}
    </>
  )
}

export default DataTable
