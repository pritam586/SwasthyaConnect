# 🩺 SwasthyaConnect

### Offline-First Rural Healthcare & Telemedicine Platform

SwasthyaConnect is an **offline-first digital healthcare platform** designed to improve access to healthcare services for people in rural and underserved areas.

The platform connects **patients, doctors, pharmacies, and healthcare services** through a unified system. It provides teleconsultation, medical-record management, medicine discovery, nearby pharmacy discovery, appointment management, and AI-assisted **anaemia screening with image-quality validation**.

> **Important:** The anaemia screening module is designed as a **screening and triage-support system**, not as a replacement for professional medical diagnosis.

---

## 📌 Problem Statement

People living in rural and underserved regions often face challenges such as:

* Limited access to qualified doctors
* Long travel distances to healthcare facilities
* Poor internet connectivity
* Difficulty maintaining medical records
* Difficulty finding prescribed medicines
* Limited access to nearby pharmacies
* Language and communication barriers
* Delayed identification of health risks
* Lack of convenient telemedicine services

SwasthyaConnect aims to address these challenges through a **mobile/web-based healthcare ecosystem with offline-first capabilities**.

---

# 🎯 Objectives

The primary objectives of SwasthyaConnect are:

1. Provide accessible digital healthcare services.
2. Enable remote doctor-patient consultations.
3. Support healthcare access in low-connectivity environments.
4. Maintain secure digital medical records.
5. Provide AI-assisted anaemia screening.
6. Validate medical images before ML inference.
7. Provide medicine discovery from doctor prescriptions/reports.
8. Help users locate nearby pharmacies.
9. Provide appointment and consultation management.
10. Support multilingual and voice-based healthcare interaction.
11. Integrate with healthcare ecosystems such as **ABHA/ABDM** where feasible.
12. Provide a scalable architecture for future healthcare services.

---

# ✨ Key Features

## 👤 Patient Module

Patients can:

* Create an account
* Login securely
* Manage their profile
* View medical history
* Manage previous/current medications
* Upload medical reports
* View prescriptions
* Book appointments
* Connect with doctors
* Participate in teleconsultations
* Search for medicines
* Find nearby pharmacies
* View health-screening results
* Receive notifications
* Access information even under limited connectivity

---

## 👨‍⚕️ Doctor Module

Doctors can:

* Register/login securely
* Manage professional profiles
* View assigned patients
* Review patient medical history
* Review uploaded medical reports
* Conduct online consultations
* Create digital prescriptions
* Recommend medicines
* Manage appointments
* Monitor patient information
* Provide consultation-based recommendations

---

## 💊 Medicine & Pharmacy Discovery

SwasthyaConnect provides a medicine-discovery workflow.

A medicine can be identified from:

* Doctor prescriptions
* Uploaded medical reports
* Consultation records
* Manually entered medicine names

After identifying the required medicine, the system can help users discover **nearby pharmacies** based on location and availability.

### Pharmacy Discovery Flow

```text
Doctor Prescription / Medical Report
              ↓
       Medicine Extraction
              ↓
       Medicine Verification
              ↓
     User Location Detection
              ↓
      Nearby Pharmacy Search
              ↓
   Distance-Based Pharmacy List
              ↓
        Pharmacy Details
```

For a new user with no previous location or medication history, the system should **not display irrelevant historical data**.

The first pharmacy search should be based on the user's current/requested location and the medicine they are looking for.

---

# 🩸 AI-Assisted Anaemia Screening

SwasthyaConnect includes an image-based anaemia screening pipeline.

The system uses a **quality-gate approach** before performing ML inference.

### Pipeline

```text
Image Capture / Upload
        ↓
Image Quality Validation
        ↓
Valid Image?
   ↙          ↘
 No           Yes
 ↓             ↓
Request       ML Model
New Image       ↓
              Prediction
                 ↓
          Risk/Triage Category
                 ↓
       Doctor/Healthcare Review
```

### ML Components

