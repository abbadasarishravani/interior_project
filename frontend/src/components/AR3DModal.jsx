import React, { useState, useEffect } from 'react'
import ModelViewer from './ModelViewer'

export default function AR3DModal({
  open,
  onClose,
  designer,
  portfolioImages = [],
  initialDesignId = null,
}) {
  const [step, setStep] = useState(1)
  const [roomType, setRoomType] = useState('Living room')
  const [length, setLength] = useState(4)
  const [width, setWidth] = useState(3)
  const [height, setHeight] = useState(2.7)
  const [selectedDesign, setSelectedDesign] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [show3DView, setShow3DView] = useState(false)

  // Reset to step 1 when modal opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedDesign(null)
      setShow3DView(false)
      setShowImageModal(false)
    }
  }, [open])

  // If the user opened the modal from a specific design card,
  // jump directly to step 3 and enable the 3D viewer.
  useEffect(() => {
    if (!open) return
    if (!initialDesignId) return

    const portfolioDesigns =
      portfolioImages && portfolioImages.length > 0
        ? portfolioImages.map((imgUrl, idx) => ({
            id: `portfolio-${idx}`,
            title: `Design ${idx + 1}`,
            categories: ['Portfolio'],
            assets: [
              {
                url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
                iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
              },
            ],
            imageUrl: imgUrl,
          }))
        : []

    const demoDesigns = [
      {
        id: '1',
        title: 'Modern Living Room',
        categories: ['Modern', 'Living Room'],
        assets: [
          {
            url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
            iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
          },
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=400&fit=crop',
      },
      {
        id: '2',
        title: 'Minimalist Bedroom',
        categories: ['Minimal', 'Bedroom'],
        assets: [
          {
            url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
            iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
          },
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1540932239986-310128078e6c?w=500&h=400&fit=crop',
      },
      {
        id: '3',
        title: 'Contemporary Kitchen',
        categories: ['Modern', 'Kitchen'],
        assets: [
          {
            url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
            iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
          },
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=400&fit=crop',
      },
    ]

    const designs = portfolioDesigns.length > 0 ? portfolioDesigns : demoDesigns
    const found = designs.find((d) => d.id === initialDesignId) || null

    if (found) {
      setSelectedDesign(found)
      setStep(3)
      setShow3DView(true)
      setShowImageModal(false)
    }
  }, [open, initialDesignId, portfolioImages])

  if (!open) return null

  console.log('[AR3DModal] portfolioImages received:', portfolioImages)

  const startAR = () => {
    setStep(3)
  }

  // Convert portfolio images to design objects
  const portfolioDesigns = (portfolioImages && portfolioImages.length > 0)
    ? portfolioImages.map((imgUrl, idx) => ({
        id: `portfolio-${idx}`,
        title: `Design ${idx + 1}`,
        categories: ['Portfolio'],
        assets: [{ url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz' }],
        imageUrl: imgUrl,
      }))
    : []

  // High-quality demo designs with working image URLs
  const demoDesigns = [
    { 
      id: '1', 
      title: 'Modern Living Room', 
      categories: ['Modern', 'Living Room'], 
      assets: [{ url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz' }], 
      imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=400&fit=crop' 
    },
    { 
      id: '2', 
      title: 'Minimalist Bedroom', 
      categories: ['Minimal', 'Bedroom'], 
      assets: [{ url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz' }], 
      imageUrl: 'https://images.unsplash.com/photo-1540932239986-310128078e6c?w=500&h=400&fit=crop' 
    },
    { 
      id: '3', 
      title: 'Contemporary Kitchen', 
      categories: ['Modern', 'Kitchen'], 
      assets: [{ url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', iosUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz' }], 
      imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=400&fit=crop' 
    },
  ]

  const designs = portfolioDesigns.length > 0 ? portfolioDesigns : demoDesigns
  
  console.log('[AR3DModal] Using designs:', designs)

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header style={styles.header}>
          <h3>AR / 3D View — {designer?.displayName || designer?.name || 'Designer'}</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </header>

        {step === 1 && (
          <div style={styles.step}>
            <h4>1 — Room details</h4>
            <label style={styles.label}>Room type</label>
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} style={styles.select}>
              <option>Living room</option>
              <option>Bedroom</option>
              <option>Kitchen</option>
              <option>Home office</option>
            </select>
            <div style={styles.dimsGrid}>
              <div>
                <label style={styles.label}>Length (m)</label>
                <input type="number" step="0.1" value={length} onChange={(e) => setLength(Number(e.target.value))} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Width (m)</label>
                <input type="number" step="0.1" value={width} onChange={(e) => setWidth(Number(e.target.value))} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Height (m)</label>
                <input type="number" step="0.05" value={height} onChange={(e) => setHeight(Number(e.target.value))} style={styles.input} />
              </div>
            </div>
            <div style={styles.actions}>
              <button onClick={() => setStep(2)} style={styles.btn}>Next — Choose design</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={styles.step}>
            <h4>2 — Choose one of the designer's projects</h4>
            {designs.length === 0 ? (
              <div style={styles.noAsset}>No designs available</div>
            ) : (
              <div style={styles.likedList}>
                {designs.map((d) => (
                  <div key={d.id} style={{...styles.likedItem, border: selectedDesign && selectedDesign.id === d.id ? '3px solid #2a9d8f' : '1px solid #ccc'}} onClick={() => { console.log('Selected design:', d); setSelectedDesign(d) }}>
                    <img src={d.imageUrl || 'https://via.placeholder.com/150'} alt={d.title} style={styles.likedImg} onError={(e) => { e.target.src = 'https://via.placeholder.com/150' }} />
                    <div style={styles.likedMeta}>
                      <strong>{d.title}</strong>
                      <small>{(d.categories || []).join(', ')}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.actions}>
              <button onClick={() => setStep(1)} style={styles.btn}>Back</button>
              <button onClick={startAR} disabled={!selectedDesign} style={{...styles.btn, opacity: selectedDesign ? 1 : 0.5}}>Start AR / 3D</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.step}>
            <h4>Preview — {roomType} ({length}m × {width}m × {height}m)</h4>
            {selectedDesign ? (
              <div>
                {!show3DView ? (
                  <div style={styles.previewContainer}>
                    <div style={styles.previewImageWrapper} onClick={() => setShowImageModal(true)}>
                      <img src={selectedDesign.imageUrl || 'https://via.placeholder.com/400'} alt={selectedDesign.title} style={styles.previewImg} />
                      <div style={styles.expandOverlay}>
                        <span style={styles.expandIcon}>🔍 Expand</span>
                      </div>
                    </div>
                    <div style={styles.previewDetails}>
                      <h3>{selectedDesign.title}</h3>
                      <p><strong>Room Type:</strong> {roomType}</p>
                      <p><strong>Dimensions:</strong> {length}m × {width}m × {height}m</p>
                      <p><strong>Categories:</strong> {selectedDesign.categories.join(', ')}</p>
                      <p style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>Click image to view full size</p>
                      <button onClick={() => setShow3DView(true)} style={{...styles.btn, width: '100%', marginTop: '15px'}}>
                        📦 View 3D Model
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.previewContainer3D}>
                    <div style={styles.viewerContainer}>
                      <ModelViewer src={selectedDesign.assets[0].url} alt={selectedDesign.title} iosSrc={selectedDesign.assets[0].iosUrl} />
                    </div>
                    <button onClick={() => setShow3DView(false)} style={{...styles.btn, marginTop: '15px', width: '100%'}}>
                      ← Back to Image Preview
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.noAsset}>No design selected</div>
            )}
            <div style={styles.actions}>
              <button onClick={() => setStep(2)} style={styles.btn}>Back</button>
              <button onClick={onClose} style={styles.btn}>Done</button>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen Image Modal */}
      {showImageModal && (
        <div style={styles.fullscreenBackdrop} onClick={() => setShowImageModal(false)}>
          <div style={styles.fullscreenContainer}>
            <button style={styles.fullscreenClose} onClick={() => setShowImageModal(false)}>✕</button>
            <img src={selectedDesign?.imageUrl || 'https://via.placeholder.com/800'} alt={selectedDesign?.title} style={styles.fullscreenImg} />
            <div style={styles.fullscreenCaption}>
              <h2>{selectedDesign?.title}</h2>
              <p>{roomType} • {length}m × {width}m × {height}m</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #eee',
    paddingBottom: '15px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  step: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginTop: '12px',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#333',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  dimsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    marginTop: '12px',
  },
  likedList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    marginTop: '12px',
    marginBottom: '20px',
  },
  likedItem: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  likedImg: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  likedMeta: {
    fontSize: '12px',
  },
  previewContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '20px',
    marginBottom: '20px',
  },
  previewContainer3D: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px',
    marginBottom: '20px',
  },
  previewImageWrapper: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    height: '350px',
    backgroundColor: '#f0f0f0',
    cursor: 'pointer',
  },
  expandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'all 0.3s',
  },
  previewImageWrapper_hover: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  expandIcon: {
    backgroundColor: 'rgba(42, 157, 143, 0.9)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  previewDetails: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    fontSize: '14px',
  },
  fullscreenBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  fullscreenContainer: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  fullscreenImg: {
    width: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  fullscreenCaption: {
    color: 'white',
    textAlign: 'center',
    marginTop: '20px',
  },
  fullscreenClose: {
    position: 'absolute',
    top: '-40px',
    right: '0',
    background: 'white',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    fontSize: '24px',
    cursor: 'pointer',
    zIndex: 10001,
  },
  viewerContainer: {
    width: '100%',
    height: '500px',
    marginTop: '12px',
    marginBottom: '0px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  noAsset: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  btn: {
    padding: '10px 20px',
    backgroundColor: '#2a9d8f',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
}
