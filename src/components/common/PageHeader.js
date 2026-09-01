import React from 'react'
import PropTypes from 'prop-types'

/** Consistent title + description + actions row used at the top of each page. */
const PageHeader = ({ title, description, actions }) => (
  <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
    <div>
      <h4 className="mb-1">{title}</h4>
      {description && <p className="text-body-secondary mb-0">{description}</p>}
    </div>
    {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
  </div>
)

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
}

export default PageHeader
