
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import './MentorDashboard.css'

export default function MentorDashboard({ user, mentor, onLogout }) {
  const [section, setSection] = useState('overview')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState('')
  const [notice, setNotice] = useState('')

  const loadBookings = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')

    try {
      const { data, error: bookingError } = await supabase
        .from('bookings')
        .select('id, mentee_id, session_date, message, status, created_at')
        .eq('mentor_id', user.id)
        .order('session_date', { ascending: true })

      if (bookingError) throw bookingError

      const rows = data || []
      const menteeIds = [...new Set(rows.map((item) => item.mentee_id))]

      let names = {}

      if (menteeIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', menteeIds)

        if (profileError) throw profileError

        names = Object.fromEntries(
          (profiles || []).map((profile) => [
            profile.id,
            profile.full_name,
          ])
        )
      }

      setBookings(
        rows.map((item) => ({
          ...item,
          menteeName: names[item.mentee_id] || 'Mentee',
        }))
      )
    } catch (err) {
      setError(err.message || 'Could not load booking requests.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  async function respondToBooking(bookingId, status) {
    setActionId(bookingId)
    setNotice('')
    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .eq('mentor_id', user.id)
        .eq('status', 'pending')
        .select('id')

      if (updateError) throw updateError

      if (!data?.length) {
        throw new Error(
          'The request was not updated. It may already have changed, or your account may not have permission.'
        )
      }

      setNotice(
        status === 'accepted'
          ? 'Session request accepted.'
          : 'Session request declined.'
      )

      await loadBookings()
    } catch (err) {
      setError(err.message || 'Could not update the request.')
    } finally {
      setActionId('')
    }
  }

  const pending = bookings.filter((b) => b.status === 'pending').length
  const accepted = bookings.filter((b) => b.status === 'accepted').length
  const declined = bookings.filter((b) => b.status === 'declined').length

  const visibleBookings =
    section === 'requests'
      ? bookings.filter((b) => b.status === 'pending')
      : section === 'sessions'
        ? bookings.filter((b) => b.status === 'accepted')
        : bookings

  const displayName = mentor?.name || user?.email || 'Mentor'

  return (
    <div className="md-shell">
      <aside className="md-sidebar">
        <a className="md-brand" href="#home">
          <span className="md-brand-icon">M</span>
          <span>Mentor<span>Connect</span></span>
        </a>

        <div className="md-sidebar-label">WORKSPACE</div>

        <nav className="md-nav">
          <button
            className={section === 'overview' ? 'active' : ''}
            onClick={() => setSection('overview')}
          >
            <span>▦</span> Overview
          </button>
          <button
            className={section === 'requests' ? 'active' : ''}
            onClick={() => setSection('requests')}
          >
            <span>✉</span> Booking requests
            {pending > 0 && <b className="md-count">{pending}</b>}
          </button>
          <button
            className={section === 'sessions' ? 'active' : ''}
            onClick={() => setSection('sessions')}
          >
            <span>▣</span> Accepted sessions
          </button>
          <button
            className={section === 'profile' ? 'active' : ''}
            onClick={() => setSection('profile')}
          >
            <span>◎</span> My profile
          </button>
        </nav>

        <div className="md-sidebar-bottom">
          <div className="md-help-card">
            <span className="md-help-icon">✦</span>
            <strong>Make an impact</strong>
            <p>Share your experience. Help someone grow.</p>
          </div>
          <a className="md-home-link" href="#home">← View website</a>
          <button className="md-logout" onClick={onLogout}>
            ↪ Log out
          </button>
        </div>
      </aside>

      <main className="md-main">
        <header className="md-topbar">
          <div>
            <span className="md-eyebrow">MENTOR WORKSPACE</span>
            <p>Your place to guide the next generation.</p>
          </div>
          <div className="md-account">
            <div className="md-avatar">
              {String(displayName).trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{displayName}</strong>
              <span>Mentor account</span>
            </div>
          </div>
        </header>

        <div className="md-content">
          {section === 'overview' && (
            <>
              <div className="md-welcome">
                <div>
                  <span className="md-eyebrow">YOUR DASHBOARD</span>
                  <h1>Welcome back, {displayName.split(' ')[0]} 👋</h1>
                  <p>Here's what's happening with your mentoring.</p>
                </div>
                <button className="md-refresh" onClick={loadBookings}>
                  ↻ Refresh data
                </button>
              </div>

              <div className="md-stat-grid">
                <article className="md-stat-card">
                  <span className="md-stat-icon blue">✉</span>
                  <span className="md-stat-label">Total requests</span>
                  <strong>{bookings.length}</strong>
                  <small>All booking requests</small>
                </article>
                <article className="md-stat-card">
                  <span className="md-stat-icon amber">◷</span>
                  <span className="md-stat-label">Awaiting response</span>
                  <strong>{pending}</strong>
                  <small>Need your attention</small>
                </article>
                <article className="md-stat-card">
                  <span className="md-stat-icon green">✓</span>
                  <span className="md-stat-label">Accepted sessions</span>
                  <strong>{accepted}</strong>
                  <small>Confirmed requests</small>
                </article>
                <article className="md-stat-card">
                  <span className="md-stat-icon rose">—</span>
                  <span className="md-stat-label">Declined</span>
                  <strong>{declined}</strong>
                  <small>Declined requests</small>
                </article>
              </div>

              <section className="md-panel">
                <div className="md-panel-heading">
                  <div>
                    <h2>Recent booking requests</h2>
                    <p>Review requests from students.</p>
                  </div>
                  <button
                    className="md-text-button"
                    onClick={() => setSection('requests')}
                  >
                    View pending →
                  </button>
                </div>
                <BookingTable
                  bookings={bookings.slice(0, 5)}
                  loading={loading}
                  error={error}
                  actionId={actionId}
                  onRespond={respondToBooking}
                />
              </section>

              <section className="md-profile-banner">
                <div className="md-profile-symbol">◎</div>
                <div>
                  <h2>Your expertise can change a career.</h2>
                  <p>
                    {mentor?.jobTitle || 'Add your professional details'} 
                    {mentor?.skills?.length
                      ? ` · ${mentor.skills.join(', ')}`
                      : ''}
                  </p>
                </div>
                <button onClick={() => setSection('profile')}>
                  View profile →
                </button>
              </section>
            </>
          )}

          {section === 'requests' && (
            <section className="md-panel">
              <div className="md-panel-heading">
                <div>
                  <span className="md-eyebrow">INBOX</span>
                  <h1>Booking requests</h1>
                  <p>Accept or decline pending session requests.</p>
                </div>
                <button className="md-refresh" onClick={loadBookings}>
                  ↻ Refresh
                </button>
              </div>
              <BookingTable
                bookings={visibleBookings}
                loading={loading}
                error={error}
                actionId={actionId}
                onRespond={respondToBooking}
              />
            </section>
          )}

          {section === 'sessions' && (
            <section className="md-panel">
              <div className="md-panel-heading">
                <div>
                  <span className="md-eyebrow">YOUR SCHEDULE</span>
                  <h1>Accepted sessions</h1>
                  <p>Review the requests you've accepted.</p>
                </div>
                <button className="md-refresh" onClick={loadBookings}>
                  ↻ Refresh
                </button>
              </div>
              <BookingTable
                bookings={visibleBookings}
                loading={loading}
                error={error}
                actionId={actionId}
                onRespond={respondToBooking}
              />
            </section>
          )}

          {section === 'profile' && (
            <section className="md-panel md-profile-panel">
              <span className="md-eyebrow">YOUR PROFESSIONAL IDENTITY</span>
              <h1>My mentor profile</h1>
              <p className="md-muted">
                These details are loaded from your Supabase mentor profile.
              </p>

              <div className="md-profile-header">
                <div className="md-profile-avatar">
                  {String(displayName).trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2>{displayName}</h2>
                  <p>{mentor?.jobTitle || 'Job title not added'}</p>
                </div>
              </div>

              <div className="md-profile-fields">
                <div>
                  <span>Email</span>
                  <strong>{user?.email || '—'}</strong>
                </div>
                <div>
                  <span>Years of experience</span>
                  <strong>{mentor?.experience ?? 0} years</strong>
                </div>
                <div>
                  <span>Skills</span>
                  <strong>
                    {mentor?.skills?.length
                      ? mentor.skills.join(', ')
                      : 'No skills added'}
                  </strong>
                </div>
                <div className="md-bio-field">
                  <span>About me</span>
                  <p>{mentor?.bio || 'No biography added yet.'}</p>
                </div>
              </div>

              <p className="md-muted">
                Profile editing and photo uploads can be added next.
              </p>
            </section>
          )}

          {notice && <p className="md-notice" role="status">{notice}</p>}
        </div>
      </main>
    </div>
  )
}

function BookingTable({ bookings, loading, error, actionId, onRespond }) {
  if (loading) return <p className="md-state">Loading booking requests...</p>

  if (error) {
    return (
      <div className="md-error" role="alert">
        <strong>Could not load requests</strong>
        <p>{error}</p>
      </div>
    )
  }

  if (!bookings.length) {
    return (
      <div className="md-empty">
        <span>✉</span>
        <strong>No booking requests yet</strong>
        <p>New requests assigned to your mentor account will appear here.</p>
      </div>
    )
  }

  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th>Mentee</th>
            <th>Session date</th>
            <th>Message</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>
                <strong>{booking.menteeName}</strong>
              </td>
              <td>
                {new Date(booking.session_date).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </td>
              <td className="md-message-cell">
                {booking.message || 'No message provided'}
              </td>
              <td>
                <span className={`md-status ${booking.status}`}>
                  {booking.status}
                </span>
              </td>
              <td>
                {booking.status === 'pending' ? (
                  <div className="md-actions">
                    <button
                      className="md-accept"
                      disabled={actionId === booking.id}
                      onClick={() => onRespond(booking.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="md-decline"
                      disabled={actionId === booking.id}
                      onClick={() => onRespond(booking.id, 'declined')}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className="md-muted">No action</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
