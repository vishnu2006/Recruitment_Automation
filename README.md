# End to End Job Recruitment Automation

An intelligent AI-powered recruitment automation platform that revolutionizes the hiring process through advanced machine learning and seamless user experience.

## 🚀 Project Overview

CyberVault_App is a comprehensive recruitment solution designed to streamline the entire hiring workflow. Built with cutting-edge AI technologies, it automates candidate screening, assessment, and evaluation while providing an intuitive interface for both HR professionals and job seekers.

## ✨ Key Features

### Smart Recruitment Pipeline
- **AI-Powered Resume Analysis**: Automatic extraction and scoring of candidate qualifications
- **Multi-Round Assessment System**: 4-stage evaluation process (Resume → MCQ → Coding → Interview)
- **Dynamic Question Generation**: Context-aware assessment questions based on job requirements
- **Real-time Progress Tracking**: Live status updates for candidates and recruiters

### Advanced AI Capabilities
- **Gemini API Integration**: Google's latest AI model for intelligent analysis
- **GitHub Profile Analysis**: Automated evaluation of candidate's coding portfolio
- **Skill Matching Algorithm**: Intelligent matching between candidate skills and job requirements
- **Automated Scoring System**: Objective evaluation across multiple criteria

### Modern User Experience
- **Responsive Design**: Seamless experience across all devices
- **Real-time Dashboard**: Comprehensive analytics and insights
- **Role-Based Access**: Secure authentication for candidates and HR professionals
- **Professional UI**: Modern SaaS-style interface with Tailwind CSS

## 🛠 Tech Stack

### Backend Technologies
- **FastAPI**: High-performance Python web framework
- **Firebase Firestore**: Scalable NoSQL database solution
- **Google Gemini API**: Advanced AI/ML capabilities
- **JWT Authentication**: Secure token-based authorization
- **bcrypt**: Enterprise-grade password security

### Frontend Technologies
- **React 18**: Modern JavaScript framework with hooks
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Axios**: Promise-based HTTP client for API integration
- **React Router**: Client-side routing and navigation

### Development Tools
- **Git**: Version control and collaboration
- **Node.js**: JavaScript runtime environment
- **Python 3.8+**: Backend development language

## 📋 Installation Guide

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Firebase project with Firestore enabled
- Google Gemini API access

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install required dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase and Gemini API credentials
   ```

5. **Start the backend server**
   ```bash
   python main.py
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Launch development server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 📸 Screenshots

*(Screenshots to be added during deployment)*

### Dashboard Views
- HR Dashboard with analytics
- Candidate application tracking
- Assessment progress visualization

### Key Interfaces
- Job posting and management
- Resume upload and analysis
- Assessment interface

## 🔧 Configuration

### Environment Variables (.env)
```env
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secure_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 🚀 Future Enhancements

### Planned Features
- **Video Interview Integration**: Automated video screening with AI analysis
- **Advanced Analytics**: Comprehensive recruitment metrics and insights
- **Email Automation**: Smart notification system for all stakeholders
- **Multi-language Support**: Global accessibility with localization
- **Mobile Application**: Native iOS and Android apps
- **API Rate Limiting**: Enhanced security and performance optimization

### Technical Improvements
- **Microservices Architecture**: Scalable backend infrastructure
- **Real-time WebSocket**: Live updates and notifications
- **Advanced Security**: OAuth2 integration and 2FA support
- **Performance Optimization**: Caching strategies and database optimization

## 📊 Project Architecture

```
CyberVault_App/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── .env                # Production environment variables
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page-level components
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS and styling
│   ├── public/             # Static assets
│   ├── package.json        # Node.js dependencies
│   └── tailwind.config.js  # Tailwind CSS configuration
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based user authentication
- **Password Encryption**: bcrypt hashing for password security
- **Role-Based Access Control**: Granular permissions for different user types
- **CORS Protection**: Cross-origin resource sharing security
- **Input Validation**: Comprehensive data validation and sanitization
- **API Rate Limiting**: Protection against abuse and attacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

For questions, support, or collaboration opportunities:
- GitHub Issues: [Create an issue](https://github.com/vishnu2006/Recruitment_Automation/issues)
- Project Repository: [CyberVault_App](https://github.com/vishnu2006/Recruitment_Automation)

---

**Built with ❤️ for modern recruitment automation**
