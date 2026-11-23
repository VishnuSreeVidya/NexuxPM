export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="page-header">
      <div className="page-header__main">
        {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
