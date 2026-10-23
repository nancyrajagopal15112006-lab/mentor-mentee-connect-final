
import { useState } from 'react'
import './App.css'
import { supabase } from './supabase.js'

function MentorProfile({ mentor }) {
  const [sessionDate, setSessionDate] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  if (!mentor) {
    return (
      <main className="profile-page">
        <h1>Mentor not found</h1>
        <a className="primary-button" href="#mentor-directory">
          Back to Mentors
        </a>
      </main>
    )
  }

  async function handleBooking(event) {
    event.preventDefault()
    setNotice('')

    if (mentor.isDemo) {
      setNotice(
        'This is a demo profile. Please choose a registered mentor to request a real session.'
      )
      return
    }

    setLoading(true)

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError

      if (!userData.user) {
        setNotice('Please log in as a mentee before requesting a session.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userData.user.id)
        .single()

      if (profileError) throw profileError

      if (profile.role !== 'mentee') {
        setNotice('Only mentee accounts can request a session.')
        return
      }

      const chosenDate = new Date(sessionDate)

      if (
        !sessionDate ||
        Number.isNaN(chosenDate.getTime()) ||
        chosenDate <= new Date()
      ) {
        setNotice('Please choose a future date and time.')
        return
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          mentee_id: userData.user.id,
          mentor_id: mentor.id,
          demo_mentor_id: null,
          session_date: chosenDate.toISOString(),
          message: message.trim(),
          status: 'pending',
        })

      if (bookingError) throw bookingError

      setNotice(`Your request to ${mentor.name} was sent successfully!`)
      setSessionDate('')
      setMessage('')
    } catch (error) {
      console.error('Booking failed:', error)
      setNotice(`Booking failed: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="profile-page">
      <a className="back-link" href="#mentor-directory">
        ← Back to Mentors
      </a>

      <section className="profile-card">
        <img
          className="profile-photo"
          src={mentor.image}
          alt={mentor.name}
        />

        <div className="profile-details">
          <span className="mentor-tag">MENTOR PROFILE</span>
          <h1>{mentor.name}</h1>
          <p className="profile-role">{mentor.role}</p>

          <div className="profile-detail-item">
            <h3>Experience</h3>
            <p>{mentor.experience}</p>
          </div>

          <div className="profile-detail-item">
            <h3>Skills</h3>
            <p>{mentor.skills || 'Not specified'}</p>
          </div>

          <div className="profile-detail-item">
            <h3>About this mentor</h3>
            <p>
              {mentor.bio ||
                `Learn from ${mentor.name}, explore practical skills, and get guidance for your career journey.`}
            </p>
          </div>

          {mentor.isDemo ? (
            <div className="booking-form">
              <h2>Demo Mentor Profile</h2>
              <p>
                This is a sample profile for demonstration. To request a real
                mentoring session, choose a registered mentor.
              </p>
              <a className="primary-button" href="#mentor-directory">
                Explore Mentors
              </a>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="booking-form">
              <h2>Request a mentoring session</h2>

              <label htmlFor="session-date">Choose date and time</label>
              <input
                id="session-date"
                type="datetime-local"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
                min={new Date(Date.now() + 60000)
                  .toISOString()
                  .slice(0, 16)}
                required
              />

              <label htmlFor="booking-message">
                Message to mentor (optional)
              </label>
              <textarea
                id="booking-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What would you like help with?"
                rows={4}
                maxLength={1000}
              />

              {notice && <p role="status">{notice}</p>}

              <button type="submit" disabled={loading}>
                {loading ? 'Sending request...' : 'Request Session'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default MentorProfile
