import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import Candidate, Credential, Job, Assignment, Expense, Document
from utils import normalize_phone, parse_date, generate_candidate_id
from datetime import datetime
from models import Job
import json
import traceback

def import_candidates_from_file(file_path: str, db: Session):
    print(f"→ Importing candidates from: {file_path}")

    try:
        df = pd.read_csv(file_path, dtype=str)
    except Exception as e:
        print(f"  ERROR reading file: {e}")
        return {"imported": 0, "skipped": 0, "errors": [str(e)]}

    df.columns = df.columns.str.strip().str.lower()

    required = ['email', 'first_name', 'last_name', 'primary_specialty']
    missing = [c for c in required if c not in df.columns]
    if missing:
        msg = f"Missing required columns: {', '.join(missing)}"
        print(f"  {msg}")
        return {"imported": 0, "skipped": 0, "errors": [msg]}
    df['email'] = df['email'].astype(str).str.strip().str.lower()
    df = df.drop_duplicates(subset=['email'], keep='first')

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        try:
            email = str(row['email']).strip()
            if not email or '@' not in email:
                errors.append(f"Row {row_num}: invalid email '{email}'")
                skipped += 1
                continue
            if db.query(Candidate).filter(Candidate.email.ilike(email)).first():
                skipped += 1
                continue

            phone = normalize_phone(str(row.get('phone', ''))) if pd.notna(row.get('phone')) else None

            avail_date = None
            if pd.notna(row.get('availability_date')):
                avail_date = parse_date(row['availability_date'])

            states = []
            if pd.notna(row.get('preferred_states')):
                val = str(row['preferred_states']).strip()
                if val:
                    states = [s.strip() for s in val.split(',') if s.strip()]

            cand_id = str(row.get('candidate_id', '')).strip() or generate_candidate_id()
            status_value = 'active'  
            if pd.notna(row.get('candidate_status')):
                status_value = str(row['candidate_status']).strip()
            elif pd.notna(row.get('status')):
                status_value = str(row['status']).strip()
            
            candidate = Candidate(
                candidate_id=cand_id,
                first_name=str(row.get('first_name', '')).strip(),
                last_name=str(row.get('last_name', '')).strip(),
                email=email,
                phone=phone,
                primary_specialty=str(row.get('primary_specialty', '')).strip(),
                years_experience=int(row['years_experience']) if pd.notna(row.get('years_experience')) else None,
                preferred_states=json.dumps(states) if states else None,
                availability_date=avail_date,
                desired_contract_weeks=int(row.get('desired_contract_weeks', 13)) if pd.notna(row.get('desired_contract_weeks')) else 13,
                candidate_status=status_value,  
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            db.add(candidate)
            db.flush()
            imported += 1

        except IntegrityError as ie:
            db.rollback()
            errors.append(f"Row {row_num}: IntegrityError - {str(ie)}")
            skipped += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped += 1

    db.commit()
    print(f"  → Imported: {imported} | Skipped: {skipped} | Errors: {len(errors)}")
    return {"imported": imported, "skipped": skipped, "errors": errors[:10]}


def import_credentials_from_file(file_path: str, db: Session):
    print(f"→ Importing credentials from: {file_path}")

    try:
        df = pd.read_csv(file_path, dtype=str)
    except Exception as e:
        return {"imported":0, "skipped":0, "errors":[str(e)]}

    df.columns = df.columns.str.strip().str.lower()

    required = ['credential_id', 'candidate_id', 'document_type']
    missing = [c for c in required if c not in df.columns]
    if missing:
        return {"imported":0, "skipped":0, "errors":[f"Missing: {', '.join(missing)}"]}

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        try:
            cred_id = str(row['credential_id']).strip()
            if not cred_id:
                skipped += 1
                continue

            if db.query(Credential).filter_by(credential_id=cred_id).first():
                skipped += 1
                continue

            cred = Credential(
                credential_id=cred_id,
                candidate_id=str(row['candidate_id']).strip(),
                document_type=str(row['document_type']).strip(),
                issue_date=parse_date(row.get('issue_date')),
                expiry_date=parse_date(row.get('expiry_date')),
                status=str(row.get('status', 'Unknown')).strip()
            )

            db.add(cred)
            db.flush()
            imported += 1

        except IntegrityError:
            db.rollback()
            skipped += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {e}")
            skipped += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors[:8]}


