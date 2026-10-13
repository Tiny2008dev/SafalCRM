
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Source code retrieved from GitHub.'
            }
        }

        stage('Check Node.js and npm') {
            steps {
                bat '"C:\\Program Files\\nodejs\\node.exe" --version'
                bat 'call "C:\\Program Files\\nodejs\\npm.cmd" --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('client') {
                    bat 'call "C:\\Program Files\\nodejs\\npm.cmd" install'
                }
            }
        }

        stage('Build React App') {
            steps {
                dir('client') {
                    bat 'call "C:\\Program Files\\nodejs\\npm.cmd" run build'
                }
            }
        }
    }

    post {
        success {
            echo 'SafalCRM frontend built successfully!'
        }
        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}
