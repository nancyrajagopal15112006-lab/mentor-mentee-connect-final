import { useState, useEffect } from 'react'
import './App.css'
import MentorProfile from './MentorProfile.jsx'
import Auth from './Auth.jsx'
import { supabase } from './supabase.js'
import MentorDashboard from './MentorDashboard.jsx'
import MenteeDashboard from './MenteeDashboard.jsx'

function App() {
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentHash, setCurrentHash] = useState(window.location.hash)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [ownMentor, setOwnMentor] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [mentors, setMentors] = useState([])
  const [mentorsLoading, setMentorsLoading] = useState(true)
  const [mentorError, setMentorError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (active) setSession(data.session)
      } catch (error) {
        console.error('Session check failed:', error.message)
      } finally {
        if (active) setAuthReady(true)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const updatePage = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', updatePage)

    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  useEffect(() => {
    let active = true

    async function loadUserProfile() {
      if (!session?.user) {
        setUserRole('')
        setOwnMentor(null)
        return
      }

      setDashboardLoading(true)
      setDashboardError('')

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError
        if (!active) return

        setUserRole(profile.role)

        if (profile.role === 'mentor') {
          const { data: mentor, error: mentorProfileError } = await supabase
            .from('mentors')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (mentorProfileError) throw mentorProfileError

          if (active) {
            setOwnMentor({
              name: mentor?.name || profile.full_name || session.user.email,
              jobTitle: mentor?.job_title || '',
              bio: mentor?.bio || '',
              skills: mentor?.skills || [],
              experience: mentor?.experience_years ?? 0,
            })
          }
        } else {
          setOwnMentor(null)
        }
      } catch (error) {
        console.error('Could not load account details:', error.message)
        if (active) setDashboardError(error.message)
      } finally {
        if (active) setDashboardLoading(false)
      }
    }

    loadUserProfile()

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    let active = true

    async function loadMentors() {
      setMentorsLoading(true)
      setMentorError('')

      try {
        const [registeredResult, demoResult] = await Promise.all([
          supabase
            .from('mentors')
            .select('id, name, job_title, bio, skills, experience_years')
            .order('name'),

          supabase
            .from('demo_mentors')
            .select('*')
            .order('name'),
        ])

        if (!active) return

        if (registeredResult.error) throw registeredResult.error
        if (demoResult.error) throw demoResult.error

        const registeredMentors = (registeredResult.data || []).map(
          (mentor) => ({
            id: mentor.id,
            name: mentor.name || 'Mentor',
            role: mentor.job_title || 'Mentor',
            skills: (mentor.skills || []).join(', '),
            experience: `${mentor.experience_years ?? 0} years of experience`,
            image: null,
            bio: mentor.bio || '',
            isDemo: false,
          })
        )

        const demoMentors = (demoResult.data || []).map((mentor) => ({
          id: mentor.id,
          name: mentor.name || 'Mentor',
          role: mentor.job_title || 'Mentor',
          skills: (mentor.skills || []).join(', '),
          experience: `${mentor.experience_years ?? 0} years of experience`,
          image: mentor.image_url || null,
          bio: mentor.bio || '',
          isDemo: true,
        }))

        setMentors([...registeredMentors, ...demoMentors])
      } catch (error) {
        console.error('Could not load mentors:', error.message)
        if (active) {
          setMentorError(error.message)
          setMentors([])
        }
      } finally {
        if (active) setMentorsLoading(false)
      }
    }

    loadMentors()

    return () => {
      active = false
    }
  }, [])

  const selectedMentorId = currentHash.startsWith('#mentor/')
    ? currentHash.slice('#mentor/'.length)
    : null

  const selectedMentor =
    selectedMentorId !== null
      ? mentors.find((mentor) => mentor.id === selectedMentorId)
      : null

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(`Unable to log out: ${error.message}`)
    } else {
      window.location.hash = '#home'
    }
  }

  if (!authReady) {
    return <div className="app"><p>Loading MentorConnect...</p></div>
  }

  if (currentHash === '#login' || currentHash === '#signup') {
    return (
      <Auth
        key={currentHash}
        onLogin={() => {
          window.location.hash = '#home'
        }}
      />
    )
  }

  if (session && dashboardLoading) {
    return <main className="profile-page"><p>Loading your account...</p></main>
  }

  if (session && dashboardError) {
    return (
      <main className="profile-page">
        <h1>Unable to load your account</h1>
        <p>{dashboardError}</p>
        <button type="button" onClick={handleLogout}>Log Out</button>
      </main>
    )
  }

  if (session && userRole === 'mentor') {
    return (
      <MentorDashboard
        user={session.user}
        mentor={ownMentor}
        onLogout={handleLogout}
      />
    )
  }
  

  if (session && userRole === 'mentee' && currentHash === '#my-bookings') {
  return (
    <MenteeDashboard
      user={session.user}
      onLogout={handleLogout}
    />
  )
}
  if (selectedMentorId !== null) {
    if (mentorsLoading) {
      return <main className="profile-page"><p>Loading mentor profile...</p></main>
    }

    if (!selectedMentor) {
      return (
        <main className="profile-page">
          <h1>Mentor not found</h1>
          <p>This mentor could not be loaded.</p>
          <a href="#mentor-directory">Back to mentors</a>
        </main>
      )
    }

    return <MentorProfile mentor={selectedMentor} />
  }

  const filteredMentors = mentors.filter((mentor) =>
    `${mentor.name} ${mentor.role} ${mentor.skills}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  )

  return (
    <div className="app" id="home">
      <header className="navbar">
        <a className="logo" href="#home">
          <span className="logo-icon">M</span>
          Mentor<span className="logo-highlight">Connect</span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#mentor-directory" onClick={() => setMenuOpen(false)}>
            Explore Mentors
          </a>
          {session && userRole === 'mentee' && (
  <a
    href="#my-bookings"
    onClick={() => setMenuOpen(false)}
  >
    My Bookings
  </a>
)}

          {session ? (
            <button
              type="button"
              className="nav-button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          ) : (
            <>
              <a href="#login" onClick={() => setMenuOpen(false)}>Login</a>
              <a
                className="nav-button"
                href="#signup"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </a>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="section-label">YOUR GROWTH, OUR COMMUNITY</span>
            <h1>Find guidance.<br /><span>Build your future.</span></h1>
            <p>
              Connect with experienced mentors who can help you learn new
              skills, explore careers, and reach your goals.
            </p>
            <a className="primary-button" href="#mentor-directory">
              Find Your Mentor <span>→</span>
            </a>
          </div>
        </section>

        <section className="benefits-section" id="about">
          <span className="section-label">WHY MENTORCONNECT?</span>
          <h2>Grow with the right guidance.</h2>

          <div className="benefits-grid">
            <article className="benefit-card">
              <div className="benefit-icon">✦</div>
              <h3>Learn from experience</h3>
              <p>Gain practical advice from people who have been there.</p>
            </article>

            <article className="benefit-card">
              <div className="benefit-icon">◎</div>
              <h3>Discover opportunities</h3>
              <p>Explore career paths and develop skills that matter.</p>
            </article>

            <article className="benefit-card">
              <div className="benefit-icon">↗</div>
              <h3>Build your confidence</h3>
              <p>Get guidance to take your next step with confidence.</p>
            </article>
          </div>
        </section>

        <section className="mentor-directory" id="mentor-directory">
          <span className="section-label">MEET THE MENTORS</span>
          <h2>Learn from people who've been there.</h2>
          <p className="directory-description">
            Find a mentor who matches your interests and goals.
          </p>

          <div className="mentor-search">
            <input
              type="search"
              placeholder="Search by name, role, or skill..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search mentors"
            />
          </div>

          {mentorsLoading && <p>Loading mentors...</p>}

          {mentorError && (
            <p role="alert">
              Could not load mentors. Please check the Supabase permissions
              and browser console.
            </p>
          )}

          {!mentorsLoading && !mentorError && (
            <div className="mentor-grid">
              {filteredMentors.map((mentor) => (
                <article
                  className="mentor-card"
                  key={`${mentor.isDemo ? 'demo' : 'registered'}-${mentor.id}`}
                >
                  {mentor.image ? (
                    <img
                      className="mentor-photo"
                      src={mentor.image}
                      alt={mentor.name}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="mentor-avatar-placeholder"
                      role="img"
                      aria-label={`No photo uploaded yet for ${mentor.name}`}
                    >
                      {mentor.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}

                  <div className="mentor-info">
                    <span className="mentor-tag">MENTOR</span>
                    <h3>{mentor.name}</h3>
                    <p className="mentor-role">{mentor.role}</p>
                    <p className="mentor-experience">{mentor.experience}</p>
                    <p className="mentor-skills">{mentor.skills}</p>

                    <a
                      className="profile-button"
                      href={`#mentor/${mentor.id}`}
                    >
                      View Profile <span>→</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!mentorsLoading && !mentorError && filteredMentors.length === 0 && (
            <p className="no-mentors">
              No mentors found. Try another name or skill.
            </p>
          )}
        </section>

        <section className="closing-section">
          <span className="section-label">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>Every great journey starts with guidance.</h2>
          <p>Discover what you can achieve with the right mentor.</p>
          <a className="primary-button" href="#mentor-directory">
            Explore Mentors <span>→</span>
          </a>
        </section>
      </main>

      <footer className="footer">
        <a className="logo footer-logo" href="#home">
          <span className="logo-icon">M</span>
          Mentor<span className="logo-highlight">Connect</span>
        </a>
        <p>Built for students. Powered by connection.</p>
        <span>© {new Date().getFullYear()} MentorConnect</span>
      </footer>
    </div>
  )
}

export default App