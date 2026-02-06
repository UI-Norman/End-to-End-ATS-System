import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Users, Briefcase, Calendar, FileCheck, DollarSign, Award, Key } from 'lucide-react';
import { 
  importCandidates, 
  importJobs, 
  importAssignments, 
  // importCredentials,
  importDocuments, 
  importExpenses,
  getSampleFileUrl 
} from '../services/api';
import './ImportData.css';

const ImportData = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('candidates');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  // Configuration for each import type
  const importTypes = {
    candidates: {
      icon: <Users size={24} />,
      title: 'Candidates',
      description: 'Import candidate profiles and information',
      primaryKey: 'candidate_id',
      primaryKeyDescription: 'Unique identifier (auto-generated if not provided)',
      requiredColumns: ['first_name', 'last_name', 'email', 'primary_specialty'],
      optionalColumns: ['candidate_id', 'phone', 'years_experience', 'preferred_states', 'availability_date', 'desired_contract_weeks', 'candidate_status'],
      sampleFile: 'candidates',
      apiFunction: importCandidates,
      redirectPath: '/candidates',
      color: '#6366f1',
      notes: [
        'Email must be unique - duplicates will be skipped',
        'candidate_id will be auto-generated if not provided (format: CNDXXXXXXXXXXXX)',
        'preferred_states should be comma-separated (e.g., "CA,NY,TX")',
        'availability_date format: YYYY-MM-DD (e.g., 2026-03-15)',
        'candidate_status: active, inactive, or placed (default: active)'
      ]
    },
    jobs: {
      icon: <Briefcase size={24} />,
      title: 'Jobs',
      description: 'Import job postings and requirements',
      primaryKey: 'job_id',
      primaryKeyDescription: 'Unique identifier (auto-generated if not provided)',
      requiredColumns: ['specialty_required', 'facility', 'state'],
      optionalColumns: ['job_id', 'title', 'city', 'min_years_experience', 'contract_weeks', 'start_date', 'pay_rate_weekly', 'status'],
      sampleFile: 'jobs',
      apiFunction: importJobs,
      redirectPath: '/jobs',
      color: '#10b981',
      notes: [
        'job_id will be auto-generated if not provided (format: JOBXXXXXXXXXXXX)',
        'start_date format: YYYY-MM-DD (e.g., 2026-04-01)',
        'status: Open, Filled, or Closed (default: Open)',
        'state should be 2-letter code (e.g., CA, NY, TX)'
      ]
    },
    assignments: {
      icon: <Calendar size={24} />,
      title: 'Assignments',
      description: 'Import candidate assignments and placements',
      primaryKey: 'assignment_id',
      primaryKeyDescription: 'Unique identifier (auto-generated if not provided)',
      requiredColumns: ['candidate_id', 'job_id', 'start_date', 'end_date'],
      optionalColumns: ['assignment_id', 'status'],
      sampleFile: 'assignments',
      apiFunction: importAssignments,
      redirectPath: '/assignments',
      color: '#8b5cf6',
      notes: [
        'assignment_id will be auto-generated if not provided (format: ASGXXXXXXXXXXXX)',
        'candidate_id must exist in candidates table',
        'job_id must exist in jobs table',
        'start_date and end_date format: YYYY-MM-DD',
        'status: Active, Completed, or Cancelled (default: Active)'
      ]
    },
    documents: {
      icon: <FileCheck size={24} />,
      title: 'Documents',
      description: 'Import document records and metadata',
      primaryKey: 'document_id',
      primaryKeyDescription: 'Required unique identifier',
      requiredColumns: ['document_id', 'candidate_id', 'document_type', 'file_name'],
      optionalColumns: ['file_path', 'expiration_date', 'status', 'notes'],
      sampleFile: 'documents',
      apiFunction: importDocuments,
      redirectPath: '/documents',
      color: '#06b6d4',
      notes: [
        'document_id MUST be provided (format: DOCXXXXXXXXXXXX)',
        'candidate_id must exist in candidates table',
        'expiration_date format: YYYY-MM-DD',
        'status: pending, approved, rejected, or expired (default: pending)',
        'Common document_types: Resume, ID Card, Vaccination Record, Physical Exam'
      ]
    },
    expenses: {
      icon: <DollarSign size={24} />,
      title: 'Expenses',
      description: 'Import expense records and reimbursements',
      primaryKey: 'expense_id',
      primaryKeyDescription: 'Required unique identifier',
      requiredColumns: ['expense_id', 'expense_type', 'amount'],
      optionalColumns: ['candidate_id', 'assignment_id', 'description', 'status', 'submitted_at'],
      sampleFile: 'expenses',
      apiFunction: importExpenses,
      redirectPath: '/expenses',
      color: '#ec4899',
      notes: [
        'expense_id MUST be provided (format: EXPXXXXXXXXXXXX)',
        'amount should be numeric (e.g., 125.50)',
        'submitted_at format: YYYY-MM-DD',
        'status: Pending, Approved, Rejected, or Paid (default: Pending)',
        'Common expense_types: Travel, Lodging, Meals, Licensure, Equipment'
      ]
    }
  };

  const currentType = importTypes[activeTab];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setSelectedFile(file);
        setResult(null);
      } else {
        alert('Please select a CSV or Excel file');
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const response = await currentType.apiFunction(selectedFile);
      setResult(response.data);
      setSelectedFile(null);
    } catch (error) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [error.response?.data?.detail || 'Import failed']
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = () => {
    const url = getSampleFileUrl(currentType.sampleFile);
    window.open(url, '_blank');
  };

  const handleViewResults = () => {
    navigate(currentType.redirectPath);
  };

  return (
    <div className="import-page">
      <div className="page-header">
        <h1><Upload size={28} /> Import Data</h1>
        <p className="page-subtitle">Import data from CSV or Excel files</p>
      </div>

      {/* Type Selection Tabs */}
      <div className="import-type-tabs">
        {Object.entries(importTypes).map(([key, type]) => (
          <button
            key={key}
            className={`import-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(key);
              setSelectedFile(null);
              setResult(null);
            }}
            style={activeTab === key ? { borderBottomColor: type.color } : {}}
          >
            <span className="tab-icon" style={activeTab === key ? { color: type.color } : {}}>
              {type.icon}
            </span>
            <span>{type.title}</span>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="instructions-card">
        <div className="instructions-header">
          <div style={{ color: currentType.color }}>
            {currentType.icon}
          </div>
          <div>
            <h2>{currentType.title}</h2>
            <p>{currentType.description}</p>
          </div>
        </div>

        {/* PRIMARY KEY SECTION */}
        <div className="primary-key-section">
          <h3>
            <Key size={18} style={{ color: currentType.color }} />
            Primary Key Information
          </h3>
          <div className="key-info">
            <div className="key-name">
              <strong>Primary Key Column:</strong> <code>{currentType.primaryKey}</code>
            </div>
            <div className="key-description">
              {currentType.primaryKeyDescription}
            </div>
          </div>
        </div>

        <div className="requirements-section">
          <h3><FileText size={18} /> File Requirements</h3>
          <div className="requirements-list">
            <div className="requirement-item">
              <CheckCircle size={18} color="#10b981" />
              <span>File format: CSV (.csv) or Excel (.xlsx, .xls)</span>
            </div>
            <div className="requirement-item">
              <CheckCircle size={18} color="#10b981" />
              <span>Required columns: <strong>{currentType.requiredColumns.join(', ')}</strong></span>
            </div>
            {currentType.optionalColumns.length > 0 && (
              <div className="requirement-item">
                <CheckCircle size={18} color="#10b981" />
                <span>Optional columns: {currentType.optionalColumns.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* IMPORTANT NOTES SECTION */}
        {currentType.notes && currentType.notes.length > 0 && (
          <div className="notes-section">
            <h3><AlertCircle size={18} /> Important Notes</h3>
            <ul className="notes-list">
              {currentType.notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="sample-files">
          <h3>Sample Template</h3>
          <p>Download the sample file to see the expected format:</p>
          <button onClick={handleDownloadSample} className="btn-download" style={{ borderColor: currentType.color }}>
            <Download size={18} />
            Download {currentType.title} Template
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-area" style={{ borderColor: selectedFile ? currentType.color : '#e2e8f0' }}>
            <div style={{ color: currentType.color }}>
              <Upload size={48} />
            </div>
            <h3>Select File to Import</h3>
            <p>Drag and drop or click to browse</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="file-input"
              id="file-input"
            />
            <label htmlFor="file-input" className="file-label" style={{ background: currentType.color }}>
              Choose File
            </label>
          </div>

          {selectedFile && (
            <div className="selected-file" style={{ borderLeftColor: currentType.color }}>
              <FileText size={24} style={{ color: currentType.color }} />
              <div className="file-info">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="btn-remove"
              >
                Remove
              </button>
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-import"
              style={{ background: currentType.color }}
            >
              {importing ? (
                <>
                  <div className="spinner-small"></div>
                  Importing {currentType.title}...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import {currentType.title}
                </>
              )}
            </button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className={`result-card ${result.errors && result.errors.length > 0 ? 'has-errors' : 'success'}`}>
            <div className="result-header">
              {(!result.errors || result.errors.length === 0) ? (
                <>
                  <CheckCircle size={48} color="#10b981" />
                  <h2>Import Successful!</h2>
                  <p>{result.imported} {currentType.title.toLowerCase()} imported successfully</p>
                </>
              ) : (
                <>
                  <AlertCircle size={48} color="#f59e0b" />
                  <h2>Import Completed with Warnings</h2>
                  <p>Some items could not be imported</p>
                </>
              )}
            </div>

            <div className="result-stats">
              <div className="stat-item stat-success">
                <span className="stat-value">{result.imported}</span>
                <span className="stat-label">Imported</span>
              </div>
              <div className="stat-item stat-skipped">
                <span className="stat-value">{result.skipped}</span>
                <span className="stat-label">Skipped</span>
              </div>
              <div className="stat-item stat-errors">
                <span className="stat-value">{result.errors ? result.errors.length : 0}</span>
                <span className="stat-label">Errors</span>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="errors-list">
                <h3>Error Details:</h3>
                <div className="errors-container">
                  {result.errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="error-item">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="error-item">
                      <AlertCircle size={16} />
                      <span>... and {result.errors.length - 10} more errors</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="result-actions">
              <button
                onClick={handleViewResults}
                className="btn-view-results"
                style={{ background: currentType.color }}
              >
                View {currentType.title}
              </button>
              <button
                onClick={() => setResult(null)}
                className="btn-import-another"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportData;