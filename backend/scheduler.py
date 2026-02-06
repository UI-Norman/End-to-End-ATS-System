from email_notification_service import email_service
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal
from matching_engine import MatchingEngine
from notification_service import get_notification_service
from datetime import datetime, date, timedelta
from models import Alert, Assignment, Document
import traceback


def scan_ending_assignments_job():
    """
    Daily job to scan for assignments ending soon
    Creates alerts and sends notifications to recruiters
    """
    print(f"\n{'='*60}")
    print(f"📊 AUTOMATED SCAN: Assignments Ending Soon")
    print(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    db = SessionLocal()
    
    try:
        engine = MatchingEngine(db)
        results = engine.scan_ending_assignments(days_threshold=28)
        
        print(f"📊 Found {len(results)} assignments ending soon\n")
        for result in results:
            assignment = result['assignment']
            candidate = result['candidate']
            days_remaining = result['days_remaining']
            matches = result['potential_matches']
            
            print(f"   👤 {candidate.full_name}")
            print(f"      • Contract ends: {assignment.end_date} ({days_remaining} days)")
            print(f"      • Potential matches: {len(matches)}")
            
            # Send email notification if assignment is ending very soon
            if days_remaining <= 14:
                try:
                    # Get recruiter email from environment 
                    recruiter_email = os.getenv("RECRUITER_EMAIL", "recruiter@purplecow.com")
                    
                    # Send email using async
                    asyncio.run(email_service.send_contract_ending_alert(
                        recruiter_email=recruiter_email,
                        candidate_name=candidate.full_name,
                        facility=assignment.job.facility if assignment.job else "Unknown",
                        location=f"{assignment.job.city}, {assignment.job.state}" if assignment.job else "Unknown",
                        end_date=str(assignment.end_date),
                        days_remaining=days_remaining,
                        candidate_id=candidate.candidate_id,
                        assignment_id=assignment.assignment_id
                    ))
                    print(f"      ✅ Email alert sent to recruiter")
                except Exception as e:
                    print(f"      ⚠️  Failed to send email: {str(e)}")
        
        print(f"\n✅ Scan completed successfully")
        
    except Exception as e:
        print(f"\n❌ ERROR during scan:")
        print(f"   {str(e)}")
        traceback.print_exc()
    
    finally:
        db.close()
        print(f"{'='*60}\n")

def scan_expiring_documents_job():
    """
    Daily job to check for expiring credentials and documents
    Creates alerts and sends renewal reminders
    """
    print(f"\n{'='*60}")
    print(f"📄 AUTOMATED SCAN: Expiring Documents")
    print(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    db = SessionLocal()
    
    try:
        notification_service = get_notification_service()
        
        # Find documents expiring 
        today = date.today()
        threshold = today + timedelta(days=30)
        
        expiring_docs = db.query(Document).filter(
            Document.expiration_date.isnot(None),
            Document.expiration_date <= threshold,
            Document.expiration_date >= today,
            Document.status != "expired"
        ).all()
        
        print(f"📊 Found {len(expiring_docs)} documents expiring soon\n")
        
        alerts_created = 0
        notifications_sent = 0
        
        for doc in expiring_docs:
            days_until_expiry = (doc.expiration_date - today).days
            
            print(f"   📄 {doc.document_type}")
            print(f"      • Candidate: {doc.candidate.full_name if doc.candidate else 'Unknown'}")
            print(f"      • Expires: {doc.expiration_date} ({days_until_expiry} days)")
            
            # Check if alert already exists recently
            existing_alert = db.query(Alert).filter(
                Alert.alert_type == "document_expiring",
                Alert.candidate_id == doc.candidate_id,
                Alert.created_at >= datetime.utcnow() - timedelta(days=7)
            ).first()
            
            if not existing_alert:
                # Create alert
                alert = Alert(
                    alert_type="document_expiring",
                    candidate_id=doc.candidate_id,
                    priority="high" if days_until_expiry <= 7 else "normal",
                    title=f"{doc.document_type} expiring soon",
                    message=f"{doc.document_type} expires in {days_until_expiry} days - renewal needed",
                    action_required=True,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                db.add(alert)
                alerts_created += 1
                print(f"      ✅ Alert created")
                
                # Send notification if expiring very soon 
                if days_until_expiry <= 7 and doc.candidate:
                    try:
                        notification_service.send_document_expiring_alert(
                            candidate=doc.candidate,
                            document=doc,
                            days_until_expiry=days_until_expiry
                        )
                        notifications_sent += 1
                        print(f"      ✅ Notification sent to candidate")
                    except Exception as e:
                        print(f"      ⚠️  Failed to send notification: {str(e)}")
            else:
                print(f"      ℹ️  Alert already exists (created recently)")
        
        db.commit()
        
        print(f"\n📊 Summary:")
        print(f"   • Alerts created: {alerts_created}")
        print(f"   • Notifications sent: {notifications_sent}")
        print(f"\n✅ Document scan completed successfully")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR during document scan:")
        print(f"   {str(e)}")
        traceback.print_exc()
    
    finally:
        db.close()
        print(f"{'='*60}\n")


def batch_matching_job():
    """
    Weekly job to run batch matching for all active candidates
    Finds new opportunities and creates match alerts
    """
    print(f"\n{'='*60}")
    print(f"🎯 AUTOMATED BATCH MATCHING")
    print(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    db = SessionLocal()
    
    try:
        engine = MatchingEngine(db)
        
        # Run batch matching with 70% minimum score
        results = engine.batch_match_all_candidates(min_score=70)
        
        print(f"📊 Batch Matching Results:")
        print(f"   • Candidates processed: {results['candidates_processed']}")
        print(f"   • Total matches found: {results['total_matches']}")
        print(f"   • Alerts created: {results['alerts_created']}")
        print(f"\n✅ Batch matching completed successfully")
        
    except Exception as e:
        print(f"\n❌ ERROR during batch matching:")
        print(f"   {str(e)}")
        traceback.print_exc()
    
    finally:
        db.close()
        print(f"{'='*60}\n")


def cleanup_old_alerts_job():
    """
    Weekly job to clean up old read alerts
    Keeps database lean by archiving or deleting old alerts
    """
    print(f"\n{'='*60}")
    print(f"🧹 AUTOMATED CLEANUP: Old Alerts")
    print(f"   Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    db = SessionLocal()
    
    try:
        # Delete read alerts older than 90 days
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        deleted_count = db.query(Alert).filter(
            Alert.is_read == True,
            Alert.created_at < cutoff_date
        ).delete()
        
        db.commit()
        
        print(f"📊 Deleted {deleted_count} old alerts (read & >90 days old)")
        print(f"\n✅ Cleanup completed successfully")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR during cleanup:")
        print(f"   {str(e)}")
        traceback.print_exc()
    
    finally:
        db.close()
        print(f"{'='*60}\n")


def start_scheduler():
    """
    Start the background scheduler with all automated jobs
    """
    print("\n" + "="*60)
    print("🚀 STARTING BACKGROUND SCHEDULER")
    print("="*60 + "\n")
    
    scheduler = BackgroundScheduler()
    
    # Job 1: Scan ending assignments
    scheduler.add_job(
        scan_ending_assignments_job,
        CronTrigger(hour=9, minute=0),
        id='scan_ending_assignments',
        name='Scan Ending Assignments',
        replace_existing=True
    )
    print("✅ Scheduled: Scan Ending Assignments (Daily at 9:00 AM)")
    
    # Job 2: Scan expiring documents 
    scheduler.add_job(
        scan_expiring_documents_job,
        CronTrigger(hour=8, minute=0),
        id='scan_expiring_documents',
        name='Scan Expiring Documents',
        replace_existing=True
    )
    print("✅ Scheduled: Scan Expiring Documents (Daily at 8:00 AM)")
    
    # Job 3: Batch matching
    scheduler.add_job(
        batch_matching_job,
        CronTrigger(day_of_week='mon', hour=7, minute=0),
        id='batch_matching',
        name='Weekly Batch Matching',
        replace_existing=True
    )
    print("✅ Scheduled: Batch Matching (Weekly on Monday at 7:00 AM)")
    
    # Job 4: Cleanup old alerts
    scheduler.add_job(
        cleanup_old_alerts_job,
        CronTrigger(day_of_week='sun', hour=2, minute=0),
        id='cleanup_alerts',
        name='Cleanup Old Alerts',
        replace_existing=True
    )
    print("✅ Scheduled: Cleanup Old Alerts (Weekly on Sunday at 2:00 AM)")
    
    # Start the scheduler
    scheduler.start()
    
    print("\n" + "="*60)
    print("✅ SCHEDULER RUNNING")
    print("="*60)
    print("\n📋 Active Jobs:")
    
    for job in scheduler.get_jobs():
        print(f"   • {job.name}")
        print(f"     ID: {job.id}")
        print(f"     Next run: {job.next_run_time}")
        print()
    
    print("="*60 + "\n")
    
    return scheduler


def run_job_manually(job_name: str):
    """
    Manually run a scheduled job for testing
    
    Args:
        job_name: Name of the job to run
                 Options: 'assignments', 'documents', 'matching', 'cleanup'
    """
    jobs = {
        'assignments': scan_ending_assignments_job,
        'documents': scan_expiring_documents_job,
        'matching': batch_matching_job,
        'cleanup': cleanup_old_alerts_job
    }
    
    if job_name not in jobs:
        print(f"❌ Unknown job: {job_name}")
        print(f"   Available jobs: {', '.join(jobs.keys())}")
        return
    
    print(f"\n🔧 Manually running job: {job_name}")
    jobs[job_name]()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        job_name = sys.argv[1]
        run_job_manually(job_name)
    else:
        print("\n" + "="*60)
        print("SCHEDULER TEST MODE")
        print("="*60 + "\n")
        print("Usage: python scheduler.py [job_name]")
        print("\nAvailable jobs:")
        print("  • assignments  - Scan ending assignments")
        print("  • documents    - Scan expiring documents")
        print("  • matching     - Run batch matching")
        print("  • cleanup      - Clean up old alerts")
        print("\nExample:")
        print("  python scheduler.py assignments")
        print("\n" + "="*60 + "\n")