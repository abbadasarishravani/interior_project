
// App.jsx
import { API_BASE, RAZORPAY_KEY_ID } from "./config";
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import ARStudio from './ARStudio'
import Profile from './components/Profile'
import DesignCard from './components/DesignCard'
import ProfilePage from './components/ProfilePage'


// API base pointing at backend during development


const STYLE_FILTERS = [
  'All',
  'Modern',
  'Minimal',
  'Scandinavian',
  'Boho',
  'Industrial',
  'Luxury',
  'Budget Friendly',
]

const SPACES = [
  'Any space',
  'Living room',
  'Bedroom',
  'Balcony',
  'Home office',
  'Studio',
  'Dining',
  'Entire home',
]

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isSearchPage = location.pathname === '/designers'
  const isProfilePage = location.pathname === '/profile'

  const [activeSection, setActiveSection] = useState('home')
  const [selectedStyle, setSelectedStyle] = useState('All')
  const [budget, setBudget] = useState(60000)
  const [aiMatch, setAiMatch] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [minBudgetFilter, setMinBudgetFilter] = useState(15000)
  const [maxBudgetFilter, setMaxBudgetFilter] = useState(120000)
  const [spaceFilter, setSpaceFilter] = useState('Any space')
  const [selectedDesigner, setSelectedDesigner] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotPasswordStep, setForgotPasswordStep] = useState('email') // 'email', 'token', 'reset'
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [selectedPalette, setSelectedPalette] = useState('warm')
  const [designers, setDesigners] = useState([])
  const [loadingDesigners, setLoadingDesigners] = useState(false)
  const [user, setUser] = useState(null)
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
  })
  const [designerProfile, setDesignerProfile] = useState(null)
  const [designerForm, setDesignerForm] = useState({
    displayName: '',
    location: '',
    styles: [],
    spaces: [],
    minBudget: '',
    maxBudget: '',
    startingPrice: '',
    description: '',
    image: '',
    portfolioImages: [],
    contactEmail: '',
    contactPhone: '',
    onlinePayments: true,
    offlineAvailable: true,
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingType, setBookingType] = useState('online') // 'online' or 'offline'
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingStatusMsg, setBookingStatusMsg] = useState('')
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectDescription: '',
    visitDate: '',
    visitTime: '',
    visitPlace: '',
    budgetRange: '',
  })
  const [bookingDesigner, setBookingDesigner] = useState(null)
  const [showDesignerBuildProfile, setShowDesignerBuildProfile] = useState(false)
  const [authToken, setAuthToken] = useState(() => {
    // Load token from localStorage on mount
    return localStorage.getItem('ic_token') || null
  })

  // Helper function to get auth headers with JWT token
  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' }
    const token = authToken || localStorage.getItem('ic_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true)
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
      if (existing) {
        existing.addEventListener('load', () => resolve(true))
        existing.addEventListener('error', () => resolve(false))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.head.appendChild(script)
    })

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const headers = getAuthHeaders()
        if (!headers.Authorization) return // No token, skip
        
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers,
        })
        if (res.ok) {
          const data = await res.json()
          const loggedInUser = data.user || null
          setUser(loggedInUser)
          
          // If designer, load their profile
          if (loggedInUser?.role === 'designer') {
            try {
              const profileRes = await fetch(`${API_BASE}/api/designers/me`, {
                headers: getAuthHeaders(),
              })
              if (profileRes.ok) {
                const profile = await profileRes.json()
                setDesignerProfile(profile)
                setDesignerForm({
                  displayName: profile.displayName || '',
                  location: profile.location || '',
                  styles: profile.styles || [],
                  spaces: profile.spaces || [],
                  minBudget: profile.minBudget || '',
                  maxBudget: profile.maxBudget || '',
                  startingPrice: profile.startingPrice || '',
                  description: profile.description || '',
                  image: profile.image || '',
                  portfolioImages: profile.portfolioImages || [],
                  contactEmail: profile.contactEmail || '',
                  contactPhone: profile.contactPhone || '',
                  onlinePayments: profile.onlinePayments !== false,
                  offlineAvailable: profile.offlineAvailable !== false,
                })
              }
            } catch (e) {
              console.warn('Could not load designer profile')
            }
          }
        }
      } catch (e) {
        console.warn('Auth check failed (expected if not logged in)')
      }
    }
    checkAuth()
  }, [authToken])

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingDesigners(true)
        const params = new URLSearchParams()
        if (selectedStyle && selectedStyle !== 'All') params.set('style', selectedStyle)
        if (spaceFilter && spaceFilter !== 'Any space') params.set('space', spaceFilter)
        if (searchText.trim()) params.set('q', searchText.trim())
        params.set('minBudget', String(minBudgetFilter))
        params.set('maxBudget', String(maxBudgetFilter))

        const res = await fetch(`${API_BASE}/api/designers?${params.toString()}`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) throw new Error('Failed to load designers')
        const data = await res.json()
        setDesigners(Array.isArray(data) ? data : [])
      } catch (e) {
        console.warn('Failed to load designers:', e.message)
        setDesigners([])
      } finally {
        setLoadingDesigners(false)
      }
    }

    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [selectedStyle, spaceFilter, searchText, minBudgetFilter, maxBudgetFilter])

  const filteredDesigners = useMemo(() => {
    let list = [...designers]

    if (aiMatch) {
      // lightweight "AI" effect: sort by closeness to budget and rating
      list.sort((a, b) => {
        const centerBudget = (minBudgetFilter + maxBudgetFilter) / 2
        const score = (d) => {
          const mid = (d.minBudget + d.maxBudget) / 2
          const budgetDiff = Math.abs(mid - centerBudget)
          return d.rating * d.projects - budgetDiff / 1000
        }
        return score(b) - score(a)
      })
    }

    return list
  }, [designers, aiMatch, minBudgetFilter, maxBudgetFilter])

  const selectedDesignerPortfolioDesigns = useMemo(() => {
    if (!selectedDesigner) return []
    const designerId = selectedDesigner._id || selectedDesigner.id
    const images = Array.isArray(selectedDesigner.portfolioImages)
      ? selectedDesigner.portfolioImages
      : []

    return images.map((url, idx) => ({
      // Unique id for "liked designs" storage UI.
      likeId: `${designerId}-${idx}`,
      title: `Portfolio ${idx + 1}`,
      categories: ['Portfolio'],
      assets: url ? [{ url }] : [],
      // Reviews are tied to the designer (not the card).
      reviewTargetId: designerId,
      // Only allow/show reviews UI on the dedicated Search Designers route.
      showReviews: isSearchPage,
    }))
  }, [selectedDesigner, isSearchPage])

  const openProfile = async (designer) => {
    try {
      const id = designer._id || designer.id
      const res = await fetch(`${API_BASE}/api/designers/${id}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to load profile')
      const full = await res.json()
      setSelectedDesigner(full)
    } catch (e) {
      setSelectedDesigner(designer)
    }

    setTimeout(() => {
      const el = document.getElementById('designer-profile')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    try {
      if (forgotPasswordStep === 'email') {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotPasswordEmail }),
        })
        const data = await res.json()
        if (res.ok) {
          // In a real app, user would get this via email. For demo, show the token
          setForgotPasswordMessage(
            'Password reset link sent to your email. Check your inbox for instructions.'
          )
          // For demo purposes, if token is returned, allow direct entry
          if (data.token) {
            setResetToken(data.token)
            setForgotPasswordStep('reset')
            setForgotPasswordMessage(
              'Demo: Token = ' + data.token + ' (automatically pre-filled below)'
            )
          } else {
            setForgotPasswordStep('token')
          }
        } else {
          setForgotPasswordMessage(data.message || 'Error sending reset link')
        }
      } else if (forgotPasswordStep === 'token') {
        // Verify token
        const res = await fetch(`${API_BASE}/api/auth/verify-reset-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken }),
        })
        const data = await res.json()
        if (res.ok) {
          setForgotPasswordStep('reset')
          setForgotPasswordMessage('Token verified! Enter your new password.')
        } else {
          setForgotPasswordMessage(data.message || 'Invalid or expired token')
        }
      } else if (forgotPasswordStep === 'reset') {
        // Reset password
        if (newPassword !== confirmPassword) {
          setForgotPasswordMessage('Passwords do not match!')
          return
        }
        if (newPassword.length < 6) {
          setForgotPasswordMessage('Password must be at least 6 characters')
          return
        }
        const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password: newPassword }),
        })
        const data = await res.json()
        if (res.ok) {
          setForgotPasswordMessage('✓ Password reset successfully! Redirecting to login...')
          setTimeout(() => {
            setShowForgotPassword(false)
            setForgotPasswordStep('email')
            setForgotPasswordEmail('')
            setResetToken('')
            setNewPassword('')
            setConfirmPassword('')
            setForgotPasswordMessage('')
            setAuthMode('login')
            setShowAuthModal(true)
          }, 1500)
        } else {
          setForgotPasswordMessage(data.message || 'Error resetting password')
        }
      }
    } catch (err) {
      setForgotPasswordMessage('Error: ' + err.message)
    }
  }

  const handleDeleteDesignerProfile = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete your designer profile? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/designers/me`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete profile')
      }

      alert('Your profile has been deleted successfully.')
      setDesignerProfile(null)
      setDesignerForm({
        displayName: '',
        location: '',
        styles: [],
        spaces: [],
        minBudget: '',
        maxBudget: '',
        startingPrice: '',
        description: '',
        image: '',
        portfolioImages: [],
        contactEmail: '',
        contactPhone: '',
        onlinePayments: true,
        offlineAvailable: true,
      })
    } catch (e) {
      alert('Error deleting profile: ' + e.message)
    }
  }

  const handleBookDesigner = (designer, type) => {
    if (!user) {
      alert('Please log in to book a designer')
      return
    }
    setBookingDesigner(designer)
    setBookingType(type)
    setBookingForm({
      customerName: user.name || '',
      customerEmail: user.email || '',
      customerPhone: '',
      projectDescription: '',
      visitDate: '',
      visitTime: '',
      visitPlace: '',
      budgetRange: '',
    })
    setShowBookingModal(true)
  }

  const submitBooking = async () => {
    try {
      if (bookingSubmitting) return
      setBookingStatusMsg('')
      if (!bookingForm.customerPhone) {
        alert('Please enter your phone number')
        return
      }

      if (bookingType === 'offline' && !bookingForm.visitDate) {
        alert('Please select a visit date')
        return
      }

      if (bookingType === 'offline' && !bookingForm.visitPlace) {
        alert('Please specify the visit place')
        return
      }

      const payload = {
        designerId: bookingDesigner._id || bookingDesigner.id,
        customerName: bookingForm.customerName,
        customerEmail: bookingForm.customerEmail,
        customerPhone: bookingForm.customerPhone,
        projectDescription: bookingForm.projectDescription,
        bookingType: bookingType,
        ...(bookingType === 'offline' && {
          preferredDate: bookingForm.visitDate,
          preferredTime: bookingForm.visitTime,
          visitPlace: bookingForm.visitPlace,
        }),
        budgetRange: bookingForm.budgetRange,
      }

      if (bookingType === 'online') {
        setBookingSubmitting(true)
        setBookingStatusMsg('Preparing secure payment…')

        const ok = await loadRazorpayScript()
        if (!ok) {
          setBookingSubmitting(false)
          setBookingStatusMsg('')
          alert('Unable to load payment gateway. Please check your connection and try again.')
          return
        }

        const bookingAmountInr = 5000 // Base booking fee in INR
        const amountPaise = bookingAmountInr * 100

        // 1) Create order on backend (secure)
        const orderRes = await fetch(`${API_BASE}/api/payments/razorpay/order`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            amountPaise,
            currency: 'INR',
            receipt: `booking_${Date.now()}`,
            notes: {
              designerId: payload.designerId,
              bookingType: payload.bookingType,
            },
          }),
        })
        const orderData = await orderRes.json().catch(() => ({}))
        if (!orderRes.ok) {
          setBookingSubmitting(false)
          setBookingStatusMsg('')
          throw new Error(orderData?.message || 'Failed to start payment')
        }

        setBookingStatusMsg('Opening payment…')

        // 2) Open Razorpay checkout with order_id
        const options = {
          key: RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          order_id: orderData.orderId,
          name: 'InteriorConnect',
          description: `Designer Consultation: ${bookingDesigner.displayName || bookingDesigner.name}`,
          prefill: {
            name: bookingForm.customerName,
            email: bookingForm.customerEmail,
            contact: bookingForm.customerPhone,
          },
          theme: { color: '#2a9d8f' },
          handler: async function (response) {
            try {
              setBookingStatusMsg('Verifying payment…')

              // 3) Verify signature on backend (secure)
              const verifyRes = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              })
              const verifyData = await verifyRes.json().catch(() => ({}))
              if (!verifyRes.ok || !verifyData?.ok) {
                throw new Error(verifyData?.message || 'Payment verification failed')
              }

              setBookingStatusMsg('Finalizing booking…')

              // 4) Create booking with verified payment info
              const bookingPayload = {
                ...payload,
                status: 'confirmed',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amountPaise,
                currency: 'INR',
              }

              const bookingRes = await fetch(`${API_BASE}/api/bookings/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(bookingPayload),
              })
              const bookingData = await bookingRes.json().catch(() => ({}))

              if (!bookingRes.ok) {
                throw new Error(bookingData?.message || 'Booking could not be confirmed. Please contact support.')
              }

              alert(
                `✓ Booking confirmed!\n\nPayment ID: ${response.razorpay_payment_id}\n\nDesigner will contact you shortly at ${bookingForm.customerPhone}`,
              )
              setShowBookingModal(false)
              setBookingForm({
                customerName: '',
                customerEmail: '',
                customerPhone: '',
                projectDescription: '',
                visitDate: '',
                visitTime: '',
                visitPlace: '',
                budgetRange: '',
              })
            } catch (err) {
              console.error('Payment/booking failed:', err)
              alert(err?.message || 'Payment failed. Please try again.')
            } finally {
              setBookingSubmitting(false)
              setBookingStatusMsg('')
            }
          },
          modal: {
            ondismiss: function () {
              setBookingSubmitting(false)
              setBookingStatusMsg('')
            },
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function () {
          setBookingSubmitting(false)
          setBookingStatusMsg('')
        })
        rzp.open()
      } else {
        // Offline booking
        setBookingSubmitting(true)
        const offlinePayload = {
          ...payload,
          status: 'pending',
        }
        const bookingRes = await fetch(`${API_BASE}/api/bookings/create`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(offlinePayload),
        })
        const offlineData = await bookingRes.json().catch(() => ({}))
        if (bookingRes.ok) {
          alert(
            '✓ Offline consultation scheduled!\n\nDesigner will contact you at ' +
              bookingForm.customerPhone +
              '\n\nDate: ' +
              bookingForm.visitDate +
              (bookingForm.visitTime ? ' at ' + bookingForm.visitTime : '') +
              '\nPlace: ' +
              bookingForm.visitPlace
          )
          setShowBookingModal(false)
          setBookingForm({
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            projectDescription: '',
            visitDate: '',
            visitTime: '',
            visitPlace: '',
            budgetRange: '',
          })
        } else {
          alert(offlineData?.message || 'Error scheduling consultation. Please try again.')
        }
        setBookingSubmitting(false)
      }

    } catch (err) {
      setBookingSubmitting(false)
      setBookingStatusMsg('')
      alert('Error: ' + err.message)
    }
  }

  const doAuth = async () => {
    const mode = authMode === 'login' ? 'login' : 'register'
    const url = `${API_BASE}/api/auth/${mode}`
    const payload =
      mode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : {
            name: authForm.name || 'User',
            email: authForm.email,
            password: authForm.password,
            role: authForm.role,
          }

    console.log(`[${mode.toUpperCase()}] Sending:`, { email: payload.email, role: payload.role || 'customer' })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    const data = await res.json().catch(() => {
      console.error(`[${mode.toUpperCase()}] Response was not JSON`)
      return {}
    })
    
    console.log(`[${mode.toUpperCase()}] Response:`, { status: res.status, hasUser: !!data.user, hasToken: !!data.token })
    
    if (!res.ok) {
      throw new Error(data?.message || `${mode} failed`)
    }
    
    const loggedInUser = data.user
    const token = data.token
    
    if (!token) {
      throw new Error('No token received from server!')
    }
    
    console.log(`[${mode.toUpperCase()}] ✓ Success - storing token in localStorage`)
    
    // Store token in localStorage
    localStorage.setItem('ic_token', token)
    setAuthToken(token)
    console.log('[AUTH] Token stored. authToken state updated.')
    
    setUser(loggedInUser)
    setShowAuthModal(false)
    setAuthForm({ name: '', email: '', password: '', role: 'customer' })
    
    // If designer, load their profile
    if (loggedInUser?.role === 'designer') {
      try {
        const profileRes = await fetch(`${API_BASE}/api/designers/me`, {
          headers: getAuthHeaders(),
        })
        if (profileRes.ok) {
          const profile = await profileRes.json()
          setDesignerProfile(profile)
          setDesignerForm({
            displayName: profile.displayName || '',
            location: profile.location || '',
            styles: profile.styles || [],
            spaces: profile.spaces || [],
            minBudget: profile.minBudget || '',
            maxBudget: profile.maxBudget || '',
            startingPrice: profile.startingPrice || '',
            description: profile.description || '',
            image: profile.image || '',
            portfolioImages: profile.portfolioImages || [],
            contactEmail: profile.contactEmail || '',
            contactPhone: profile.contactPhone || '',
            onlinePayments: profile.onlinePayments !== false,
            offlineAvailable: profile.offlineAvailable !== false,
          })
        }
      } catch (e) {
        console.warn('Could not load existing designer profile')
      }
    }
    
    // After login, show the main website/home content.
    setActiveSection('home')
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const saveDesignerProfile = async () => {
    try {
      setSavingProfile(true)
      
      // Validate required fields
      if (!designerForm.displayName || !designerForm.location) {
        alert('Please fill in Display Name and Location (required fields)')
        return
      }
      
      const payload = {
        ...designerForm,
        minBudget: Number(designerForm.minBudget) || 0,
        maxBudget: Number(designerForm.maxBudget) || 0,
      }
      
      const headers = getAuthHeaders()
      console.log('Saving profile with token:', headers.Authorization ? '✓ YES' : '✗ NO')
      
      const res = await fetch(`${API_BASE}/api/designers/me`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        console.error('Save failed:', { status: res.status, message: data.message })
        if (res.status === 401) {
          localStorage.removeItem('ic_token')
          setAuthToken(null)
          setUser(null)
          throw new Error('Your session expired. Please log in again.')
        }
        throw new Error(data.message || `Failed to save profile (${res.status})`)
      }
      
      setDesignerProfile(data)
      alert('✓ Profile saved successfully! Your profile is now live.')
    } catch (e) {
      console.error('Save profile error:', e.message)
      alert('Failed to save: ' + e.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const addStyle = (style) => {
    if (!designerForm.styles.includes(style)) {
      setDesignerForm((f) => ({ ...f, styles: [...f.styles, style] }))
    }
  }

  const removeStyle = (style) => {
    setDesignerForm((f) => ({ ...f, styles: f.styles.filter((s) => s !== style) }))
  }

  const addSpace = (space) => {
    if (!designerForm.spaces.includes(space)) {
      setDesignerForm((f) => ({ ...f, spaces: [...f.spaces, space] }))
    }
  }

  const removeSpace = (space) => {
    setDesignerForm((f) => ({ ...f, spaces: f.spaces.filter((s) => s !== space) }))
  }

  const addPortfolioImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      setDesignerForm((f) => ({ ...f, portfolioImages: [...f.portfolioImages, url] }))
    }
  }

  const removePortfolioImage = (index) => {
    setDesignerForm((f) => ({
      ...f,
      portfolioImages: f.portfolioImages.filter((_, i) => i !== index),
    }))
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
    } catch (e) {
      console.warn('Logout request failed (but clearing local session anyway)')
    } finally {
      localStorage.removeItem('ic_token')
      setAuthToken(null)
      setUser(null)
      setDesignerProfile(null)
      setShowDesignerBuildProfile(false)
      setDesignerForm({
        displayName: '',
        location: '',
        styles: [],
        spaces: [],
        minBudget: '',
        maxBudget: '',
        startingPrice: '',
        description: '',
        image: '',
        portfolioImages: [],
        contactEmail: '',
        contactPhone: '',
        onlinePayments: true,
        offlineAvailable: true,
      })
    }
  }

  const openBuildProfile = () => {
    if (user?.role !== 'designer') return
    setShowDesignerBuildProfile(true)
    setTimeout(() => scrollToSection('designer-dashboard'), 80)
  }

  const scrollToSection = (id) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="ic-root">
      <header className="ic-nav">
        <div className="ic-nav-inner">
          <div
            className="ic-logo"
            onClick={() => {
              setSelectedDesigner(null)
              navigate('/')
              setTimeout(() => scrollToSection('home'), 80)
            }}
            role="button"
          >
            <span className="ic-logo-mark">IC</span>
            <span className="ic-logo-text">InteriorConnect</span>
          </div>
          <nav className="ic-nav-links">
            {user ? (
              <>
                {user.role === 'customer' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDesigner(null)
                      navigate('/designers')
                    }}
                    className={
                      isSearchPage ? 'ic-nav-link active' : 'ic-nav-link'
                    }
                  >
                    Search Designers
                  </button>
                )}
                {user.role === 'designer' && (
                  <button
                    type="button"
                    onClick={() => openBuildProfile()}
                    className={activeSection === 'designer-dashboard' ? 'ic-nav-link active' : 'ic-nav-link'}
                  >
                    Build Profile
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('how')}
                  className={activeSection === 'how' ? 'ic-nav-link active' : 'ic-nav-link'}
                >
                  How it works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('designers')}
                  className={activeSection === 'designers' ? 'ic-nav-link active' : 'ic-nav-link'}
                >
                  Designers
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('ai')}
                  className={activeSection === 'ai' ? 'ic-nav-link active' : 'ic-nav-link'}
                >
                  AI & 3D
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('ar-studio')}
                  className={activeSection === 'ar-studio' ? 'ic-nav-link active' : 'ic-nav-link'}
                >
                  AR Studio
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('testimonials')}
                  className={activeSection === 'testimonials' ? 'ic-nav-link active' : 'ic-nav-link'}
                >
                  Stories
                </button>
              </>
            )}
          </nav>
          <div className="ic-nav-cta">
            {user ? (
              <>
                <span className="ic-user-name">{user.name}</span>
                <Profile
                  user={user}
                  apiBase={API_BASE}
                  getAuthHeaders={getAuthHeaders}
                  onLogout={handleLogout}
                  onGoToProfile={() => {
                    setSelectedDesigner(null)
                    setShowBookingModal(false)
                    setBookingDesigner(null)
                    navigate('/profile')
                  }}
                  onViewProfile={() => {
                    if (user?.role !== 'designer') return
                    if (!designerProfile) {
                      openBuildProfile()
                      return
                    }
                    setSelectedDesigner(designerProfile)
                    setTimeout(() => scrollToSection('designer-profile'), 80)
                  }}
                  onMyDesigns={() => openBuildProfile()}
                  preferences={{
                    style: selectedStyle,
                    space: spaceFilter,
                    minBudget: minBudgetFilter,
                    maxBudget: maxBudgetFilter,
                  }}
                />
              </>
            ) : (
              <button
                type="button"
                className="ic-btn ghost"
                onClick={() => {
                  setAuthMode('login')
                  setAuthForm((f) => ({ ...f, role: 'customer' }))
                  setShowAuthModal(true)
                }}
              >
                Log in
              </button>
            )}
            <button
              type="button"
              className="ic-btn primary"
              onClick={() => {
                setAuthMode('signup')
                setAuthForm((f) => ({ ...f, role: 'customer' }))
                setShowAuthModal(true)
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Build Profile - on-demand for logged-in designers */}
        {user?.role === 'designer' && showDesignerBuildProfile && (
          <section id="designer-dashboard" className="ic-section ic-designer-dashboard">
            <div className="ic-dashboard-container">
              <div className="ic-dashboard-header">
                <h1>Your Designer Profile</h1>
                <p>Manage your profile, portfolio, and pricing to attract customers</p>
              </div>

              <form
                className="ic-designer-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveDesignerProfile()
                }}
              >
                <div className="ic-form-section">
                  <h2>Basic Information</h2>
                  <div className="ic-form-grid">
                    <label>
                      Display Name *
                      <input
                        type="text"
                        required
                        value={designerForm.displayName}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, displayName: e.target.value }))
                        }
                        placeholder="Your professional name"
                      />
                    </label>
                    <label>
                      Location *
                      <input
                        type="text"
                        required
                        value={designerForm.location}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, location: e.target.value }))
                        }
                        placeholder="City, Country"
                      />
                    </label>
                  </div>
                  <label>
                    Profile Image URL
                    <input
                      type="url"
                      value={designerForm.image}
                      onChange={(e) =>
                        setDesignerForm((f) => ({ ...f, image: e.target.value }))
                      }
                      placeholder="https://example.com/your-photo.jpg"
                    />
                  </label>
                  <label>
                    Description *
                    <textarea
                      required
                      rows={4}
                      value={designerForm.description}
                      onChange={(e) =>
                        setDesignerForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Tell customers about your design philosophy and expertise..."
                    />
                  </label>
                </div>

                <div className="ic-form-section">
                  <h2>Design Styles</h2>
                  <div className="ic-form-tags">
                    {designerForm.styles.map((style) => (
                      <span key={style} className="ic-tag">
                        {style}
                        <button
                          type="button"
                          onClick={() => removeStyle(style)}
                          className="ic-tag-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="ic-form-chip-group">
                    {STYLE_FILTERS.filter((s) => s !== 'All').map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => addStyle(style)}
                        disabled={designerForm.styles.includes(style)}
                        className="ic-chip"
                      >
                        + {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ic-form-section">
                  <h2>Spaces You Design</h2>
                  <div className="ic-form-tags">
                    {designerForm.spaces.map((space) => (
                      <span key={space} className="ic-tag">
                        {space}
                        <button
                          type="button"
                          onClick={() => removeSpace(space)}
                          className="ic-tag-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="ic-form-chip-group">
                    {SPACES.filter((s) => s !== 'Any space').map((space) => (
                      <button
                        key={space}
                        type="button"
                        onClick={() => addSpace(space)}
                        disabled={designerForm.spaces.includes(space)}
                        className="ic-chip"
                      >
                        + {space}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ic-form-section">
                  <h2>Pricing</h2>
                  <div className="ic-form-grid">
                    <label>
                      Minimum Budget (₹) *
                      <input
                        type="number"
                        required
                        min={0}
                        value={designerForm.minBudget}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, minBudget: e.target.value }))
                        }
                        placeholder="15000"
                      />
                    </label>
                    <label>
                      Maximum Budget (₹) *
                      <input
                        type="number"
                        required
                        min={designerForm.minBudget || 0}
                        value={designerForm.maxBudget}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, maxBudget: e.target.value }))
                        }
                        placeholder="80000"
                      />
                    </label>
                    <label>
                      Starting Price (display text) *
                      <input
                        type="text"
                        required
                        value={designerForm.startingPrice}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, startingPrice: e.target.value }))
                        }
                        placeholder="₹35,000"
                      />
                    </label>
                  </div>
                </div>

                <div className="ic-form-section">
                  <h2>Contact Information</h2>
                  <div className="ic-form-grid">
                    <label>
                      Email *
                      <input
                        type="email"
                        required
                        value={designerForm.contactEmail}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, contactEmail: e.target.value }))
                        }
                        placeholder="your@email.com"
                      />
                    </label>
                    <label>
                      Phone *
                      <input
                        type="tel"
                        required
                        value={designerForm.contactPhone}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, contactPhone: e.target.value }))
                        }
                        placeholder="+91-98765-43210"
                      />
                    </label>
                  </div>
                  <div className="ic-form-checkboxes">
                    <label>
                      <input
                        type="checkbox"
                        checked={designerForm.onlinePayments}
                        onChange={(e) =>
                          setDesignerForm((f) => ({ ...f, onlinePayments: e.target.checked }))
                        }
                      />
                      Accept online payments (UPI/Card)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={designerForm.offlineAvailable}
                        onChange={(e) =>
                          setDesignerForm((f) => ({
                            ...f,
                            offlineAvailable: e.target.checked,
                          }))
                        }
                      />
                      Available for offline visits
                    </label>
                  </div>
                </div>

                <div className="ic-form-section">
                  <h2>Portfolio Images</h2>
                  <p className="ic-form-hint">
                    Add URLs of your previous design work. Customers will see these in your
                    profile.
                  </p>
                  <div className="ic-portfolio-grid">
                    {designerForm.portfolioImages.map((url, idx) => (
                      <div key={idx} className="ic-portfolio-item">
                        <img src={url} alt={`Portfolio ${idx + 1}`} />
                        <button
                          type="button"
                          onClick={() => removePortfolioImage(idx)}
                          className="ic-portfolio-remove"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addPortfolioImage}
                    className="ic-btn secondary"
                  >
                    + Add Portfolio Image URL
                  </button>
                </div>

                <div className="ic-form-actions">
                  <button
                    type="submit"
                    className="ic-btn primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                  {designerProfile && (
                    <>
                      <p className="ic-form-success">
                        ✓ Your profile is live! Customers can now find you.
                      </p>
                      <button
                        type="button"
                        className="ic-btn secondary"
                        onClick={handleDeleteDesignerProfile}
                      >
                        Delete Profile
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Profile Page (route: /profile) */}
        {isProfilePage && (
          <ProfilePage
            user={user}
            apiBase={API_BASE}
            getAuthHeaders={getAuthHeaders}
            preferences={{
              style: selectedStyle,
              space: spaceFilter,
              minBudget: minBudgetFilter,
              maxBudget: maxBudgetFilter,
            }}
            designerProfile={designerProfile}
            onBack={() => {
              setSelectedDesigner(null)
              setShowBookingModal(false)
              setBookingDesigner(null)
              navigate('/')
              setTimeout(() => scrollToSection('home'), 80)
            }}
          />
        )}

        {/* Search Designers Page (route: /designers) */}
        {isSearchPage && !isProfilePage && user?.role === 'customer' && (
          <section id="customer-dashboard" className="ic-section ic-customer-dashboard">
            <div className="ic-dashboard-container">
              <div className="ic-dashboard-header">
                <button
                  type="button"
                  className="ic-btn ghost"
                  onClick={() => {
                    setSelectedDesigner(null)
                    setShowBookingModal(false)
                    setBookingDesigner(null)
                    navigate('/')
                  }}
                >
                  ← Back
                </button>
                <h1>Welcome back, {user.name}!</h1>
                <p>Search for designers based on your requirements</p>
              </div>
              {/* Search and filters section - reuse existing code */}
              <div id="designers" className="ic-section ic-designers">
                <div className="ic-section-header ic-section-header-row">
                  <div>
                    <span className="ic-eyebrow">Browse designers</span>
                    <h2>Find your perfect designer match</h2>
                  </div>
                </div>

                <div className="ic-search-bar-container">
                  <div className="ic-search-main">
                    <input
                      type="text"
                      placeholder="Search by name, location, or style..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="ic-search-input"
                    />
                  </div>
                  <div className="ic-search-filters">
                    <div className="ic-filter-group">
                      <label>Style</label>
                      <div className="ic-chips">
                        {STYLE_FILTERS.map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setSelectedStyle(style)}
                            className={
                              style === selectedStyle ? 'ic-chip active' : 'ic-chip'
                            }
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="ic-filter-group">
                      <label>Space Type</label>
                      <select
                        value={spaceFilter}
                        onChange={(e) => setSpaceFilter(e.target.value)}
                      >
                        {SPACES.map((space) => (
                          <option key={space} value={space}>
                            {space}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ic-search-budget">
                      <label>Budget (approx. per space)</label>
                      <div className="ic-search-budget-inputs">
                        <input
                          type="number"
                          min={10000}
                          max={maxBudgetFilter}
                          value={minBudgetFilter}
                          onChange={(e) =>
                            setMinBudgetFilter(Number(e.target.value) || 0)
                          }
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min={minBudgetFilter}
                          max={200000}
                          value={maxBudgetFilter}
                          onChange={(e) =>
                            setMaxBudgetFilter(Number(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {loadingDesigners && (
                  <div className="ic-loading">Loading designers...</div>
                )}

                <div className="ic-designers-grid">
                  {filteredDesigners.map((designer) => (
                    <article key={designer._id || designer.id} className="ic-designer-card">
                      <div className="ic-designer-image-wrapper">
                        <img
                          src={designer.image}
                          alt={designer.displayName || designer.name}
                        />
                        {designer.badge && (
                          <span className="ic-designer-badge">{designer.badge}</span>
                        )}
                      </div>
                      <div className="ic-designer-content">
                        <div className="ic-designer-header">
                          <div>
                            <h3>{designer.displayName || designer.name}</h3>
                            <span className="ic-designer-location">
                              {designer.location}
                            </span>
                          </div>
                          <div className="ic-designer-rating">
                            ⭐ {designer.rating?.toFixed(1) || '0.0'}
                          </div>
                        </div>
                        <p className="ic-designer-desc">
                          {designer.description || 'No description available.'}
                        </p>
                        <div className="ic-designer-tags">
                          {(designer.styles || []).map((style) => (
                            <span key={style}>{style}</span>
                          ))}
                        </div>
                        <div className="ic-designer-footer">
                          <div className="ic-designer-price">
                            From <strong>{designer.startingPrice}</strong>
                            <span>
                              Typical range ₹
                              {designer.minBudget?.toLocaleString('en-IN')} – ₹
                              {designer.maxBudget?.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="ic-btn tertiary"
                            onClick={() => openProfile(designer)}
                          >
                            View profile
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!loadingDesigners && filteredDesigners.length === 0 && (
                    <div className="ic-empty-state">
                      <h3>No designers match these filters yet.</h3>
                      <p>Try widening your budget or removing a style/space filter.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main / Home (route: /) */}
        {!isSearchPage && !isProfilePage && (
          <>
        <section id="home" className="ic-section ic-hero">
          <div className="ic-hero-grid">
            <div className="ic-hero-left">
              <span className="ic-pill">
                ✨ Smart interior design marketplace
              </span>
              <h1>
                Bring your dream space{' '}
                <span className="ic-accent">to life</span> with the right
                designer.
              </h1>
              <p>
                Match with vetted interior designers tailored to your style,
                budget, and location. Explore AI-powered concepts, immersive
                3D/AR previews, and book with full transparency.
              </p>
              <div className="ic-hero-actions">
                <button
                  type="button"
                  className="ic-btn primary"
                  onClick={() => scrollToSection('designers')}
                >
                  Find a designer
                </button>
                <button
                  type="button"
                  className="ic-btn secondary"
                  onClick={() => {
                    setAuthMode('designer')
                    setAuthForm((f) => ({ ...f, role: 'designer' }))
                    setShowAuthModal(true)
                  }}
                >
                  I&apos;m a designer
                </button>
              </div>
              <div className="ic-metrics">
                <div>
                  <strong>5k+</strong>
                  <span>Projects completed</span>
                </div>
                <div>
                  <strong>4.9/5</strong>
                  <span>Average designer rating</span>
                </div>
                <div>
                  <strong>70%</strong>
                  <span>Faster decisions with 3D/AR</span>
                </div>
              </div>
            </div>

            <div className="ic-hero-right">
              <div className="ic-room-card">
                <div className="ic-room-image" />
                <div className="ic-floating-cards">
                  <div className="ic-glass-card">
                    <span className="ic-card-label">AI budget planner</span>
                    <p>
                      We optimise layouts and materials to keep you within{' '}
                      <strong>₹{budget.toLocaleString('en-IN')}</strong>.
                    </p>
                    <div className="ic-slider-group">
                      <input
                        type="range"
                        min="20000"
                        max="150000"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                      />
                      <div className="ic-slider-labels">
                        <span>₹20k</span>
                        <span>₹1.5L+</span>
                      </div>
                    </div>
                  </div>
                  <div className="ic-glass-card dark">
                    <span className="ic-card-label">Designer match</span>
                    <p>
                      <strong>{filteredDesigners.length} designers</strong>{' '}
                      currently match your inputs.
                    </p>
                    <label className="ic-toggle">
                      <input
                        type="checkbox"
                        checked={aiMatch}
                        onChange={(e) => setAiMatch(e.target.checked)}
                      />
                      <span className="ic-toggle-slider" />
                      <span className="ic-toggle-label">
                        AI match {aiMatch ? 'on' : 'off'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="ic-section ic-how">
          <div className="ic-section-header">
            <span className="ic-eyebrow">How it works</span>
            <h2>From inspiration to installation in three simple steps.</h2>
            <p>
              We blend real designers, real projects, and real budgets with
              smart technology so you always feel in control.
            </p>
          </div>
          <div className="ic-how-grid">
            <div className="ic-step-card">
              <span className="ic-step-number">01</span>
              <h3>Tell us about your space</h3>
              <p>
                Share photos, floor plans, and your preferred style. Our AI
                quickly understands your taste and constraints.
              </p>
              <ul>
                <li>✅ Upload room photos in seconds</li>
                <li>✅ Select styles and colour palettes</li>
                <li>✅ Define your all-in budget</li>
              </ul>
            </div>
            <div className="ic-step-card">
              <span className="ic-step-number">02</span>
              <h3>Get curated designer matches</h3>
              <p>
                We connect you with designers whose portfolios, pricing, and
                location align with your needs.
              </p>
              <ul>
                <li>✅ Transparent packages & pricing</li>
                <li>✅ Chat before you book</li>
                <li>✅ View 3D & AR previews</li>
              </ul>
            </div>
            <div className="ic-step-card">
              <span className="ic-step-number">03</span>
              <h3>Book, design, and review</h3>
              <p>
                Secure payments, clear timelines, and milestone-based delivery
                ensure a stress-free experience.
              </p>
              <ul>
                <li>✅ Secure escrow-style payments</li>
                <li>✅ Track progress in your dashboard</li>
                <li>✅ Rate & review your designer</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="designers" className="ic-section ic-designers">
          {user && user.role === 'customer' && (
            <div className="ic-welcome-banner">
              <h3>Welcome back, {user.name || 'Customer'}! 👋</h3>
              <p>Search for designers that match your requirements below.</p>
            </div>
          )}
          
          <div className="ic-section-header ic-section-header-row">
            <div>
              <span className="ic-eyebrow">Browse designers</span>
              <h2>Discover designers who speak your style.</h2>
              <p className="ic-designers-subtitle">
                Use search, budget, and space filters. Our AI will sort the best
                fits for you.
              </p>
            </div>
          </div>

          {/* Prominent Search Bar with All Filters */}
          <div className="ic-search-container">
            <div className="ic-search-main-bar">
              <div className="ic-search-field-large">
                <label htmlFor="search-input-main">🔍 Search designers</label>
                <input
                  id="search-input-main"
                  type="text"
                  placeholder="Search by city, style, or designer name..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="ic-filters-row">
              <div className="ic-filter-group">
                <span className="ic-filter-label">Design Style</span>
                <div className="ic-chips">
                  {STYLE_FILTERS.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
                      className={
                        style === selectedStyle ? 'ic-chip active' : 'ic-chip'
                      }
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="ic-filter-group">
                <span className="ic-filter-label">Space Type</span>
                <select
                  value={spaceFilter}
                  onChange={(e) => setSpaceFilter(e.target.value)}
                  className="ic-filter-select"
                >
                  {SPACES.map((space) => (
                    <option key={space} value={space}>
                      {space}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ic-filter-group">
                <span className="ic-filter-label">Budget Range</span>
                <div className="ic-search-budget-inputs">
                  <input
                    type="number"
                    min={10000}
                    max={maxBudgetFilter}
                    value={minBudgetFilter}
                    onChange={(e) =>
                      setMinBudgetFilter(Number(e.target.value) || 0)
                    }
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={minBudgetFilter}
                    max={200000}
                    value={maxBudgetFilter}
                    onChange={(e) =>
                      setMaxBudgetFilter(Number(e.target.value) || 0)
                    }
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ic-search-row" style={{ display: 'none' }}>
            <div className="ic-search-main">
              <div className="ic-search-field">
                <label htmlFor="search-input">Search designers</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search by city, style, or designer name..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="ic-search-field">
                <label htmlFor="space-select">Space</label>
                <select
                  id="space-select"
                  value={spaceFilter}
                  onChange={(e) => setSpaceFilter(e.target.value)}
                >
                  {SPACES.map((space) => (
                    <option key={space} value={space}>
                      {space}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ic-search-budget">
              <label>Budget (approx. per space)</label>
              <div className="ic-search-budget-inputs">
                <input
                  type="number"
                  min={10000}
                  max={maxBudgetFilter}
                  value={minBudgetFilter}
                  onChange={(e) =>
                    setMinBudgetFilter(Number(e.target.value) || 0)
                  }
                />
                <span>to</span>
                <input
                  type="number"
                  min={minBudgetFilter}
                  max={200000}
                  value={maxBudgetFilter}
                  onChange={(e) =>
                    setMaxBudgetFilter(Number(e.target.value) || 0)
                  }
                />
              </div>
              <div className="ic-search-budget-hint">
                AI sorts matches closest to your budget range.
              </div>
            </div>
          </div>

          <div className="ic-designers-grid">
            {filteredDesigners.map((designer) => (
              <article key={designer._id || designer.id} className="ic-designer-card">
                <div className="ic-designer-image-wrapper">
                  <img
                    src={designer.image}
                    alt={designer.displayName || designer.name}
                  />
                  <span className="ic-designer-badge">{designer.badge}</span>
                </div>
                <div className="ic-designer-content">
                  <div className="ic-designer-header">
                    <div>
                      <h3>{designer.displayName || designer.name}</h3>
                      <span className="ic-designer-location">
                        {designer.location}
                      </span>
                    </div>
                    <div className="ic-designer-rating">
                      ⭐ {designer.rating.toFixed(1)}
                    </div>
                  </div>
                  <p className="ic-designer-desc">{designer.description}</p>
                  <div className="ic-designer-tags">
                    {(designer.styles || []).map((style) => (
                      <span key={style}>{style}</span>
                    ))}
                  </div>
                  <div className="ic-designer-footer">
                    <div className="ic-designer-price">
                      From <strong>{designer.startingPrice}</strong>
                      <span>
                        Typical range ₹
                        {designer.minBudget.toLocaleString('en-IN')} – ₹
                        {designer.maxBudget.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ic-btn tertiary"
                      onClick={() => openProfile(designer)}
                    >
                      View profile
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {loadingDesigners && (
              <div className="ic-empty-state">
                <h3>Loading designers…</h3>
                <p>Fetching results from your MongoDB backend.</p>
              </div>
            )}
            {!loadingDesigners && filteredDesigners.length === 0 && (
              <div className="ic-empty-state">
                <h3>No designers match these filters yet.</h3>
                <p>
                  Seed demo designers once: <code>POST {API_BASE}/api/dev/seed</code>
                </p>
              </div>
            )}
          </div>
        </section>

        <section id="ai" className="ic-section ic-ai">
          <div className="ic-ai-grid">
            <div>
              <span className="ic-eyebrow">AI & immersive previews</span>
              <h2>See your future space before you spend.</h2>
              <p>
                Our AI-powered budget planner and 3D/AR tools help you choose
                layouts, furniture, and finishes with confidence—long before
                anything is installed.
              </p>
              <div className="ic-ai-highlights">
                <div>
                  <h3>Smart budget planning</h3>
                  <p>
                    Play with material options and instantly see how they impact
                    your budget and timeline.
                  </p>
                </div>
                <div>
                  <h3>3D & AR previews</h3>
                  <p>
                    Walk through your design on your phone or laptop, change
                    colours, and compare alternatives side-by-side.
                  </p>
                </div>
              </div>
            </div>
            <div className="ic-ai-visual">
              <div className="ic-ai-phone">
                <div className="ic-ai-phone-screen">
                  <div className={`ic-ai-room-small palette-${selectedPalette}`} />
                  <div className="ic-ai-options">
                    <span className="ic-pill small">Style options</span>
                    <div className="ic-ai-swatches">
                      <button
                        type="button"
                        className={selectedPalette === 'warm' ? 'active' : ''}
                        onClick={() => setSelectedPalette('warm')}
                      />
                      <button
                        type="button"
                        className={selectedPalette === 'dark' ? 'active' : ''}
                        onClick={() => setSelectedPalette('dark')}
                      />
                      <button
                        type="button"
                        className={selectedPalette === 'light' ? 'active' : ''}
                        onClick={() => setSelectedPalette('light')}
                      />
                      <button
                        type="button"
                        className={selectedPalette === 'bold' ? 'active' : ''}
                        onClick={() => setSelectedPalette('bold')}
                      />
                    </div>
                    <p>
                      {selectedPalette === 'warm' &&
                        'Soft beiges and warm woods create a cosy, timeless living room.'}
                      {selectedPalette === 'dark' &&
                        'Moody accents and dark walls highlight statement lighting and art.'}
                      {selectedPalette === 'light' &&
                        'Crisp whites and pale woods bounce maximum natural light.'}
                      {selectedPalette === 'bold' &&
                        'Colour blocked walls and vibrant textiles make a playful, expressive space.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ic-ai-card">
                <span className="ic-card-label">Live project status</span>
                <p>
                  Track every milestone with your designer—from moodboard to
                  final styling—with clear due dates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AR Studio Section */}
        <ARStudio user={user} />

        <section id="testimonials" className="ic-section ic-testimonials">
          <div className="ic-section-header">
            <span className="ic-eyebrow">Stories from our community</span>
            <h2>Real homes, real designers, real impact.</h2>
          </div>
          <div className="ic-testimonials-grid">
            <article className="ic-testimonial-card">
              <p>
                “InteriorConnect turned our empty 2BHK into a warm, modern home.
                We finalised a design in 10 days and stayed within budget.”
              </p>
              <div className="ic-testimonial-footer">
                <div>
                  <h3>Riya & Kunal</h3>
                  <span>First-time homeowners · Pune</span>
                </div>
                <span className="ic-testimonial-rating">★★★★★</span>
              </div>
            </article>
            <article className="ic-testimonial-card">
              <p>
                “As a designer, I love how transparent the platform is. My best
                projects now come from InteriorConnect leads.”
              </p>
              <div className="ic-testimonial-footer">
                <div>
                  <h3>Devika Sharma</h3>
                  <span>Interior designer · Bengaluru</span>
                </div>
                <span className="ic-testimonial-rating">★★★★★</span>
              </div>
            </article>
            <article className="ic-testimonial-card">
              <p>
                “The 3D & AR previews helped my parents visualise everything.
                No surprises when the furniture arrived!”
              </p>
              <div className="ic-testimonial-footer">
                <div>
                  <h3>Abhishek Rao</h3>
                  <span>Rented apartment makeover · Mumbai</span>
                </div>
                <span className="ic-testimonial-rating">★★★★☆</span>
              </div>
            </article>
          </div>
        </section>
          </>
        )}
      </main>

      {selectedDesigner && !isProfilePage && (
        <section
          id="designer-profile"
          className="ic-section ic-profile-section"
        >
          <div className="ic-profile">
            <div className="ic-profile-main">
              <div className="ic-profile-header">
                <div className="ic-profile-avatar">
                  <img src={selectedDesigner.image} alt={selectedDesigner.name} />
                </div>
                <div className="ic-profile-summary">
                  <span className="ic-eyebrow">Designer profile</span>
                  <h2>{selectedDesigner.name}</h2>
                  <p className="ic-profile-location">{selectedDesigner.location}</p>
                  <div className="ic-profile-meta">
                    <span>⭐ {selectedDesigner.rating.toFixed(1)} rating</span>
                    <span>{selectedDesigner.projects}+ projects</span>
                    <span>{selectedDesigner.badge}</span>
                  </div>
                  <p className="ic-profile-desc">{selectedDesigner.description}</p>
                  <div className="ic-profile-tags">
                    {selectedDesigner.styles.map((style) => (
                      <span key={style}>{style}</span>
                    ))}
                    {selectedDesigner.spaces.map((space) => (
                      <span key={space}>{space}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                }}
              >
                {selectedDesignerPortfolioDesigns.map((d) => (
                  <DesignCard
                    key={d.likeId}
                    design={d}
                    user={user}
                    apiBase={API_BASE}
                    getAuthHeaders={getAuthHeaders}
                  />
                ))}
              </div>
            </div>

            <aside className="ic-profile-sidebar">
              <div className="ic-profile-card">
                <h3>Packages & pricing</h3>
                <p className="ic-profile-price-main">
                  From {selectedDesigner.startingPrice}{' '}
                  <span>per room</span>
                </p>
                <p className="ic-profile-price-range">
                  Typical project: ₹
                  {selectedDesigner.minBudget.toLocaleString('en-IN')} – ₹
                  {selectedDesigner.maxBudget.toLocaleString('en-IN')}
                </p>
                <button
                  type="button"
                  className="ic-btn primary ic-profile-btn"
                  onClick={() => handleBookDesigner(selectedDesigner, 'online')}
                >
                  Book online (UPI / Card)
                </button>
                <button
                  type="button"
                  className="ic-btn secondary ic-profile-btn"
                  onClick={() => handleBookDesigner(selectedDesigner, 'offline')}
                >
                  Schedule offline visit
                </button>
              </div>

              <div className="ic-profile-card">
                <h3>Contact</h3>
                <p>
                  Email:{' '}
                  <a href={`mailto:${selectedDesigner.contactEmail}`}>
                    {selectedDesigner.contactEmail}
                  </a>
                </p>
                <p>Phone: {selectedDesigner.contactPhone}</p>
                <p className="ic-profile-payments">
                  Online payments:{' '}
                  <strong>
                    {selectedDesigner.onlinePayments ? 'Available' : 'Not available'}
                  </strong>
                  <br />
                  Offline / cash:{' '}
                  <strong>
                    {selectedDesigner.offlineAvailable ? 'Available' : 'On request only'}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                className="ic-btn ghost ic-profile-back"
                onClick={() => {
                  setSelectedDesigner(null)
                  scrollToSection('designers')
                }}
              >
                ← Back to all designers
              </button>
            </aside>
          </div>
        </section>
      )}

      <footer className="ic-footer">
        <div className="ic-footer-inner">
          <div className="ic-footer-main">
            <div>
              <div className="ic-logo">
                <span className="ic-logo-mark">IC</span>
                <span className="ic-logo-text">InteriorConnect</span>
              </div>
              <p>
                Bridging the gap between design dreams and real homes with
                curated designers, transparent pricing, and immersive tech.
              </p>
            </div>
            <div className="ic-footer-links">
              <div>
                <h4>Product</h4>
                <a href="#how">How it works</a>
                <a href="#designers">Browse designers</a>
                <a href="#ai">AI & 3D</a>
              </div>
              <div>
                <h4>For designers</h4>
                <a href="/">Become a partner</a>
                <a href="/">Designer resources</a>
              </div>
              <div>
                <h4>Company</h4>
                <a href="/">About</a>
                <a href="/">Careers</a>
              </div>
            </div>
          </div>
          <div className="ic-footer-bottom">
            <span>© {new Date().getFullYear()} InteriorConnect. All rights reserved.</span>
            <div className="ic-footer-bottom-links">
              <a href="/">Terms</a>
              <a href="/">Privacy</a>
            </div>
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <div className="ic-auth-backdrop" onClick={() => setShowAuthModal(false)}>
          <div
            className="ic-auth-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="ic-auth-header">
              <h3>
                {authMode === 'login' && 'Log in to InteriorConnect'}
                {authMode === 'signup' && 'Create your InteriorConnect account'}
                {authMode === 'designer' && 'Join as an InteriorConnect designer'}
              </h3>
              <p>
                This is a demo UI – hook these fields to your backend auth when
                you are ready.
              </p>
            </div>
            <form
              className="ic-auth-form"
              onSubmit={(e) => {
                e.preventDefault()
                doAuth().catch((err) => window.alert(err.message))
              }}
            >
              {authMode !== 'login' && (
                <label>
                  Name
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={authForm.name}
                    onChange={(e) =>
                      setAuthForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  placeholder="Your password"
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </label>
              {authMode === 'login' && (
                <button
                  type="button"
                  className="ic-forgot-password-link"
                  onClick={() => {
                    setShowAuthModal(false)
                    setShowForgotPassword(true)
                    setForgotPasswordEmail('')
                  }}
                >
                  Forgot password?
                </button>
              )}
              {authMode !== 'login' && (
                <label>
                  I am
                  <select
                    value={authForm.role}
                    onChange={(e) =>
                      setAuthForm((f) => ({ ...f, role: e.target.value }))
                    }
                  >
                    <option value="customer">A customer</option>
                    <option value="designer">A designer</option>
                  </select>
                </label>
              )}
              <button type="submit" className="ic-btn primary ic-auth-submit">
                {authMode === 'login' && 'Log in'}
                {authMode === 'signup' && 'Create account'}
                {authMode === 'designer' && 'Apply as designer'}
              </button>
              <button
                type="button"
                className="ic-btn ghost ic-auth-cancel"
                onClick={() => setShowAuthModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {showForgotPassword && (
        <div className="ic-auth-backdrop" onClick={() => setShowForgotPassword(false)}>
          <div
            className="ic-auth-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="ic-auth-header">
              <h3>Reset Your Password</h3>
              <p>
                {forgotPasswordStep === 'email' && 'Enter your email address to receive a reset link.'}
                {forgotPasswordStep === 'token' && 'Enter the reset token from your email.'}
                {forgotPasswordStep === 'reset' && 'Enter your new password.'}
              </p>
            </div>
            <form className="ic-auth-form" onSubmit={handleForgotPasswordSubmit}>
              {forgotPasswordStep === 'email' && (
                <label>
                  Email
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  />
                </label>
              )}
              {forgotPasswordStep === 'token' && (
                <label>
                  Reset Token
                  <input
                    type="text"
                    required
                    placeholder="Enter the token from your email"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                  />
                </label>
              )}
              {forgotPasswordStep === 'reset' && (
                <>
                  <label>
                    New Password
                    <input
                      type="password"
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </label>
                  <label>
                    Confirm Password
                    <input
                      type="password"
                      required
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </label>
                </>
              )}
              {forgotPasswordMessage && (
                <div className="ic-auth-message">
                  {forgotPasswordMessage}
                </div>
              )}
              <button type="submit" className="ic-btn primary ic-auth-submit">
                {forgotPasswordStep === 'email' && 'Send Reset Link'}
                {forgotPasswordStep === 'token' && 'Verify Token'}
                {forgotPasswordStep === 'reset' && 'Reset Password'}
              </button>
              <button
                type="button"
                className="ic-btn ghost ic-auth-cancel"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotPasswordStep('email')
                  setForgotPasswordEmail('')
                  setResetToken('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setForgotPasswordMessage('')
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {showBookingModal && bookingDesigner && (
        <div className="ic-auth-backdrop" onClick={() => setShowBookingModal(false)}>
          <div
            className="ic-auth-modal ic-booking-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="ic-auth-header">
              <h3>
                {bookingType === 'online'
                  ? 'Book Online with ' + (bookingDesigner.displayName || bookingDesigner.name)
                  : 'Schedule Offline Consultation with ' + (bookingDesigner.displayName || bookingDesigner.name)}
              </h3>
              <p>
                {bookingType === 'online'
                  ? 'Secure online booking with instant payment'
                  : 'Schedule an in-person or video consultation'}
              </p>
            </div>
            <form className="ic-auth-form" onSubmit={(e) => {e.preventDefault(); submitBooking()}}>
              {bookingStatusMsg ? (
                <div
                  className="ic-auth-message"
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontWeight: 700,
                  }}
                >
                  {bookingStatusMsg}
                </div>
              ) : null}
              <label>
                Full Name
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={bookingForm.customerName}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, customerName: e.target.value }))
                  }
                  disabled={bookingSubmitting}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  value={bookingForm.customerEmail}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, customerEmail: e.target.value }))
                  }
                  disabled={bookingSubmitting}
                />
              </label>
              <label>
                Phone Number *
                <input
                  type="tel"
                  required
                  placeholder="+91-98765-43210"
                  value={bookingForm.customerPhone}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, customerPhone: e.target.value }))
                  }
                  disabled={bookingSubmitting}
                />
              </label>
              <label>
                Project Description
                <textarea
                  rows={3}
                  placeholder="Tell us about your project..."
                  value={bookingForm.projectDescription}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, projectDescription: e.target.value }))
                  }
                  disabled={bookingSubmitting}
                />
              </label>
              {bookingType === 'offline' && (
                <>
                  <label>
                    Preferred Visit Date *
                    <input
                      type="date"
                      required
                      value={bookingForm.visitDate}
                      onChange={(e) =>
                        setBookingForm((f) => ({ ...f, visitDate: e.target.value }))
                      }
                      disabled={bookingSubmitting}
                    />
                  </label>
                  <label>
                    Preferred Time
                    <input
                      type="time"
                      value={bookingForm.visitTime}
                      onChange={(e) =>
                        setBookingForm((f) => ({ ...f, visitTime: e.target.value }))
                      }
                      disabled={bookingSubmitting}
                    />
                  </label>
                  <label>
                    Visit Place (e.g., Home, Office, Project Site) *
                    <input
                      type="text"
                      required
                      placeholder="Where should the designer visit?"
                      value={bookingForm.visitPlace}
                      onChange={(e) =>
                        setBookingForm((f) => ({ ...f, visitPlace: e.target.value }))
                      }
                      disabled={bookingSubmitting}
                    />
                  </label>
                </>
              )}
              <label>
                Estimated Budget
                <input
                  type="text"
                  placeholder="e.g., ₹50,000 - ₹1,00,000"
                  value={bookingForm.budgetRange}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, budgetRange: e.target.value }))
                  }
                  disabled={bookingSubmitting}
                />
              </label>
              <button type="submit" className="ic-btn primary ic-auth-submit" disabled={bookingSubmitting}>
                {bookingSubmitting ? 'Please wait…' : bookingType === 'online' ? 'Proceed to Payment' : 'Schedule Consultation'}
              </button>
              <button
                type="button"
                className="ic-btn ghost ic-auth-cancel"
                onClick={() => {
                  if (bookingSubmitting) return
                  setShowBookingModal(false)
                  setBookingStatusMsg('')
                }}
                disabled={bookingSubmitting}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
