import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Email configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "Healthcare Recruiting")

def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None
) -> bool:
    """
    Send an email via SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        body_html: HTML content of the email
        body_text: Plain text version (optional, will strip HTML if not provided)
        from_email: Sender email (defaults to FROM_EMAIL from env)
        from_name: Sender name (defaults to FROM_NAME from env)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    # Validate SMTP configuration
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("❌ ERROR: SMTP credentials not configured in .env file")
        return False
    sender_email = from_email or FROM_EMAIL
    sender_name = from_name or FROM_NAME
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{sender_name} <{sender_email}>"
        msg['To'] = to_email
        if body_text:
            part1 = MIMEText(body_text, 'plain')
            msg.attach(part1)
        part2 = MIMEText(body_html, 'html')
        msg.attach(part2)
        print(f"📧 Connecting to SMTP server: {SMTP_SERVER}:{SMTP_PORT}")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.ehlo()
        server.starttls() 
        server.ehlo()
        
        # Login
        print(f"🔐 Logging in as: {SMTP_USERNAME}")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        # Send email
        print(f"✉️ Sending email to: {to_email}")
        server.send_message(msg)
        server.quit()
        
        print("✅ Email sent successfully!")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ ERROR: SMTP authentication failed. Check your username/password.")
        print("   For Gmail: Make sure you're using an App Password, not your regular password")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ ERROR: SMTP error occurred: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ ERROR: Failed to send email: {str(e)}")
        return False


def send_opportunity_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    facility_name: str,
    location: str,
    pay_rate: Optional[str] = None,
    start_date: Optional[str] = None,
    custom_message: Optional[str] = None,
    recruiter_name: Optional[str] = None,
    recruiter_email: Optional[str] = None,
    recruiter_phone: Optional[str] = None
) -> bool:
    """
    Send a job opportunity email to a candidate
    
    Args:
        candidate_email: Candidate's email address
        candidate_name: Candidate's full name
        job_title: Job position title
        facility_name: Healthcare facility name
        location: Job location (city, state)
        pay_rate: Hourly or weekly pay rate (optional)
        start_date: Job start date (optional)
        custom_message: Additional message from recruiter (optional)
        recruiter_name: Recruiter's name (optional)
        recruiter_email: Recruiter's email (optional)
        recruiter_phone: Recruiter's phone (optional)
    
    Returns:
        bool: True if email sent successfully
    """
    
    subject = f"Exciting Travel Healthcare Opportunity: {job_title} in {location}"
    
    # Build HTML email
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
            }}
            .content {{
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e2e8f0;
                border-top: none;
            }}
            .job-details {{
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .job-details h2 {{
                margin-top: 0;
                color: #6366f1;
                font-size: 20px;
            }}
            .detail-row {{
                display: flex;
                padding: 10px 0;
                border-bottom: 1px solid #e2e8f0;
            }}
            .detail-row:last-child {{
                border-bottom: none;
            }}
            .detail-label {{
                font-weight: 600;
                color: #64748b;
                width: 140px;
            }}
            .detail-value {{
                color: #1e293b;
            }}
            .custom-message {{
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
            }}
            .footer {{
                background: #f8fafc;
                padding: 20px;
                border-radius: 0 0 10px 10px;
                text-align: center;
                font-size: 14px;
                color: #64748b;
            }}
            .recruiter-info {{
                margin-top: 20px;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏥 New Travel Healthcare Opportunity</h1>
        </div>
        
        <div class="content">
            <p>Hi {candidate_name},</p>
            
            <p>We have an exciting travel healthcare opportunity that matches your profile!</p>
            
            <div class="job-details">
                <h2>{job_title}</h2>
                <div class="detail-row">
                    <div class="detail-label">Facility:</div>
                    <div class="detail-value">{facility_name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Location:</div>
                    <div class="detail-value">📍 {location}</div>
                </div>
                {f'''<div class="detail-row">
                    <div class="detail-label">Pay Rate:</div>
                    <div class="detail-value">💰 {pay_rate}</div>
                </div>''' if pay_rate else ''}
                {f'''<div class="detail-row">
                    <div class="detail-label">Start Date:</div>
                    <div class="detail-value">📅 {start_date}</div>
                </div>''' if start_date else ''}
            </div>
            
            {f'''<div class="custom-message">
                <strong>Message from your recruiter:</strong><br>
                {custom_message}
            </div>''' if custom_message else ''}
            
            <p>This position is a great match for your skills and experience. We'd love to discuss this opportunity with you!</p>
            
            <center>
                <a href="mailto:{recruiter_email or FROM_EMAIL}?subject=RE: {job_title} Opportunity" class="cta-button">
                    📧 Express Interest
                </a>
            </center>
            
            {f'''<div class="recruiter-info">
                <strong>Your Recruiter:</strong><br>
                {recruiter_name or "Healthcare Recruiting Team"}<br>
                {f"📧 {recruiter_email}" if recruiter_email else ""}<br>
                {f"📞 {recruiter_phone}" if recruiter_phone else ""}
            </div>''' if recruiter_name or recruiter_email or recruiter_phone else ''}
        </div>
        
        <div class="footer">
            <p>This email was sent by your healthcare recruiting team.</p>
            <p style="font-size: 12px; color: #94a3b8;">
                If you're no longer interested in travel healthcare opportunities, please let us know.
            </p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Hi {candidate_name},
    
    We have an exciting travel healthcare opportunity that matches your profile!
    
    Position: {job_title}
    Facility: {facility_name}
    Location: {location}
    {f"Pay Rate: {pay_rate}" if pay_rate else ""}
    {f"Start Date: {start_date}" if start_date else ""}
    
    {f"Message from your recruiter:\n{custom_message}\n" if custom_message else ""}
    
    This position is a great match for your skills and experience. We'd love to discuss this opportunity with you!
    
    Please reply to this email to express your interest.
    
    {f"Your Recruiter: {recruiter_name}" if recruiter_name else ""}
    {f"Email: {recruiter_email}" if recruiter_email else ""}
    {f"Phone: {recruiter_phone}" if recruiter_phone else ""}
    """
    
    return send_email(
        to_email=candidate_email,
        subject=subject,
        body_html=html_body,
        body_text=text_body
    )