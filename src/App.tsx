import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import DesignSystem from './pages/DesignSystem'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import VolunteerDashboard from './pages/dashboard/VolunteerDashboard'
import EventDiscovery from './pages/discovery/EventDiscovery'
import EventDetail from './pages/discovery/EventDetail'
import EventForm from './pages/ngo/EventForm'

type View = 'landing' | 'design' | 'login' | 'register' | 'verify' | 'dashboard' | 'discovery' | 'detail' | 'ngo-create'

function App() {
  const [view, setView] = useState<View>('landing')

  // Simple router simulation for development purposes
  const renderView = () => {
    switch (view) {
      case 'design': return <DesignSystem />;
      case 'login': return <Login />;
      case 'register': return <Register />;
      case 'verify': return <VerifyEmail />;
      case 'dashboard': return <VolunteerDashboard />;
      case 'discovery': return <EventDiscovery />;
      case 'detail': return <EventDetail />;
      case 'ngo-create': return <EventForm />;
      default: return <LandingPage />;
    }
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-wrap gap-2 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md p-2 rounded-xl shadow-2xl border border-slate-200 pointer-events-auto flex gap-2 overflow-auto max-w-[90vw]">
          <NavButton active={view === 'landing'} onClick={() => setView('landing')}>Landing</NavButton>
          <NavButton active={view === 'discovery'} onClick={() => setView('discovery')}>Discovery</NavButton>
          <NavButton active={view === 'detail'} onClick={() => setView('detail')}>Detail</NavButton>
          <NavButton active={view === 'ngo-create'} onClick={() => setView('ngo-create')}>NGO Create</NavButton>
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</NavButton>
          <NavButton active={view === 'login'} onClick={() => setView('login')}>Login</NavButton>
          <NavButton active={view === 'register'} onClick={() => setView('register')}>Register</NavButton>
          <NavButton active={view === 'verify'} onClick={() => setView('verify')}>Email Verify</NavButton>
          <NavButton active={view === 'design'} onClick={() => setView('design')}>UI System</NavButton>
        </div>
      </div>
      {renderView()}
    </>
  )
}

function NavButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active
          ? 'bg-hive-primary text-white shadow-sm'
          : 'bg-slate-50 text-hive-text-secondary hover:bg-slate-100'
        }`}
    >
      {children}
    </button>
  )
}

export default App
