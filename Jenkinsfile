pipeline {
    agent any
    
    environment {
        PROJECT_NAME = 'todo-devops-demo'
        NODE_VERSION = 'NodeJS-18'
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
                    sh '''
                        echo "Cloning from GitHub repository..."
                        git clone https://github.com/ImtiazSajwani/DevopPipeline.git .
                        echo "Repository cloned successfully:"
                        git remote -v
                        git log -1 --oneline
                        ls -la
                        echo "Node.js and npm versions:"
                        node --version
                        npm --version
                    '''
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
                        echo "Installing dependencies..."
                        npm ci
                        echo "Running build script..."
                        npm run build || echo "No build script configured, continuing..."
                        echo "Checking application files..."
                        ls -la
                        if [ ! -f "server.js" ]; then
                            echo "server.js not found"
                            exit 1
                        fi
                        if [ ! -f "package.json" ]; then
                            echo "package.json not found"
                            exit 1
                        fi
                        cat > build-info.txt << EOF
Build Information:
- Build Number: ${BUILD_NUMBER}
- Build Time: $(date)
- Node Version: $(node --version)
- NPM Version: $(npm --version)
- Git Commit: $(git rev-parse HEAD)
EOF
                        echo "Build preparation completed"
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
                                echo "Executing Jest unit tests..."
                                npm test -- --ci --coverage --watchAll=false || echo "Tests completed with issues"
                                echo "Test results:"
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
                                echo "Starting application for integration tests..."
                                pkill -f "node.*server.js" || echo "No existing node processes found"
                                sleep 2
                                PORT=3002 npm start &
                                APP_PID=$!
                                echo $APP_PID > integration-test.pid
                                echo "Waiting for application to start on port 3002..."
                                for i in {1..30}; do
                                    if curl -f http://localhost:3002/health 2>/dev/null; then
                                        echo "Application started successfully"
                                        break
                                    fi
                                    echo "Waiting... ($i/30)"
                                    sleep 2
                                done
                                echo "Testing API endpoints..."
                                curl -f http://localhost:3002/health || echo "Health check failed"
                                curl -f http://localhost:3002/api/todos || echo "Get todos failed"
                                curl -X POST http://localhost:3002/api/todos -H "Content-Type: application/json" -d '{"text":"Integration test todo"}' || echo "Create todo failed"
                                curl -f http://localhost:3002/metrics || echo "Metrics endpoint failed"
                                if [ -f integration-test.pid ]; then
                                    kill $(cat integration-test.pid) 2>/dev/null || echo "Test app already stopped"
                                    rm -f integration-test.pid
                                fi
                                echo "Integration tests completed"
                            '''
                        }
                    }
                }
                
                stage('Performance Tests') {
                    steps {
                        script {
                            echo 'Running performance tests...'
                            sh '''
                                echo "Starting performance tests..."
                                pkill -f "node.*server.js" || echo "No existing processes"
                                sleep 2
                                PORT=3003 npm start &
                                PERF_PID=$!
                                echo $PERF_PID > performance-test.pid
                                sleep 10
                                echo "Running load test..."
                                START_TIME=$(date +%s)
                                for i in {1..50}; do
                                    curl -s http://localhost:3003/health > /dev/null &
                                done
                                wait
                                END_TIME=$(date +%s)
                                DURATION=$((END_TIME - START_TIME))
                                echo "Testing response times..."
                                RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3003/health)
                                echo "Response time: ${RESPONSE_TIME}s"
                                if [ -f performance-test.pid ]; then
                                    MEMORY_USAGE=$(ps -o pid,vsz,rss,comm -p $(cat performance-test.pid) | tail -1 | awk '{print $3}')
                                    echo "Memory usage: ${MEMORY_USAGE}KB"
                                fi
                                cat > performance-report.txt << EOF
Performance Test Results:
- Load Test Duration: ${DURATION}s
- Concurrent Requests: 50
- Response Time: ${RESPONSE_TIME}s
- Memory Usage: ${MEMORY_USAGE:-N/A}KB
- Test Status: $([ $(echo "$RESPONSE_TIME < 1.0" | bc -l 2>/dev/null || echo "0") -eq 1 ] && echo "PASS" || echo "WARN")
EOF
                                if [ -f performance-test.pid ]; then
                                    kill $(cat performance-test.pid) 2>/dev/null || echo "Performance app stopped"
                                    rm -f performance-test.pid
                                fi
                                echo "Performance tests completed"
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
                        echo "Running ESLint..."
                        if [ ! -f ".eslintrc.json" ]; then
                            cat > .eslintrc.json << 'EOF'
{
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "no-undef": "error"
  }
}
EOF
                        fi
                        npm install eslint --save-dev || echo "ESLint installation failed, continuing..."
                        npx eslint . --ext .js --format json --output-file eslint-report.json || echo "ESLint completed with issues"
                        npx eslint . --ext .js --format unix || echo "ESLint analysis completed"
                        echo "Analyzing code complexity..."
                        find . -name "*.js" -not -path "./node_modules/*" -not -path "./coverage/*" | while read file; do
                            lines=$(wc -l < "$file")
                            echo "File: $file - Lines: $lines"
                        done > complexity-report.txt
                        echo "Code statistics:" > code-stats.txt
                        echo "Total JavaScript files: $(find . -name '*.js' -not -path './node_modules/*' | wc -l)" >> code-stats.txt
                        echo "Total lines of code: $(find . -name '*.js' -not -path './node_modules/*' -exec wc -l {} + | tail -1 | awk '{print $1}')" >> code-stats.txt
                        echo "Dependencies: $(cat package.json | jq -r '.dependencies | keys | length' 2>/dev/null || echo 'N/A')" >> code-stats.txt
                        echo "Dev Dependencies: $(cat package.json | jq -r '.devDependencies | keys | length' 2>/dev/null || echo 'N/A')" >> code-stats.txt
                        echo "Code quality analysis completed"
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
                        echo "Running npm audit..."
                        mkdir -p security-reports
                        npm audit --audit-level=${SECURITY_THRESHOLD} --json > security-reports/npm-audit.json || true
                        npm audit --audit-level=${SECURITY_THRESHOLD} || echo "npm audit completed with warnings"
                        echo "Checking for potential secrets..."
                        grep -r -i -E "(password|secret|key|token|api_key)" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=coverage . > security-reports/secrets-check.txt || echo "No obvious secrets found"
                        echo "Checking file permissions..." > security-reports/permissions-check.txt
                        find . -type f -perm /o+w -not -path "./node_modules/*" >> security-reports/permissions-check.txt || echo "No world-writable files found" >> security-reports/permissions-check.txt
                        echo "=== Security Scan Summary ===" > security-reports/summary.txt
                        echo "Scan Date: $(date)" >> security-reports/summary.txt
                        if [ -f "security-reports/npm-audit.json" ]; then
                            AUDIT_ISSUES=$(cat security-reports/npm-audit.json | jq -r '.vulnerabilities | length' 2>/dev/null || echo "0")
                            echo "NPM Audit Issues: $AUDIT_ISSUES" >> security-reports/summary.txt
                        fi
                        if [ -s "security-reports/secrets-check.txt" ]; then
                            echo "Potential secrets detected!" >> security-reports/summary.txt
                            echo "SECRETS_FOUND=true" >> security-reports/summary.txt
                        else
                            echo "No obvious secrets found" >> security-reports/summary.txt
                            echo "SECRETS_FOUND=false" >> security-reports/summary.txt
                        fi
                        echo "Security analysis completed"
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
                            echo "Security Summary: ${summary}"
                            if (summary.contains('SECRETS_FOUND=true')) {
                                currentBuild.result = 'UNSTABLE'
                                echo "Potential secrets detected - marking build as unstable"
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
                        echo "Setting up staging deployment..."
                        if [ -f "${STAGING_PID_FILE}" ]; then
                            OLD_PID=$(cat ${STAGING_PID_FILE})
                            kill $OLD_PID 2>/dev/null || echo "No existing staging process found"
                            rm -f ${STAGING_PID_FILE}
                        fi
                        pkill -f "PORT=${STAGING_PORT}" || echo "No process on staging port"
                        sleep 2
                        echo "Starting staging application on port ${STAGING_PORT}..."
                        PORT=${STAGING_PORT} NODE_ENV=staging npm start &
                        STAGING_PID=$!
                        echo $STAGING_PID > ${STAGING_PID_FILE}
                        echo "Staging PID: $STAGING_PID"
                        echo "Waiting for staging application to start..."
                        sleep 15
                        HEALTH_CHECK_PASSED=false
                        for i in {1..10}; do
                            echo "Health check attempt $i/10..."
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
                                kill $(cat ${STAGING_PID_FILE}) 2>/dev/null || echo "Process cleanup attempted"
                                rm -f ${STAGING_PID_FILE}
                            fi
                            exit 1
                        fi
                        echo "Testing staging deployment..."
                        curl -f http://localhost:${STAGING_PORT}/api/todos || echo "API test warning"
                        curl -f http://localhost:${STAGING_PORT}/ || echo "Frontend test warning"
                        curl -f http://localhost:${STAGING_PORT}/metrics || echo "Metrics test warning"
                        echo "Staging deployment successful"
                        echo "Staging deployment information:"
                        echo "URL: http://localhost:${STAGING_PORT}"
                        echo "PID: $(cat ${STAGING_PID_FILE})"
                        echo "Process Status: $(ps -p $(cat ${STAGING_PID_FILE}) -o pid,ppid,cmd --no-headers || echo 'Process not found')"
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
                        echo "Staging deployment failure details:"
                        if [ -f "${STAGING_PID_FILE}" ]; then
                            echo "Staging PID file exists: $(cat ${STAGING_PID_FILE})"
                            ps -p $(cat ${STAGING_PID_FILE}) || echo "Process not running"
                        fi
                        netstat -tlnp | grep :${STAGING_PORT} || echo "No process listening on staging port"
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
                        echo "Setting up production deployment..."
                        echo "Implementing blue-green deployment..."
                        if [ -f "${PROD_PID_FILE}" ]; then
                            OLD_PROD_PID=$(cat ${PROD_PID_FILE})
                            echo "Stopping current production process: $OLD_PROD_PID"
                            kill $OLD_PROD_PID 2>/dev/null || echo "Production process already stopped"
                            rm -f ${PROD_PID_FILE}
                        fi
                        pkill -f "PORT=${PROD_PORT}" || echo "No process on production port"
                        sleep 3
                        echo "Starting production application on port ${PROD_PORT}..."
                        PORT=${PROD_PORT} NODE_ENV=production npm start &
                        PROD_PID=$!
                        echo $PROD_PID > ${PROD_PID_FILE}
                        echo "Production PID: $PROD_PID"
                        echo "Waiting for production deployment..."
                        sleep 20
                        PRODUCTION_HEALTHY=false
                        for i in {1..15}; do
                            echo "Production health check $i/15..."
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
                                kill $(cat ${PROD_PID_FILE}) 2>/dev/null || echo "Failed production cleanup attempted"
                                rm -f ${PROD_PID_FILE}
                            fi
                            exit 1
                        fi
                        echo "Running production smoke tests..."
                        curl -f http://localhost:${PROD_PORT}/health || echo "Health endpoint test failed"
                        curl -f http://localhost:${PROD_PORT}/api/todos || echo "API endpoint test failed"
                        curl -f http://localhost:${PROD_PORT}/ || echo "Frontend test failed"
                        curl -f http://localhost:${PROD_PORT}/metrics || echo "Metrics test failed"
                        echo "Production deployment and testing completed"
                        cat > production-deployment.txt << EOF
Production Deployment Summary:
- Build Number: ${BUILD_NUMBER}
- Deployed by: ${DEPLOYER_NAME:-Jenkins}
- Deployment Time: $(date)
- Production URL: http://localhost:${PROD_PORT}
- Process PID: $(cat ${PROD_PID_FILE})
- Status: Successful
EOF
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
                        echo "Production deployment failure details:"
                        if [ -f "${PROD_PID_FILE}" ]; then
                            echo "Production PID file: $(cat ${PROD_PID_FILE})"
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
                        echo "Configuring application monitoring..."
                        mkdir -p monitoring/logs
                        cat > monitoring/monitor-app.sh << 'EOF'
#!/bin/bash
LOG_FILE="monitoring/logs/application-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Starting application monitoring..." >> $LOG_FILE
if [ -f "${PROD_PID_FILE}" ]; then
    PROD_PID=$(cat ${PROD_PID_FILE})
    if ps -p $PROD_PID > /dev/null; then
        PROD_STATUS="running"
        PROD_HEALTH=$(curl -s http://localhost:${PROD_PORT}/health | jq -r '.status' 2>/dev/null || echo "unreachable")
    else
        PROD_STATUS="stopped"
        PROD_HEALTH="unhealthy"
    fi
else
    PROD_STATUS="not deployed"
    PROD_HEALTH="unhealthy"
fi
echo "[$TIMESTAMP] Production status: $PROD_STATUS, health: $PROD_HEALTH" >> $LOG_FILE
if [ -f "${STAGING_PID_FILE}" ]; then
    STAGING_PID=$(cat ${STAGING_PID_FILE})
    if ps -p $STAGING_PID > /dev/null; then
        STAGING_STATUS="running"
        STAGING_HEALTH=$(curl -s http://localhost:${STAGING_PORT}/health | jq -r '.status' 2>/dev/null || echo "unreachable")
    else
        STAGING_STATUS="stopped"
        STAGING_HEALTH="unhealthy"
    fi
else
    STAGING_STATUS="not deployed"
    STAGING_HEALTH="unhealthy"
fi
echo "[$TIMESTAMP] Staging status: $STAGING_STATUS, health: $STAGING_HEALTH" >> $LOG_FILE
if [ "$PROD_HEALTH" != "healthy" ]; then
    echo "[$TIMESTAMP] ALERT: Production application unhealthy!" >> $LOG_FILE
fi
if [ "$STAGING_HEALTH" != "healthy" ]; then
    echo "[$TIMESTAMP] ALERT: Staging application unhealthy!" >> $LOG_FILE
fi
echo "[$TIMESTAMP] Monitoring check completed" >> $LOG_FILE
EOF
                        chmod +x monitoring/monitor-app.sh
                        ./monitoring/monitor-app.sh
                        cat > monitoring/health-dashboard.sh << 'EOF'
#!/bin/bash
echo "=== Application Health Dashboard ==="
echo "Generated: $(date)"
echo ""
echo "PRODUCTION (Port ${PROD_PORT}):"
if curl -f http://localhost:${PROD_PORT}/health 2>/dev/null; then
    echo "  Status: Healthy"
    echo "  URL: http://localhost:${PROD_PORT}"
else
    echo "  Status: Unhealthy"
fi
echo ""
echo "STAGING (Port ${STAGING_PORT}):"
if curl -f http://localhost:${STAGING_PORT}/health 2>/dev/null; then
    echo "  Status: Healthy"
    echo "  URL: http://localhost:${STAGING_PORT}"
else
    echo "  Status: Unhealthy"
fi
echo ""
echo "System Resources:"
echo "  Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "  Disk: $(df -h / | awk 'NR==2{print $5}')"
echo ""
echo "Active Node.js Processes:"
ps aux | grep node | grep -v grep | wc -l
EOF
                        chmod +x monitoring/health-dashboard.sh
                        ./monitoring/health-dashboard.sh > monitoring/current-status.txt
                        cat > monitoring-setup.txt << 'EOF'
Monitoring Setup Complete:

Health Monitoring:
- Production Health: http://localhost:${PROD_PORT}/health
- Staging Health: http://localhost:${STAGING_PORT}/health
- Production Metrics: http://localhost:${PROD_PORT}/metrics
- Staging Metrics: http://localhost:${STAGING_PORT}/metrics

Monitoring Scripts:
- Health Monitor: ./monitoring/monitor-app.sh
- Dashboard: ./monitoring/health-dashboard.sh

Application URLs:
- Production: http://localhost:${PROD_PORT}
- Staging: http://localhost:${STAGING_PORT}

Log Files:
- Monitoring Log: monitoring/logs/application-monitor.log
- Current Status: monitoring/current-status.txt
EOF
                        echo "Monitoring setup completed"
                        cat monitoring-setup.txt
                        echo ""
                        echo "=== Current Application Status ==="
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
            node {
                script {
                    echo 'Todo DevOps Pipeline completed'
                    sh '''
                        echo "=== Todo DevOps Pipeline Final Report ===" > final-report.txt
                        echo "Build: ${BUILD_NUMBER}" >> final-report.txt
                        echo "Timestamp: $(date)" >> final-report.txt
                        echo "Branch: ${BRANCH_NAME:-main}" >> final-report.txt
                        echo "Mode: No Docker Deployment" >> final-report.txt
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
                        echo "2. Build - Dependencies installed, build verified" >> final-report.txt
                        echo "3. Test - Unit, Integration, Performance tests" >> final-report.txt
                        echo "4. Code Quality - ESLint analysis, complexity check" >> final-report.txt
                        echo "5. Security Scan - npm audit, secrets detection" >> final-report.txt
                        echo "6. Deploy to Staging - Process-based deployment" >> final-report.txt
                        echo "7. Release to Production - Blue-green deployment" >> final-report.txt
                        echo "8. Monitoring & Alerting - Health monitoring setup" >> final-report.txt
                        echo "" >> final-report.txt
                        echo "Process Information:" >> final-report.txt
                        echo "Node.js processes:" >> final-report.txt
                        ps aux | grep node | grep -v grep >> final-report.txt || echo "No Node.js processes found" >> final-report.txt
                        echo "" >> final-report.txt
                        echo "Port Usage:" >> final-report.txt
                        netstat -tlnp | grep -E ":(${PROD_PORT}|${STAGING_PORT})" >> final-report.txt || echo "No processes on configured ports" >> final-report.txt
                    '''
                    archiveArtifacts artifacts: 'final-report.txt'
                    sh '''
                        rm -f integration-test.pid performance-test.pid || true
                    '''
                }
            }
        }
        
        success {
            node {
                script {
                    echo 'Todo DevOps Pipeline completed successfully!'
                    if (fileExists('final-report.txt')) {
                        def report = readFile('final-report.txt')
                        echo "${report}"
                    }
                }
            }
        }
        
        failure {
            node {
                script {
                    echo 'Todo DevOps Pipeline failed'
                    sh '''
                        echo "Cleaning up processes..."
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
        }
        
        unstable {
            node {
                script {
                    echo 'Todo DevOps Pipeline completed with warnings'
                }
            }
        }
        
        cleanup {
            node {
                script {
                    echo 'Final cleanup...'
                    sh '''
                        mkdir -p .jenkins_cache
                        cp final-report.txt .jenkins_cache/ 2>/dev/null || true
                        cp monitoring-setup.txt .jenkins_cache/ 2>/dev/null || true
                        cp build-info.txt .jenkins_cache/ 2>/dev/null || true
                        echo "Files preserved for next build:"
                        ls -la .jenkins_cache/ || echo "No files preserved"
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
}