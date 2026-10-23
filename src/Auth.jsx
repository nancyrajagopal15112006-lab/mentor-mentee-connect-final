
import { useState } from 'react'
import { supabase } from './supabase.js'
import './Auth.css'

export default function Auth({ onLogin }) {
  const [isSignup, setIsSignup] = useState(true)
  const [role, setRole] = useState('mentee')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState('')
  const [experience, setExperience] = useState('0')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

 
async function saveMentorProfile(user) {
  const details = user.user_metadata || {}

  if (details.role !== 'mentor') return

  const { error } = await supabase
    .from('mentors')
    .upsert({
      id: user.id,
      name: details.full_name || '',
      job_title: details.job_title || '',
      bio: details.bio || '',
      skills: Array.isArray(details.skills)
        ? details.skills
        : [],
      experience_years: Number(details.experience_years || 0),
    })

  if (error) throw error
}


  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (isSignup) {
        if (!name.trim()) {
          throw new Error('Please enter your full name.')
        }

        if (role === 'mentor') {
          if (!jobTitle.trim()) {
            throw new Error('Please enter your job title.')
          }

          if (!skills.trim()) {
            throw new Error('Please enter your skills.')
          }

          if (!bio.trim()) {
            throw new Error('Please tell us about yourself.')
          }
        }

        const mentorSkills = skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role,
              job_title: role === 'mentor' ? jobTitle.trim() : '',
              bio: role === 'mentor' ? bio.trim() : '',
              skills: role === 'mentor' ? mentorSkills : [],
              experience_years:
                role === 'mentor' ? Number(experience) : 0,
            },
          },
        })

        if (error) throw error

        if (data.session && data.user) {
          await saveMentorProfile(data.user)
          onLogin(data.user)
        } else {
          setMessage(
            'Account created! Confirm your email, then log in with the same email and password to finish setting up your profile.'
          )
          setIsSignup(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error

        // Create or update the mentor record when the mentor logs in.
        await saveMentorProfile(data.user)

        onLogin(data.user)
      }
    } catch (error) {
      setMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>

        <p>
          {isSignup
            ? 'Join MentorConnect and start your journey.'
            : 'Log in to your MentorConnect account.'}
        </p>

        {isSignup && (
          <>
            <label>
              I want to join as
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="mentee">Mentee — Find a mentor</option>
                <option value="mentor">Mentor — Guide students</option>
              </select>
            </label>

            <label>
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </label>

            {role === 'mentor' && (
              <>
                <label>
                  Job title
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Developer"
                    required
                  />
                </label>

                <label>
                  Years of experience
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Skills (separate with commas)
                  <input
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, JavaScript, SQL"
                    required
                  />
                </label>

                <label>
                  About you
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your experience and how you can guide students."
                    rows={4}
                    required
                  />
                </label>
              </>
            )}
          </>
        )}

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </label>

        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : isSignup
              ? role === 'mentor'
                ? 'Register as Mentor'
                : 'Create Account'
              : 'Log In'}
        </button>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to MentorConnect?'}{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setIsSignup(!isSignup)
              setMessage('')
            }}
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </form>
    </main>
  )
}
