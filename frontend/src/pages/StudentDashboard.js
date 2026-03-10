import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ImmersiveLayout, FloatingCard, GlowButton,
  PageTransition, TeachingStage, StatusBadge, SectionHeader,
} from '../components/immersive';

const API_BASE = process.env.REACT_APP_API_URL || '';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [nextClass, setNextClass] = useState(null);
  const [avatarMood, setAvatarMood] = useState('happy');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Cycle avatar mood for liveliness
  useEffect(() => {
    const moods = ['happy', 'neutral', 'explaining', 'happy'];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % moods.length;
      setAvatarMood(moods[i]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/active`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const sessions = data.data || [];
        setLiveCount(sessions.filter(s => s.status === 'active').length);
        const scheduled = sessions.filter(s => s.status === 'scheduled' && s.scheduled_time)
          .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
        if (scheduled.length > 0) setNextClass(scheduled[0]);
        else if (sessions.filter(s => s.status === 'active').length > 0)
          setNextClass(sessions.find(s => s.status === 'active'));
      }
    } catch (e) {}
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (e) {}
  };

  const features = [
    { id: 'classes', title: 'My Classes', desc: 'View live, upcoming & completed sessions', icon: '📚', accent: '#a78bfa', path: '/student-classes', badge: liveCount > 0 ? `${liveCount} live` : null },
    { id: 'attendance', title: 'Attendance', desc: 'Check your attendance history & records', icon: '📋', accent: '#3b82f6', path: '/student-attendance', badge: null },
    { id: 'timetable', title: 'Timetable', desc: 'View your weekly class schedule', icon: '📅', accent: '#10b981', path: '/student-timetable', badge: null },
  ];

  const motivations = [
    { text: "Every expert was once a beginner. Keep learning!", emoji: "🚀" },
    { text: "Consistency beats intensity. One lesson at a time.", emoji: "🔥" },
    { text: "Senku is here to help you understand every concept.", emoji: "⭐" },
    { text: "Great things never come from comfort zones.", emoji: "💎" },
  ];
  const [motIdx] = useState(Math.floor(Math.random() * motivations.length));

  const formatCountdown = (dt) => {
    if (!dt) return '';
    const diff = new Date(dt).getTime() - Date.now();
    if (diff <= 0) return 'Starting soon';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  };

  return (
    <ImmersiveLayout showParticles showGrid>
      {/* ── Nav Bar ── */}
      <PageTransition type="fade" duration={400}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.2rem 2rem', maxWidth: 1000, margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
            }}>
              <i className="fas fa-brain" style={{ color: 'white', fontSize: '1rem' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.3px' }}>AI Tutor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 14px',
              border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                {(user?.username || 'S').charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                {user?.username || 'Student'}
              </span>
            </div>
            <GlowButton variant="ghost" size="sm" onClick={handleLogout}
              icon={<i className="fas fa-sign-out-alt" style={{ fontSize: '0.7rem' }} />}>
              Logout
            </GlowButton>
          </div>
        </div>
      </PageTransition>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 3rem' }}>
        {/* ── Center Stage: AI Teacher Greets Student ── */}
        <PageTransition type="scale" duration={700} delay={100}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2.5rem 0 1rem', position: 'relative',
          }}>
            <TeachingStage mood={avatarMood} size={140} accent="#60a5fa" statusText="your AI teacher" />

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div style={{
                fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600,
                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6,
              }}>
                {greeting}
              </div>
              <h1 style={{
                fontSize: '1.9rem', fontWeight: 800, margin: '0 0 8px',
                lineHeight: 1.2, letterSpacing: '-0.5px',
              }}>
                Hey,{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {user?.username || 'Student'}
                </span>!
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', margin: 0,
                maxWidth: 450, marginInline: 'auto', lineHeight: 1.6,
              }}>
                I'm <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Senku</strong>, your AI teacher.
                Ready to learn something amazing today?
              </p>
            </div>

            {/* Live / Next class alert */}
            {nextClass && (
              <div style={{ marginTop: 20 }}>
                {nextClass.status === 'active' ? (
                  <FloatingCard accent="#ef4444" style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <StatusBadge label="LIVE NOW" color="#ef4444" pulse size="sm" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                        {nextClass.session_name}
                      </span>
                      <GlowButton size="sm" accent="#ef4444"
                        onClick={() => navigate(`/study-session/${nextClass.id}`)}>
                        Join Class
                      </GlowButton>
                    </div>
                  </FloatingCard>
                ) : (
                  <FloatingCard accent="#3b82f6" style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1rem' }}>⏰</span>
                      <span style={{ fontSize: '0.84rem', color: '#93c5fd', fontWeight: 500 }}>
                        Next: <strong style={{ color: '#fff' }}>{nextClass.session_name}</strong> — {formatCountdown(nextClass.scheduled_time)}
                      </span>
                    </div>
                  </FloatingCard>
                )}
              </div>
            )}
          </div>
        </PageTransition>

        {/* ── Motivation ── */}
        <PageTransition type="fade-up" delay={400}>
          <div style={{
            background: 'rgba(251,191,36,0.05)', borderRadius: 14, padding: '12px 20px',
            border: '1px solid rgba(251,191,36,0.1)', margin: '8px 0 28px',
            display: 'flex', alignItems: 'center', gap: 12,
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ fontSize: '1.1rem' }}>{motivations[motIdx].emoji}</span>
            <span style={{
              fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.5, fontStyle: 'italic',
            }}>
              "{motivations[motIdx].text}"
            </span>
          </div>
        </PageTransition>

        {/* ── Feature Cards ── */}
        <PageTransition type="fade-up" delay={500}>
          <SectionHeader
            title="What would you like to do?"
            accent="#60a5fa"
            icon="🎯"
          />
        </PageTransition>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {features.map((f, i) => (
            <FloatingCard
              key={f.id}
              accent={f.accent}
              onClick={() => navigate(f.path)}
              delay={0.55 + i * 0.08}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${f.accent}12`,
                border: `1px solid ${f.accent}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', marginBottom: 14,
              }}>
                {f.icon}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>{f.title}</h3>
                {f.badge && (
                  <StatusBadge label={f.badge} color="#ef4444" pulse size="sm" />
                )}
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem',
                margin: 0, lineHeight: 1.5,
              }}>
                {f.desc}
              </p>

              <div style={{
                marginTop: 14, color: f.accent, fontSize: '0.75rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5, opacity: 0.7,
              }}>
                Open <i className="fas fa-arrow-right" style={{ fontSize: '0.6rem' }} />
              </div>
            </FloatingCard>
          ))}
        </div>

        {/* ── Quick Links ── */}
        <PageTransition type="fade-up" delay={800}>
          <div style={{
            display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {liveCount > 0 && (
              <GlowButton accent="#ef4444" pulse
                icon={<i className="fas fa-play" style={{ fontSize: '0.7rem' }} />}
                onClick={() => navigate('/student-classes')}>
                Join Live Class
              </GlowButton>
            )}
            <GlowButton variant="secondary" size="sm" accent="#a78bfa"
              onClick={() => navigate('/student-classes')}
              icon={<i className="fas fa-history" style={{ fontSize: '0.7rem' }} />}>
              Past Sessions
            </GlowButton>
          </div>
        </PageTransition>
      </div>
    </ImmersiveLayout>
  );
};

export default StudentDashboard;
