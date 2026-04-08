import React from 'react'
import DesignCard from './DesignCard'

export default function ProjectGallery({ designs = [], onOpenAR, user = null, apiBase = '', getAuthHeaders }) {
  if (!designs.length) return <div className="project-gallery-empty">No designs yet</div>

  return (
    <div className="project-gallery">
      {designs.map((d) => (
        <DesignCard
          key={d._id || d.id}
          design={d}
          onOpenAR={onOpenAR}
          user={user}
          apiBase={apiBase}
          getAuthHeaders={getAuthHeaders}
        />
      ))}
    </div>
  )
}