def import_jobs_from_file(file_path: str, db: Session):
    """
    Import jobs from CSV with ALL fields properly mapped
    
    🔧 FIXED: Now correctly imports shift details and compensation fields
    """
    
    print(f"\n📥 Importing jobs from {file_path}...")
    
    # Read CSV file
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            return {"imported": 0, "skipped": 0, "errors": ["Unsupported file format"]}
    except Exception as e:
        return {"imported": 0, "skipped": 0, "errors": [f"Error reading file: {str(e)}"]}
    print(f"📋 CSV Columns found: {df.columns.tolist()}")
    print(f"📊 Total rows to import: {len(df)}")
    
    imported = 0
    skipped = 0
    errors = []
    
    for index, row in df.iterrows():
        try:
            job_id = str(row.get('job_id', '')).strip()
            if not job_id:
                skipped += 1
                continue
            existing = db.query(Job).filter(Job.job_id == job_id).first()
            if existing:
                print(f"   ⚠️  Job {job_id} already exists, skipping...")
                skipped += 1
                continue
            floating_required = str(row.get('floating_required', 'No')).strip().lower() in ['yes', 'true', '1']
            call_required = str(row.get('call_required', 'No')).strip().lower() in ['yes', 'true', '1']
            extension_possible = str(row.get('extension_possible', 'No')).strip().lower() in ['yes', 'true', '1']
            def safe_float(value, default=None):
                """Safely convert to float, return None if empty"""
                if pd.isna(value) or value == '' or value is None:
                    return default
                try:
                    return float(value)
                except:
                    return default
            
            def safe_int(value, default=None):
                """Safely convert to int, return None if empty"""
                if pd.isna(value) or value == '' or value is None:
                    return default
                try:
                    return int(value)
                except:
                    return default
            start_date = None
            if pd.notna(row.get('start_date')):
                try:
                    start_date = pd.to_datetime(row['start_date']).date()
                except:
                    pass
            new_job = Job(
                job_id=job_id,
                
                # Basic Info
                title=str(row.get('title', '')) or None,
                specialty_required=str(row.get('specialty_required', '')),
                sub_specialties_accepted=json.dumps([]),  
                
                # Location
                facility=str(row.get('facility', '')),
                facility_type=str(row.get('facility_type', '')) or None,
                city=str(row.get('city', '')),
                state=str(row.get('state', '')),
                zip_code=str(row.get('zip_code', '')) or None,
                
                # 🔧 SHIFT & SCHEDULE (THE FIX IS HERE!)
                shift_type=str(row.get('shift_type', '')) or None,          
                shift_length=str(row.get('shift_length', '')) or None,      
                schedule=str(row.get('schedule', '')) or None,              
                floating_required=floating_required,                        
                call_required=call_required,                                 
                
                # Requirements
                min_years_experience=safe_int(row.get('min_years_experience'), 0),
                required_certifications=json.dumps([]), 
                required_licenses=json.dumps([]),
                special_requirements=None,
                
                # Contract Details
                contract_weeks=safe_int(row.get('contract_weeks'), 13),
                start_date=start_date,
                extension_possible=extension_possible,
                positions_available=safe_int(row.get('positions_available'), 1),
                
                # COMPENSATION 
                pay_rate_weekly=safe_float(row.get('pay_rate_weekly')),         
                pay_rate_hourly=safe_float(row.get('pay_rate_hourly')),       
                overtime_rate=safe_float(row.get('overtime_rate')),              
                housing_stipend=safe_float(row.get('housing_stipend')),          
                per_diem_daily=safe_float(row.get('per_diem_daily')),           
                travel_reimbursement=safe_float(row.get('travel_reimbursement')),
                sign_on_bonus=safe_float(row.get('sign_on_bonus')),              
                completion_bonus=safe_float(row.get('completion_bonus')),        
                
                # Benefits
                benefits=json.dumps([]),  
                
                # Facility Details
                unit_details=None,
                patient_ratio=None,
                parking=None,
                scrub_color=None,
                facility_rating=None,
                
                # Status
                status=str(row.get('status', 'Open')),
                urgency_level='normal',
                
                # Metadata
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            
            db.add(new_job)
            imported += 1
            
            # Print progress
            if imported % 10 == 0:
                print(f"   ✅ Imported {imported} jobs so far...")
            
        except Exception as e:
            error_msg = f"Row {index}: {str(e)}"
            errors.append(error_msg)
            print(f"   ❌ Error on row {index}: {str(e)}")
            continue
    
    # Commit all changes
    try:
        db.commit()
        print(f"\n✅ Import complete!")
        print(f"   📥 Imported: {imported}")
        print(f"   ⏭️  Skipped: {skipped}")
        if errors:
            print(f"   ❌ Errors: {len(errors)}")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Commit failed: {str(e)}")
        return {"imported": 0, "skipped": skipped, "errors": [str(e)]}
    
    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors
    }


