from database import SessionLocal
from models import Assignment, Alert, Candidate, Job, Document
from matching_engine import MatchingEngine
from datetime import date, timedelta, datetime
import sys

def generate_initial_alerts():
    """Generate alerts from existing data"""
    
    db = SessionLocal()
    engine = MatchingEngine(db)
    
    print("\n" + "="*60)
    print("🔍 SCANNING FOR ALERT-WORTHY EVENTS")
    print("="*60 + "\n")
    
    total_created = 0
    
    # ========================================
    # 1. CONTRACT ENDING ALERTS
    # ========================================
    print("1️⃣  Checking assignments ending soon...")
    today = date.today()
    threshold = today + timedelta(days=30)
    
    ending_assignments = db.query(Assignment).filter(
        Assignment.status.ilike("active"),
        Assignment.end_date.isnot(None),
        Assignment.end_date <= threshold,
        Assignment.end_date >= today
    ).all()
    
    print(f"   Found {len(ending_assignments)} assignments ending within 30 days")
    
    created_count = 0
    for assignment in ending_assignments:
        if not assignment.candidate:
            print(f"   ⚠️  Warning: Assignment {assignment.assignment_id} has no candidate")
            continue
            
        days_remaining = (assignment.end_date - today).days
        
        # Check if alert already exists
        existing = db.query(Alert).filter(
            Alert.alert_type == "contract_ending",
            Alert.candidate_id == assignment.candidate_id,
            Alert.assignment_id == assignment.assignment_id
        ).first()
        
        if not existing:
            alert = Alert(
                alert_type="contract_ending",
                candidate_id=assignment.candidate_id,
                assignment_id=assignment.assignment_id,
                priority="high" if days_remaining <= 14 else "normal",
                title=f"Contract ending in {days_remaining} days",
                message=f"{assignment.candidate.full_name}'s assignment at {assignment.job.facility if assignment.job else 'facility'} ends {assignment.end_date}. Find next placement!",
                action_required=True,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(alert)
            created_count += 1
            
            priority_emoji = "🔴" if days_remaining <= 14 else "🟡"
            print(f"   {priority_emoji} Created alert for {assignment.candidate.full_name} ({days_remaining} days remaining)")
    
    db.commit()
    total_created += created_count
    print(f"   ✅ Created {created_count} contract ending alerts\n")
    
    # ========================================
    # 2. NEW MATCH ALERTS
    # ========================================
    print("2️⃣  Finding job matches for active candidates...")
    active_candidates = db.query(Candidate).filter(
        Candidate.candidate_status.ilike("active")
    ).all()
    
    print(f"   Found {len(active_candidates)} active candidates")
    print(f"   Finding top matches for each candidate (this may take a moment)...")
    
    match_count = 0
    candidates_processed = 0
    max_candidates = 50  
    candidates_to_process = active_candidates[:max_candidates]
    
    for candidate in candidates_to_process:
        candidates_processed += 1
        
        try:
            # Find top matches 
            matches = engine.find_matches_for_candidate(candidate.candidate_id, min_score=70)
            
            # Create alerts
            for match in matches[:3]:
                job = match['job']
                
                # Check if alert already exists
                existing = db.query(Alert).filter(
                    Alert.alert_type == "new_match",
                    Alert.candidate_id == candidate.candidate_id,
                    Alert.job_id == job.job_id
                ).first()
                
                if not existing:
                    alert = Alert(
                        alert_type="new_match",
                        candidate_id=candidate.candidate_id,
                        job_id=job.job_id,
                        priority="high" if match['score'] >= 85 else "normal",
                        title=f"Great match: {job.specialty_required} in {job.state}",
                        message=f"{match['score']}% match for {candidate.full_name} - {job.facility}, {job.state}",
                        action_required=True,
                        is_read=False,
                        created_at=datetime.utcnow()
                    )
                    db.add(alert)
                    match_count += 1
            
            # Show progress every 10 candidates
            if candidates_processed % 10 == 0:
                print(f"   ... processed {candidates_processed}/{len(candidates_to_process)} candidates")
                
        except Exception as e:
            print(f"   ⚠️  Error processing {candidate.candidate_id}: {str(e)}")
            continue
    
    db.commit()
    total_created += match_count
    print(f"   ✅ Created {match_count} new match alerts for {candidates_processed} candidates\n")
    
    # ========================================
    # 3. DOCUMENT EXPIRING ALERTS
    # ========================================
    print("3️⃣  Checking expiring documents...")
    expiry_threshold = today + timedelta(days=30)
    
    expiring_docs = db.query(Document).filter(
        Document.expiration_date.isnot(None),
        Document.expiration_date <= expiry_threshold,
        Document.expiration_date >= today,
        Document.status != "expired"
    ).all()
    
    print(f"   Found {len(expiring_docs)} documents expiring within 30 days")
    
    doc_alert_count = 0
    for doc in expiring_docs:
        days_until_expiry = (doc.expiration_date - today).days
        
        # Check if alert already exists
        existing = db.query(Alert).filter(
            Alert.alert_type == "document_expiring",
            Alert.candidate_id == doc.candidate_id,
            Alert.created_at >= datetime.utcnow() - timedelta(days=7)  # Only check recent alerts
        ).first()
        
        if not existing:
            alert = Alert(
                alert_type="document_expiring",
                candidate_id=doc.candidate_id,
                priority="high" if days_until_expiry <= 7 else "normal",
                title=f"{doc.document_type} expiring soon",
                message=f"{doc.document_type} expires in {days_until_expiry} days - renewal needed for {doc.candidate.full_name if doc.candidate else 'candidate'}",
                action_required=True,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(alert)
            doc_alert_count += 1
            
            priority_emoji = "🔴" if days_until_expiry <= 7 else "🟡"
            print(f"   {priority_emoji} {doc.document_type} expires in {days_until_expiry} days")
    
    db.commit()
    total_created += doc_alert_count
    print(f"   ✅ Created {doc_alert_count} document expiration alerts\n")
    
    # ========================================
    # SUMMARY
    # ========================================
    print("="*60)
    print("🎉 ALERT GENERATION COMPLETE")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"   • Contract ending alerts:  {created_count}")
    print(f"   • New match alerts:        {match_count}")
    print(f"   • Document expiring alerts: {doc_alert_count}")
    print(f"   ─────────────────────────────")
    print(f"   📌 Total alerts created:    {total_created}")
    print(f"\n✅ Alerts are now visible in the dashboard!")
    print("="*60 + "\n")
    
    db.close()
    return total_created

def verify_alerts():
    """Verify that alerts were created successfully"""
    db = SessionLocal()
    
    print("\n🔍 Verifying alerts in database...")
    
    # Count by type
    from sqlalchemy import func
    results = db.query(
        Alert.alert_type,
        Alert.priority,
        func.count(Alert.alert_id).label('count')
    ).filter(
        Alert.is_read == False
    ).group_by(
        Alert.alert_type,
        Alert.priority
    ).all()
    
    print("\n📋 Unread Alerts by Type:")
    print("   " + "-"*50)
    
    total = 0
    for alert_type, priority, count in results:
        emoji = "🔴" if priority == "high" else "🟡"
        print(f"   {emoji} {alert_type:20} | {priority:8} | {count:3} alerts")
        total += count
    
    print("   " + "-"*50)
    print(f"   📌 Total unread alerts: {total}\n")
    
    db.close()
    return total

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PURPLE COW RECRUITING - ALERT GENERATION SCRIPT")
    print("="*60 + "\n")
    
    try:
        # Generate alerts
        total_created = generate_initial_alerts()
        
        # Verify creation
        if total_created > 0:
            total_unread = verify_alerts()
            
            if total_unread > 0:
                print("✅ SUCCESS! Alerts are ready to view in the dashboard.\n")
                sys.exit(0)
            else:
                print("⚠️  Warning: Alerts were created but none are showing as unread.\n")
                sys.exit(1)
        else:
            print("ℹ️  No new alerts were created (either no data or alerts already exist).\n")
            verify_alerts()
            sys.exit(0)
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)