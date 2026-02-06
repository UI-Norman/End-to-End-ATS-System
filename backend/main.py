from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import pandas as pd
import io
from datetime import datetime, date, timedelta
from scheduler import start_scheduler
from database import get_db, init_db
from models import Candidate, Job, Assignment, Credential, Document, Expense, Alert
from matching_engine import MatchingEngine
from import_data import (
    import_candidates_from_file,
    import_credentials_from_file,
    import_jobs_from_file,
    import_assignments_from_file,
    import_documents_from_file,
    import_expenses_from_file
)
from auth_routes import router as auth_router
from auth_routes import router as auth_router
import json
import os
import tempfile
import uuid
from pydantic import BaseModel, EmailStr
from typing import Optional
from auth import get_current_user
from models import Job, Assignment
import shutil
from pathlib import Path
from fastapi import Form, UploadFile, File
app = FastAPI(title="Travel Healthcare ATS")
from models import User
from auth import get_password_hash
from sqlalchemy.orm import Session
from database import SessionLocal
def create_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "purplecowadmin@gmail.com").first()
        if existing:
            print("Default admin already exists — skipping creation")
            return
       
        admin = User(
            user_id=f"USR-ADMIN-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
            email="purplecowadmin@gmail.com",
            hashed_password=get_password_hash("purplecowadmin123"),
            first_name="PurpleCow",
            last_name="Admin",
            role="admin",
            is_active=True
        )
       
        db.add(admin)
        db.commit()
        print("✅ Default admin user created successfully!")
        print(" Email : purplecowadmin@gmail.com")
        print(" Password : purplecowadmin123")
       
    except Exception as e:
        db.rollback()
        print(f"Error creating default admin: {e}")
    finally:
        db.close()
create_default_admin()
app.include_router(auth_router)
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
ENDING_SOON_DAYS = 30
# ────────────────────────────────────────────────
# PYDANTIC MODELS FOR REQUEST/RESPONSE
# ────────────────────────────────────────────────
class CandidateCreate(BaseModel):
    """Request model for creating candidates"""
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    primary_specialty: str
    years_experience: Optional[int] = None
    preferred_states: Optional[List[str]] = []
    availability_date: Optional[str] = None
    desired_contract_weeks: Optional[int] = 13
    candidate_status: str = "active"
class JobCreate(BaseModel):
    """Request model for creating jobs"""
    title: Optional[str] = None
    specialty_required: str
    facility: str
    facility_type: Optional[str] = None
    city: str
    state: str
    zip_code: Optional[str] = None
    shift_type: Optional[str] = None
    shift_length: Optional[str] = None
    schedule: Optional[str] = None
    floating_required: Optional[bool] = False
    call_required: Optional[bool] = False
    min_years_experience: Optional[int] = 0
    required_certifications: Optional[List[str]] = []
    required_licenses: Optional[List[str]] = []
    special_requirements: Optional[str] = None
    contract_weeks: int
    start_date: Optional[str] = None
    extension_possible: Optional[bool] = False
    positions_available: Optional[int] = 1
    pay_rate_weekly: Optional[float] = None
    pay_rate_hourly: Optional[float] = None
    overtime_rate: Optional[float] = None
    housing_stipend: Optional[float] = None
    per_diem_daily: Optional[float] = None
    travel_reimbursement: Optional[float] = None
    sign_on_bonus: Optional[float] = None
    completion_bonus: Optional[float] = None
    benefits: Optional[List[str]] = []
    unit_details: Optional[str] = None
    patient_ratio: Optional[str] = None
    parking: Optional[str] = None
    scrub_color: Optional[str] = None
    facility_rating: Optional[float] = None
    status: str = "open"
    urgency_level: str = "normal"
@app.on_event("startup")
def on_startup():
    init_db()
    start_scheduler()
# Dashboard Stats
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
   
    total_candidates = db.query(Candidate).count()
    # Use candidate_status
    active_candidates = db.query(Candidate).filter(
        Candidate.candidate_status.ilike("active")
    ).count()
   
    total_jobs = db.query(Job).count()
    open_jobs = db.query(Job).filter(
        Job.status.ilike("open")
    ).count()
   
    total_assignments = db.query(Assignment).count()
    active_assignments = db.query(Assignment).filter(
        Assignment.status.ilike("active")
    ).count()
    completed_assignments = db.query(Assignment).filter(
        Assignment.status.ilike("completed")
    ).count()
   
    today = date.today()
    threshold_date = today + timedelta(days=ENDING_SOON_DAYS)
    ending_soon = db.query(Assignment).filter(
        Assignment.status.ilike("active"),
        Assignment.end_date.isnot(None),
        Assignment.end_date > today, 
        Assignment.end_date <= threshold_date
    ).count()
   
    unread_alerts = db.query(Alert).filter(Alert.is_read == False).count()
   
    return {
        "candidates": {
            "total": total_candidates,
            "active": active_candidates,
        },
        "jobs": {
            "total": total_jobs,
            "open": open_jobs,
        },
        "assignments": {
            "total": total_assignments,
            "active": active_assignments,
            "completed": completed_assignments,
            "ending_soon": ending_soon,
            "ending_soon_days": ENDING_SOON_DAYS,
        },
        "alerts": {
            "unread": unread_alerts,
        }
    }
