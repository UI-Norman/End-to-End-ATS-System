from sqlalchemy import Column, String, Integer, Date, Text, ForeignKey, DateTime, Boolean, Float, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid
from uuid import uuid4
Base = declarative_base()

def generate_id(prefix):
    """Generate unique ID with prefix"""
    return f"{prefix}{uuid.uuid4().hex[:12].upper()}"


class Candidate(Base):
    """Enhanced Candidate model with comprehensive preferences"""
    __tablename__ = "candidates"
    
    candidate_id = Column(String(20), primary_key=True, default=lambda: generate_id("CND"))
    
    # Basic Info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50))
    date_of_birth = Column(Date)
    
    # Professional Info
    primary_specialty = Column(String(120), index=True)
    sub_specialties = Column(JSON)
    years_experience = Column(Integer)
    certifications = Column(JSON)
    languages = Column(JSON)
    
    # Preferences - Location
    preferred_states = Column(JSON)
    preferred_regions = Column(JSON)
    preferred_cities = Column(JSON)
    
    # Preferences - Work Schedule
    availability_date = Column(Date)
    availability_windows = Column(JSON)
    blackout_dates = Column(JSON)
    shift_preferences = Column(JSON)
    
    # Preferences - Contract
    desired_contract_duration_min = Column(Integer, default=8)
    desired_contract_duration_max = Column(Integer, default=13)
    preferred_contract_weeks = Column(Integer, default=13)
    desired_contract_weeks = Column(Integer, default=13)
    
    # Preferences - Housing & Compensation
    housing_preference = Column(String(50))
    relocation_assistance_needed = Column(Boolean, default=False)
    min_weekly_pay = Column(Float)
    
    # Preferences - Facility
    preferred_facility_types = Column(JSON)
    willing_to_float = Column(Boolean, default=True)
    willing_to_take_call = Column(Boolean, default=True)
    
    # Compliance
    covid_vaccinated = Column(Boolean)
    background_check_status = Column(String(50))
    background_check_date = Column(Date)
    drug_screen_status = Column(String(50))
    drug_screen_date = Column(Date)
    physical_exam_date = Column(Date)
    tb_test_date = Column(Date)
    candidate_status = Column(String(50), default="active", nullable=False, index=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_contact_date = Column(DateTime)
    source = Column(String(100))
    notes = Column(Text)
    
    # Relationships
    credentials = relationship("Credential", back_populates="candidate", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="candidate")
    documents = relationship("Document", back_populates="candidate")
    expenses = relationship("Expense", back_populates="candidate")
    references = relationship("Reference", back_populates="candidate")
    communications = relationship("CommunicationLog", back_populates="candidate")
    responses = relationship("CandidateResponse", back_populates="candidate")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def status(self):
        return self.candidate_status
    
    @status.setter
    def status(self, value):
        self.candidate_status = value


class Job(Base):
    __tablename__ = "jobs"
    
    job_id = Column(String(20), primary_key=True, default=lambda: generate_id("JOB"))
    
    title = Column(String(200))
    specialty_required = Column(String(120), index=True)
    sub_specialties_accepted = Column(JSON)
    
    facility = Column(String(200))
    facility_type = Column(String(100))
    city = Column(String(100))
    state = Column(String(50), index=True)
    zip_code = Column(String(50))
    
    shift_type = Column(String(50))
    shift_length = Column(String(20))
    schedule = Column(String(50))
    floating_required = Column(Boolean, default=False)
    call_required = Column(Boolean, default=False)
    
    min_years_experience = Column(Integer)
    required_certifications = Column(JSON)
    required_licenses = Column(JSON)
    special_requirements = Column(Text)
    
    contract_weeks = Column(Integer)
    start_date = Column(Date)
    extension_possible = Column(Boolean, default=False)
    positions_available = Column(Integer, default=1)
    
    pay_rate_weekly = Column(Float)
    pay_rate_hourly = Column(Float)
    overtime_rate = Column(Float)
    housing_stipend = Column(Float)
    per_diem_daily = Column(Float)
    travel_reimbursement = Column(Float)
    sign_on_bonus = Column(Float)
    completion_bonus = Column(Float)
    
    benefits = Column(JSON)
    
    unit_details = Column(Text)
    patient_ratio = Column(String(20))
    parking = Column(String(100))
    scrub_color = Column(String(50))
    facility_rating = Column(Float)
    
    status = Column(String(50), default="open", index=True)
    urgency_level = Column(String(20), default="normal")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(20), ForeignKey("users.user_id"))
    filled_date = Column(Date)
    
    assignments = relationship("Assignment", back_populates="job")
    responses = relationship("CandidateResponse", back_populates="job")


