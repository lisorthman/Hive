import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import VolunteerDashboard from './pages/dashboard/VolunteerDashboard'
import EventDiscovery from './pages/discovery/EventDiscovery'
import EventDetail from './pages/discovery/EventDetail'
import EventForm from './pages/ngo/EventForm'
import NGODashboard from './pages/ngo/NGODashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import AttendanceManagement from './pages/ngo/AttendanceManagement'
import CheckInConfirm from './pages/discovery/CheckInConfirm'
import Leaderboard from './pages/discovery/Leaderboard'
import ImpactResume from './pages/dashboard/ImpactResume'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyEmail />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
            <VolunteerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute allowedRoles={['volunteer', 'ngo', 'admin']}>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path="/resume" element={
          <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
            <ImpactResume />
          </ProtectedRoute>
        } />
        <Route path="/discovery" element={<EventDiscovery />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/ngo-create" element={
          <ProtectedRoute allowedRoles={['ngo', 'admin']}>
            <EventForm />
          </ProtectedRoute>
        } />
        <Route path="/ngo-edit/:id" element={
          <ProtectedRoute allowedRoles={['ngo', 'admin']}>
            <EventForm />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/ngo-dashboard" element={
          <ProtectedRoute allowedRoles={['ngo']}>
            <NGODashboard />
          </ProtectedRoute>
        } />
        <Route path="/ngo-attendance/:id" element={
          <ProtectedRoute allowedRoles={['ngo', 'admin']}>
            <AttendanceManagement />
          </ProtectedRoute>
        } />
        <Route path="/check-in/:id" element={
          <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
            <CheckInConfirm />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  )
}

export default App