The planned/implemented pipeline includes:

* Python-based ML runtime
* MobileNetV2 / EfficientNet-Lite
* Image preprocessing
* Image-quality validation
* Grad-CAM visualization
* Screening/triage classification

### Dataset

The project uses publicly available anaemia-related image datasets, including:

* EyeS-Defy-Anemia
* CP-AnemiC

The combined dataset contains approximately **928 images** used during development/research.

> Model predictions are intended to support screening and triage. They should not be treated as a definitive medical diagnosis.

---

# 🟢🟡🔴 Triage System

The screening workflow can classify results into three levels:

| Level     | Meaning                 | Suggested Action                     |
| --------- | ----------------------- | ------------------------------------ |
| 🟢 Green  | Lower screening risk    | Continue routine healthcare          |
| 🟡 Yellow | Moderate/uncertain risk | Consider medical consultation        |
| 🔴 Red    | Higher screening risk   | Seek professional medical evaluation |

The system is designed to **assist healthcare decisions**, not independently diagnose patients.

---

# 📱 Offline-First Architecture

A major goal of SwasthyaConnect is supporting users with unreliable internet connectivity.

The application follows an **offline-first approach** where appropriate data can be stored locally and synchronized when connectivity becomes available.

### Basic Synchronization Flow

```text
                ┌─────────────────┐
                │   Mobile/Web    │
                │    Client       │
                └────────┬────────┘
                         │
                Internet Available?
                    /           \
                  Yes            No
                   ↓              ↓
             Backend API      Local Storage
                   ↓              ↓
               Database       Pending Queue
                   │              │
                   └──────┬───────┘
                          ↓
                    Synchronization
```

This architecture is particularly useful for rural areas where connectivity may be intermittent.

---

# 🏥 Telemedicine

SwasthyaConnect enables remote healthcare interaction between patients and doctors.

Possible workflow:

```text
Patient
   ↓
Doctor Search
   ↓
Appointment Booking
   ↓
Doctor Confirmation
   ↓
Teleconsultation
   ↓
Medical Assessment
   ↓
Digital Prescription
   ↓
Medicine Discovery
   ↓
Nearby Pharmacy
```

---

# 📍 Location & Nearby Pharmacy

The application can use location services to assist users in finding pharmacies near them.

The system can consider:

* Current user location
* Pharmacy coordinates
* Distance
* Medicine requirement
* Pharmacy availability
* Search radius

Example:

```text
User Location
      ↓
Find Pharmacies
      ↓
Calculate Distance
      ↓
Sort by Distance
      ↓
Display Nearby Pharmacies
```

The system should request location permission appropriately and provide a manual location/search option when location access is unavailable.

---

# 🔐 Authentication & Security

SwasthyaConnect is designed with security as a core requirement because it handles healthcare-related information.

The authentication architecture includes:

* User registration
* Secure login
* JWT-based authentication
* Password hashing
* Protected API routes
* Role-based authorization
* Secure session/token handling
* Input validation
* API validation
* CORS configuration
* Environment variables for secrets
* Rate limiting
* Secure HTTP headers

### User Roles

```text
                ┌──────────────┐
                │    User      │
                └──────┬───────┘
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
         Patient              Doctor
```

Additional roles such as administrators/pharmacy users can be introduced as the platform evolves.

---

# 🗄️ Database

The backend uses a relational database architecture for structured healthcare information.

The database can contain entities such as:

* Users
* Patients
* Doctors
* Appointments
* Prescriptions
* Medicines
* Medical Reports
* Medical History
* Screening Results
* Pharmacies
* Notifications
* Consultation Records

Sensitive information should be stored and accessed according to appropriate security and privacy requirements.

---

# 🏛️ System Architecture

