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
import AdminSubjects from './pages/admin/AdminSubjects';
import AdminNews from './pages/admin/News';
import AdminSettings from './pages/admin/Settings';
import AdminAnalytics from './pages/admin/Analytics';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentTests from './pages/student/Tests';
import StudentResults from './pages/student/Results';
import StudentLeaderboard from './pages/student/Leaderboard';
import StudentStudy from './pages/student/Study';
import StudentProfile from './pages/student/Profile';
import StudentNews from './pages/student/News';
import StudentAssignments from './pages/student/Assignments';
import StudentChat from './pages/student/Chat';
import StudentSubjects from './pages/student/Subjects';
import StudentAttendance from './pages/student/Attendance';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherTests from './pages/teacher/Tests';
import TeacherSubjects from './pages/teacher/Subjects';
import TeacherCreateTest from './pages/teacher/CreateTest';
import TeacherResults from './pages/teacher/Results';
import TeacherStudents from './pages/teacher/Students';
import TeacherStudentDetail from './pages/teacher/StudentDetail';
import TeacherProfile from './pages/teacher/Profile';
import TeacherNews from './pages/teacher/News';
import TeacherMarks from './pages/teacher/Marks';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherChat from './pages/teacher/Chat';
import TeacherStudyNotes from './pages/teacher/StudyNotes';
import TeacherLeaderboard from './pages/teacher/Leaderboard';
import TeacherAttendance from './pages/teacher/Attendance';

import HODDashboard from './pages/hod/Dashboard';
import HODTeachers from './pages/hod/Teachers';
import HODStudents from './pages/hod/Students';
import HODStudentDetail from './pages/hod/StudentDetail';
import HODSubjects from './pages/hod/Subjects';
import HODTests from './pages/hod/Tests';
import HODAnalytics from './pages/hod/Analytics';
import HODProfile from './pages/hod/Profile';
import HODNews from './pages/hod/News';
import HODExams from './pages/hod/Exams';
import HODChat from './pages/hod/Chat';
import HODStudyNotes from './pages/hod/StudyNotes';
import HODSemesterUpgrade from './pages/hod/SemesterUpgrade';
import HODLeaderboard from './pages/hod/Leaderboard';

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
                <Route path="subjects" element={<AdminSubjects />} />
                <Route path="news" element={<AdminNews />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              <Route path="/student" element={<ProtectedRoute><RoleRoute allowedRoles={['STUDENT']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<StudentDashboard />} />
                <Route path="tests" element={<StudentTests />} />
                <Route path="results" element={<StudentResults />} />
                <Route path="assignments" element={<StudentAssignments />} />
                <Route path="study" element={<StudentStudy />} />
                <Route path="subjects" element={<StudentSubjects />} />
                <Route path="chat" element={<StudentChat />} />
                <Route path="leaderboard" element={<StudentLeaderboard />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="news" element={<StudentNews />} />
                <Route path="attendance" element={<StudentAttendance />} />
              </Route>

              <Route path="/teacher" element={<ProtectedRoute><RoleRoute allowedRoles={['TEACHER']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<TeacherDashboard />} />
                <Route path="subjects" element={<TeacherSubjects />} />
            <Route path="tests" element={<TeacherTests />} />
                <Route path="tests/create" element={<TeacherCreateTest />} />
                <Route path="tests/:id" element={<Navigate to="/teacher/tests" replace />} />
                <Route path="leaderboard" element={<TeacherLeaderboard />} />
                <Route path="results" element={<TeacherResults />} />
                <Route path="marks" element={<TeacherMarks />} />
                <Route path="students" element={<TeacherStudents />} />
                <Route path="students/:id" element={<TeacherStudentDetail />} />
                <Route path="assignments" element={<TeacherAssignments />} />
                <Route path="study-notes" element={<TeacherStudyNotes />} />
                <Route path="chat" element={<TeacherChat />} />
                <Route path="news" element={<TeacherNews />} />
                <Route path="profile" element={<TeacherProfile />} />
                <Route path="attendance" element={<TeacherAttendance />} />
              </Route>

              <Route path="/hod" element={<ProtectedRoute><RoleRoute allowedRoles={['HOD']}><AppLayout /></RoleRoute></ProtectedRoute>}>
                <Route index element={<HODDashboard />} />
                <Route path="teachers" element={<HODTeachers />} />
                <Route path="students" element={<HODStudents />} />
                <Route path="students/:id" element={<HODStudentDetail />} />
                <Route path="semester-upgrade" element={<HODSemesterUpgrade />} />
                <Route path="subjects" element={<HODSubjects />} />
                <Route path="study-notes" element={<HODStudyNotes />} />
                <Route path="tests" element={<HODTests />} />
                <Route path="exams" element={<HODExams />} />
                <Route path="news" element={<HODNews />} />
                <Route path="leaderboard" element={<HODLeaderboard />} />
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