def import_assignments_from_file(file_path: str, db: Session):
    print(f"→ Importing assignments from: {file_path}")

    df = pd.read_csv(file_path, dtype=str)
    df.columns = df.columns.str.strip().str.lower()

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        try:
            aid = str(row['assignment_id']).strip()
            if not aid:
                skipped += 1
                continue

            if db.query(Assignment).filter_by(assignment_id=aid).first():
                skipped += 1
                continue

            assign = Assignment(
                assignment_id=aid,
                candidate_id=str(row['candidate_id']).strip(),
                job_id=str(row['job_id']).strip(),
                start_date=parse_date(row.get('start_date')),
                end_date=parse_date(row.get('end_date')),
                status=str(row.get('status','Unknown')).strip()
            )

            db.add(assign)
            db.flush()
            imported += 1

        except IntegrityError:
            db.rollback()
            skipped += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {e}")
            skipped += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors[:8]}


def import_expenses_from_file(file_path: str, db: Session):
    """
    Import expenses from CSV file with strong validation for candidate_id
    - Skips rows with missing/invalid/'nan' candidate_id
    - Prevents foreign key violations
    - Handles assignment_id as optional
    """
    print(f"→ Importing expenses from: {file_path}")

    try:
        df = pd.read_csv(file_path, dtype=str)
    except Exception as e:
        return {"imported": 0, "skipped": 0, "errors": [str(e)]}

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # Required columns check
    required = ['expense_id', 'expense_type', 'amount', 'candidate_id']
    missing = [c for c in required if c not in df.columns]
    if missing:
        return {"imported": 0, "skipped": 0, "errors": [f"Missing required columns: {', '.join(missing)}"]}

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2  
        try:
            exp_id = str(row.get('expense_id', '')).strip()
            if not exp_id:
                errors.append(f"Row {row_num}: Missing expense_id → skipped")
                skipped += 1
                continue

            # Skip if already exists
            if db.query(Expense).filter_by(expense_id=exp_id).first():
                skipped += 1
                continue

            amount_raw = row.get('amount')
            if pd.isna(amount_raw) or str(amount_raw).strip() == '':
                errors.append(f"Row {row_num}: Missing or empty amount → skipped")
                skipped += 1
                continue

            try:
                amount_str = str(amount_raw).strip().replace('$', '').replace(',', '')
                amount = float(amount_str)
            except ValueError:
                errors.append(f"Row {row_num}: Invalid amount value '{amount_raw}' → skipped")
                skipped += 1
                continue

            # ───────────────────────────────────────────────
            # CANDIDATE_ID 
            # ───────────────────────────────────────────────
            candidate_id_raw = str(row.get('candidate_id', '')).strip()
            if pd.isna(row.get('candidate_id')):
                candidate_id_clean = ''
            else:
                candidate_id_clean = candidate_id_raw.lower().strip()
            invalid_patterns = {'', 'nan', 'na', 'n/a', '#n/a', 'none', 'null', 'unknown', 'n.a.', 'n-a'}

            if candidate_id_clean in invalid_patterns:
                errors.append(f"Row {row_num}: Invalid/missing candidate_id '{candidate_id_raw}' → skipped")
                skipped += 1
                continue
            if not candidate_id_raw.upper().startswith('C') or len(candidate_id_raw) < 5:
                errors.append(f"Row {row_num}: Suspicious candidate_id format '{candidate_id_raw}' → skipped")
                skipped += 1
                continue
            candidate_id = candidate_id_raw.strip()  

            # ───────────────────────────────────────────────
            # ASSIGNMENT_ID 
            # ───────────────────────────────────────────────
            assignment_id_raw = str(row.get('assignment_id', '')).strip()
            assignment_id = None

            if assignment_id_raw and assignment_id_raw.lower() not in invalid_patterns:
                assignment_id = assignment_id_raw.strip()

            # ───────────────────────────────────────────────
            # Create Expense object
            # ───────────────────────────────────────────────
            expense = Expense(
                expense_id=exp_id,
                expense_type=str(row.get('expense_type', '')).strip(),
                amount=amount,
                description=str(row.get('description', '')).strip() if pd.notna(row.get('description')) else None,
                candidate_id=candidate_id,
                assignment_id=assignment_id,
                status=str(row.get('status', 'pending')).strip().lower(),
                submitted_at=parse_date(row.get('submitted_at')),
                approved_at=parse_date(row.get('approved_at')) if pd.notna(row.get('approved_at')) else None
            )

            db.add(expense)
            db.flush()  
            imported += 1

            print(f"   Imported expense {exp_id} for candidate {candidate_id}")

        except IntegrityError as ie:
            db.rollback()
            errors.append(f"Row {row_num}: Foreign key / Integrity error - {str(ie)}")
            skipped += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped += 1

    # Final commit
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        errors.append(f"Final commit failed: {str(e)}")
        return {"imported": imported, "skipped": skipped, "errors": errors}

    print(f"  → Imported: {imported} | Skipped: {skipped} | Errors: {len(errors)}")
    return {"imported": imported, "skipped": skipped, "errors": errors[:15]}