@app.get("/api/candidates")
def get_candidates(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    specialty: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get candidates with optional filters"""
    query = db.query(Candidate)
   
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Candidate.first_name.ilike(search_term)) |
            (Candidate.last_name.ilike(search_term)) |
            (Candidate.email.ilike(search_term)) |
            (Candidate.primary_specialty.ilike(search_term))
        )
    if status:
        query = query.filter(Candidate.candidate_status.ilike(status))
   
    if specialty:
        query = query.filter(Candidate.primary_specialty.ilike(f"%{specialty}%"))
   
    if state and state != "":
        query = query.filter(Candidate.preferred_states.contains(state))
   
    total = query.count()
    candidates = query.offset(skip).limit(limit).all()
   
    formatted_candidates = []
    for c in candidates:
        candidate_dict = {
            "id": c.candidate_id,
            "candidate_id": c.candidate_id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "full_name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "phone": c.phone,
            "primary_specialty": c.primary_specialty,
            "years_experience": c.years_experience,
            "preferred_states": json.loads(c.preferred_states) if c.preferred_states else [],
            "availability_date": str(c.availability_date) if c.availability_date else None,
            "desired_contract_weeks": c.desired_contract_weeks,
            "status": c.candidate_status,
            "created_at": str(c.created_at),
        }
        formatted_candidates.append(candidate_dict)
   
    return {
        "candidates": formatted_candidates,
        "total": total
    }
@app.get("/api/candidates/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Get single candidate by ID"""
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
   
    return {
        "id": candidate.candidate_id,
        "candidate_id": candidate.candidate_id,
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "full_name": f"{candidate.first_name} {candidate.last_name}",
        "email": candidate.email,
        "phone": candidate.phone,
        "primary_specialty": candidate.primary_specialty,
        "years_experience": candidate.years_experience,
        "preferred_states": json.loads(candidate.preferred_states) if candidate.preferred_states else [],
        "availability_date": str(candidate.availability_date) if candidate.availability_date else None,
        "desired_contract_weeks": candidate.desired_contract_weeks,
        "status": candidate.candidate_status,
    }
# ════════════════════════════════════════════════════════════════════════
# CREATE CANDIDATE ENDPOINT
# ════════════════════════════════════════════════════════════════════════
@app.post("/api/candidates")
def create_candidate(candidate_data: CandidateCreate, db: Session = Depends(get_db)):
    """
    Create a new candidate
   
    This endpoint allows you to add a new candidate to the database.
    It validates the data, checks for duplicate emails, and creates the candidate.
    """
   
    # Check if email already exists
    existing = db.query(Candidate).filter(
        Candidate.email.ilike(candidate_data.email)
    ).first()
   
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A candidate with email {candidate_data.email} already exists"
        )
   
    # Generate unique candidate ID
    candidate_id = f"CND{uuid.uuid4().hex[:12].upper()}"
   
    # Parse availability date
    avail_date = None
    if candidate_data.availability_date:
        try:
            avail_date = datetime.strptime(
                candidate_data.availability_date,
                '%Y-%m-%d'
            ).date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD (e.g., 2026-03-15)"
            )
   
    # Create new candidate object
    new_candidate = Candidate(
        candidate_id=candidate_id,
        first_name=candidate_data.first_name.strip(),
        last_name=candidate_data.last_name.strip(),
        email=candidate_data.email.strip().lower(),
        phone=candidate_data.phone.strip() if candidate_data.phone else None,
        primary_specialty=candidate_data.primary_specialty,
        years_experience=candidate_data.years_experience,
        preferred_states=json.dumps(candidate_data.preferred_states) if candidate_data.preferred_states else None,
        availability_date=avail_date,
        desired_contract_weeks=candidate_data.desired_contract_weeks,
        candidate_status=candidate_data.candidate_status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
   
    # Add to database
    try:
        db.add(new_candidate)
        db.commit()
        db.refresh(new_candidate)
       
        print(f"✅ Created new candidate: {new_candidate.first_name} {new_candidate.last_name} ({new_candidate.email})")
       
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create candidate: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create candidate: {str(e)}"
        )
   
    # Return success response
    return {
        "success": True,
        "message": "Candidate created successfully",
        "candidate": {
            "id": new_candidate.candidate_id,
            "candidate_id": new_candidate.candidate_id,
            "first_name": new_candidate.first_name,
            "last_name": new_candidate.last_name,
            "full_name": f"{new_candidate.first_name} {new_candidate.last_name}",
            "email": new_candidate.email,
            "phone": new_candidate.phone,
            "primary_specialty": new_candidate.primary_specialty,
            "years_experience": new_candidate.years_experience,
            "preferred_states": json.loads(new_candidate.preferred_states) if new_candidate.preferred_states else [],
            "availability_date": str(new_candidate.availability_date) if new_candidate.availability_date else None,
            "desired_contract_weeks": new_candidate.desired_contract_weeks,
            "status": new_candidate.candidate_status,
            "created_at": str(new_candidate.created_at),
        }
    }
