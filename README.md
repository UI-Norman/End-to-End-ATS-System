# Travel Healthcare ATS

**Full-Stack Applicant Tracking & Staffing Management System for Travel Nursing & Allied Health**

- This is a Modern, recruiter-focused platform built to manage travel healthcare professionals (RNs, therapists, rad techs, respiratory therapists, etc.), open contracts, credential compliance, matching, alerts, expenses, and bulk onboarding.

## Project Overview

### Purpose
This system replaces spreadsheets, multiple CRMs, and manual follow-ups for a travel healthcare staffing agency.  
It centralizes:

- Candidate profiles & credential tracking
- Job orders & facility contracts
- Intelligent candidate–job matching
- Expense reimbursement tracking
- Bulk data import from legacy Excel/CSV files
- Recruiter-to-candidate email communication

### Core Target Users
- Internal recruiters
- Compliance / credentialing coordinators
- Agency owners / managers 

### Key Features
- Travel healthcare domain knowledge (13-week contracts, multi-state licensure etc)
- Multi-factor matching score (specialty match + location preference + pay alignment + license expiration buffer + experience)
- Full CSV/Excel import pipeline to onboard legacy data quickly

#### Candidate Management
- Full profile: name, contact, specialties, years of experience, preferred states, desired contract length, availability date
- Candidate status lifecycle: Lead → Active → Submitted → Placed → Inactive
- Linked credentials & documents with issue/expiry dates
- View active & historical assignments

#### Job / Assignment Management
- Job orders: specialty, facility, city/state, shift, contract weeks, pay package (weekly + stipends), start date, positions open
- Assignment lifecycle: Open → Submitted → Active → Completed / Cancelled
- Days remaining calculation & Alerts

#### Matching Engine
- Score based on:
  - Specialty match
  - State preference match
  - Pay rate alignment
  - Years of experience requirement
- Candidate, job, Assignments match views
- Creates "new match" alerts automatically

#### Credential & Document Compliance
- Track licenses, certifications (ACLS, PALS, BLS, NRP, TNCC, CPI) etc.
- Expiration-based alerts 
- Status: Valid , Expiring , Expired , Pending 

#### Alerts & Notifications
- Types:
  - Contract ending days
  - Credential/document expiring soon
  - New candidate added
- Email delivery 
- Unread/read tracking

#### Expense Tracking
- Categories: Travel, Medical, Relocation etc
- Status: Pending / Approved / Rejected
- Summary cards and list view with filters

#### Bulk Data Import
- Individual importers for:
  - Candidates 
  - Credentials
  - Jobs
  - Assignments
  - Documents 
  - Expenses
- Phone number normalization, date parsing, duplicate skipping

#### Authentication & Security
- Email and password login
- JWT access tokens
- Role: recruiter
- Password hashing (bcrypt)

## Technology Stack 

### Backend
- Python 3.10+
- FastAPI 
- SQLAlchemy 2.0 (ORM) and psycopg2
- PostgreSQL
- python-jose and passlib[bcrypt] (JWT & auth)
- APScheduler
- aiosmtplib or SendGrid
- pandas and openpyxl 

### Frontend
- React 18
- React Router v6
- Axios 
- lucide-react 
- Recharts
- Custom CSS 

## Folder Structure

### Backend

```
backend/
├── main.py                    
├── database.py                 
├── models.py                  
├── auth.py                    
├── auth_routes.py             
├── import_data.py             
├── run_import.py            
├── matching_engine.py         
├── scheduler.py               
├── email_notification_service.py  
├── utils.py                   
├── requirements.txt
├── .env
└── create_tables.py           
```

### Frontend

```
frontend/
├── public/
├── src/
│   ├── api.js                
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   ├── StatCard.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── Layout.jsx
│   ├── pages/
│   │   ├── RecruiterDashboard.jsx
│   │   ├── CandidatesList.jsx
│   │   ├── CandidatesList.css
│   │   ├── CandidateDetail.css
│   │   ├── CandidateDetail.jsx
│   │   ├── CandidateForm.jsx
│   │   ├── CandidateForm.css
│   │   ├── JobsList.jsx
│   │   ├── Jobs.css
│   │   ├── JobForm.jsx
│   │   ├── JobDetails.jsx
│   │   ├── JobDetails.css
│   │   ├── MatchingDashboard.jsx
│   │   ├── MatchingDashboard.css
│   │   ├── AlertsList.jsx
│   │   ├── Alerts.css
│   │   ├── Assignments.jsx
│   │   ├── Assignments.css
│   │   ├── DocumentsList.jsx
│   │   ├── Documents.css
│   │   ├── Dashboard.css
│   │   ├── ExpensesList.jsx
│   │   ├── Expenses.css
│   │   ├── EmailModal.jsx
│   │   ├── EmailModal.css
│   │   ├── ImportData.jsx
│   │   ├── ImportData.css
│   │   ├── Auth.css
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── utils/
│   │   ├── dateUtils.js
│   │   ├── formatUtils.js
│   │   └── validationUtils.js
│   ├── services/
│   │   └── authService.js
│   ├── App.jsx
│   ├── App.css
│   ├── index.js
│   └── index.css 
├── package.json
└── package-lock.json
```

## Setup & Installation

### Prerequisites
- Python 3.10+
- PostgreSQL 15/16
- Node.js 18+ / npm

### Backend Setup

1. Clone repo & go to backend folder
2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Create `.env` file (see `.env.example`)

5. Create database & run migrations

```bash
# Then run:
python create_tables.py
```

6. Import data

```bash
python run_import.py
```

### Frontend Setup

1. Go to frontend folder

```bash
cd frontend
npm install
```

2. Create `.env`

```env
REACT_APP_API_URL=http://localhost:8000
```

3. Start server

```bash
npm start
```

### Running both together

```bash
# Terminal 1 – Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 – Frontend
cd frontend
npm start
```

→ Open http://localhost:3000

## Default Credentials 

- Email: `purplecowadmin@gmail.com`
- Password: `purplecowadmin123`

## Important Notes

- Phone numbers are normalized → store in many formats
- Dates must be parseable (MM/DD/YYYY or YYYY-MM-DD)
- Email sending requires valid SMTP credentials (Gmail App Password recommended)
- CSV import but column names should match approximately