def import_documents_from_file(file_path: str, db: Session):
    print(f"→ Importing documents from: {file_path}")

    try:
        df = pd.read_csv(file_path, dtype=str)
    except Exception as e:
        return {"imported": 0, "skipped": 0, "errors": [str(e)]}

    df.columns = df.columns.str.strip().str.lower()

    required = ['document_id', 'candidate_id', 'document_type', 'file_name']
    missing = [c for c in required if c not in df.columns]
    if missing:
        return {"imported": 0, "skipped": 0, "errors": [f"Missing: {', '.join(missing)}"]}

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        try:
            doc_id = str(row['document_id']).strip()
            if not doc_id:
                skipped += 1
                continue

            if db.query(Document).filter_by(document_id=doc_id).first():
                skipped += 1
                continue

            document = Document(
                document_id=doc_id,
                candidate_id=str(row.get('candidate_id', '')).strip(),
                document_type=str(row.get('document_type', '')).strip(),
                file_name=str(row.get('file_name', '')).strip(),
                file_path=str(row.get('file_path', '')).strip() if pd.notna(row.get('file_path')) else None,
                expiration_date=parse_date(row.get('expiration_date')) if pd.notna(row.get('expiration_date')) else None,
                status=str(row.get('status', 'pending')).strip(),
                notes=str(row.get('notes', '')).strip() if pd.notna(row.get('notes')) else None,
                uploaded_at=parse_date(row.get('uploaded_at')) if pd.notna(row.get('uploaded_at')) else datetime.utcnow()
            )

            db.add(document)
            db.flush()
            imported += 1

        except IntegrityError:
            db.rollback()
            skipped += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {e}")
            skipped += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors[:8]}