class Assignment(Base):
    __tablename__ = "assignments"
    
    assignment_id = Column(String(20), primary_key=True, default=lambda: generate_id("ASG"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"), nullable=False)
    job_id = Column(String(20), ForeignKey("jobs.job_id"), nullable=False)
    
    start_date = Column(Date)
    end_date = Column(Date)
    extension_end_date = Column(Date)
    
    status = Column(String(50), index=True)
    
    weekly_hours = Column(Float)
    overtime_hours = Column(Float)
    performance_rating = Column(Float)
    facility_satisfaction = Column(Float)
    would_return = Column(Boolean)
    manager_feedback = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    candidate = relationship("Candidate", back_populates="assignments")
    job = relationship("Job", back_populates="assignments")
    expenses = relationship("Expense", back_populates="assignment")


class Credential(Base):
    __tablename__ = "credentials"
    
    credential_id = Column(String(20), primary_key=True, default=lambda: generate_id("CRD"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"), nullable=False)
    
    credential_type = Column(String(50))
    document_type = Column(String(120))
    state = Column(String(10))
    license_number = Column(String(100))
    
    issue_date = Column(Date)
    expiry_date = Column(Date)
    
    status = Column(String(50), default="active")
    verification_status = Column(String(50))
    
    renewal_reminder_sent = Column(Boolean, default=False)
    renewal_reminder_date = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="credentials")


class Document(Base):
    __tablename__ = "documents"
    
    document_id = Column(String(20), primary_key=True, default=lambda: generate_id("DOC"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"))
    
    document_type = Column(String(100), index=True)
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    expiration_date = Column(Date)
    
    status = Column(String(50), default="pending")
    reviewed_by = Column(String(20), ForeignKey("users.user_id"))
    review_date = Column(DateTime)
    review_notes = Column(Text)
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    
    candidate = relationship("Candidate", back_populates="documents")


class Expense(Base):
    __tablename__ = "expenses"
    
    expense_id = Column(String(20), primary_key=True, default=lambda: generate_id("EXP"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"))
    assignment_id = Column(String(20), ForeignKey("assignments.assignment_id"))
    
    expense_type = Column(String(50))
    amount = Column(Float)
    description = Column(Text)
    
    receipt_path = Column(String(500))
    
    status = Column(String(50), default="pending")
    approved_by = Column(String(20), ForeignKey("users.user_id"))
    approved_at = Column(DateTime)
    paid_at = Column(DateTime)
    
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="expenses")
    assignment = relationship("Assignment", back_populates="expenses")


class Reference(Base):
    __tablename__ = "references"
    
    reference_id = Column(String(20), primary_key=True, default=lambda: generate_id("REF"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"))
    
    name = Column(String(200))
    title = Column(String(100))
    organization = Column(String(200))
    
    contact_relationship = Column(String(100))
    
    phone = Column(String(50))
    email = Column(String(255))
    
    contacted = Column(Boolean, default=False)
    contact_date = Column(Date)
    rating = Column(Float)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="references")


class Alert(Base):
    __tablename__ = "alerts"
    
    alert_id = Column(String(20), primary_key=True, default=lambda: generate_id("ALT"))
    
    alert_type = Column(String(50), index=True)
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"))
    job_id = Column(String(20), ForeignKey("jobs.job_id"), nullable=True)
    assignment_id = Column(String(20), ForeignKey("assignments.assignment_id"), nullable=True)
    
    priority = Column(String(20), default="normal")
    
    title = Column(String(200))
    message = Column(Text)
    action_required = Column(Boolean, default=False)
    action_url = Column(String(500))
    
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    
    notification_sent = Column(Boolean, default=False)
    notification_method = Column(String(20))
    sent_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime)


class CommunicationLog(Base):
    __tablename__ = "communication_logs"
    
    log_id = Column(String(20), primary_key=True, default=lambda: generate_id("COM"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"))
    job_id = Column(String(20), ForeignKey("jobs.job_id"), nullable=True)
    
    communication_type = Column(String(50))
    direction = Column(String(20))
    
    subject = Column(String(500))
    body = Column(Text)
    
    template_used = Column(String(100))
    sent_via = Column(String(50))
    
    status = Column(String(50))
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    
    created_by = Column(String(20), ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="communications")


class CandidateResponse(Base):
    __tablename__ = "candidate_responses"
    
    response_id = Column(String(20), primary_key=True, default=lambda: generate_id("RSP"))
    candidate_id = Column(String(20), ForeignKey("candidates.candidate_id"))
    job_id = Column(String(20), ForeignKey("jobs.job_id"))
    
    interested = Column(Boolean)
    response_method = Column(String(50))
    response_text = Column(Text)
    
    decline_reason = Column(String(200))
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date)
    follow_up_notes = Column(Text)
    
    responded_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="responses")
    job = relationship("Job", back_populates="responses")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    template_id = Column(String(20), primary_key=True, default=lambda: generate_id("TPL"))
    
    name = Column(String(200))
    template_type = Column(String(50))
    category = Column(String(100))
    
    subject = Column(String(500))
    body = Column(Text)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MatchingRule(Base):
    __tablename__ = "matching_rules"
    
    rule_id = Column(String(20), primary_key=True, default=lambda: generate_id("RUL"))
    
    rule_name = Column(String(200))
    rule_type = Column(String(50))
    rule_config = Column(JSON)
    
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    first_name = Column(String(100))
    last_name = Column(String(100))
    
    role = Column(String(50), default="recruiter")
    is_active = Column(Boolean, default=True)
    
    placements_count = Column(Integer, default=0)
    avg_time_to_fill = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


def create_all_tables(engine):
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ All enhanced tables created successfully!")