```text
                       ┌──────────────────┐
                       │   Patient App    │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │   Web Interface  │
                       └────────┬─────────┘
                                │
                         REST / HTTPS API
                                │
                ┌───────────────▼───────────────┐
                │       Node.js / Express       │
                │          Backend API           │
                └───────┬───────────┬───────────┘
                        │           │
               ┌────────▼───┐   ┌──▼────────────┐
               │ PostgreSQL │   │ Authentication│
               │ Database   │   │ / Authorization│
               └────────────┘   └───────────────┘
                        │
              ┌─────────▼─────────┐
              │   ML Runtime      │
              │     Python        │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │ ML Screening Model│
              │ MobileNetV2 /     │
              │ EfficientNet-Lite │
              └───────────────────┘

          External / Healthcare Integrations
                        │
          ┌─────────────┼──────────────┐
          ↓             ↓              ↓
        Maps          ABDM          Voice/
      Services       / ABHA         Language
```

---

# 🛠️ Technology Stack

## Frontend

* Flutter
* Dart
* Responsive UI
* Offline/local storage
* REST API integration

## Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Role-Based Access Control
* Input validation
* Rate limiting

## Database

* PostgreSQL

## Machine Learning

* Python
* TensorFlow / compatible ML framework
* MobileNetV2
* EfficientNet-Lite
* Grad-CAM
* Image preprocessing
* Quality validation

## Healthcare Integration

* ABHA / ABDM Sandbox
* Mocked healthcare-service integrations where required
* Future integration with government/healthcare APIs

## Communication

Potential integrations include:

* Twilio
* Whisper
* Bhashini
* Voice/telemedicine services

## Development & Deployment

* Git
* GitHub
* Docker
* REST APIs
* Environment-based configuration
* Cloud deployment

---

# 📂 Project Structure

The project is organized into modular components.

```text
SwasthyaConnect/
│
├── frontend/
│   └── Flutter application
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   └── server configuration
│
├── ml_runtime/
│   ├── preprocessing/
│   ├── models/
│   ├── inference/
│   ├── quality_gate/
│   └── visualization/
│
├── database/
│   ├── schema/
│   └── migrations/
│
├── docs/
│   ├── architecture/
│   ├── research/
│   └── API documentation/
│
├── docker/
│
├── .env.example
├── README.md
└── ...
```

> Folder names may vary depending on the current implementation of the repository.

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/pritam586/SwasthyaConnect.git
cd SwasthyaConnect
```

---

## 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create the environment configuration:

```bash
cp .env.example .env
```

Configure required environment variables.

Example:

```env
PORT=5000

DATABASE_URL=your_database_url

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:3000

MAP_API_KEY=your_map_api_key

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

Start the development server:

```bash
npm run dev
```

---

# 🧠 ML Runtime Setup

Navigate to the ML directory:

```bash
cd ml_runtime
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the inference/service according to the ML runtime configuration.

---

# 📱 Flutter Setup

Make sure Flutter is installed and configured.

Check:

```bash
flutter doctor
```

Navigate to the Flutter application:

```bash
cd frontend
```

Install dependencies:

```bash
flutter pub get
```

Run the application:

```bash
flutter run
```

---

# 🔑 Environment Variables

Never commit real secrets to GitHub.

Use:

```text
.env
```

for local development and provide:

```text
.env.example
```

for other developers.

Sensitive credentials may include:

* Database credentials
* JWT secrets
* API keys
* Cloud credentials
* Twilio credentials
* Healthcare integration credentials

---

# 🔄 Core User Workflow

```text
                    USER
                     │
                     ↓
              Register / Login
                     │
                     ↓
              Patient Dashboard
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
   Medical       Appointment    Screening
    Records        Booking        Module
       │             │             │
       │             ↓             ↓
       │           Doctor       Image Upload
       │         Consultation       │
       │             │              ↓
       │             ↓         Quality Gate
       │        Prescription        │
       │                            ↓
       └──────────────┬─────── ML Screening
                      │
                      ↓
              Medicine Discovery
                      │
                      ↓
               Nearby Pharmacy
