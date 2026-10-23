import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import './MenteeDashboard.css'

function MenteeDashboard({ user, onLogout }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadBookings() {
      setLoading(true)
      setError('')

      const { data, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          session_date,
          message,
          status,
          mentor_id,
          demo_mentor_id
        `)
        .eq('mentee_id', user.id)
        .order('session_date', { ascending: false })

      if (!active) return

      if (bookingError) {
        setError(bookingError.message)
        setLoading(false)
        return
      }

      const rows = data || []
      const mentorIds = [...new Set(rows.map((b) => b.mentor_id).filter(Boolean))]
      const demoIds = [...new Set(rows.map((b) => b.demo_mentor_id).filter(Boolean))]

      let names = {}

      if (mentorIds.length) {
        const { data: mentors } = await supabase
          .from('mentors')
          .select('id, name')
          .in('id', mentorIds)

        ;(mentors || []).forEach((m) => {
          names[m.id] = m.name || 'Mentor'
        })
      }

      if (demoIds.length) {
        const { data: demos } = await supabase
          .from('demo_mentors')
          .select('id, name')
          .in('id', demoIds)

        ;(demos || []).forEach((m) => {
          names[m.id] = m.name || 'Mentor'
        })
      }

      if (active) {
        setBookings(rows.map((b) => ({
          ...b,
          mentorName: names[b.mentor_id || b.demo_mentor_id] || 'Mentor',
        })))
        setLoading(false)
      }
    }

    loadBookings()

    return () => {
      active = false
    }
  }, [user.id])

  return (
    <main className="mentee-dashboard">
      <header className="mentee-header">
        <a className="logo" href="#home">
          <span className="logo-icon">M</span>
          Mentor<span className="logo-highlight">Connect</span>
        </a>
        <button type="button" onClick={onLogout}>Log Out</button>
      </header>

      <section className="mentee-content">
        <p className="section-label">YOUR LEARNING JOURNEY</p>
        <h1>My Bookings</h1>
        <div className="booking-stats">
  <div className="booking-stat">
    <h3>Total Requests</h3>
    <p>{bookings.length}</p>
  </div>

  <div className="booking-stat">
    <h3>Accepted</h3>
    <p>{bookings.filter((b) => b.status === 'accepted').length}</p>
  </div>

  <div className="booking-stat">
    <h3>Rejected</h3>
    <p>{bookings.filter((b) => b.status === 'declined').length}</p>
  </div>

  <div className="booking-stat">
    <h3>Pending</h3>
    <p>{bookings.filter((b) => b.status === 'pending').length}</p>
  </div>
</div>
        <p>Track your mentor session requests and their latest status.</p>

        {loading && <p>Loading your bookings...</p>}

        {error && (
          <p role="alert">Could not load bookings: {error}</p>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="mentee-empty">
            <h2>No bookings yet</h2>
            <p>Explore the mentor directory to request your first session.</p>
            <a className="primary-button" href="#mentor-directory">
              Explore Mentors →
            </a>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="mentee-booking-list">
            {bookings.map((booking) => (
              <article className="mentee-booking-card" key={booking.id}>
                <div>
                  <h2>{booking.mentorName}</h2>
                  <p>
                    Session: {booking.session_date
                      ? new Date(booking.session_date).toLocaleString()
                      : 'Not scheduled'}
                  </p>
                  {booking.message && <p>Message: {booking.message}</p>}
                </div>

                <span className={`booking-status status-${booking.status}`}>
                  {booking.status?.charAt(0).toUpperCase() +
                    booking.status?.slice(1)}
                </span>
              </article>
            ))}
            <button type="button" onClick={() => window.location.reload()}>
              Refresh bookings
            </button>
          </div>
        )}

        <a className="mentee-back-link" href="#mentor-directory">
          ← Back to mentors
        </a>
      </section>
    </main>
  )
}

export default MenteeDashboard