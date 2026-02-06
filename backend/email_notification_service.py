import os
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Optional
import aiosmtplib
from dotenv import load_dotenv

load_dotenv()
# Email Configuration from .env
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL")
FROM_NAME = os.getenv("FROM_NAME", "Purple Cow Recruiting")


class EmailNotificationService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self.smtp_host = SMTP_HOST
        self.smtp_port = SMTP_PORT
        self.username = SMTP_USERNAME
        self.password = SMTP_PASSWORD
        self.from_email = FROM_EMAIL
        self.from_name = FROM_NAME
        
        # Validate configuration
        if not all([self.smtp_host, self.smtp_port, self.username, self.password]):
            print("⚠️  WARNING: Email configuration incomplete! Check your .env file.")
    
    async def send_email(
      self,
      to_email: str,
      subject: str,
      html_body: str,
      text_body: Optional[str] = None
  ) -> bool:
      try:
          message = MIMEMultipart("alternative")
          message["Subject"] = subject
          message["From"] = f"{self.from_name} <{self.from_email}>"
          message["To"] = to_email
          
          if text_body:
              message.attach(MIMEText(text_body, "plain"))
          message.attach(MIMEText(html_body, "html"))

          print(f"→ Trying to connect to {self.smtp_host}:{self.smtp_port} ...")

          async with aiosmtplib.SMTP(
              hostname=self.smtp_host,
              port=self.smtp_port,
              timeout=15,
              use_tls=False                
          ) as smtp:
              print("  Connected → starting TLS...")
              print("  TLS already active / login next...")
              await smtp.login(self.username, self.password)
              print("  Logged in → sending message...")
              await smtp.send_message(message)
          
          print(f"✅ Email sent successfully to {to_email}")
          return True

      except Exception as e:
          print(f"❌ Failed to send email to {to_email}: {type(e).__name__}: {str(e)}")
          import traceback
          traceback.print_exc()
          return False
    # ==================== ALERT EMAIL TEMPLATES ====================
    
    async def send_contract_ending_alert(
        self,
        recruiter_email: str,
        candidate_name: str,
        facility: str,
        location: str,
        end_date: str,
        days_remaining: int,
        candidate_id: str,
        assignment_id: str
    ):
        """Send email about contract ending soon"""
        
        subject = f"🔔 Contract Ending Alert: {candidate_name} ({days_remaining} days)"
        
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">⏰ Contract Ending Soon</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; margin-top: 20px; border-radius: 10px;">
                <h2 style="color: #667eea; margin-top: 0;">Candidate Assignment Ending</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>👤 Candidate:</strong> {candidate_name}</p>
                  <p style="margin: 10px 0;"><strong>🏥 Facility:</strong> {facility}</p>
                  <p style="margin: 10px 0;"><strong>📍 Location:</strong> {location}</p>
                  <p style="margin: 10px 0;"><strong>📅 End Date:</strong> {end_date}</p>
                  <p style="margin: 10px 0;">
                    <strong style="color: {'#dc2626' if days_remaining <= 14 else '#f59e0b'};">
                      ⏳ Days Remaining: {days_remaining}
                    </strong>
                  </p>
                </div>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; 
                            padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
                  <p style="margin: 5px 0 0 0;">
                    Contact {candidate_name} to discuss their next placement or contract extension.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="http://localhost:3000/candidates/{candidate_id}" 
                     style="background: #667eea; color: white; padding: 12px 30px; 
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    View Candidate Profile
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
                <p>Purple Cow Recruiting - Travel Healthcare ATS</p>
                <p>This is an automated alert from your recruitment system.</p>
              </div>
              
            </div>
          </body>
        </html>
        """
        
        await self.send_email(recruiter_email, subject, html_body)
    
    async def send_document_expiring_alert(
        self,
        candidate_email: str,
        candidate_name: str,
        document_type: str,
        expiration_date: str,
        days_until_expiry: int
    ):
        """Send email about document expiring soon"""
        
        subject = f"🔔 Document Expiring: {document_type} ({days_until_expiry} days)"
        
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); 
                          color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">📄 Document Expiring Soon</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; margin-top: 20px; border-radius: 10px;">
                <h2 style="color: #ef4444; margin-top: 0;">Hi {candidate_name},</h2>
                
                <p>Your {document_type} is expiring soon and needs to be renewed.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>📋 Document:</strong> {document_type}</p>
                  <p style="margin: 10px 0;"><strong>📅 Expiration Date:</strong> {expiration_date}</p>
                  <p style="margin: 10px 0;">
                    <strong style="color: {'#dc2626' if days_until_expiry <= 7 else '#f59e0b'};">
                      ⏳ Days Remaining: {days_until_expiry}
                    </strong>
                  </p>
                </div>
                
                <div style="background: #fee2e2; border-left: 4px solid #ef4444; 
                            padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
                  <p style="margin: 5px 0 0 0;">
                    Please renew your {document_type} before it expires to avoid any interruption 
                    in your assignments.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <p>Contact your recruiter if you need assistance with the renewal process.</p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
                <p>Purple Cow Recruiting - Travel Healthcare ATS</p>
                <p>This is an automated reminder from your recruitment system.</p>
              </div>
              
            </div>
          </body>
        </html>
        """
        
        await self.send_email(candidate_email, subject, html_body)
    
    async def send_new_match_alert(
        self,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        facility: str,
        location: str,
        match_score: int,
        weekly_pay: Optional[float],
        contract_weeks: Optional[int],
        start_date: Optional[str],
        job_id: str
    ):
        """Send email about new job match"""
        
        subject = f"🎯 New Job Match: {job_title} in {location} ({match_score}% match)"
        
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                          color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🎯 Great Job Match Found!</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; margin-top: 20px; border-radius: 10px;">
                <h2 style="color: #10b981; margin-top: 0;">Hi {candidate_name},</h2>
                
                <p>We found an excellent opportunity that matches your preferences!</p>
                
                <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0;
                            border-left: 5px solid #10b981;">
                  <h3 style="margin-top: 0; color: #10b981;">{job_title}</h3>
                  <p style="margin: 10px 0;"><strong>🏥 Facility:</strong> {facility}</p>
                  <p style="margin: 10px 0;"><strong>📍 Location:</strong> {location}</p>
                  {f'<p style="margin: 10px 0;"><strong>💰 Weekly Pay:</strong> ${weekly_pay:,.0f}</p>' if weekly_pay else ''}
                  {f'<p style="margin: 10px 0;"><strong>📅 Contract Length:</strong> {contract_weeks} weeks</p>' if contract_weeks else ''}
                  {f'<p style="margin: 10px 0;"><strong>🚀 Start Date:</strong> {start_date}</p>' if start_date else ''}
                  
                  <div style="background: #d1fae5; padding: 10px; border-radius: 5px; margin-top: 15px;">
                    <p style="margin: 0; text-align: center;">
                      <strong style="color: #059669; font-size: 18px;">
                        ⭐ {match_score}% Match Score
                      </strong>
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="http://localhost:3000/jobs/{job_id}" 
                     style="background: #10b981; color: white; padding: 15px 40px; 
                            text-decoration: none; border-radius: 5px; display: inline-block;
                            font-weight: bold; font-size: 16px;">
                    View Job Details
                  </a>
                </div>
                
                <div style="background: #e0f2fe; border-left: 4px solid #0284c7; 
                            padding: 15px; margin: 30px 0; border-radius: 5px;">
                  <p style="margin: 0;"><strong>📞 Interested?</strong></p>
                  <p style="margin: 5px 0 0 0;">
                    Reply to this email or call us to learn more about this opportunity!
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
                <p>Purple Cow Recruiting - Travel Healthcare ATS</p>
                <p>Finding the perfect match for your travel healthcare career.</p>
              </div>
              
            </div>
          </body>
        </html>
        """
        
        await self.send_email(candidate_email, subject, html_body)
    
    async def send_candidate_status_alert(
        self,
        recruiter_email: str,
        candidate_name: str,
        candidate_id: str,
        status: str,
        reason: Optional[str] = None
    ):
        """Send email about candidate status change"""
        
        status_emoji = {
            'pending': '⏳',
            'inactive': '💤',
            'active': '✅',
            'expired': '⚠️',
            'passed': '✅'
        }
        
        subject = f"{status_emoji.get(status, '🔔')} Candidate Status: {candidate_name} - {status.upper()}"
        
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">
                  {status_emoji.get(status, '🔔')} Candidate Status Update
                </h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; margin-top: 20px; border-radius: 10px;">
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>👤 Candidate:</strong> {candidate_name}</p>
                  <p style="margin: 10px 0;"><strong>📊 Status:</strong> {status.upper()}</p>
                  {f'<p style="margin: 10px 0;"><strong>📝 Reason:</strong> {reason}</p>' if reason else ''}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="http://localhost:3000/candidates/{candidate_id}" 
                     style="background: #667eea; color: white; padding: 12px 30px; 
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    View Candidate Profile
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
                <p>Purple Cow Recruiting - Travel Healthcare ATS</p>
              </div>
              
            </div>
          </body>
        </html>
        """
        
        await self.send_email(recruiter_email, subject, html_body)


# Create singleton instance
email_service = EmailNotificationService()


# Helper function for synchronous code
def send_email_sync(to_email: str, subject: str, html_body: str):
    """Synchronous wrapper for sending emails"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(
        email_service.send_email(to_email, subject, html_body)
    )
    loop.close()
    return result