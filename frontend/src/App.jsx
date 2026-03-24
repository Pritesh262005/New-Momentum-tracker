import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import AppLayout from './components/common/AppLayout';

import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminNews from './pages/admin/News';
import AdminSettings from './pages/admin/Settings';
import AdminAnalytics from './pages/admin/Analytics';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentTests from './pages/student/Tests';
import StudentResults from './pages/student/Results';
import StudentLeaderboard from './pages/student/Leaderboard';
import StudentProfile from './pages/student/Profile';
import StudentNews from './pages/student/News';
import StudentAssignments from './pages/student/Assignments';
import StudentChat from './pages/student/Chat';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherTests from './pages/teacher/Tests';
import TeacherCreateTest from './pages/teacher/CreateTest';
import TeacherResults from './pages/teacher/Results';
import TeacherStudents from './pages/teacher/Students';
import TeacherProfile from './pages/teacher/Profile';
import TeacherNews from './pages/teacher/News';
import TeacherMarks from './pages/teacher/Marks';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherChat from './pages/teacher/Chat';

import HODDashboard from './pages/hod/Dashboard';
import HODTeachers from './pages/hod/Teachers';
import HODStudents from './pages/hod/Students';
import HODSubjects from './pages/hod/Subjects';
import HODTests from './pages/hod/Tests';
import HODAnalytics from './pages/hod/Analytics';
import HODProfile from './pages/hod/Profile';
import HODNews from './pages/hod/News';
import HODExams from './pages/hod/Exams';
import HODChat from './pages/hod/Chat';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/admin" element={<ProtectedRoute><RoleRoute allowedRoles={['ADMIN']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="departments" element={<AdminDepartments />} />
                <Route path="news" element={<AdminNews />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              <Route path="/student" element={<ProtectedRoute><RoleRoute allowedRoles={['STUDENT']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<StudentDashboard />} />
                <Route path="tests" element={<StudentTests />} />
                <Route path="results" element={<StudentResults />} />
                <Route path="assignments" element={<StudentAssignments />} />
                <Route path="chat" element={<StudentChat />} />
                <Route path="leaderboard" element={<StudentLeaderboard />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="news" element={<StudentNews />} />
              </Route>

              <Route path="/teacher" element={<ProtectedRoute><RoleRoute allowedRoles={['TEACHER']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<TeacherDashboard />} />
                <Route path="tests" element={<TeacherTests />} />
                <Route path="tests/create" element={<TeacherCreateTest />} />
                <Route path="tests/:id" element={<Navigate to="/teacher/tests" replace />} />
                <Route path="results" element={<TeacherResults />} />
                <Route path="marks" element={<TeacherMarks />} />
                <Route path="students" element={<TeacherStudents />} />
                <Route path="assignments" element={<TeacherAssignments />} />
                <Route path="chat" element={<TeacherChat />} />
                <Route path="news" element={<TeacherNews />} />
                <Route path="profile" element={<TeacherProfile />} />
              </Route>

              <Route path="/hod" element={<ProtectedRoute><RoleRoute allowedRoles={['HOD']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<HODDashboard />} />
                <Route path="teachers" element={<HODTeachers />} />
                <Route path="students" element={<HODStudents />} />
                <Route path="subjects" element={<HODSubjects />} />
                <Route path="tests" element={<HODTests />} />
                <Route path="exams" element={<HODExams />} />
                <Route path="news" element={<HODNews />} />
                <Route path="analytics" element={<HODAnalytics />} />
                <Route path="chat" element={<HODChat />} />
                <Route path="profile" element={<HODProfile />} />
              </Route>

              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
