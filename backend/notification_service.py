import os
from typing import Optional, Dict, Any
from datetime import datetime
import json

# Email imports 
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    print("⚠️  SendGrid not installed. Run: pip install sendgrid")

# SMS imports
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("⚠️  Twilio not installed. Run: pip install twilio")

# Template imports
from jinja2 import Template


class NotificationService:
    """Service for sending email and SMS notifications"""
    
    def __init__(self):
        # Email setup (SendGrid)
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@purplecow.com')
        
        if SENDGRID_AVAILABLE and self.sendgrid_api_key:
            self.sg_client = SendGridAPIClient(self.sendgrid_api_key)
        else:
            self.sg_client = None
            print("⚠️  SendGrid not configured. Set SENDGRID_API_KEY in .env")
        
        # SMS setup (Twilio)
        self.twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')
        
        if TWILIO_AVAILABLE and self.twilio_sid and self.twilio_token:
            self.twilio_client = Client(self.twilio_sid, self.twilio_token)
        else:
            self.twilio_client = None
            print("⚠️  Twilio not configured. Set TWILIO credentials in .env")
        
        # URLs
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000')
    
    # ==================== EMAIL NOTIFICATIONS ====================
    
    def send_match_notification(
        self, 
        candidate: Any, 
        job: Any, 
        score: int,
        response_token: str
    ) -> bool:
        """
        Send job match notification to candidate with Yes/No response buttons
        
        Args:
            candidate: Candidate object
            job: Job object
            score: Match score (0-100)
            response_token: JWT token for response tracking
        
        Returns:
            bool: True if sent successfully
        """
        if not self.sg_client:
            print("📧 Email simulation (SendGrid not configured)")
            print(f"   TO: {candidate.email}")
            print(f"   SUBJECT: New {job.specialty_required} Opportunity in {job.state}")
            print(f"   MATCH SCORE: {score}%")
            return False
        
        response_url = f"{self.backend_url}/api/candidate/response/{response_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎯 New Opportunity Matched for You!</h1>
            </div>
            
            <!-- Main Content -->
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 20px;">
                <h2 style="color: #1f2937; margin-top: 0;">Hi {candidate.first_name},</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Great news! We found an opportunity that matches your skills and preferences perfectly.
                </p>
                
                <!-- Job Details Card -->
                <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; margin: 30px 0;">
                    <h3 style="color: #667eea; margin-top: 0; font-size: 22px;">
                        {job.title or job.specialty_required}
                    </h3>
                    
                    <div style="margin: 20px 0;">
                        <div style="margin: 10px 0;">
                            <span style="color: #6b7280; font-weight: bold;">📍 Location:</span>
                            <span style="color: #1f2937; margin-left: 10px;">{job.facility}, {job.state}</span>
                        </div>
                        
                        <div style="margin: 10px 0;">
                            <span style="color: #6b7280; font-weight: bold;">💰 Weekly Pay:</span>
                            <span style="color: #1f2937; margin-left: 10px;">${job.pay_rate_weekly or 'Competitive'}</span>
                        </div>
                        
                        <div style="margin: 10px 0;">
                            <span style="color: #6b7280; font-weight: bold;">📅 Start Date:</span>
                            <span style="color: #1f2937; margin-left: 10px;">{job.start_date or 'Flexible'}</span>
                        </div>
                        
                        <div style="margin: 10px 0;">
                            <span style="color: #6b7280; font-weight: bold;">⏱️ Contract Duration:</span>
                            <span style="color: #1f2937; margin-left: 10px;">{job.contract_weeks} weeks</span>
                        </div>
                        
                        <div style="margin: 20px 0; padding: 15px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px;">
                            <span style="color: #065f46; font-weight: bold;">✨ Match Score:</span>
                            <span style="color: #059669; margin-left: 10px; font-size: 24px; font-weight: bold;">{score}%</span>
                        </div>
                    </div>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 40px 0;">
                    <p style="font-size: 18px; color: #1f2937; margin-bottom: 25px; font-weight: 600;">
                        Are you interested in this opportunity?
                    </p>
                    
                    <div style="margin: 20px 0;">
                        <a href="{response_url}?response=yes" 
                           style="display: inline-block; background: #10b981; color: white; padding: 16px 45px; 
                                  text-decoration: none; border-radius: 8px; margin: 10px; font-weight: bold; 
                                  font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                            ✓ YES, I'm Interested!
                        </a>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <a href="{response_url}?response=no" 
                           style="display: inline-block; background: #ef4444; color: white; padding: 16px 45px; 
                                  text-decoration: none; border-radius: 8px; margin: 10px; font-weight: bold; 
                                  font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">
                            ✗ Not Right Now
                        </a>
                    </div>
                </div>
                
                <!-- Additional Info -->
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 6px;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>💡 Quick Response Appreciated:</strong> This position is in high demand. 
                        Let us know your interest within 24 hours to secure your spot!
                    </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
                    Questions about this opportunity? Reply to this email or call us at <strong>(555) 123-4567</strong>. 
                    We're here to help!
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #1f2937; color: #9ca3af; padding: 30px 20px; text-align: center;">
                <p style="margin: 5px 0; font-size: 14px;">
                    <strong style="color: #e5e7eb;">Purple Cow Recruiting</strong>
                </p>
                <p style="margin: 5px 0; font-size: 13px;">
                    Travel Healthcare Staffing Excellence
                </p>
                <p style="margin: 15px 0 5px 0; font-size: 12px;">
                    © 2026 Purple Cow Recruiting. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=self.from_email,
            to_emails=candidate.email,
            subject=f"🎯 New {job.specialty_required} Opportunity in {job.state} - {score}% Match!",
            html_content=html_content
        )
        
        try:
            response = self.sg_client.send(message)
            print(f"✅ Match notification sent to {candidate.email}: Status {response.status_code}")
            return True
        except Exception as e:
            print(f"❌ Failed to send match notification: {str(e)}")
            return False
    
    def send_contract_ending_alert(
        self, 
        candidate: Any, 
        assignment: Any, 
        days_remaining: int
    ) -> bool:
        """
        Send contract ending alert to recruiter
        
        Args:
            candidate: Candidate object
            assignment: Assignment object
            days_remaining: Days until contract ends
        
        Returns:
            bool: True if sent successfully
        """
        if not self.sg_client:
            print("📧 Email simulation (SendGrid not configured)")
            print(f"   ALERT: {candidate.full_name}'s contract ends in {days_remaining} days")
            return False
        
        urgency = "URGENT" if days_remaining <= 7 else "ACTION REQUIRED"
        urgency_color = "#dc2626" if days_remaining <= 7 else "#f59e0b"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
            <!-- Header -->
            <div style="background: {urgency_color}; padding: 30px 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">⚠️ {urgency}: Contract Ending Soon</h2>
            </div>
            
            <!-- Content -->
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 20px;">
                <h3 style="color: #1f2937;">Action Required: Find Next Placement</h3>
                
                <div style="background: #fef3c7; padding: 20px; border-left: 4px solid {urgency_color}; margin: 25px 0; border-radius: 6px;">
                    <p style="margin: 8px 0;"><strong>Traveler:</strong> {candidate.full_name}</p>
                    <p style="margin: 8px 0;"><strong>Current Assignment:</strong> {assignment.job.facility if assignment.job else 'N/A'}, {assignment.job.state if assignment.job else 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>End Date:</strong> {assignment.end_date}</p>
                    <p style="margin: 8px 0;">
                        <strong>Days Remaining:</strong> 
                        <span style="color: {urgency_color}; font-weight: bold; font-size: 20px;">{days_remaining}</span>
                    </p>
                </div>
                
                <p style="color: #4b5563; line-height: 1.6;">
                    This traveler needs a new assignment soon. Log into the ATS to view matching opportunities 
                    and reach out to the candidate about their next placement.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{self.frontend_url}/matching" 
                       style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        View Matching Jobs →
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
                    This is an automated alert from Purple Cow Recruiting ATS.
                </p>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=self.from_email,
            to_emails=os.getenv('RECRUITER_EMAIL', 'recruiter@purplecow.com'),
            subject=f"⚠️ {urgency}: {candidate.full_name}'s contract ends in {days_remaining} days",
            html_content=html_content
        )
        
        try:
            response = self.sg_client.send(message)
            print(f"✅ Contract ending alert sent: Status {response.status_code}")
            return True
        except Exception as e:
            print(f"❌ Failed to send contract ending alert: {str(e)}")
            return False
    
    def send_document_expiring_alert(
        self,
        candidate: Any,
        document: Any,
        days_until_expiry: int
    ) -> bool:
        """Send document expiring alert to candidate and recruiter"""
        
        if not self.sg_client:
            print("📧 Email simulation")
            print(f"   ALERT: {candidate.full_name}'s {document.document_type} expires in {days_until_expiry} days")
            return False
        
        # Email to candidate
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
            <div style="background: #f59e0b; padding: 25px; text-align: center;">
                <h2 style="color: white; margin: 0;">📄 Document Renewal Required</h2>
            </div>
            
            <div style="max-width: 600px; margin: 0 auto; padding: 30px;">
                <h3>Hi {candidate.first_name},</h3>
                
                <p>Your <strong>{document.document_type}</strong> will expire soon and needs to be renewed.</p>
                
                <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                    <p><strong>Document:</strong> {document.document_type}</p>
                    <p><strong>Expires:</strong> {document.expiration_date}</p>
                    <p><strong>Days Remaining:</strong> <span style="color: #dc2626; font-weight: bold;">{days_until_expiry}</span></p>
                </div>
                
                <p>Please upload your renewed document to avoid any interruption in your assignments.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <a href="{self.frontend_url}/documents/upload" 
                       style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Upload Document
                    </a>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=self.from_email,
            to_emails=candidate.email,
            subject=f"⚠️ {document.document_type} Expires in {days_until_expiry} Days",
            html_content=html_content
        )
        
        try:
            response = self.sg_client.send(message)
            print(f"✅ Document expiring alert sent to {candidate.email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send document alert: {str(e)}")
            return False
    
    # ==================== SMS NOTIFICATIONS ====================
    
    def send_sms(self, phone: str, message: str) -> bool:
        """Send SMS notification"""
        
        if not self.twilio_client:
            print("📱 SMS simulation (Twilio not configured)")
            print(f"   TO: {phone}")
            print(f"   MESSAGE: {message}")
            return False
        
        try:
            sms = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=phone
            )
            print(f"✅ SMS sent to {phone}: {sms.sid}")
            return True
        except Exception as e:
            print(f"❌ Failed to send SMS: {str(e)}")
            return False
    
    def send_quick_match_sms(self, candidate: Any, job: Any, score: int) -> bool:
        """Send quick SMS notification about new match"""
        
        if not candidate.phone:
            return False
        
        message = f"""
🎯 New Job Match!

{job.specialty_required} in {job.state}
{score}% match for you

${job.pay_rate_weekly or 'Competitive'}/week
Start: {job.start_date or 'Flexible'}

Check your email for details!
- Purple Cow Recruiting
        """.strip()
        
        return self.send_sms(candidate.phone, message)


# Singleton instance
notification_service = NotificationService()


def get_notification_service() -> NotificationService:
    """Get notification service instance"""
    return notification_service