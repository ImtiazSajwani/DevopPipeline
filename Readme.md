# Todo DevOps Demo

A simple Todo application demonstrating a complete DevOps pipeline with Jenkins, featuring all 7 essential stages: Build, Test, Code Quality, Security, Deploy, Release, and Monitoring.

## 🚀 Features

- **RESTful API** with full CRUD operations
- **Modern Frontend** with vanilla JavaScript
- **Health Monitoring** with custom endpoints
- **Docker Support** for containerization
- **Complete Test Suite** (Unit + Integration + Performance)
- **Security Scanning** with multiple tools
- **Code Quality Analysis** with ESLint and SonarQube
- **Monitoring Stack** with Prometheus and Grafana

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Jenkins with required plugins
- Git

## 🛠️ Quick Start

### Local Development

```bash
# Clone the repository
git clone <your-repository-url>
cd todo-devops-demo

# Install dependencies
npm install

# Start the application
npm start

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3000/api/todos
# Health: http://localhost:3000/health
```

### Docker Deployment

```bash
# Build Docker image
docker build -t todo-app .

# Run container
docker run -p 3000:3000 todo-app
```

### Jenkins Pipeline

1. Create a new Jenkins Pipeline job
2. Configure Git repository URL
3. Set Pipeline script from SCM
4. Point to `Jenkinsfile` in repository root
5. Run the pipeline

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | Get all todos |
| GET | `/api/todos/:id` | Get specific todo |
| POST | `/api/todos` | Create new todo |
| PUT | `/api/todos/:id` | Update todo |
| DELETE | `/api/todos/:id` | Delete todo |
| GET | `/api/stats` | Get todo statistics |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run linting
npm run lint
```

## 🔒 Security

- Input validation and sanitization
- Rate limiting
- Security headers with Helmet
- Dependency vulnerability scanning
- Container security scanning

## 📈 Monitoring

The application includes comprehensive monitoring:

- **Health Endpoints**: `/health` and `/metrics`
- **Prometheus Metrics**: Custom application metrics
- **Grafana Dashboards**: Visual monitoring
- **Automated Alerts**: Container and application health
- **Log Aggregation**: Centralized logging

## Jenkins Pipeline Stages

### 1. **Checkout** 
- Code repository checkout
- Environment verification

### 2. **Build**
- Dependency installation
- Docker image creation
- Build artifact generation

### 3. **Test**
- **Unit Tests**: Jest test suite
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load and response time testing

### 4. **Code Quality**
- ESLint static analysis
- Code complexity analysis
- SonarQube integration (if available)

### 5. **Security Scan**
- npm audit for dependency vulnerabilities
- Snyk security scanning (if available)
- Docker image security analysis
- Secrets detection

### 6. **Deploy to Staging**
- Staging environment deployment
- Health check validation
- Smoke testing

### 7. **Release to Production**
- Blue-green deployment strategy
- Production health validation
- Load balancer configuration
- Rollback capability

### 8. **Monitoring & Alerting**
- Prometheus and Grafana setup
- Custom metrics collection
- Automated health monitoring
- Alert configuration

## 🐳 Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 3000, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => { process.exit(1); }); req.end();"

# Start application
CMD ["npm", "start"]
```

## 📁 Project Structure

```
todo-devops-demo/
├── server.js              # Main application server
├── package.json            # Dependencies and scripts
├── Jenkinsfile            # Complete CI/CD pipeline
├── Dockerfile             # Container configuration
├── docker-compose.yml     # Multi-container setup
├── public/                # Frontend assets
│   ├── index.html         # Main HTML page
│   ├── style.css          # Styling
│   └── script.js          # Frontend JavaScript
├── tests/                 # Test suites
│   ├── api.test.js        # API integration tests
│   └── unit.test.js       # Unit tests
├── monitoring/            # Monitoring configuration
├── .eslintrc.json         # Code quality rules
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## 🌍 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application port |
| `NODE_ENV` | `development` | Environment mode |

## 🚀 Deployment Environments

### Staging
- **URL**: http://localhost:3001
- **Purpose**: Testing and validation
- **Docker Container**: `todo-staging`

### Production  
- **URL**: http://localhost:3000
- **Load Balancer**: http://localhost
- **Docker Container**: `todo-production`
- **Features**: Nginx reverse proxy, resource limits

## 📊 Monitoring URLs

- **Application**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Node Exporter**: http://localhost:9100

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.


## 🔧 Troubleshooting

### Common Issues

**Port Conflicts**: Change ports in environment variables
**Docker Issues**: Ensure Docker daemon is running
**Jenkins Permissions**: Add Jenkins user to docker group
**Node Version**: Ensure Node.js 18+ is installed

### Health Check Failures
```bash
# Check application logs
docker logs todo-production

# Verify container status
docker ps | grep todo

# Test health endpoint manually
curl http://localhost:3000/health
```

For more help, check the Jenkins console output and container logs.