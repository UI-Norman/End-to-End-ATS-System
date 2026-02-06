import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Authentication pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected pages 
import RecruiterDashboard from './pages/RecruiterDashboard';
import CandidatesList from './pages/CandidatesList';
import CandidateDetail from './pages/CandidateDetail';
import CandidateForm from './pages/CandidateForm';
import JobsList from './pages/JobsList';
import JobForm from './pages/JobForm';  
import JobDetails from './pages/JobDetails';
import AssignmentsList from './pages/AssignmentsList';
import AlertsList from './pages/AlertsList';
import DocumentsList from './pages/DocumentsList';
import ExpensesList from './pages/ExpensesList';
import ExpenseForm from './pages/ExpenseForm';  
import ImportData from './pages/ImportData';
import MatchingDashboard from './pages/MatchingDashboard';

// Layout component
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* ═══════════════════════════════════════════════════ */}
          {/* PUBLIC ROUTES - Accessible without login */}
          {/* ═══════════════════════════════════════════════════ */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* ═══════════════════════════════════════════════════ */}
          {/* PROTECTED ROUTES - Require login */}
          {/* ═══════════════════════════════════════════════════ */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* DASHBOARD */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="dashboard" element={<RecruiterDashboard />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* CANDIDATES */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="candidates" element={<CandidatesList />} />
            <Route path="candidates/new" element={<CandidateForm />} />
            <Route path="candidates/:id" element={<CandidateDetail />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* JOBS */}
            {/* CRITICAL: /jobs/new MUST come BEFORE /jobs/:id */}
            {/* Otherwise "new" will be treated as an ID parameter */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="jobs" element={<JobsList />} />
            <Route path="jobs/new" element={<JobForm />} />  
            <Route path="jobs/:id" element={<JobDetails />} />  

            {/* ────────────────────────────────────────────────────── */}
            {/* ASSIGNMENTS */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="assignments" element={<AssignmentsList />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* ALERTS */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="alerts" element={<AlertsList />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* DOCUMENTS */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="documents" element={<DocumentsList />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* EXPENSES */}
            {/* CRITICAL: /expenses/new MUST come BEFORE /expenses/:id */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="expenses" element={<ExpensesList />} />
            <Route path="expenses/new" element={<ExpenseForm />} />  
            
            {/* ────────────────────────────────────────────────────── */}
            {/* MATCHING */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="matching" element={<MatchingDashboard />} />
            
            {/* ────────────────────────────────────────────────────── */}
            {/* IMPORT DATA */}
            {/* ────────────────────────────────────────────────────── */}
            <Route path="import" element={<ImportData />} />
          </Route>

          {/* ═══════════════════════════════════════════════════ */}
          {/* 404 - NOT FOUND */}
          {/* Any unmatched route redirects to dashboard */}
          {/* ═══════════════════════════════════════════════════ */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;