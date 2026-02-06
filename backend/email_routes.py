from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from email_service import send_opportunity_email

router = APIRouter(prefix="/api/email", tags=["email"])

class SendEmailRequest(BaseModel):
    """Request model for sending emails to candidates"""
    to_email: EmailStr
    candidate_name: str
    subject: str
    job_title: str
    facility_name: str
    location: str
    pay_rate: Optional[str] = None
    start_date: Optional[str] = None
    custom_message: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[EmailStr] = None
    recruiter_phone: Optional[str] = None

@router.post("/send-to-candidate")
async def send_email_to_candidate(email_data: SendEmailRequest):
    """
    Send a job opportunity email to a candidate
    
    Example request:
    ```json
    {
        "to_email": "candidate@email.com",
        "candidate_name": "John Doe",
        "subject": "Exciting Travel Nurse Opportunity",
        "job_title": "Travel RN - ICU",
        "facility_name": "Memorial Hospital",
        "location": "San Diego, CA",
        "pay_rate": "$2,500/week",
        "start_date": "2024-03-15",
        "custom_message": "Hi John! Based on your ICU experience, this would be perfect for you.",
        "recruiter_name": "Sarah Smith",
        "recruiter_email": "sarah@recruiter.com",
        "recruiter_phone": "555-1234"
    }
    ```
    """
    try:
        success = send_opportunity_email(
            candidate_email=email_data.to_email,
            candidate_name=email_data.candidate_name,
            job_title=email_data.job_title,
            facility_name=email_data.facility_name,
            location=email_data.location,
            pay_rate=email_data.pay_rate,
            start_date=email_data.start_date,
            custom_message=email_data.custom_message,
            recruiter_name=email_data.recruiter_name,
            recruiter_email=email_data.recruiter_email,
            recruiter_phone=email_data.recruiter_phone
        )
        
        if success:
            return {
                "success": True,
                "message": f"Email sent successfully to {email_data.to_email}"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Check server logs for details."
            )
            
    except Exception as e:
        print(f"❌ Error in send_email_to_candidate endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Email sending failed: {str(e)}"
        )