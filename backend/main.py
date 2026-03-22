from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
import pdfplumber
import httpx
import json
import hashlib
import jwt
import io
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

load_dotenv()

app = FastAPI(title="AI Recruitment Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase setup
if not firebase_admin._apps:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("FIREBASE_PRIVATE_KEY"),
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
        "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    })
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Gemini setup
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# JWT setup
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # "candidate" or "hr"
    github_username: Optional[str] = None
    leetcode_username: Optional[str] = None
    linkedin_url: Optional[str] = None

class User(BaseModel):
    email: EmailStr
    role: str
    github_username: Optional[str] = None
    leetcode_username: Optional[str] = None
    linkedin_url: Optional[str] = None

class JobCreate(BaseModel):
    title: str
    location: str
    work_mode: str
    job_description: str
    required_skills: List[str]

class Job(BaseModel):
    id: str
    title: str
    location: str
    work_mode: str
    job_description: str
    required_skills: List[str]
    posted_by: str
    posted_at: datetime

class Application(BaseModel):
    job_id: str
    candidate_email: str
    resume_text: str
    status: str = "pending"

class AssessmentResult(BaseModel):
    round_number: int
    score: Optional[int] = None
    passed: bool
    feedback: Optional[str] = None
    questions: Optional[List[str]] = None
    answers: Optional[List[str]] = None

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user_doc = db.collection("users").document(email).get()
    if not user_doc.exists:
        raise credentials_exception
    
    return user_doc.to_dict()

# Auth endpoints
@app.post("/register")
async def register(user: UserCreate):
    # Check if user already exists
    user_doc = db.collection("users").document(user.email).get()
    if user_doc.exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user.password)
    
    # Store user
    user_data = {
        "email": user.email,
        "password": hashed_password,
        "role": user.role,
        "github_username": user.github_username,
        "leetcode_username": user.leetcode_username,
        "linkedin_url": user.linkedin_url,
        "created_at": datetime.utcnow()
    }
    
    db.collection("users").document(user.email).set(user_data)
    
    return {"message": "User registered successfully"}

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_doc = db.collection("users").document(form_data.username).get()
    if not user_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = user_doc.to_dict()
    if not verify_password(form_data.password, user_data["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user_data["role"],
        "email": user_data["email"]
    }

@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Job endpoints
@app.post("/jobs")
async def create_job(job: JobCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can post jobs")
    
    job_data = {
        "title": job.title,
        "location": job.location,
        "work_mode": job.work_mode,
        "job_description": job.job_description,
        "required_skills": job.required_skills,
        "posted_by": current_user["email"],
        "posted_at": datetime.utcnow()
    }
    
    job_ref = db.collection("jobs").add(job_data)
    
    return {"message": "Job posted successfully", "job_id": job_ref[1].id}

@app.get("/jobs")
async def get_jobs():
    jobs = []
    job_docs = db.collection("jobs").stream()
    
    for doc in job_docs:
        job_data = doc.to_dict()
        job_data["id"] = doc.id
        jobs.append(job_data)
    
    return jobs

@app.get("/jobs/{job_id}/applicants")
async def get_job_applicants(job_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view applicants")
    
    applicants = []
    application_docs = db.collection("applications").where("job_id", "==", job_id).stream()
    
    for doc in application_docs:
        app_data = doc.to_dict()
        app_data["id"] = doc.id
        applicants.append(app_data)
    
    return applicants

# Application endpoints
@app.get("/applications")
async def get_applications(current_user: dict = Depends(get_current_user)):
    """Get applications for current user"""
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can view their applications")
    
    applications = []
    application_docs = db.collection("applications").where("candidate_email", "==", current_user["email"]).stream()
    
    for doc in application_docs:
        app_data = doc.to_dict()
        app_data["id"] = doc.id
        
        # Get job title
        job_doc = db.collection("jobs").document(app_data["job_id"]).get()
        if job_doc.exists:
            job_data = job_doc.to_dict()
            app_data["job_title"] = job_data["title"]
        
        applications.append(app_data)
    
    return applications

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), job_id: str = "", current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply")
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Check file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Extract text from PDF with error handling
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. Please ensure the PDF contains readable text.")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    
    # Store application with initial status
    application_data = {
        "job_id": job_id,
        "candidate_email": current_user["email"],
        "candidate_name": current_user.get("email", "").split("@")[0],  # Extract name from email
        "resume_text": text.strip(),
        "status": "applied",
        "screening_score": None,
        "mcq_score": None,
        "coding_score": None,
        "interview_score": None,
        "final_css_score": None,
        "applied_at": datetime.utcnow(),
        "logs": []
    }
    
    try:
        app_ref = db.collection("applications").add(application_data)
        application_id = app_ref[1].id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save application: {str(e)}")
    
    # Trigger AI screening immediately
    try:
        screening_result = await screen_candidate(application_id, job_id, current_user["email"], text.strip())
        
        # Update application status based on screening
        if screening_result["passed"]:
            db.collection("applications").document(application_id).update({
                "status": "screening_passed",
                "screening_score": screening_result["score"],
                "logs": firestore.ArrayUnion([f"Screening passed with score: {screening_result['score']}"])
            })
        else:
            db.collection("applications").document(application_id).update({
                "status": "rejected",
                "screening_score": screening_result["score"],
                "logs": firestore.ArrayUnion([f"Screening failed: {screening_result['feedback']}"])
            })
            
    except Exception as e:
        print(f"AI screening failed: {e}")
    
    return {
        "message": "Application submitted successfully", 
        "application_id": application_id,
        "status": "screening_in_progress"
    }

async def screen_candidate(application_id: str, job_id: str, candidate_email: str, resume_text: str):
    """AI screening with low threshold for demo"""
    # Get job details
    job_doc = db.collection("jobs").document(job_id).get()
    if not job_doc.exists:
        return {"passed": False, "score": 0, "feedback": "Job not found"}
    
    job_data = job_doc.to_dict()
    
    # Get candidate details
    candidate_doc = db.collection("users").document(candidate_email).get()
    candidate_data = candidate_doc.to_dict()
    
    # Fetch GitHub data
    github_data = {}
    if candidate_data.get("github_username"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://api.github.com/users/{candidate_data['github_username']}/repos")
                if response.status_code == 200:
                    repos = response.json()
                    languages = {}
                    for repo in repos:
                        if repo.get("language"):
                            languages[repo["language"]] = languages.get(repo["language"], 0) + 1
                    github_data = {"repos": len(repos), "languages": languages}
        except:
            pass
    
    # Mock LeetCode data
    leetcode_data = {"problems_solved": 150, "ranking": 50000} if candidate_data.get("leetcode_username") else {}
    
    # AI Screening prompt with LOW threshold (40%)
    prompt = f"""
    You are screening candidates for this job. Use a LOW threshold for demo purposes (40% to pass).
    
    Job Description:
    Title: {job_data['title']}
    Location: {job_data['location']}
    Work Mode: {job_data['work_mode']}
    Description: {job_data['job_description']}
    Required Skills: {', '.join(job_data['required_skills'])}
    
    Resume:
    {resume_text[:2000]}
    
    GitHub Profile:
    {github_data}
    
    LeetCode Profile:
    {leetcode_data}
    
    Evaluate the candidate and provide:
    1. Score (0-100) - PASS if score >= 40
    2. Brief explanation
    3. If failed, provide improvement feedback
    
    Respond in JSON format:
    {{
        "score": <number>,
        "passed": <boolean>,
        "explanation": "<text>",
        "improvement_feedback": "<text if failed>"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Screening AI error: {e}")
        return {"passed": False, "score": 0, "feedback": "AI screening failed"}

async def score_candidate(application_id: str, job_id: str, candidate_email: str, resume_text: str):
    # Get job details
    job_doc = db.collection("jobs").document(job_id).get()
    if not job_doc.exists:
        return
    
    job_data = job_doc.to_dict()
    
    # Get candidate details
    candidate_doc = db.collection("users").document(candidate_email).get()
    candidate_data = candidate_doc.to_dict()
    
    # Fetch GitHub data
    github_data = {}
    if candidate_data.get("github_username"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://api.github.com/users/{candidate_data['github_username']}/repos")
                if response.status_code == 200:
                    repos = response.json()
                    languages = {}
                    for repo in repos:
                        if repo.get("language"):
                            languages[repo["language"]] = languages.get(repo["language"], 0) + 1
                    github_data = {"repos": len(repos), "languages": languages}
        except:
            pass
    
    # Mock LeetCode data
    leetcode_data = {"problems_solved": 150, "ranking": 50000} if candidate_data.get("leetcode_username") else {}
    
    # AI Scoring prompt
    prompt = f"""
    You are an expert hiring manager. Analyze this candidate for the job and provide a score from 0-100.
    
    Job Description:
    Title: {job_data['title']}
    Location: {job_data['location']}
    Work Mode: {job_data['work_mode']}
    Description: {job_data['job_description']}
    Required Skills: {', '.join(job_data['required_skills'])}
    
    Resume:
    {resume_text}
    
    GitHub Profile:
    {github_data}
    
    LeetCode Profile:
    {leetcode_data}
    
    Analyze what matters most for this specific job and dynamically weigh:
    - Coding skills and projects
    - Domain knowledge
    - Experience level
    - Technical stack match
    
    Provide:
    1. Score (0-100)
    2. Brief explanation
    3. If score < 60, provide improvement feedback
    
    Respond in JSON format:
    {{
        "score": <number>,
        "explanation": "<text>",
        "improvement_feedback": "<text if score < 60>"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        
        # Store assessment result
        assessment_data = {
            "application_id": application_id,
            "round_number": 1,
            "score": result["score"],
            "passed": result["score"] >= 60,
            "feedback": result["explanation"],
            "improvement_feedback": result.get("improvement_feedback"),
            "completed_at": datetime.utcnow()
        }
        
        db.collection("assessments").add(assessment_data)
        
        # Update application status
        db.collection("applications").document(application_id).update({
            "status": "round1_completed",
            "ai_score": result["score"]
        })
        
    except Exception as e:
        print(f"AI Scoring error: {e}")

@app.get("/applications/{application_id}/assessments")
async def get_assessments(application_id: str, current_user: dict = Depends(get_current_user)):
    assessments = []
    assessment_docs = db.collection("assessments").where("application_id", "==", application_id).stream()
    
    for doc in assessment_docs:
        assessment_data = doc.to_dict()
        assessment_data["id"] = doc.id
        assessments.append(assessment_data)
    
    return assessments

@app.post("/assessments/{application_id}/next-round")
async def next_round_assessment(application_id: str, current_user: dict = Depends(get_current_user)):
    # Get current round
    assessments = await get_assessments(application_id, current_user)
    current_round = len(assessments) + 1
    
    if current_round > 4:
        raise HTTPException(status_code=400, detail="All rounds completed")
    
    # Get application and job details
    app_doc = db.collection("applications").document(application_id).get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_data = app_doc.to_dict()
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    if current_round == 2:
        # Generate MCQs
        prompt = f"""
        Generate 5 multiple choice questions based on this job description:
        
        {job_data['job_description']}
        
        Required skills: {', '.join(job_data['required_skills'])}
        
        Format each question as:
        Q: [question text]
        A) [option A]
        B) [option B]
        C) [option C]
        D) [option D]
        Correct: [A/B/C/D]
        """
        
        try:
            response = model.generate_content(prompt)
            questions = response.text.split('\n\n')
            
            assessment_data = {
                "application_id": application_id,
                "round_number": 2,
                "questions": questions,
                "passed": False,
                "completed_at": datetime.utcnow()
            }
            
            db.collection("assessments").add(assessment_data)
            
            return {"message": "MCQ round generated", "questions": questions}
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate MCQs: {e}")
    
    elif current_round == 3:
        # Generate coding question
        prompt = f"""
        Generate one coding challenge based on this job description:
        
        {job_data['job_description']}
        
        Required skills: {', '.join(job_data['required_skills'])}
        
        Provide:
        1. Problem statement
        2. Example input/output
        3. Constraints
        4. Expected time/space complexity
        
        Keep it suitable for a 30-minute assessment.
        """
        
        try:
            response = model.generate_content(prompt)
            
            assessment_data = {
                "application_id": application_id,
                "round_number": 3,
                "questions": [response.text],
                "passed": False,
                "completed_at": datetime.utcnow()
            }
            
            db.collection("assessments").add(assessment_data)
            
            return {"message": "Coding round generated", "question": response.text}
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate coding question: {e}")
    
    elif current_round == 4:
        # Generate interview questions
        app_doc = db.collection("applications").document(application_id).get()
        resume_text = app_doc.to_dict().get("resume_text", "")
        
        prompt = f"""
        Generate 2 behavioral/technical interview questions based on:
        
        Job Description:
        {job_data['job_description']}
        
        Candidate Resume:
        {resume_text[:1000]}
        
        Questions should assess:
        1. Technical fit for the role
        2. Experience with required skills
        3. Problem-solving approach
        
        Format as numbered questions.
        """
        
        try:
            response = model.generate_content(prompt)
            
            assessment_data = {
                "application_id": application_id,
                "round_number": 4,
                "questions": response.text.split('\n\n'),
                "passed": False,
                "completed_at": datetime.utcnow()
            }
            
            db.collection("assessments").add(assessment_data)
            
            return {"message": "Interview round generated", "questions": response.text.split('\n\n')}
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate interview questions: {e}")

@app.post("/assessments/{assessment_id}/submit")
async def submit_assessment(assessment_id: str, answers: List[str], current_user: dict = Depends(get_current_user)):
    # Get assessment details
    assessment_doc = db.collection("assessments").document(assessment_id).get()
    if not assessment_doc.exists:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assessment_data = assessment_doc.to_dict()
    application_id = assessment_data["application_id"]
    round_number = assessment_data["round_number"]
    
    # Get application and job details
    app_doc = db.collection("applications").document(application_id).get()
    app_data = app_doc.to_dict()
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    # Grade based on round
    if round_number == 2:
        # Grade MCQs
        correct_count = 0
        for i, question in enumerate(assessment_data["questions"]):
            if i < len(answers):
                lines = question.split('\n')
                correct_line = [line for line in lines if line.startswith("Correct:")][0]
                correct_answer = correct_line.split(":")[1].strip()
                if answers[i].strip().upper() == correct_answer:
                    correct_count += 1
        
        score = (correct_count / len(assessment_data["questions"])) * 100
        passed = score >= 60
        
    elif round_number == 3:
        # Grade coding answer
        prompt = f"""
        Evaluate this coding solution for the problem:
        
        Problem: {assessment_data["questions"][0]}
        
        Solution: {answers[0] if answers else ""}
        
        Evaluate based on:
        1. Correctness
        2. Efficiency
        3. Code quality
        4. Edge cases handled
        
        Provide score (0-100) and brief feedback.
        Respond in JSON:
        {{
            "score": <number>,
            "feedback": "<text>"
        }}
        """
        
        try:
            response = model.generate_content(prompt)
            result = json.loads(response.text)
            score = result["score"]
            passed = score >= 60
            feedback = result["feedback"]
        except:
            score = 50
            passed = False
            feedback = "Unable to evaluate solution"
    
    elif round_number == 4:
        # Grade interview answers
        prompt = f"""
        Evaluate these interview answers for the role:
        
        Job: {job_data['title']}
        Questions: {assessment_data["questions"]}
        Answers: {answers}
        
        Evaluate based on:
        1. Technical accuracy
        2. Communication clarity
        3. Problem-solving approach
        4. Cultural fit
        
        Provide score (0-100) and brief feedback.
        Respond in JSON:
        {{
            "score": <number>,
            "feedback": "<text>"
        }}
        """
        
        try:
            response = model.generate_content(prompt)
            result = json.loads(response.text)
            score = result["score"]
            passed = score >= 60
            feedback = result["feedback"]
        except:
            score = 50
            passed = False
            feedback = "Unable to evaluate answers"
    
    # Update assessment
    db.collection("assessments").document(assessment_id).update({
        "answers": answers,
        "score": score,
        "passed": passed,
        "feedback": feedback,
        "completed_at": datetime.utcnow()
    })
    
    # Update application status
    if passed and round_number < 4:
        new_status = f"round{round_number}_passed"
    elif not passed:
        new_status = "rejected"
    else:
        new_status = "completed"
    
    db.collection("applications").document(application_id).update({
        "status": new_status
    })
    
    return {"message": "Assessment submitted", "score": score, "passed": passed, "feedback": feedback}

# New step-by-step assessment endpoints
@app.post("/assessments/{application_id}/start-mcq")
async def start_mcq_round(application_id: str, current_user: dict = Depends(get_current_user)):
    """Start MCQ round - only if screening passed"""
    # Get application
    app_doc = db.collection("applications").document(application_id).get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_data = app_doc.to_dict()
    
    # Check if screening passed
    if app_data.get("status") != "screening_passed":
        raise HTTPException(status_code=400, detail="MCQ round not available. Screening must pass first.")
    
    # Get job details for MCQ generation
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    # Generate 5 MCQs via Gemini
    prompt = f"""
    Generate 5 multiple choice questions based on this job description:
    
    Job Title: {job_data['title']}
    Description: {job_data['job_description']}
    Required Skills: {', '.join(job_data['required_skills'])}
    
    Format each question as:
    Q: [question text]
    A) [option A]
    B) [option B] 
    C) [option C]
    D) [option D]
    Correct: [A/B/C/D]
    
    Make questions test practical knowledge for this role.
    """
    
    try:
        response = model.generate_content(prompt)
        questions = response.text.split('\n\n')
        
        # Store MCQ assessment
        assessment_data = {
            "application_id": application_id,
            "round_type": "mcq",
            "questions": questions,
            "created_at": datetime.utcnow()
        }
        
        assessment_ref = db.collection("assessments").add(assessment_data)
        
        return {
            "message": "MCQ round started",
            "assessment_id": assessment_ref[1].id,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate MCQs: {str(e)}")

@app.post("/assessments/{assessment_id}/submit-mcq")
async def submit_mcq(assessment_id: str, answers: List[str], current_user: dict = Depends(get_current_user)):
    """Submit MCQ answers and evaluate"""
    # Get assessment
    assess_doc = db.collection("assessments").document(assessment_id).get()
    if not assess_doc.exists:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assess_data = assess_doc.to_dict()
    application_id = assess_data["application_id"]
    
    # Grade MCQs
    correct_count = 0
    for i, question in enumerate(assess_data["questions"]):
        if i < len(answers):
            lines = question.split('\n')
            correct_line = [line for line in lines if line.startswith("Correct:")][0]
            correct_answer = correct_line.split(":")[1].strip()
            if answers[i].strip().upper() == correct_answer:
                correct_count += 1
    
    score = (correct_count / len(assess_data["questions"])) * 100
    passed = score >= 60  # 60% to pass MCQ
    
    # Update assessment
    db.collection("assessments").document(assessment_id).update({
        "answers": answers,
        "score": score,
        "passed": passed,
        "completed_at": datetime.utcnow()
    })
    
    # Update application status
    if passed:
        db.collection("applications").document(application_id).update({
            "status": "mcq_passed",
            "mcq_score": score,
            "logs": firestore.ArrayUnion([f"MCQ passed with score: {score}"])
        })
    else:
        db.collection("applications").document(application_id).update({
            "status": "rejected",
            "mcq_score": score,
            "logs": firestore.ArrayUnion([f"MCQ failed with score: {score}"])
        })
    
    return {
        "message": "MCQ submitted",
        "score": score,
        "passed": passed,
        "next_round_available": passed
    }

@app.post("/assessments/{application_id}/start-coding")
async def start_coding_round(application_id: str, current_user: dict = Depends(get_current_user)):
    """Start coding round - only if MCQ passed"""
    # Get application
    app_doc = db.collection("applications").document(application_id).get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_data = app_doc.to_dict()
    
    # Check if MCQ passed
    if app_data.get("status") != "mcq_passed":
        raise HTTPException(status_code=400, detail="Coding round not available. MCQ must pass first.")
    
    # Get job details for coding question generation
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    # Generate coding question via Gemini
    prompt = f"""
    Generate 1-2 coding challenges based on this job:
    
    Job Title: {job_data['title']}
    Description: {job_data['job_description']}
    Required Skills: {', '.join(job_data['required_skills'])}
    
    Provide:
    1. Problem statement
    2. Example input/output
    3. Constraints
    4. Expected time/space complexity
    
    Make it suitable for a 45-minute assessment. Focus on practical skills.
    """
    
    try:
        response = model.generate_content(prompt)
        
        # Store coding assessment
        assessment_data = {
            "application_id": application_id,
            "round_type": "coding",
            "questions": [response.text],
            "created_at": datetime.utcnow()
        }
        
        assessment_ref = db.collection("assessments").add(assessment_data)
        
        return {
            "message": "Coding round started",
            "assessment_id": assessment_ref[1].id,
            "questions": [response.text]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate coding question: {str(e)}")

@app.post("/assessments/{assessment_id}/submit-coding")
async def submit_coding(assessment_id: str, answers: List[str], current_user: dict = Depends(get_current_user)):
    """Submit coding solution and evaluate"""
    # Get assessment
    assess_doc = db.collection("assessments").document(assessment_id).get()
    if not assess_doc.exists:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assess_data = assess_doc.to_dict()
    application_id = assess_data["application_id"]
    
    # Get application and job details
    app_doc = db.collection("applications").document(application_id).get()
    app_data = app_doc.to_dict()
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    # Evaluate coding solution via Gemini
    prompt = f"""
    Evaluate this coding solution for the job:
    
    Job: {job_data['title']}
    Requirements: {job_data['required_skills']}
    
    Problem: {assess_data['questions'][0]}
    
    Solution: {answers[0] if answers else ""}
    
    Evaluate based on:
    1. Correctness
    2. Efficiency
    3. Code quality
    4. Edge cases handled
    
    Provide score (0-100) and feedback. 60+ to pass.
    Respond in JSON:
    {{
        "score": <number>,
        "feedback": "<text>"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        score = result["score"]
        passed = score >= 60
        feedback = result["feedback"]
    except:
        score = 50
        passed = False
        feedback = "Unable to evaluate solution"
    
    # Update assessment
    db.collection("assessments").document(assessment_id).update({
        "answers": answers,
        "score": score,
        "passed": passed,
        "feedback": feedback,
        "completed_at": datetime.utcnow()
    })
    
    # Update application status
    if passed:
        db.collection("applications").document(application_id).update({
            "status": "coding_passed",
            "coding_score": score,
            "logs": firestore.ArrayUnion([f"Coding passed with score: {score}"])
        })
    else:
        db.collection("applications").document(application_id).update({
            "status": "rejected",
            "coding_score": score,
            "logs": firestore.ArrayUnion([f"Coding failed with score: {score}"])
        })
    
    return {
        "message": "Coding submitted",
        "score": score,
        "passed": passed,
        "next_round_available": passed
    }

@app.post("/assessments/{application_id}/start-interview")
async def start_interview_round(application_id: str, current_user: dict = Depends(get_current_user)):
    """Start interview round - only if coding passed"""
    # Get application
    app_doc = db.collection("applications").document(application_id).get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_data = app_doc.to_dict()
    
    # Check if coding passed
    if app_data.get("status") != "coding_passed":
        raise HTTPException(status_code=400, detail="Interview round not available. Coding must pass first.")
    
    # Get application details for interview questions
    app_doc = db.collection("applications").document(application_id).get()
    app_data = app_doc.to_dict()
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    # Generate 3-5 interview questions via Gemini
    prompt = f"""
    Generate 3-5 interview questions based on:
    
    Job: {job_data['title']}
    Requirements: {', '.join(job_data['required_skills'])}
    
    Resume: {app_data.get('resume_text', '')[:1000]}
    
    GitHub Profile: Candidate has repositories
    LeetCode: Candidate has problem-solving experience
    
    Generate questions that assess:
    1. Technical fit for the role
    2. Problem-solving approach  
    3. Experience with required technologies
    4. Cultural fit
    
    Format as numbered questions.
    """
    
    try:
        response = model.generate_content(prompt)
        questions = response.text.split('\n\n')
        
        # Store interview assessment
        assessment_data = {
            "application_id": application_id,
            "round_type": "interview",
            "questions": questions,
            "created_at": datetime.utcnow()
        }
        
        assessment_ref = db.collection("assessments").add(assessment_data)
        
        return {
            "message": "Interview round started",
            "assessment_id": assessment_ref[1].id,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate interview questions: {str(e)}")

@app.post("/assessments/{assessment_id}/submit-interview")
async def submit_interview(assessment_id: str, answers: List[str], current_user: dict = Depends(get_current_user)):
    """Submit interview answers and evaluate"""
    # Get assessment
    assess_doc = db.collection("assessments").document(assessment_id).get()
    if not assess_doc.exists:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assess_data = assess_doc.to_dict()
    application_id = assess_data["application_id"]
    
    # Get application and job details
    app_doc = db.collection("applications").document(application_id).get()
    app_data = app_doc.to_dict()
    job_doc = db.collection("jobs").document(app_data["job_id"]).get()
    job_data = job_doc.to_dict()
    
    # Evaluate interview answers via Gemini
    prompt = f"""
    Evaluate these interview answers for the job:
    
    Job: {job_data['title']}
    Questions: {assess_data['questions']}
    Answers: {answers}
    
    Evaluate based on:
    1. Technical accuracy
    2. Communication clarity
    3. Problem-solving approach
    4. Cultural fit indicators
    
    Provide score (0-100) and feedback. 60+ to pass.
    Also calculate final CSS score if this is the final round.
    
    Respond in JSON:
    {{
        "score": <number>,
        "final_css_score": <number>,
        "feedback": "<text>"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        score = result["score"]
        final_css_score = result.get("final_css_score", score)
        passed = score >= 60
        feedback = result["feedback"]
    except:
        score = 50
        final_css_score = score
        passed = False
        feedback = "Unable to evaluate answers"
    
    # Update assessment
    db.collection("assessments").document(assessment_id).update({
        "answers": answers,
        "score": score,
        "passed": passed,
        "feedback": feedback,
        "completed_at": datetime.utcnow()
    })
    
    # Update application status
    if passed:
        db.collection("applications").document(application_id).update({
            "status": "interview_passed",
            "interview_score": score,
            "final_css_score": final_css_score,
            "logs": firestore.ArrayUnion([f"Interview passed with score: {score}"])
        })
    else:
        db.collection("applications").document(application_id).update({
            "status": "rejected",
            "interview_score": score,
            "logs": firestore.ArrayUnion([f"Interview failed with score: {score}"])
        })
    
    return {
        "message": "Interview submitted",
        "score": score,
        "final_css_score": final_css_score,
        "passed": passed
    }

@app.get("/jobs/{job_id}/applicants")
async def get_job_applicants_detailed(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed applicants for HR dashboard"""
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view applicants")
    
    # Get all applications for this job
    applicants = []
    application_docs = db.collection("applications").where("job_id", "==", job_id).stream()
    
    for doc in application_docs:
        app_data = doc.to_dict()
        app_data["id"] = doc.id
        applicants.append(app_data)
    
    # Group by status
    screening = [a for a in applicants if a.get("status") in ["applied", "screening_passed", "rejected"]]
    mcq = [a for a in applicants if a.get("status") in ["mcq_passed", "rejected"]]
    coding = [a for a in applicants if a.get("status") in ["coding_passed", "rejected"]]
    interview = [a for a in applicants if a.get("status") in ["interview_passed", "selected", "waitlist"]]
    
    return {
        "total_applicants": len(applicants),
        "screening": screening,
        "mcq": mcq,
        "coding": coding,
        "interview": interview,
        "all_applicants": applicants
    }

@app.post("/applications/{application_id}/select")
async def select_candidate(application_id: str, current_user: dict = Depends(get_current_user)):
    """HR selects candidate for offer"""
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can select candidates")
    
    # Get application
    app_doc = db.collection("applications").document(application_id).get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_data = app_doc.to_dict()
    
    # Check if interview passed
    if app_data.get("status") != "interview_passed":
        raise HTTPException(status_code=400, detail="Can only select candidates who passed interview")
    
    # Update status to selected
    db.collection("applications").document(application_id).update({
        "status": "selected",
        "selected_at": datetime.utcnow(),
        "logs": firestore.ArrayUnion(["Selected for offer"])
    })
    
    return {"message": "Candidate selected successfully"}

@app.post("/applications/{application_id}/send-offer")
async def send_offer(application_id: str, current_user: dict = Depends(get_current_user)):
    """Mock send offer to candidate"""
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can send offers")
    
    # Get application
    app_doc = db.collection("applications").document(application_id).get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_data = app_doc.to_dict()
    
    # Check if selected
    if app_data.get("status") != "selected":
        raise HTTPException(status_code=400, detail="Can only send offer to selected candidates")
    
    # Mock offer sending
    db.collection("applications").document(application_id).update({
        "status": "offer_sent",
        "offer_sent_at": datetime.utcnow(),
        "logs": firestore.ArrayUnion([f"Offer sent by {current_user['email']}"])
    })
    
    return {"message": "Offer sent successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