# ════════════════════════════════════════════════════════════════════════
# JOBS ENDPOINTS
# ════════════════════════════════════════════════════════════════════════
@app.get("/api/jobs")
def get_jobs(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,      
    status: Optional[str] = None,
    specialty: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get jobs with optional filters"""
    query = db.query(Job)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Job.specialty_required.ilike(search_term)) |
            (Job.facility.ilike(search_term)) |
            (Job.city.ilike(search_term)) |
            (Job.state.ilike(search_term)) |
            (Job.title.ilike(search_term))
        )
   
    if status:
        query = query.filter(Job.status.ilike(status))
   
    if specialty:
        query = query.filter(Job.specialty_required.ilike(f"%{specialty}%"))
   
    if state:
        query = query.filter(Job.state == state)
   
    total = query.count()
    jobs = query.offset(skip).limit(limit).all()
   
    formatted_jobs = []
    for j in jobs:
        job_dict = {
            "id": j.job_id,
            "job_id": j.job_id,
            "title": j.title,
            "specialty_required": j.specialty_required,
            "state": j.state,
            "facility": j.facility,
            "city": j.city,  
            "min_years_experience": j.min_years_experience,
            "contract_weeks": j.contract_weeks,
            "start_date": str(j.start_date) if j.start_date else None,
            "pay_rate_weekly": j.pay_rate_weekly,
            "status": j.status,
        }
        formatted_jobs.append(job_dict)
   
    return {
        "jobs": formatted_jobs,
        "total": total
    }

@app.post("/api/jobs")
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new job posting
   
    This endpoint allows you to create a new job in the database.
    It validates the data and creates the job with a unique ID.
    """
    from models import generate_id
    start_date_obj = None
    if job_data.start_date:
        try:
            start_date_obj = datetime.strptime(job_data.start_date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD (e.g., 2026-03-15)"
            )
    new_job = Job(
        job_id=generate_id("JOB"),
        title=job_data.title or f"{job_data.specialty_required} - {job_data.facility}",
        specialty_required=job_data.specialty_required,
        sub_specialties_accepted=json.dumps([]) if not job_data.specialty_required else None,
        facility=job_data.facility,
        facility_type=job_data.facility_type,
        city=job_data.city,
        state=job_data.state,
        zip_code=job_data.zip_code,
        shift_type=job_data.shift_type,
        shift_length=job_data.shift_length,
        schedule=job_data.schedule,
        floating_required=job_data.floating_required,
        call_required=job_data.call_required,
        min_years_experience=job_data.min_years_experience,
        required_certifications=json.dumps(job_data.required_certifications) if job_data.required_certifications else None,
        required_licenses=json.dumps(job_data.required_licenses) if job_data.required_licenses else None,
        special_requirements=job_data.special_requirements,
        contract_weeks=job_data.contract_weeks,
        start_date=start_date_obj,
        extension_possible=job_data.extension_possible,
        positions_available=job_data.positions_available,
        pay_rate_weekly=job_data.pay_rate_weekly,
        pay_rate_hourly=job_data.pay_rate_hourly,
        overtime_rate=job_data.overtime_rate,
        housing_stipend=job_data.housing_stipend,
        per_diem_daily=job_data.per_diem_daily,
        travel_reimbursement=job_data.travel_reimbursement,
        sign_on_bonus=job_data.sign_on_bonus,
        completion_bonus=job_data.completion_bonus,
        benefits=json.dumps(job_data.benefits) if job_data.benefits else None,
        unit_details=job_data.unit_details,
        patient_ratio=job_data.patient_ratio,
        parking=job_data.parking,
        scrub_color=job_data.scrub_color,
        facility_rating=job_data.facility_rating,
        status=job_data.status,
        urgency_level=job_data.urgency_level,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
   
    # Add to database
    try:
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
       
        print(f"✅ Created new job: {new_job.title} at {new_job.facility}")
       
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create job: {str(e)}"
        )
   
    # Return success response
    return {
        "success": True,
        "message": "Job created successfully",
        "job_id": new_job.job_id,
        "job": {
            "job_id": new_job.job_id,
            "title": new_job.title,
            "specialty_required": new_job.specialty_required,
            "facility": new_job.facility,
            "city": new_job.city,
            "state": new_job.state,
            "contract_weeks": new_job.contract_weeks,
            "status": new_job.status,
        }
    }
@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    """
    Get single job by ID with COMPLETE details
    
    🔧 FIXED: Now returns ALL fields including shift details and compensation
    """
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
   
    # Get all assignments for this job
    assignments = db.query(Assignment).filter(Assignment.job_id == job_id).all()
    job_detail = {
        # Basic Info
        "job_id": job.job_id,
        "title": job.title,
        "specialty_required": job.specialty_required,
        "sub_specialties_accepted": json.loads(job.sub_specialties_accepted) if job.sub_specialties_accepted else [],
       
        # Location
        "facility": job.facility,
        "facility_type": job.facility_type,
        "city": job.city,
        "state": job.state,
        "zip_code": job.zip_code,
        "shift_type": job.shift_type,             
        "shift_length": job.shift_length,          
        "schedule": job.schedule,                 
        "floating_required": job.floating_required if job.floating_required is not None else False,  
        "call_required": job.call_required if job.call_required is not None else False,           
       
        # Requirements
        "min_years_experience": job.min_years_experience,
        "required_certifications": json.loads(job.required_certifications) if job.required_certifications else [],
        "required_licenses": json.loads(job.required_licenses) if job.required_licenses else [],
        "special_requirements": job.special_requirements,
       
        # Contract Details
        "contract_weeks": job.contract_weeks,
        "start_date": str(job.start_date) if job.start_date else None,
        "extension_possible": job.extension_possible if job.extension_possible is not None else False,
        "positions_available": job.positions_available,
       
        # COMPENSATION
        "pay_rate_weekly": float(job.pay_rate_weekly) if job.pay_rate_weekly else None,         
        "pay_rate_hourly": float(job.pay_rate_hourly) if job.pay_rate_hourly else None,        
        "overtime_rate": float(job.overtime_rate) if job.overtime_rate else None,              
        "housing_stipend": float(job.housing_stipend) if job.housing_stipend else None,        
        "per_diem_daily": float(job.per_diem_daily) if job.per_diem_daily else None,            
        "travel_reimbursement": float(job.travel_reimbursement) if job.travel_reimbursement else None,  
        "sign_on_bonus": float(job.sign_on_bonus) if job.sign_on_bonus else None,               
        "completion_bonus": float(job.completion_bonus) if job.completion_bonus else None,        
       
        # Benefits
        "benefits": json.loads(job.benefits) if job.benefits else [],
       
        # Facility Details
        "unit_details": job.unit_details,
        "patient_ratio": job.patient_ratio,
        "parking": job.parking,
        "scrub_color": job.scrub_color,
        "facility_rating": float(job.facility_rating) if job.facility_rating else None,
       
        # Status
        "status": job.status,
        "urgency_level": job.urgency_level,
       
        # Metadata
        "created_at": str(job.created_at),
        "updated_at": str(job.updated_at),
        "filled_date": str(job.filled_date) if job.filled_date else None,
       
        # Assignments
        "assignments_count": len(assignments),
        "assignments": [
            {
                "assignment_id": a.assignment_id,
                "candidate_name": f"{a.candidate.first_name} {a.candidate.last_name}" if a.candidate else "Unknown",
                "start_date": str(a.start_date) if a.start_date else None,
                "end_date": str(a.end_date) if a.end_date else None,
                "status": a.status,
            }
            for a in assignments
        ],
    }
   
    return job_detail
# Assignments Endpoints
@app.get("/api/assignments")
def get_assignments(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get assignments with optional filters"""
    query = db.query(Assignment)
   
    if status:
        query = query.filter(Assignment.status.ilike(status))
   
    total = query.count()
    assignments = query.offset(skip).limit(limit).all()
   
    today = date.today()
   
    formatted_assignments = []
    for a in assignments:
        # Calculate days_remaining
        days_remaining = None
        if a.end_date and a.status and a.status.lower() == 'active':
            days_remaining = (a.end_date - today).days
       
        assignment_dict = {
            "id": a.assignment_id,
            "assignment_id": a.assignment_id,
            "candidate_id": a.candidate_id,
            "job_id": a.job_id,
            "start_date": str(a.start_date) if a.start_date else None,
            "end_date": str(a.end_date) if a.end_date else None,
            "days_remaining": days_remaining,
            "status": a.status,
            "candidate": {
                "full_name": f"{a.candidate.first_name} {a.candidate.last_name}",
                "email": a.candidate.email,
            } if a.candidate else None,
            "job": {
                "facility": a.job.facility,
                "state": a.job.state,
            } if a.job else None,
        }
        formatted_assignments.append(assignment_dict)
   
    return {
        "assignments": formatted_assignments,
        "total": total
    }
@app.get("/api/assignments/ending-soon")
def get_assignments_ending_soon(
    skip: int = 0,
    limit: int = 100,
    days: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get assignments ending soon (future dates only, excludes past dates)
    
    🔧 FIXED: Now filters out assignments with end_date in the past
    """
    days_threshold = days if days is not None else ENDING_SOON_DAYS
   
    today = date.today()
    threshold_date = today + timedelta(days=days_threshold)
    query = db.query(Assignment).filter(
        Assignment.status.ilike("active"),
        Assignment.end_date.isnot(None),
        Assignment.end_date > today, 
        Assignment.end_date <= threshold_date
    ).order_by(Assignment.end_date.asc())
   
    total = query.count()
    assignments = query.offset(skip).limit(limit).all()
   
    formatted_assignments = []
    for a in assignments:
        days_remaining = (a.end_date - today).days
       
        assignment_dict = {
            "id": a.assignment_id,
            "assignment_id": a.assignment_id,
            "candidate_id": a.candidate_id,
            "job_id": a.job_id,
            "start_date": str(a.start_date) if a.start_date else None,
            "end_date": str(a.end_date) if a.end_date else None,
            "days_remaining": days_remaining,
            "status": a.status,
            "candidate": {
                "id": a.candidate.candidate_id,
                "full_name": f"{a.candidate.first_name} {a.candidate.last_name}",
                "email": a.candidate.email,
                "phone": a.candidate.phone,
                "primary_specialty": a.candidate.primary_specialty,
            } if a.candidate else None,
            "job": {
                "id": a.job.job_id,
                "facility": a.job.facility,
                "state": a.job.state,
                "specialty_required": a.job.specialty_required,
            } if a.job else None,
        }
        formatted_assignments.append(assignment_dict)
   
    return {
        "assignments": formatted_assignments,
        "total": total,
        "days_threshold": days_threshold,
        "threshold_date": str(threshold_date),
    }
# Alerts Endpoints
@app.get("/api/alerts")
def get_alerts(
    skip: int = 0,
    limit: int = 50,
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get alerts with optional filters"""
    query = db.query(Alert)
   
    if is_read is not None:
        query = query.filter(Alert.is_read == is_read)
   
    query = query.order_by(Alert.created_at.desc())
    total = query.count()
    alerts = query.offset(skip).limit(limit).all()
   
    formatted_alerts = []
    for a in alerts:
        alert_dict = {
            "id": a.alert_id,
            "alert_id": a.alert_id,
            "alert_type": a.alert_type,
            "candidate_id": a.candidate_id,
            "job_id": a.job_id,
            "message": a.message,
            "is_read": a.is_read,
            "created_at": str(a.created_at),
        }
        formatted_alerts.append(alert_dict)
   
    return {
        "alerts": formatted_alerts,
        "total": total
    }
@app.put("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: str, db: Session = Depends(get_db)):
    """Mark an alert as read"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
   
    alert.is_read = True
    db.commit()
   
    return {"message": "Alert marked as read"}
@app.put("/api/alerts/{alert_id}/unread")
def mark_alert_unread(alert_id: str, db: Session = Depends(get_db)):
    """Mark an alert as unread"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = False
    db.commit()
    
    return {"message": "Alert marked as unread"}


@app.put("/api/alerts/unread-all")
def mark_all_alerts_unread(db: Session = Depends(get_db)):
    """Mark ALL alerts as unread (restore to unread state)"""
    
    # Update all alerts to unread
    updated_count = db.query(Alert).update({"is_read": False})
    db.commit()
    
    return {
        "message": f"Successfully marked {updated_count} alerts as unread",
        "count": updated_count
    }

# Matching Endpoints
@app.get("/api/matching/ending-assignments")
def get_ending_assignments_with_matches(days: int = None, db: Session = Depends(get_db)):
    """
    Get assignments ending within specified days with potential matches
    
    🔧 FIXED: Now filters out assignments with end_date in the past
    """
    days_threshold = days if days is not None else ENDING_SOON_DAYS
   
    today = date.today()
    threshold_date = today + timedelta(days=days_threshold)
    assignments = db.query(Assignment).filter(
        Assignment.status.ilike("active"),
        Assignment.end_date.isnot(None),
        Assignment.end_date > today, 
        Assignment.end_date <= threshold_date
    ).order_by(Assignment.end_date.asc()).all()
   
    formatted_ending = []
    engine = MatchingEngine(db)
   
    for assignment in assignments:
        days_remaining = (assignment.end_date - today).days
       
        candidate = assignment.candidate
        if not candidate:
            continue
       
        try:
            matches = engine.find_matches_for_candidate(candidate.candidate_id, min_score=50)
        except Exception as e:
            matches = []
       
        formatted_item = {
            "assignment": {
                "id": assignment.assignment_id,
                "assignment_id": assignment.assignment_id,
                "end_date": str(assignment.end_date),
                "location": f"{assignment.job.facility}, {assignment.job.state}" if assignment.job else "N/A",
            },
            "candidate": {
                "id": candidate.candidate_id,
                "full_name": f"{candidate.first_name} {candidate.last_name}",
                "email": candidate.email,
            },
            "days_remaining": days_remaining,
            "potential_matches": len(matches),
        }
        formatted_ending.append(formatted_item)
   
    return {
        "ending_assignments": formatted_ending,
        "total": len(formatted_ending),
        "days_threshold": days_threshold,
    }
@app.get("/api/matching/job/{job_id}")
def get_matches_for_job(job_id: str, min_score: int = 50, db: Session = Depends(get_db)):
    """Get candidate matches for a job"""
    try:
        engine = MatchingEngine(db)
        matches = engine.find_matches_for_job(job_id, min_score)
       
        formatted_matches = []
        for match in matches:
            candidate = match['candidate']
            formatted_match = {
                "candidate_id": candidate.candidate_id,
                "candidate_name": f"{candidate.first_name} {candidate.last_name}",
                "full_name": f"{candidate.first_name} {candidate.last_name}",
                "email": candidate.email,
                "phone": candidate.phone,
                "primary_specialty": candidate.primary_specialty,
                "years_experience": candidate.years_experience,
                "score": match['score'],
                "match_details": match.get('match_details', {}),
                "rule_notes": match.get('rule_notes', [])
            }
            formatted_matches.append(formatted_match)
       
        return {
            "matches": formatted_matches,
            "total": len(formatted_matches)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/matching/candidate/{candidate_id}")
def get_matches_for_candidate(candidate_id: str, min_score: int = 50, db: Session = Depends(get_db)):
    """Get job matches for a candidate"""
    try:
        engine = MatchingEngine(db)
        matches = engine.find_matches_for_candidate(candidate_id, min_score)
       
        formatted_matches = []
        for match in matches:
            job = match['job']
            formatted_match = {
                "job_id": job.job_id,
                "title": job.title,
                "specialty_required": job.specialty_required,
                "facility": job.facility,
                "state": job.state,
                "pay_rate_weekly": job.pay_rate_weekly,
                "start_date": str(job.start_date) if job.start_date else None,
                "contract_weeks": job.contract_weeks,
                "score": match['score'],
                "match_details": match.get('match_details', {}),
                "rule_notes": match.get('rule_notes', [])
            }
            formatted_matches.append(formatted_match)
       
        return {
            "matches": formatted_matches,
            "total": len(formatted_matches)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Documents Endpoints 
@app.get("/api/documents")
def get_documents(
    skip: int = 0,
    limit: int = 100,
    candidate_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get documents with optional filters"""
    query = db.query(Document)
   
    if candidate_id:
        query = query.filter(Document.candidate_id == candidate_id)
    if status:
        query = query.filter(Document.status == status)
   
    total = query.count()
    documents = query.offset(skip).limit(limit).all()
   
    formatted_docs = []
    for d in documents:
        doc_dict = {
            "id": d.document_id,
            "document_id": d.document_id,
            "candidate_id": d.candidate_id,
            "document_type": d.document_type,
            "file_name": d.file_name,
            "expiration_date": str(d.expiration_date) if d.expiration_date else None,
            "status": d.status,
            "uploaded_at": str(d.uploaded_at),
        }
        formatted_docs.append(doc_dict)
   
    return {
        "documents": formatted_docs,
        "total": total
    }
# Expenses Endpoints
@app.get("/api/expenses")
def get_expenses(
    skip: int = 0,
    limit: int = 100,
    candidate_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get expenses with optional filters"""
    query = db.query(Expense)
   
    if candidate_id:
        query = query.filter(Expense.candidate_id == candidate_id)
   
    if status:
        query = query.filter(Expense.status.ilike(status))
   
    total = query.count()
    expenses = query.offset(skip).limit(limit).all()
   
    formatted_expenses = []
    for e in expenses:
        expense_dict = {
            "id": e.expense_id,
            "expense_id": e.expense_id,
            "candidate_id": e.candidate_id,
            "assignment_id": e.assignment_id,
            "expense_type": e.expense_type,
            "amount": e.amount,
            "description": e.description,
            "status": e.status,
            "submitted_at": str(e.submitted_at),
        }
        formatted_expenses.append(expense_dict)
   
    return {
        "expenses": formatted_expenses,
        "total": total
    }
# Import Endpoint
@app.post("/api/import/candidates")
async def import_candidates(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import candidates from CSV file"""
   
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
   
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
   
    try:
        result = import_candidates_from_file(temp_file_path, db)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
@app.post("/api/import/jobs")
async def import_jobs(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import jobs from CSV/Excel file"""
   
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
   
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
   
    try:
        result = import_jobs_from_file(temp_file_path, db)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
@app.post("/api/import/assignments")
async def import_assignments(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import assignments from CSV/Excel file"""
   
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
   
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
   
    try:
        result = import_assignments_from_file(temp_file_path, db)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
@app.post("/api/import/credentials")
async def import_credentials(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import credentials from CSV/Excel file"""
   
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
   
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
   
    try:
        result = import_credentials_from_file(temp_file_path, db)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
@app.post("/api/import/documents")
async def import_documents(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import documents from CSV/Excel file"""
   
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
   
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
   
    try:
        result = import_documents_from_file(temp_file_path, db)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
@app.post("/api/import/expenses")
async def import_expenses(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import expenses from CSV/Excel file"""
   
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
   
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
   
    try:
        result = import_expenses_from_file(temp_file_path, db)
        return result
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
# ====================================================================
# SAMPLE FILE DOWNLOADS
# ====================================================================
from fastapi.responses import FileResponse
@app.get("/api/sample-files/{file_type}")
async def download_sample_file(file_type: str):
    """Download sample CSV file for importing data"""
   
    # Map file types to actual CSV files
    file_mapping = {
        'candidates': 'ats_candidates.csv',
        'jobs': 'jobs.csv',
        'assignments': 'assignments.csv',
        'credentials': 'credentials.csv',
        'documents': 'documents.csv',
        'expenses': 'expenses.csv'
    }
   
    if file_type not in file_mapping:
        raise HTTPException(status_code=404, detail="Sample file not found")
   
    file_name = file_mapping[file_type]
    file_path = os.path.join(os.getcwd(), file_name)
   
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Sample file {file_name} not found")
   
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type='text/csv'
    )
@app.get("/api/specialties/candidates")
def get_candidate_specialties(db: Session = Depends(get_db)):
    """Get unique specialties from candidates for dropdown"""
    try:
        specialties = db.query(Candidate.primary_specialty)\
            .filter(Candidate.primary_specialty.isnot(None))\
            .filter(Candidate.primary_specialty != "")\
            .distinct()\
            .order_by(Candidate.primary_specialty)\
            .all()
        specialty_list = [s[0] for s in specialties if s[0]]
       
        return {
            "specialties": specialty_list,
            "total": len(specialty_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/specialties/jobs")
def get_job_specialties(db: Session = Depends(get_db)):
    """Get unique specialties from jobs for dropdown"""
    try:
        specialties = db.query(Job.specialty_required)\
            .filter(Job.specialty_required.isnot(None))\
            .filter(Job.specialty_required != "")\
            .distinct()\
            .order_by(Job.specialty_required)\
            .all()
        specialty_list = [s[0] for s in specialties if s[0]]
       
        return {
            "specialties": specialty_list,
            "total": len(specialty_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class SendEmailRequest(BaseModel):
    """Request model for sending email to candidate"""
    to_email: EmailStr
    subject: str
    message: str
    candidate_name: str

@app.post("/api/email/send-to-candidate")
async def send_email_to_candidate(
    request: SendEmailRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Send an email to a candidate
    
    This endpoint allows recruiters to send emails directly to candidates
    from the application interface with professional HTML templates.
    
    Args:
        request: SendEmailRequest containing email details
        current_user: Authenticated user (from token)
    
    Returns:
        Success message with email details
    
    Raises:
        HTTPException: If email fails to send
    """
    try:
        from email_notification_service import email_service
        recruiter_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or 'The Recruiting Team'
        recruiter_email = current_user.email or ''
        html_body = f"""
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f3f4f6;">
            
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <!-- Header with Gradient -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 40px 30px; 
                          border-radius: 12px 12px 0 0; 
                          text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                  Purple Cow Recruiting
                </h1>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                  Travel Healthcare Staffing Excellence
                </p>
              </div>
              
              <!-- Main Content -->
              <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Greeting -->
                <h2 style="color: #667eea; margin-top: 0; margin-bottom: 20px; font-size: 22px;">
                  Hi {request.candidate_name},
                </h2>
                
                <!-- Message Content -->
                <div style="background: #f9fafb; 
                            padding: 25px; 
                            border-radius: 8px; 
                            margin: 20px 0;
                            border-left: 4px solid #667eea;
                            line-height: 1.7;
                            color: #374151;
                            font-size: 15px;">
                  {request.message.replace(chr(10), '<br><br>')}
                </div>
                
                <!-- Signature Section -->
                <div style="margin-top: 40px; 
                            padding-top: 30px; 
                            border-top: 2px solid #e5e7eb;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 15px;">
                    Best regards,
                  </p>
                  <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">
                    {recruiter_name}
                  </p>
                  <p style="margin: 5px 0 0 0; color: #667eea; font-size: 14px; font-weight: 500;">
                    Purple Cow Recruiting
                  </p>
                  {f'<p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 13px;">{recruiter_email}</p>' if recruiter_email else ''}
                </div>
                
                <!-- Call to Action -->
                <div style="margin-top: 30px; 
                            padding: 20px; 
                            background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); 
                            border-radius: 8px;
                            text-align: center;">
                  <p style="margin: 0 0 15px 0; color: #4b5563; font-size: 14px;">
                    📞 Questions? Feel free to reply to this email or give us a call!
                  </p>
                  <a href="mailto:{recruiter_email}" 
                     style="display: inline-block;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 12px 30px;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 600;
                            font-size: 14px;">
                    Reply to This Email
                  </a>
                </div>
                
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; 
                          margin-top: 30px; 
                          color: #9ca3af; 
                          font-size: 12px;
                          line-height: 1.5;">
                <p style="margin: 5px 0;">
                  <strong>Purple Cow Recruiting</strong> - Travel Healthcare ATS
                </p>
                <p style="margin: 5px 0;">
                  This email was sent from your recruitment system.
                </p>
                <p style="margin: 10px 0 0 0;">
                  <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
                  <a href="#" style="color: #667eea; text-decoration: none;">Preferences</a>
                </p>
              </div>
              
            </div>
            
          </body>
        </html>
        """
        
        # Log the email send attempt
        print(f"\n📧 ====== EMAIL SEND REQUEST ======")
        print(f"From: {recruiter_name} ({recruiter_email})")
        print(f"To: {request.to_email}")
        print(f"Subject: {request.subject}")
        print(f"Message Preview: {request.message[:100]}...")
        print(f"==================================\n")
        
        # Send the email using the email service
        success = await email_service.send_email(
            to_email=request.to_email,
            subject=request.subject,
            html_body=html_body
        )
        
        if success:
            print(f"✅ Email sent successfully to {request.to_email}")
            
            return {
                "success": True,
                "message": f"Email sent successfully to {request.to_email}",
                "details": {
                    "to": request.to_email,
                    "subject": request.subject,
                    "sent_by": recruiter_name
                }
            }
        else:
            print(f"❌ Email service returned False for {request.to_email}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. The email service did not return a success status. Check server logs for details."
            )
            
    except Exception as e:
        print(f"❌ Error in send_email_to_candidate endpoint:")
        print(f"   Error Type: {type(e).__name__}")
        print(f"   Error Message: {str(e)}")
        
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Error sending email: {str(e)}. Please check your email configuration in the .env file."
        )
class SendOpportunityRequest(BaseModel):
    candidate_id: str
    job_id: str
    personal_message: Optional[str] = None

@app.post("/matching/send-opportunity")
async def send_job_opportunity(
    request: SendOpportunityRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)   
):
    """
    Send job opportunity email to candidate + log action
    """
    from models import Candidate, Job, CommunicationLog
    from email_notification_service import email_service
    from datetime import datetime

    # 1. Get candidate & job
    candidate = db.query(Candidate).filter(Candidate.candidate_id == request.candidate_id).first()
    job = db.query(Job).filter(Job.job_id == request.job_id).first()

    if not candidate:
        raise HTTPException(404, detail="Candidate not found")
    if not job:
        raise HTTPException(404, detail="Job not found")
    if not candidate.email:
        raise HTTPException(400, detail="Candidate has no email address")

    # 2. Build nice email content
    subject = f"New Travel Assignment Opportunity - {job.specialty_required} in {job.state}"

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4f46e5;">Hi {candidate.first_name},</h2>
        
        <p>Your recruiter found a great opportunity that might interest you!</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">{job.specialty_required} - {job.facility or job.title}</h3>
          <p><strong>Location:</strong> {job.city or 'N/A'}, {job.state}</p>
          <p><strong>Start date:</strong> {job.start_date or 'Flexible'}</p>
          <p><strong>Weeks:</strong> {job.contract_weeks or '13'} weeks</p>
          <p><strong>Pay:</strong> ${job.pay_rate_weekly or 'Competitive'}/week</p>
        </div>

        {f'<p><strong>Personal note from your recruiter:</strong><br>{request.personal_message}</p>' if request.personal_message else ''}

        <p style="margin: 30px 0;">
          <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/jobs/{job.job_id}"
             style="background: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Full Job Details
          </a>
        </p>

        <p>Reply directly to this email if you're interested or have questions.</p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
          Best regards,<br>
          {current_user.full_name or current_user.email}<br>
          Purple Cow Recruiting
        </p>
      </body>
    </html>
    """

    # 3. Send the email
    success = await email_service.send_email(
        to_email=candidate.email,
        subject=subject,
        html_body=html_body
    )

    if not success:
        raise HTTPException(500, detail="Failed to send email - check SMTP settings")

    # 4. Log communication
    log = CommunicationLog(
        candidate_id=candidate.candidate_id,
        type="email_sent",
        subject=subject,
        message=html_body[:2000], 
        direction="outgoing",
        sent_by=current_user.user_id,
        sent_at=datetime.utcnow(),
        status="sent" if success else "failed"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Opportunity sent to {candidate.email}",
        "candidate": candidate.first_name + " " + candidate.last_name,
        "job": job.specialty_required
    }

class ExpenseCreate(BaseModel):
    """Request model for creating expenses"""
    expense_type: str
    description: str
    amount: float
    candidate_id: str
    assignment_id: Optional[str] = None
    status: str = "pending"


@app.post("/api/expenses")
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new expense"""
    candidate = db.query(Candidate).filter(
        Candidate.candidate_id == expense_data.candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate {expense_data.candidate_id} not found"
        )
    assignment_id = expense_data.assignment_id
    if assignment_id == "" or assignment_id is None:
        assignment_id = None  
    else:
        assignment = db.query(Assignment).filter(
            Assignment.assignment_id == assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(
                status_code=404,
                detail=f"Assignment {assignment_id} not found"
            )
    
    # Create the expense
    new_expense = Expense(
        expense_type=expense_data.expense_type,
        description=expense_data.description,
        amount=expense_data.amount,
        candidate_id=expense_data.candidate_id,
        assignment_id=assignment_id,  
        status=expense_data.status,
        submitted_at=datetime.utcnow()
    )
    
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    
    return {
        "success": True,
        "message": "Expense created successfully",
        "expense": {
            "expense_id": new_expense.expense_id,
            "expense_type": new_expense.expense_type,
            "description": new_expense.description,
            "amount": new_expense.amount,
            "candidate_id": new_expense.candidate_id,
            "assignment_id": new_expense.assignment_id,
            "status": new_expense.status,
            "submitted_at": str(new_expense.submitted_at)
        }
    }
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    candidate_id: str = Form(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload a document file for a candidate
    """
    print(f"\n📤 ====== UPLOADING DOCUMENT ======")
    print(f"Candidate ID: {candidate_id}")
    print(f"Document Type: {document_type}")
    print(f"File Name: {file.filename}")
    
    # 1. Validate candidate exists
    candidate = db.query(Candidate).filter(
        Candidate.candidate_id == candidate_id
    ).first()
    
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate {candidate_id} not found"
        )
    
    # 2. Validate file size 
    file_size = 0
    chunk_size = 1024 * 1024  
    temp_file = io.BytesIO()
    
    while chunk := await file.read(chunk_size):
        file_size += len(chunk)
        if file_size > 10 * 1024 * 1024: 
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 10MB limit"
            )
        temp_file.write(chunk)
    
    temp_file.seek(0)
    print(f"File Size: {file_size / 1024:.2f} KB")
    
    # 3. Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{candidate_id}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # 4. Save file to disk
    try:
        with open(file_path, "wb") as f:
            f.write(temp_file.read())
        
        print(f"✅ File saved to: {file_path}")
        
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # 5. Create database record
    new_document = Document(
        document_id=f"DOC{uuid.uuid4().hex[:12].upper()}",
        candidate_id=candidate_id,
        document_type=document_type,
        file_name=file.filename,  
        file_path=str(file_path), 
        file_url=f"/api/documents/files/{unique_filename}", 
        file_size=file_size,
        mime_type=file.content_type,
        status="Pending Review",
        uploaded_at=datetime.utcnow()
    )
    
    try:
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
        
        print(f"✅ Document record created: {new_document.document_id}")
        print(f"==================================\n")
        
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        
        db.rollback()
        print(f"❌ Database error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save document record: {str(e)}"
        )
    
    return {
        "success": True,
        "message": "Document uploaded successfully",
        "document": {
            "document_id": new_document.document_id,
            "file_name": new_document.file_name,
            "document_type": new_document.document_type,
            "file_url": new_document.file_url,
            "status": new_document.status,
            "uploaded_at": str(new_document.uploaded_at)
        }
    }
from fastapi.responses import FileResponse

@app.get("/api/documents/files/{filename}")
async def get_document_file(filename: str):
    """
    Serve document file for viewing or downloading
    """
    print(f"\n📥 Serving file: {filename}")
    
    file_path = UPLOAD_DIR / filename
    
    # Check if file exists
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    
    print(f"✅ File found, sending: {file_path}")
    
    # Return the file
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)