```

---

# 🧪 Testing

Testing should be performed at multiple levels.

### Backend

* Unit testing
* API testing
* Authentication testing
* Authorization testing
* Input validation testing

### Frontend

* UI testing
* Form validation
* Offline-mode testing
* API failure handling

### ML

* Dataset validation
* Image preprocessing tests
* Quality-gate tests
* Model evaluation
* Confusion matrix
* Precision
* Recall
* F1-score
* Sensitivity
* Specificity

### Security

* Authentication testing
* JWT validation
* Unauthorized-access testing
* API rate-limit testing
* Input sanitization
* CORS validation

---

# 📊 ML Evaluation

For research and academic evaluation, the screening model should be evaluated using appropriate metrics.

Recommended metrics include:

```text
Accuracy
Precision
Recall / Sensitivity
Specificity
F1 Score
ROC-AUC
Confusion Matrix
```

Grad-CAM can be used to visualize regions contributing to the model's prediction.

---

# 🔒 Privacy & Responsible AI

Healthcare information is sensitive. SwasthyaConnect follows a privacy-first development approach.

Important principles:

* Collect only required information.
* Protect authentication credentials.
* Do not expose sensitive patient information through public APIs.
* Use encrypted communication.
* Restrict access using authorization.
* Do not expose production secrets.
* Clearly communicate that ML output is screening assistance.
* Encourage professional medical evaluation for concerning results.

### AI Disclaimer

> SwasthyaConnect's AI module is intended for research, screening, and decision-support purposes. It does not provide a definitive medical diagnosis. Users should consult qualified healthcare professionals for diagnosis and treatment decisions.

---

# 🌐 Future Scope

Future versions can include:

* Advanced multilingual support
* Voice-first healthcare interaction
* Improved offline synchronization
* More healthcare screening models
* Real-time doctor availability
* Pharmacy inventory integration
* Medicine delivery integration
* ABDM production integration
* ABHA-based health-record interoperability
* PM-JAY ecosystem integration
* Advanced analytics dashboard
* Wearable-device integration
* Health-risk prediction
* Expanded rural healthcare support

---

# 📚 Research & Innovation Potential

SwasthyaConnect has potential for academic and research outcomes in areas such as:

### 1. Conference Publication

Possible research topics:

* Offline-first telemedicine architecture for rural healthcare
* AI-assisted anaemia screening
* Image-quality-aware medical ML pipelines
* Rural healthcare accessibility through digital platforms

### 2. Journal Publication

Possible areas:

* Computer vision for anaemia screening
* AI-assisted healthcare triage
* Offline healthcare systems
* Telemedicine in low-connectivity environments

### 3. Patent

Potentially patentable innovation may arise from a **novel technical combination or workflow**, subject to a proper prior-art and patentability assessment.

### 4. Copyright

Potential copyrightable components include:

* Software source code
* UI/UX implementation
* Documentation
* Original graphics
* Original ML pipeline implementation

---

# 👥 Contributors

### SwasthyaConnect Team

* **Pritam Prajapati**
* **Pratik Singh**
* **Sairaj Harpale**

Additional contributors can be added as the project evolves.

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Commit your changes.

```bash
git add -A
git commit -m "Add your feature"
```

5. Push the branch.

```bash
git push origin feature/your-feature
```

6. Create a Pull Request.

---

# 📄 License

This project is currently developed as an academic/capstone project.

The licensing terms may be updated after determining the project's publication, intellectual-property, and deployment requirements.

---

# ⚠️ Disclaimer

SwasthyaConnect is an academic and research-oriented healthcare technology project.

It is **not a substitute for professional medical advice, diagnosis, or treatment**.

Any AI-generated screening result should be reviewed by an appropriately qualified healthcare professional before making clinical decisions.

---

# ⭐ Project Vision

> **"Connecting people to healthcare, regardless of distance or connectivity."**

SwasthyaConnect aims to combine **telemedicine, offline-first technology, AI-assisted screening, digital health records, medicine discovery, and pharmacy connectivity** into a single accessible healthcare platform for underserved communities.
