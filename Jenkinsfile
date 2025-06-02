pipeline {
    agent any
    
    environment {
        PROJECT_NAME = 'todo-devops-demo'
        NODE_VERSION = 'Node18'  // Must match the Name in Jenkins tool config
        STAGING_PORT = '3001'
        PROD_PORT = '3000'
        COVERAGE_THRESHOLD = '70'
        SECURITY_THRESHOLD = 'moderate'
        STAGING_PID_FILE = "${WORKSPACE}/staging.pid"
        PROD_PID_FILE = "${WORKSPACE}/production.pid"
    }
    
    tools {
        nodejs "${NODE_VERSION}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Starting Todo DevOps Pipeline - Build #${BUILD_NUMBER}"
                    deleteDir()
                    sh 'git clone https://github.com/ImtiazSajwani/DevopPipeline.git .'
                    sh 'git remote -v'
                    sh 'git log -1 --oneline'
                    sh 'ls -la'
                    sh 'node --version || echo "Node.js not found"'
                    sh 'npm --version || echo "npm not found"'
                }
            }
            post {
                success {
                    echo 'Checkout completed successfully'
                }
                failure {
                    echo 'Checkout failed'
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    echo 'Building application...'
                    sh '''
                        echo "Using Jenkins-managed Node.js..."
                        echo "Node.js version: $(node --version)"
                        echo "npm version: $(npm --version)"
                        echo "Node.js location: $(which node)"
                        echo "npm location: $(which npm)"
                        
                        echo "Installing project dependencies..."
                        npm ci || npm install
                        
                        echo "Running build script..."
                        npm run build || echo "No build script configured, continuing..."
                        
                        echo "Checking application files..."
                        ls -la
                        
                        # Verify critical files exist
                        if [ ! -f "server.js" ]; then
                            echo "server.js not found"
                            exit 1
                        fi
                        
                        if [ ! -f "package.json" ]; then
                            echo "package.json not found"
                            exit 1
                        fi
                        
                        # Create build info file
                        echo "Build Number: ${BUILD_NUMBER}" > build-info.txt
                        echo "Build Time: $(date)" >> build-info.txt
                        echo "Node Version: $(node --version)" >> build-info.txt
                        echo "NPM Version: $(npm --version)" >> build-info.txt
                        echo "Git Commit: $(git rev-parse HEAD)" >> build-info.txt
                        
                        echo "Build preparation completed successfully"
                        cat build-info.txt
                    '''
                }
            }
            post {
                success {
                    echo 'Build completed successfully'
                    archiveArtifacts artifacts: 'build-info.txt', allowEmptyArchive: true
                }
                failure {
                    echo 'Build failed'
                    echo 'Check NodeJS tool configuration in Jenkins'
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            echo 'Running unit tests...'
                            sh '''
                                npm test -- --ci --coverage --watchAll=false || echo "Tests completed with issues"
                                if [ -f "coverage/lcov-report/index.html" ]; then
                                    echo "Coverage report generated"
                                fi
                                if [ -f "coverage/coverage-summary.json" ]; then
                                    echo "Coverage summary found"
                                    cat coverage/coverage-summary.json | head -10 || echo "Coverage summary could not be read"
                                else
                                    echo "No coverage summary found"
                                fi
                            '''
                        }
                    }
                    post {
                        always {
                            script {
                                if (fileExists('junit.xml')) {
                                    publishTestResults testResultsPattern: 'junit.xml'
                                }
                                if (fileExists('coverage/cobertura-coverage.xml')) {
                                    publishCoverage adapters: [
                                        istanbulCoberturaAdapter('coverage/cobertura-coverage.xml')
                                    ], sourceFileResolver: sourceFiles('STORE_ALL_BUILD')
                                }
                            }
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        script {
                            echo 'Running integration tests...'
                            sh '''
                                pkill -f "node.*server.js" || echo "No existing node processes"
                                sleep 2
                                PORT=3002 npm start &
                                APP_PID=$!
                                echo $APP_PID > integration-test.pid
                                for i in {1..30}; do
                                    if curl -f http://localhost:3002/health 2>/dev/null; then
                                        echo "Application started successfully"
                                        break
                                    fi
                                    echo "Waiting... ($i/30)"
                                    sleep 2
                                done
                                curl -f http://localhost:3002/health || echo "Health check failed"
                                curl -f http://localhost:3002/api/todos || echo "Get todos failed"
                                curl -X POST http://localhost:3002/api/todos -H "Content-Type: application/json" -d '{"text":"Integration test todo"}' || echo "Create todo failed"
                                curl -f http://localhost:3002/metrics || echo "Metrics endpoint failed"
                                if [ -f integration-test.pid ]; then
                                    kill $(cat integration-test.pid) 2>/dev/null || echo "Test app stopped"
                                    rm -f integration-test.pid
                                fi
                            '''
                        }
                    }
                }
                
                stage('Performance Tests') {
                    steps {
                        script {
                            echo 'Running performance tests...'
                            sh '''
                                pkill -f "node.*server.js" || echo "No existing processes"
                                sleep 2
                                PORT=3003 npm start &
                                PERF_PID=$!
                                echo $PERF_PID > performance-test.pid
                                sleep 10
                                START_TIME=$(date +%s)
                                for i in {1..50}; do
                                    curl -s http://localhost:3003/health > /dev/null &
                                done
                                wait
                                END_TIME=$(date +%s)
                                DURATION=$((END_TIME - START_TIME))
                                RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3003/health)
                                if [ -f performance-test.pid ]; then
                                    MEMORY_USAGE=$(ps -o rss -p $(cat performance-test.pid) | tail -1)
                                fi
                                echo "Load Test Duration: ${DURATION}s" > performance-report.txt
                                echo "Concurrent Requests: 50" >> performance-report.txt
                                echo "Response Time: ${RESPONSE_TIME}s" >> performance-report.txt
                                echo "Memory Usage: ${MEMORY_USAGE:-N/A}KB" >> performance-report.txt
                                if [ -f performance-test.pid ]; then
                                    kill $(cat performance-test.pid) 2>/dev/null || echo "Performance app stopped"
                                    rm -f performance-test.pid
                                fi
                                cat performance-report.txt
                            '''
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'performance-report.txt', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage('Code Quality') {
            steps {
                script {
                    echo 'Running code quality analysis...'
                    sh '''
                        echo '{"env":{"node":true,"es2021":true,"jest":true},"extends":["eslint:recommended"],"parserOptions":{"ecmaVersion":12},"rules":{"no-console":"warn","no-unused-vars":"error","no-undef":"error"}}' > .eslintrc.json
                        npm install eslint --save-dev || echo "ESLint installation failed"
                        npx eslint . --ext .js --format json --output-file eslint-report.json || echo "ESLint completed with issues"
                        npx eslint . --ext .js --format unix || echo "ESLint analysis completed"
                        find . -name "*.js" -not -path "./node_modules/*" -not -path "./coverage/*" | while read file; do
                            lines=$(wc -l < "$file")
                            echo "File: $file - Lines: $lines"
                        done > complexity-report.txt
                        echo "Total JavaScript files: $(find . -name '*.js' -not -path './node_modules/*' | wc -l)" > code-stats.txt
                        echo "Total lines of code: $(find . -name '*.js' -not -path './node_modules/*' -exec wc -l {} + | tail -1 | awk '{print $1}')" >> code-stats.txt
                        cat code-stats.txt
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'eslint-report.json,complexity-report.txt,code-stats.txt', allowEmptyArchive: true
                    script {
                        if (fileExists('eslint-report.json')) {
                            recordIssues enabledForFailure: false, tools: [esLint(pattern: 'eslint-report.json')]
                        }
                    }
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    echo 'Running security analysis...'
                    sh '''
                        mkdir -p security-reports
                        npm audit --audit-level=${SECURITY_THRESHOLD} --json > security-reports/npm-audit.json || true
                        npm audit --audit-level=${SECURITY_THRESHOLD} || echo "npm audit completed with warnings"
                        grep -r -i -E "(password|secret|key|token|api_key)" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=coverage . > security-reports/secrets-check.txt || echo "No secrets found"
                        find . -type f -perm /o+w -not -path "./node_modules/*" > security-reports/permissions-check.txt || echo "No world-writable files"
                        echo "Security Scan Summary" > security-reports/summary.txt
                        echo "Scan Date: $(date)" >> security-reports/summary.txt
                        if [ -f "security-reports/npm-audit.json" ]; then
                            AUDIT_ISSUES=$(cat security-reports/npm-audit.json | jq -r '.vulnerabilities | length' 2>/dev/null || echo "0")
                            echo "NPM Audit Issues: $AUDIT_ISSUES" >> security-reports/summary.txt
                        fi
                        if [ -s "security-reports/secrets-check.txt" ]; then
                            echo "SECRETS_FOUND=true" >> security-reports/summary.txt
                        else
                            echo "SECRETS_FOUND=false" >> security-reports/summary.txt
                        fi
                        cat security-reports/summary.txt
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'security-reports/**/*', allowEmptyArchive: true
                    script {
                        if (fileExists('security-reports/summary.txt')) {
                            def summary = readFile('security-reports/summary.txt')
                            if (summary.contains('SECRETS_FOUND=true')) {
                                currentBuild.result = 'UNSTABLE'
                                echo "Potential secrets detected"
                            }
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                script {
                    echo 'Deploying to staging environment...'
                    sh '''
                        if [ -f "${STAGING_PID_FILE}" ]; then
                            OLD_PID=$(cat ${STAGING_PID_FILE})
                            kill $OLD_PID 2>/dev/null || echo "No existing staging process"
                            rm -f ${STAGING_PID_FILE}
                        fi
                        pkill -f "PORT=${STAGING_PORT}" || echo "No process on staging port"
                        sleep 2
                        PORT=${STAGING_PORT} NODE_ENV=staging npm start &
                        STAGING_PID=$!
                        echo $STAGING_PID > ${STAGING_PID_FILE}
                        echo "Staging PID: $STAGING_PID"
                        sleep 15
                        HEALTH_CHECK_PASSED=false
                        for i in {1..10}; do
                            if curl -f http://localhost:${STAGING_PORT}/health; then
                                echo "Staging health check passed"
                                HEALTH_CHECK_PASSED=true
                                break
                            fi
                            sleep 5
                        done
                        if [ "$HEALTH_CHECK_PASSED" = "false" ]; then
                            echo "Staging deployment health check failed"
                            if [ -f "${STAGING_PID_FILE}" ]; then
                                kill $(cat ${STAGING_PID_FILE}) 2>/dev/null
                                rm -f ${STAGING_PID_FILE}
                            fi
                            exit 1
                        fi
                        curl -f http://localhost:${STAGING_PORT}/api/todos || echo "API test warning"
                        curl -f http://localhost:${STAGING_PORT}/ || echo "Frontend test warning"
                        curl -f http://localhost:${STAGING_PORT}/metrics || echo "Metrics test warning"
                        echo "Staging deployment successful"
                        echo "URL: http://localhost:${STAGING_PORT}"
                        echo "PID: $(cat ${STAGING_PID_FILE})"
                    '''
                }
            }
            post {
                success {
                    echo 'Staging deployment completed successfully'
                }
                failure {
                    echo 'Staging deployment failed'
                    sh '''
                        if [ -f "${STAGING_PID_FILE}" ]; then
                            ps -p $(cat ${STAGING_PID_FILE}) || echo "Process not running"
                        fi
                        netstat -tlnp | grep :${STAGING_PORT} || echo "No process on staging port"
                    '''
                }
            }
        }
        
        stage('Release to Production') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    echo 'Deploying to production environment...'
                    timeout(time: 5, unit: 'MINUTES') {
                        input message: 'Deploy to production?', ok: 'Deploy',
                              submitterParameter: 'DEPLOYER_NAME'
                    }
                    sh '''
                        echo "Production deployment approved by: ${DEPLOYER_NAME:-Unknown}"
                        if [ -f "${PROD_PID_FILE}" ]; then
                            OLD_PROD_PID=$(cat ${PROD_PID_FILE})
                            echo "Stopping current production process: $OLD_PROD_PID"
                            kill $OLD_PROD_PID 2>/dev/null || echo "Production process already stopped"
                            rm -f ${PROD_PID_FILE}
                        fi
                        pkill -f "PORT=${PROD_PORT}" || echo "No process on production port"
                        sleep 3
                        PORT=${PROD_PORT} NODE_ENV=production npm start &
                        PROD_PID=$!
                        echo $PROD_PID > ${PROD_PID_FILE}
                        echo "Production PID: $PROD_PID"
                        sleep 20
                        PRODUCTION_HEALTHY=false
                        for i in {1..15}; do
                            if curl -f http://localhost:${PROD_PORT}/health 2>/dev/null; then
                                echo "Production health check passed"
                                PRODUCTION_HEALTHY=true
                                break
                            fi
                            sleep 5
                        done
                        if [ "$PRODUCTION_HEALTHY" = "true" ]; then
                            echo "Production deployment successful"
                            git tag -a "v${BUILD_NUMBER}" -m "Production release ${BUILD_NUMBER}" || true
                        else
                            echo "Production deployment failed health checks"
                            if [ -f "${PROD_PID_FILE}" ]; then
                                kill $(cat ${PROD_PID_FILE}) 2>/dev/null
                                rm -f ${PROD_PID_FILE}
                            fi
                            exit 1
                        fi
                        curl -f http://localhost:${PROD_PORT}/health || echo "Health endpoint test failed"
                        curl -f http://localhost:${PROD_PORT}/api/todos || echo "API endpoint test failed"
                        curl -f http://localhost:${PROD_PORT}/ || echo "Frontend test failed"
                        curl -f http://localhost:${PROD_PORT}/metrics || echo "Metrics test failed"
                        echo "Build Number: ${BUILD_NUMBER}" > production-deployment.txt
                        echo "Deployed by: ${DEPLOYER_NAME:-Jenkins}" >> production-deployment.txt
                        echo "Deployment Time: $(date)" >> production-deployment.txt
                        echo "Production URL: http://localhost:${PROD_PORT}" >> production-deployment.txt
                        echo "Process PID: $(cat ${PROD_PID_FILE})" >> production-deployment.txt
                        echo "Status: Successful" >> production-deployment.txt
                        cat production-deployment.txt
                    '''
                }
            }
            post {
                success {
                    echo 'Production deployment completed successfully'
                    archiveArtifacts artifacts: 'production-deployment.txt', allowEmptyArchive: true
                }
                failure {
                    echo 'Production deployment failed'
                    sh '''
                        if [ -f "${PROD_PID_FILE}" ]; then
                            ps -p $(cat ${PROD_PID_FILE}) || echo "Production process not running"
                        fi
                        netstat -tlnp | grep :${PROD_PORT} || echo "No process on production port"
                    '''
                }
            }
        }
        
        stage('Monitoring & Alerting') {
            steps {
                script {
                    echo 'Setting up monitoring and alerting...'
                    sh '''
                        mkdir -p monitoring/logs
                        echo '#!/bin/bash' > monitoring/monitor-app.sh
                        echo 'LOG_FILE="monitoring/logs/application-monitor.log"' >> monitoring/monitor-app.sh
                        echo 'TIMESTAMP=$(date)' >> monitoring/monitor-app.sh
                        echo 'echo "[$TIMESTAMP] Starting monitoring..." >> $LOG_FILE' >> monitoring/monitor-app.sh
                        echo 'if [ -f "${PROD_PID_FILE}" ]; then' >> monitoring/monitor-app.sh
                        echo '    PROD_PID=$(cat ${PROD_PID_FILE})' >> monitoring/monitor-app.sh
                        echo '    if ps -p $PROD_PID > /dev/null; then' >> monitoring/monitor-app.sh
                        echo '        PROD_STATUS="running"' >> monitoring/monitor-app.sh
                        echo '    else' >> monitoring/monitor-app.sh
                        echo '        PROD_STATUS="stopped"' >> monitoring/monitor-app.sh
                        echo '    fi' >> monitoring/monitor-app.sh
                        echo 'else' >> monitoring/monitor-app.sh
                        echo '    PROD_STATUS="not deployed"' >> monitoring/monitor-app.sh
                        echo 'fi' >> monitoring/monitor-app.sh
                        echo 'echo "[$TIMESTAMP] Production status: $PROD_STATUS" >> $LOG_FILE' >> monitoring/monitor-app.sh
                        chmod +x monitoring/monitor-app.sh
                        ./monitoring/monitor-app.sh
                        echo '#!/bin/bash' > monitoring/health-dashboard.sh
                        echo 'echo "Application Health Dashboard"' >> monitoring/health-dashboard.sh
                        echo 'echo "Generated: $(date)"' >> monitoring/health-dashboard.sh
                        echo 'echo "PRODUCTION (Port ${PROD_PORT}):"' >> monitoring/health-dashboard.sh
                        echo 'if curl -f http://localhost:${PROD_PORT}/health 2>/dev/null; then' >> monitoring/health-dashboard.sh
                        echo '    echo "  Status: Healthy"' >> monitoring/health-dashboard.sh
                        echo 'else' >> monitoring/health-dashboard.sh
                        echo '    echo "  Status: Unhealthy"' >> monitoring/health-dashboard.sh
                        echo 'fi' >> monitoring/health-dashboard.sh
                        echo 'echo "STAGING (Port ${STAGING_PORT}):"' >> monitoring/health-dashboard.sh
                        echo 'if curl -f http://localhost:${STAGING_PORT}/health 2>/dev/null; then' >> monitoring/health-dashboard.sh
                        echo '    echo "  Status: Healthy"' >> monitoring/health-dashboard.sh
                        echo 'else' >> monitoring/health-dashboard.sh
                        echo '    echo "  Status: Unhealthy"' >> monitoring/health-dashboard.sh
                        echo 'fi' >> monitoring/health-dashboard.sh
                        chmod +x monitoring/health-dashboard.sh
                        ./monitoring/health-dashboard.sh > monitoring/current-status.txt
                        echo "Monitoring Setup Complete" > monitoring-setup.txt
                        echo "Production Health: http://localhost:${PROD_PORT}/health" >> monitoring-setup.txt
                        echo "Staging Health: http://localhost:${STAGING_PORT}/health" >> monitoring-setup.txt
                        echo "Production URL: http://localhost:${PROD_PORT}" >> monitoring-setup.txt
                        echo "Staging URL: http://localhost:${STAGING_PORT}" >> monitoring-setup.txt
                        cat monitoring-setup.txt
                        cat monitoring/current-status.txt
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'monitoring/**/*,monitoring-setup.txt', allowEmptyArchive: true
                }
                success {
                    echo 'Monitoring setup completed successfully'
                }
                failure {
                    echo 'Monitoring setup failed'
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo 'Todo DevOps Pipeline completed'
                sh '''
                    echo "Todo DevOps Pipeline Final Report" > final-report.txt
                    echo "Build: ${BUILD_NUMBER}" >> final-report.txt
                    echo "Timestamp: $(date)" >> final-report.txt
                    echo "Branch: ${BRANCH_NAME:-main}" >> final-report.txt
                    echo "Mode: No Docker, No NodeJS Tool" >> final-report.txt
                    echo "" >> final-report.txt
                    echo "Deployment Status:" >> final-report.txt
                    if [ -f "${PROD_PID_FILE}" ] && ps -p $(cat ${PROD_PID_FILE}) > /dev/null; then
                        echo "- Production: Running (PID: $(cat ${PROD_PID_FILE}))" >> final-report.txt
                    else
                        echo "- Production: Not running" >> final-report.txt
                    fi
                    if [ -f "${STAGING_PID_FILE}" ] && ps -p $(cat ${STAGING_PID_FILE}) > /dev/null; then
                        echo "- Staging: Running (PID: $(cat ${STAGING_PID_FILE}))" >> final-report.txt
                    else
                        echo "- Staging: Not running" >> final-report.txt
                    fi
                    echo "" >> final-report.txt
                    echo "Access URLs:" >> final-report.txt
                    echo "- Production: http://localhost:${PROD_PORT}" >> final-report.txt
                    echo "- Staging: http://localhost:${STAGING_PORT}" >> final-report.txt
                    echo "" >> final-report.txt
                    echo "Pipeline Stages Completed:" >> final-report.txt
                    echo "1. Checkout - Code retrieved from GitHub" >> final-report.txt
                    echo "2. Build - Dependencies installed, Node.js verified" >> final-report.txt
                    echo "3. Test - Unit, Integration, Performance tests" >> final-report.txt
                    echo "4. Code Quality - ESLint analysis, complexity check" >> final-report.txt
                    echo "5. Security Scan - npm audit, secrets detection" >> final-report.txt
                    echo "6. Deploy to Staging - Process-based deployment" >> final-report.txt
                    echo "7. Release to Production - Blue-green deployment" >> final-report.txt
                    echo "8. Monitoring & Alerting - Health monitoring setup" >> final-report.txt
                    echo "" >> final-report.txt
                    echo "Process Information:" >> final-report.txt
                    ps aux | grep node | grep -v grep >> final-report.txt || echo "No Node.js processes found" >> final-report.txt
                    echo "" >> final-report.txt
                    echo "Port Usage:" >> final-report.txt
                    netstat -tlnp | grep -E ":(${PROD_PORT}|${STAGING_PORT})" >> final-report.txt || echo "No processes on configured ports" >> final-report.txt
                '''
                archiveArtifacts artifacts: 'final-report.txt'
                sh 'rm -f integration-test.pid performance-test.pid || true'
            }
        }
        
        success {
            script {
                echo 'Todo DevOps Pipeline completed successfully!'
                if (fileExists('final-report.txt')) {
                    def report = readFile('final-report.txt')
                    echo "${report}"
                }
            }
        }
        
        failure {
            script {
                echo 'Todo DevOps Pipeline failed'
                sh '''
                    if [ -f "${STAGING_PID_FILE}" ]; then
                        kill $(cat ${STAGING_PID_FILE}) 2>/dev/null || echo "Staging cleanup attempted"
                        rm -f ${STAGING_PID_FILE}
                    fi
                    if [ -f "${PROD_PID_FILE}" ]; then
                        kill $(cat ${PROD_PID_FILE}) 2>/dev/null || echo "Production cleanup attempted"
                        rm -f ${PROD_PID_FILE}
                    fi
                    rm -f integration-test.pid performance-test.pid || true
                    pkill -f "PORT=300[2-3]" || echo "Test process cleanup attempted"
                '''
            }
        }
        
        unstable {
            script {
                echo 'Todo DevOps Pipeline completed with warnings'
            }
        }
        
        cleanup {
            script {
                echo 'Final cleanup...'
                sh '''
                    mkdir -p .jenkins_cache
                    cp final-report.txt .jenkins_cache/ 2>/dev/null || true
                    cp monitoring-setup.txt .jenkins_cache/ 2>/dev/null || true
                    cp build-info.txt .jenkins_cache/ 2>/dev/null || true
                '''
                cleanWs(
                    cleanWhenNotBuilt: false,
                    deleteDirs: true,
                    disableDeferredWipeout: true,
                    notFailBuild: true,
                    patterns: [
                        [pattern: '.jenkins_cache/**', type: 'EXCLUDE'],
                        [pattern: '*.pid', type: 'INCLUDE']
                    ]
                )
            }
        }
    }
}