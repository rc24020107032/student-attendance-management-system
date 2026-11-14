pipeline {
    agent any

    environment {
        APP_NAME = 'student-attendance-system'
        DOCKER_IMAGE = 'student-attendance-system:latest'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t ${DOCKER_IMAGE} .'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
