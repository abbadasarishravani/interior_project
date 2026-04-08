import React, { useState, useEffect } from 'react'
import ProjectGallery from './ProjectGallery'
export default function DesignerProfile({ designerId }) {
  const [designer, setDesigner] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/designers/${designerId}`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setDesigner(data)
      } catch (e) {
        console.warn('Designer load failed', e)
      } finally {
        setLoading(false)
      }
    }
    if (designerId) load()
  }, [designerId])

  if (loading) return <div>Loading designer...</div>
  if (!designer) return <div>No designer selected</div>

  return (
    <section id="designer-profile" className="designer-profile">
      <div className="designer-hero">
        <img src={designer.image} alt={designer.displayName} className="designer-avatar" />
        <div className="designer-meta">
          <h2>{designer.displayName}</h2>
          <p>{designer.description}</p>
          <div className="designer-tags">{(designer.styles || []).join(' • ')}</div>
        </div>
      </div>

      <div className="designer-portfolio">
        <h3>Recent Projects</h3>
        <ProjectGallery designs={designer.designs || []} />
      </div>
    </section>
  )
}
