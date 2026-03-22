import requests
import io
import PyPDF2

# Test the upload endpoint
def test_upload():
    # Create a simple test PDF
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.drawString(100, 750, "John Doe")
    p.drawString(100, 730, "Software Engineer")
    p.drawString(100, 710, "Experience: 5 years in Python, React, AWS")
    p.drawString(100, 690, "Skills: Python, JavaScript, Machine Learning")
    p.save()
    
    buffer.seek(0)
    
    # Test upload
    url = "http://localhost:8000/upload-resume"
    files = {'file': ('test_resume.pdf', buffer, 'application/pdf')}
    data = {'job_id': 'test_job_id'}
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_upload()
