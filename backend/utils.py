import re
import phonenumbers
from datetime import datetime, date, timedelta
import json

def normalize_phone(phone_str):
    """
    Normalize phone numbers from various formats to a standard format.
    Handles formats like: (219)196-9124x260, 199.183.1916, +1-437-150-1667x548, etc.
    """
    if not phone_str or phone_str == '-3903' or phone_str == '-1644':
        return None
    
    cleaned = re.sub(r'[^\d+]', '', phone_str)
    
    # Handle extension 
    extension = None
    if 'x' in phone_str.lower():
        parts = phone_str.lower().split('x')
        cleaned = re.sub(r'[^\d+]', '', parts[0])
        extension = re.sub(r'[^\d]', '', parts[1])
    
    # Try to parse with phonenumbers library
    try:
        if not cleaned.startswith('+'):
            cleaned = '+1' + cleaned
        
        phone_obj = phonenumbers.parse(cleaned, None)
        if phonenumbers.is_valid_number(phone_obj):
            formatted = phonenumbers.format_number(phone_obj, phonenumbers.PhoneNumberFormat.E164)
            if extension:
                formatted += f" ext. {extension}"
            return formatted
    except:
        pass
    digits_only = re.sub(r'\D', '', phone_str)
    if len(digits_only) == 10:
        return f"+1{digits_only}"
    elif len(digits_only) == 11 and digits_only[0] == '1':
        return f"+{digits_only}"
    
    return cleaned if cleaned else None

def calculate_days_until_end(end_date):
    """Calculate days remaining until assignment end date"""
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    today = date.today()
    delta = end_date - today
    return delta.days

def is_assignment_ending_soon(end_date, days_threshold=28):
    """Check if assignment is ending within threshold days"""
    days_remaining = calculate_days_until_end(end_date)
    return 0 <= days_remaining <= days_threshold

def parse_date(date_str):
    """Parse date string to date object"""
    if isinstance(date_str, date):
        return date_str
    
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        try:
            return datetime.strptime(date_str, '%m/%d/%Y').date()
        except:
            return None

def calculate_match_score(candidate, job):
    """
    Calculate match score between candidate and job
    Returns score from 0-100
    """
    score = 0
    max_score = 100
    
    # Specialty match
    if candidate.primary_specialty and job.specialty:
        if candidate.primary_specialty.lower() == job.specialty.lower():
            score += 30
        elif candidate.sub_specialties:
            sub_specs = json.loads(candidate.sub_specialties) if isinstance(candidate.sub_specialties, str) else candidate.sub_specialties
            if job.specialty.lower() in [s.lower() for s in sub_specs]:
                score += 20
    
    # Location match
    if candidate.preferred_states and job.state:
        preferred = json.loads(candidate.preferred_states) if isinstance(candidate.preferred_states, str) else candidate.preferred_states
        if job.state in preferred:
            score += 25
        # Partial match for nearby states
        elif any(state in preferred for state in [job.state]):
            score += 15
    
    # Experience match
    if candidate.years_experience and job.required_experience:
        if candidate.years_experience >= job.required_experience:
            score += 20
        elif candidate.years_experience >= (job.required_experience * 0.8):
            score += 15
        elif candidate.years_experience >= (job.required_experience * 0.6):
            score += 10
    
    # Availability match
    if candidate.availability_date and job.start_date:
        avail_date = parse_date(candidate.availability_date)
        start_date = parse_date(job.start_date)
        if avail_date and start_date:
            days_diff = (start_date - avail_date).days
            if days_diff >= 0 and days_diff <= 14:
                score += 15
            elif days_diff >= -7 and days_diff <= 30:
                score += 10
            elif days_diff >= -14 and days_diff <= 45:
                score += 5
    
    # Contract duration preference
    if candidate.desired_contract_weeks and job.contract_weeks:
        desired_weeks = candidate.desired_contract_weeks.split('-')
        if len(desired_weeks) == 2:
            min_weeks = int(desired_weeks[0])
            max_weeks = int(desired_weeks[1])
            if min_weeks <= job.contract_weeks <= max_weeks:
                score += 10
            elif job.contract_weeks >= min_weeks * 0.8 and job.contract_weeks <= max_weeks * 1.2:
                score += 5
    
    return min(score, max_score)

def generate_candidate_id():
    """Generate unique candidate ID"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return f"CND{timestamp}"

def generate_job_id():
    """Generate unique job ID"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return f"JOB{timestamp}"
