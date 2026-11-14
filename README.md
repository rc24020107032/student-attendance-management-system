# Student Attendance Management System

A full-stack web application and CLI suite for managing university student attendance, built with Node.js, Express, MongoDB, and Yargs, with containerization via Docker and build automation via Jenkins and Maven.

---

## Table of Contents
- [Architecture & Concepts](#architecture--concepts)
  - [1. Express.js Web Server & API Routes](#1-expressjs-web-server--api-routes)
  - [2. MongoDB Data Modeling, Queries & Updates](#2-mongodb-data-modeling-queries--updates)
  - [3. File System Logging & Yargs CLI](#3-file-system-logging--yargs-cli)
  - [4. Source Control, Automated Testing & Build Management](#4-source-control-automated-testing--build-management)
  - [5. Docker Containerization & Port Forwarding](#5-docker-containerization--port-forwarding)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup & Running](#local-setup--running)
  - [1. Installation](#1-installation)
  - [2. Configuration](#2-configuration)
  - [3. Start the Web Server](#3-start-the-web-server)
  - [4. Running the Yargs CLI](#4-running-the-yargs-cli)
- [Running with Docker Compose](#running-with-docker-compose)
- [Automated Testing](#automated-testing)

---

## Architecture & Concepts

### 1. Express.js Web Server & API Routes
The backend application is structured around Node.js and Express.js (`src/server.js`), providing a RESTful JSON API alongside static file serving for the web interface.

Key architectural elements:
- Middleware pipeline: `cors` for cross-origin handling, `express.json()` and `express.urlencoded()` for request body parsing, `morgan` for HTTP request logging, and centralized error handling middleware.
- Route separation:
  - `POST /api/students` - Register a new student profile (roll number validation, duplicate checks).
  - `GET /api/students` - Retrieve active students with optional query filters (course, search keyword).
  - `GET /api/students/:rollNumber` - Retrieve student metadata by roll number.
  - `DELETE /api/students/:id` - Remove a student record.
  - `POST /api/attendance/mark` - Submit or update daily attendance for a course session.
  - `GET /api/attendance/student/:rollNumber` - Compute attendance statistics and percentage for a student.
  - `GET /api/attendance/sessions` - List recent attendance sessions.
  - `GET /api/attendance/logs` - Read raw audit logs maintained by the file system module.
  - `GET /api/health` - Server health check endpoint.

### 2. MongoDB Data Modeling, Queries & Updates
Data persistence is handled by MongoDB via Mongoose (`src/config/db.js`, `src/models/`).

#### Schemas:
- **Student Schema (`src/models/Student.js`):** Stores `rollNumber` (unique index, uppercase), `name`, `email`, `course`, `batch`, `semester`, and active status.
- **Attendance Schema (`src/models/Attendance.js`):** Contains `date` (normalized to midnight), `course`, `facultyName`, counters (`totalPresent`, `totalAbsent`, `totalLate`), and an embedded array of student records:
  ```javascript
  {
    student: ObjectId (ref: 'Student'),
    rollNumber: String,
    studentName: String,
    status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
    remarks: String
  }
  ```
  A compound index on `{ date: 1, course: 1 }` prevents accidental duplicate sessions for the same subject on the same day.

#### Queries and Updates:
- Inserting: Documents are created through Mongoose validation rules.
- Querying: Retrieval combines filter queries with indexed lookups (e.g. `'records.rollNumber': roll`).
- Percentage Computation: Aggregates total conducted sessions and attended sessions dynamically:
  $$\text{Attendance Percentage} = \left(\frac{\text{Attended Sessions}}{\text{Total Sessions}}\right) \times 100$$
  If the percentage falls below 75%, an attendance shortage flag is assigned.
- Updating: When attendance for a date/course is re-submitted, the existing document is located and updated in place.

### 3. File System Logging & Yargs CLI
To guarantee auditability independent of the database, the Node.js File System (`fs`) module writes session activities to a local flat file (`logs/attendance.log`).

- **Logger Service (`src/services/loggerService.js`):** Uses asynchronous `fs.promises.appendFile` to record timestamps, action types, course names, and present/absent counters. An asynchronous reader using `fs.promises.readFile` provides administrative log access.
- **Command-Line Processing via Yargs (`cli.js`):** Provides terminal-based administrative operations without launching a browser:
  - `add-student`: Registers a student in MongoDB (`--roll`, `--name`, `--course`, `--batch`).
  - `mark`: Marks attendance for a student and immediately appends to `logs/attendance.log` (`--roll`, `--status`, `--date`, `--course`, `--faculty`).
  - `view-student`: Calculates and prints formatted attendance percentage and eligibility status for a given roll number.
  - `view-logs`: Reads and prints recent lines from `logs/attendance.log`.

### 4. Source Control, Automated Testing & Build Management
The project integrates standard CI/CD practices across Git, Jenkins, and Maven:

- **Git:** Version control with branch isolation, commit history, and clean tracking configuration via `.gitignore`.
- **Jenkins (`Jenkinsfile`):** A declarative pipeline with four stages:
  1. *Checkout:* Clones the repository from source control.
  2. *Install:* Runs `npm install` within the pipeline workspace.
  3. *Test:* Executes automated unit and integration tests via `npm test`.
  4. *Docker Build:* Packages the validated application into a Docker container.
- **Maven (`pom.xml`):** In enterprise environments managing polyglot stacks, Maven coordinates the build lifecycle. The `frontend-maven-plugin` binds to Maven phases (`generate-resources`, `test`) to install Node/npm and run tests via `mvn test`.

### 5. Docker Containerization & Port Forwarding
Containerization encapsulates the application runtime and database dependencies.

- **Dockerfile:** Multi-stage, production-focused Alpine Linux container (`node:18-alpine`), creating non-root execution paths, installing production packages (`npm install --omit=dev`), and declaring `EXPOSE 3000`.
- **Port Forwarding:** Translates external host network requests into container bridge network ports:
  - Host port `3000` is forwarded to container port `3000` for the web server (`3000:3000`).
  - Host port `27017` is forwarded to container port `27017` for MongoDB (`27017:27017`).
- **Docker Compose (`docker-compose.yml`):** Orchestrates the `app` service and `mongodb` service with named volume data persistence (`mongo-data`). Includes an optional on-demand `jenkins` service profile for local CI pipeline verification.

---

## Project Structure

```text
.
├── Dockerfile                  # Application container definition
├── Jenkinsfile                 # Declarative CI/CD pipeline definition
├── README.md                   # System documentation and operational guide
├── cli.js                      # Yargs CLI tool for terminal operations
├── docker-compose.yml          # Multi-container orchestration (App, MongoDB, CI)
├── package.json                # Project dependencies and npm scripts
├── pom.xml                     # Maven build management configuration
├── logs/                       # File system audit directory
│   ├── .gitkeep
│   └── attendance.log          # Runtime log file written by fs module
├── public/                     # Static frontend client
│   ├── app.js                  # Frontend interactions and API fetch calls
│   ├── index.html              # Faculty, Student, and Admin views
│   └── style.css               # User interface styling
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection handler
│   ├── controllers/
│   │   ├── attendanceController.js  # Attendance calculation and recording logic
│   │   └── studentController.js     # Student registration and query logic
│   ├── models/
│   │   ├── Attendance.js       # Mongoose Attendance model
│   │   ├── Faculty.js          # Mongoose Faculty model
│   │   └── Student.js          # Mongoose Student model
│   ├── routes/
│   │   ├── attendanceRoutes.js # Attendance API routing
│   │   └── studentRoutes.js    # Student API routing
│   ├── services/
│   │   └── loggerService.js    # Node.js fs module audit logging
│   └── server.js               # Express application entrypoint
└── tests/
    └── api.test.js             # Automated API integration and route tests
```

---

## Prerequisites

- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** Local installation or Docker container
- *(Optional)* **Docker & Docker Compose** for containerized execution

---

## Local Setup & Running

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd "fullstack assignment project"
npm install
```

### 2. Configuration
An environment file `.env` is pre-configured in the project root:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/attendance_db
NODE_ENV=development
```
If using a remote or custom MongoDB instance, update `MONGODB_URI` accordingly.

### 3. Start the Web Server
Make sure MongoDB is running on your machine, then run:

```bash
# Standard start
npm start

# Development mode (auto-reload via nodemon)
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

The portal provides three functional views:
- **Faculty Portal:** Select a course and date, view enrolled students, mark Present / Absent / Late, and save attendance.
- **Student Portal:** Enter a student roll number to see total sessions, attended sessions, percentage, and shortage status (< 75%).
- **Admin Console:** Register new students, view the student directory, and review live audit logs written to `logs/attendance.log`.

### 4. Running the Yargs CLI
Administrative commands can be executed directly from the terminal using `cli.js`:

```bash
# Display CLI help and available options
node cli.js --help

# Register a student
node cli.js add-student --roll SD101 --name "Rahul Verma" --course "B.Voc Software Development"

# Mark attendance for a student
node cli.js mark --roll SD101 --status Present --course "Full Stack Web Dev - 2"

# View attendance summary and percentage for a student
node cli.js view-student --roll SD101

# Inspect file system audit logs
node cli.js view-logs --limit 10
```

---

## Running with Docker Compose

To run the complete system (Web Application + MongoDB) in isolated containers without installing MongoDB locally:

```bash
# Build and start services in detached mode
docker compose up --build -d

# Check container status
docker compose ps

# View application logs
docker compose logs -f app

# Stop and remove containers
docker compose down
```

The web server will be accessible at `http://localhost:3000` via Docker port forwarding.

### Optional Jenkins Container for CI Pipeline Testing
If you wish to test the `Jenkinsfile` locally, start the Jenkins service profile:
```bash
# Start Jenkins on port 8080
docker compose --profile ci up -d jenkins

# Stop Jenkins when testing is finished
docker compose stop jenkins
```

---

## Automated Testing

Execute the automated test suite using Jest and Supertest:
```bash
npm test
```

The test runner verifies:
- Web server health endpoint availability (`GET /api/health`).
- Input validation on student registration (`POST /api/students`).
- Input validation on attendance marking (`POST /api/attendance/mark`).
- File system log reading operations (`GET /api/attendance/logs`).
