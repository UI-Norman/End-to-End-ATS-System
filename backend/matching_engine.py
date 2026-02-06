from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_
from datetime import datetime, date, timedelta
import json
from typing import List, Dict, Optional

# Import models
from models import (
    Candidate, Job, Assignment, Alert, CandidateResponse,
    MatchingRule, CommunicationLog, NotificationTemplate
)


class MatchingEngine:
    """
    Advanced matching engine with:
    - Multi-factor scoring algorithm
    - Custom rule processing
    - Automated notification triggers
    - Response tracking
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.scoring_weights = {
            'specialty': 30,
            'location': 25,
            'experience': 20,
            'availability': 15,
            'contract_duration': 5,
            'shift_preference': 3,
            'housing': 2
        }
    
    # ==================== MATCHING FUNCTIONS ====================
    
    def find_matches_for_job(self, job_id: str, min_score: int = 50) -> List[Dict]:
        """
        Find top candidate matches for a job
        Returns ranked list with scores and reasons
        """
        job = self.db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            return []
        candidates = self.db.query(Candidate).filter(
            Candidate.candidate_status.ilike("active")
        ).all()
        
        matches = []
        for candidate in candidates:
            # Calculate base score
            score = self._calculate_match_score(candidate, job)
            
            # Apply custom rules
            rule_result = self._apply_matching_rules(candidate, job)
            if rule_result['disqualified']:
                continue 
            
            score += rule_result['bonus_points']
            score = min(score, 100) 
            
            if score >= min_score:
                matches.append({
                    'candidate': candidate,
                    'score': score,
                    'match_details': self._get_match_details(candidate, job),
                    'rule_notes': rule_result['notes']
                })
        
        # Sort by score
        matches.sort(key=lambda x: x['score'], reverse=True)
        
        return matches
    
    def find_matches_for_candidate(self, candidate_id: str, min_score: int = 50) -> List[Dict]:
        """
        Find top job matches for a candidate
        Returns ranked list with scores and reasons
        """
        candidate = self.db.query(Candidate).filter(
            Candidate.candidate_id == candidate_id
        ).first()
        if not candidate:
            return []
        
        # Get open jobs
        jobs = self.db.query(Job).filter(Job.status == "Open").all()
        
        matches = []
        for job in jobs:
            # Calculate base score
            score = self._calculate_match_score(candidate, job)
            
            # Apply custom rules
            rule_result = self._apply_matching_rules(candidate, job)
            if rule_result['disqualified']:
                continue
            
            score += rule_result['bonus_points']
            score = min(score, 100)
            
            if score >= min_score:
                matches.append({
                    'job': job,
                    'score': score,
                    'match_details': self._get_match_details(candidate, job),
                    'rule_notes': rule_result['notes']
                })
        
        matches.sort(key=lambda x: x['score'], reverse=True)
        
        return matches
    
    # ==================== SCORING ALGORITHM ====================
    
    def _calculate_match_score(self, candidate, job) -> int:
        """
        Calculate match score using weighted algorithm
        """
        score = 0
        
        # 1. SPECIALTY MATCH 
        score += self._score_specialty(candidate, job)
        
        # 2. LOCATION MATCH
        score += self._score_location(candidate, job)
        
        # 3. EXPERIENCE MATCH
        score += self._score_experience(candidate, job)
        
        # 4. AVAILABILITY MATCH
        score += self._score_availability(candidate, job)
        
        # 5. CONTRACT DURATION
        score += self._score_contract_duration(candidate, job)
        
        # 6. SHIFT PREFERENCE
        score += self._score_shift_preference(candidate, job)
        
        # 7. HOUSING PREFERENCE
        score += self._score_housing(candidate, job)
        
        return min(score, 100)
    
    def _score_specialty(self, candidate, job) -> int:
        """Score specialty match"""
        if not candidate.primary_specialty or not job.specialty_required:
            return 0
        
        # Perfect match
        if candidate.primary_specialty.lower() == job.specialty_required.lower():
            return 30
        
        # Check sub-specialties
        if candidate.sub_specialties:
            sub_specs = candidate.sub_specialties if isinstance(candidate.sub_specialties, list) else json.loads(candidate.sub_specialties)
            if job.specialty_required in [s for s in sub_specs]:
                return 25
        
        # Check if job accepts candidate's specialty
        if job.sub_specialties_accepted:
            accepted = job.sub_specialties_accepted if isinstance(job.sub_specialties_accepted, list) else json.loads(job.sub_specialties_accepted)
            if candidate.primary_specialty in accepted:
                return 20
        
        return 0
    
    def _score_location(self, candidate, job) -> int:
        """Score location preference match"""
        if not job.state:
            return 0
        
        if not candidate.preferred_states:
            return 10  
        
        preferred = candidate.preferred_states if isinstance(candidate.preferred_states, list) else json.loads(candidate.preferred_states)
        
        # Exact state match
        if job.state in preferred:
            return 25
        
        # Check regions
        if candidate.preferred_regions:
            regions = candidate.preferred_regions if isinstance(candidate.preferred_regions, list) else json.loads(candidate.preferred_regions)
            job_region = self._get_state_region(job.state)
            if job_region in regions:
                return 15
        
        return 0
    
    def _score_experience(self, candidate, job) -> int:
        """Score experience level match"""
        if not candidate.years_experience or not job.min_years_experience:
            return 10
        
        exp_diff = candidate.years_experience - job.min_years_experience
        
        if exp_diff >= 5:
            return 20 
        elif exp_diff >= 2:
            return 18  
        elif exp_diff >= 0:
            return 15  
        elif exp_diff >= -1:
            return 8   
        else:
            return 0   
    
    def _score_availability(self, candidate, job) -> int:
        """Score availability match"""
        if not candidate.availability_date or not job.start_date:
            return 5  
        
        avail_date = candidate.availability_date if isinstance(candidate.availability_date, date) else datetime.strptime(str(candidate.availability_date), '%Y-%m-%d').date()
        start_date = job.start_date if isinstance(job.start_date, date) else datetime.strptime(str(job.start_date), '%Y-%m-%d').date()
        
        days_diff = (start_date - avail_date).days
        
        if days_diff >= 0 and days_diff <= 7:
            return 15  
        elif days_diff > 7 and days_diff <= 14:
            return 12  
        elif days_diff > 14 and days_diff <= 30:
            return 8  
        elif days_diff < 0 and days_diff >= -7:
            return 10  
        else:
            return 0   
    
    def _score_contract_duration(self, candidate, job) -> int:
        """Score contract duration preference"""
        if not candidate.desired_contract_weeks or not job.contract_weeks:
            return 2  
        
        diff = abs(candidate.desired_contract_weeks - job.contract_weeks)
        
        if diff == 0:
            return 5  
        elif diff <= 4:
            return 3  
        else:
            return 1  
    
    def _score_shift_preference(self, candidate, job) -> int:
        """Score shift type preference"""
        if not hasattr(candidate, 'preferred_shift') or not candidate.preferred_shift or not job.shift_type:
            return 1  
        
        if candidate.preferred_shift.lower() == job.shift_type.lower():
            return 3
        
        return 0
    
    def _score_housing(self, candidate, job) -> int:
        """Score housing stipend match"""
        if not hasattr(candidate, 'needs_housing') or not candidate.needs_housing:
            return 1 
        
        if candidate.needs_housing and job.housing_stipend and job.housing_stipend > 0:
            return 2
        
        return 0
    
    # ==================== CUSTOM RULES ====================
    
    def _apply_matching_rules(self, candidate, job) -> Dict:
        """
        Apply custom matching rules
        Returns: {disqualified: bool, bonus_points: int, notes: [str]}
        """
        result = {
            'disqualified': False,
            'bonus_points': 0,
            'notes': []
        }
        
        # Get active rules
        rules = self.db.query(MatchingRule).filter(
            MatchingRule.is_active == True
        ).all()
        
        for rule in rules:
            # Evaluate rule conditions
            rule_applies = self._evaluate_rule_conditions(rule, candidate, job)
            
            if rule_applies:
                if rule.action == "disqualify":
                    result['disqualified'] = True
                    result['notes'].append(f"❌ {rule.rule_name}: {rule.description}")
                    return result  
                
                elif rule.action == "bonus":
                    result['bonus_points'] += rule.bonus_points or 0
                    result['notes'].append(f"✓ {rule.rule_name}: +{rule.bonus_points} points")
                
                elif rule.action == "penalty":
                    result['bonus_points'] -= abs(rule.bonus_points or 0)
                    result['notes'].append(f"⚠ {rule.rule_name}: {rule.bonus_points} points")
        
        return result
    
    def _evaluate_rule_conditions(self, rule, candidate, job) -> bool:
        """
        Evaluate if a rule's conditions are met
        """
        if not rule.conditions:
            return False
        
        conditions = rule.conditions if isinstance(rule.conditions, dict) else json.loads(rule.conditions)
        
        # condition evaluation
        for key, value in conditions.items():
            if key == "specialty_match_required" and value:
                if candidate.primary_specialty != job.specialty_required:
                    return True
            
            if key == "min_experience" and value:
                if candidate.years_experience < value:
                    return True
            
            if key == "state_required" and value:
                preferred = candidate.preferred_states if isinstance(candidate.preferred_states, list) else json.loads(candidate.preferred_states or '[]')
                if job.state not in preferred:
                    return True
        
        return False
    
    # ==================== MATCH DETAILS ====================
    
    def _get_match_details(self, candidate, job) -> Dict:
        """
        Generate detailed match explanation
        """
        details = {
            'specialty_match': False,
            'location_match': False,
            'experience_match': False,
            'availability_match': False,
            'reasons': [],
            'concerns': []
        }
        
        # Specialty
        if candidate.primary_specialty and job.specialty_required:
            if candidate.primary_specialty.lower() == job.specialty_required.lower():
                details['specialty_match'] = True
                details['reasons'].append(f"✓ Perfect specialty match: {candidate.primary_specialty}")
            else:
                details['concerns'].append(f"⚠ Specialty mismatch: {candidate.primary_specialty} vs {job.specialty_required}")
        
        # Location
        if job.state:
            preferred = candidate.preferred_states if isinstance(candidate.preferred_states, list) else json.loads(candidate.preferred_states or '[]')
            if job.state in preferred:
                details['location_match'] = True
                details['reasons'].append(f"✓ Preferred state: {job.state}")
            else:
                details['concerns'].append(f"⚠ Not in preferred states: {job.state}")
        
        # Experience
        if candidate.years_experience and job.min_years_experience:
            if candidate.years_experience >= job.min_years_experience:
                details['experience_match'] = True
                details['reasons'].append(f"✓ Meets experience requirement: {candidate.years_experience} years")
            else:
                details['concerns'].append(f"⚠ Below experience requirement: {candidate.years_experience} vs {job.min_years_experience} years")
        
        # Availability
        if candidate.availability_date and job.start_date:
            avail_date = candidate.availability_date if isinstance(candidate.availability_date, date) else datetime.strptime(str(candidate.availability_date), '%Y-%m-%d').date()
            start_date = job.start_date if isinstance(job.start_date, date) else datetime.strptime(str(job.start_date), '%Y-%m-%d').date()
            
            days_diff = (start_date - avail_date).days
            if days_diff >= 0 and days_diff <= 14:
                details['availability_match'] = True
                details['reasons'].append(f"✓ Available on time ({days_diff} days)")
            else:
                details['concerns'].append(f"⚠ Availability mismatch: {days_diff} days difference")
        
        return details
    
    # ==================== AUTOMATED WORKFLOWS ====================
    
    def scan_ending_assignments(self, days_threshold: int = 28) -> List[Dict]:
        """
        Scan assignments ending soon and create alerts with matched jobs
        """
        cutoff_date = date.today() + timedelta(days=days_threshold)
        
        ending_assignments = self.db.execute(
            select(Assignment).where(
                and_(
                    Assignment.status == "active",
                    Assignment.end_date <= cutoff_date,
                    Assignment.end_date >= date.today()
                )
            )
        ).scalars().all()
        
        results = []
        
        for assignment in ending_assignments:
            days_remaining = (assignment.end_date - date.today()).days
            
            # Create alert
            existing_alert = self.db.query(Alert).filter(
                and_(
                    Alert.alert_type == "contract_ending",
                    Alert.candidate_id == assignment.candidate_id,
                    Alert.is_read == False
                )
            ).first()
            
            if not existing_alert:
                alert = Alert(
                    alert_type="contract_ending",
                    candidate_id=assignment.candidate_id,
                    assignment_id=assignment.assignment_id,
                    priority="high" if days_remaining <= 14 else "normal",
                    title=f"Assignment ending in {days_remaining} days",
                    message=f"Time to find next placement for {assignment.candidate.full_name}!",
                    action_required=True,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                self.db.add(alert)
            
            # Find matching jobs
            matches = self.find_matches_for_candidate(assignment.candidate_id, min_score=60)
            
            results.append({
                'assignment': assignment,
                'candidate': assignment.candidate,
                'days_remaining': days_remaining,
                'potential_matches': matches[:5]
            })
        
        self.db.commit()
        return results
    
    def notify_new_job_matches(self, job_id: str, auto_send: bool = False) -> int:
        """
        Find matches for new job and create alerts/notifications
        """
        matches = self.find_matches_for_job(job_id, min_score=70)
        
        job = self.db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            return 0
        
        notifications_created = 0
        
        for match in matches[:10]:  
            candidate = match['candidate']
            
            # Create alert
            alert = Alert(
                alert_type="new_match",
                candidate_id=candidate.candidate_id,
                job_id=job_id,
                priority="high" if match['score'] >= 85 else "normal",
                title=f"New {job.specialty_required} opportunity",
                message=f"New {job.specialty_required} role in {job.state} - {match['score']}% match!",
                action_required=True,
                is_read=False,
                created_at=datetime.utcnow()
            )
            self.db.add(alert)
            
            # If auto_send, trigger email/SMS
            if auto_send:
                self._send_match_notification(candidate, job, match['score'])
            
            notifications_created += 1
        
        self.db.commit()
        return notifications_created
    
    def _send_match_notification(self, candidate, job, score):
        """
        Send email/SMS notification to candidate about match
        (Placeholder - integrate with email/SMS service)
        """
        # Create communication log
        comm_log = CommunicationLog(
            candidate_id=candidate.candidate_id,
            job_id=job.job_id,
            communication_type="email",
            direction="outbound",
            subject=f"New Opportunity: {job.specialty_required} in {job.state}",
            body=f"Hi {candidate.first_name}, we have a great opportunity for you...",
            template_used="new_match_notification",
            status="sent",
            created_at=datetime.utcnow()
        )
        self.db.add(comm_log)
        self.db.commit()
    
    # ==================== HELPER METHODS ====================
    
    def _get_state_region(self, state: str) -> str:
        """Map state to region"""
        regions = {
            'West Coast': ['CA', 'OR', 'WA'],
            'Mountain': ['CO', 'UT', 'AZ', 'NM', 'NV', 'ID', 'MT', 'WY'],
            'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
            'Northeast': ['NY', 'PA', 'NJ', 'CT', 'MA', 'VT', 'NH', 'ME', 'RI'],
            'Southeast': ['FL', 'GA', 'NC', 'SC', 'VA', 'TN', 'AL', 'MS', 'LA', 'AR', 'KY', 'WV'],
            'Southwest': ['TX', 'OK'],
        }
        
        for region, states in regions.items():
            if state in states:
                return region
        return "Other"
    
    def _is_in_blackout(self, check_date, blackout_dates) -> bool:
        """Check if date falls in blackout period"""
        blackouts = blackout_dates if isinstance(blackout_dates, list) else json.loads(blackout_dates or '[]')
        
        for blackout in blackouts:
            start = datetime.strptime(blackout['start'], '%Y-%m-%d').date()
            end = datetime.strptime(blackout['end'], '%Y-%m-%d').date()
            if start <= check_date <= end:
                return True
        return False
    
    # ==================== BATCH PROCESSING ====================
    
    def batch_match_all_candidates(self, min_score: int = 70) -> Dict:
        """
        Run matching for all active candidates against all open jobs
        """
        results = {
            'total_matches': 0,
            'candidates_processed': 0,
            'alerts_created': 0
        }
        
        # Use candidate_status with case-insensitive match
        candidates = self.db.query(Candidate).filter(
            Candidate.candidate_status.ilike("active")
        ).all()
        
        for candidate in candidates:
            matches = self.find_matches_for_candidate(candidate.candidate_id, min_score=min_score)
            results['candidates_processed'] += 1
            results['total_matches'] += len(matches)
            
            # Create alerts for top 3 matches
            for match in matches[:3]:
                existing_alert = self.db.query(Alert).filter(
                    and_(
                        Alert.alert_type == "new_match",
                        Alert.candidate_id == candidate.candidate_id,
                        Alert.job_id == match['job'].job_id,
                        Alert.is_read == False
                    )
                ).first()
                
                if not existing_alert:
                    alert = Alert(
                        alert_type="new_match",
                        candidate_id=candidate.candidate_id,
                        job_id=match['job'].job_id,
                        title=f"Great match: {match['job'].specialty_required}",
                        message=f"{match['score']}% compatibility - {match['job'].facility}, {match['job'].state}",
                        priority="normal",
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    self.db.add(alert)
                    results['alerts_created'] += 1
        
        self.db.commit()
        return results