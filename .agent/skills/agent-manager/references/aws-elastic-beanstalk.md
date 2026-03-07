# AWS Elastic Beanstalk: Managed PaaS Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and deploying applications using AWS Elastic Beanstalk.

## 1. Core Concepts
AWS Elastic Beanstalk is an easy-to-use service for deploying and scaling web applications and services.
- **Managed PaaS**: Automatically handles capacity provisioning, load balancing, auto-scaling, and application health monitoring.
- **No Restrictions**: You retain full control over the AWS resources powering your application and can access them at any time.

## 2. Environment Types
- **Web Server Environment**: Designed for standard web applications that handle HTTP/HTTPS requests. Provisions an Elastic Load Balancer (ELB) and Auto Scaling Group (ASG).
- **Worker Environment**: Designed for background tasks and asynchronous processing. Integrated with Amazon SQS; a local daemon on each instance pulls messages from SQS and sends them to the application as HTTP POST requests.

## 3. Configuration & Customization
- **.ebextensions**: YAML/JSON configuration files in the `.ebextensions/` folder at the project root. Used to customize software, install packages, and define additional AWS resources using CloudFormation syntax.
- **Procfile**: Declares custom commands to execute application processes (e.g., `web: npm start`).
- **Platform Hooks**: Scripts that run during specific lifecycle events (e.g., prebuild, postdeploy).

## 4. Implementation Workflow (EB CLI)
```bash
# 1. Initialize project
eb init -p node.js-18 my-app

# 2. Create environment
eb create my-env

# 3. Deploy updates
eb deploy

# 4. View logs or health
eb logs
eb health
```

## 5. Security & Governance
- **IAM Instance Profile**: Assign specific permissions to the EC2 instances running your application.
- **VPC Integration**: Deploy environments into private subnets with NAT Gateway for enhanced security.
- **Environment Properties**: Manage sensitive configuration (database strings, API keys) securely via environment variables.

## 6. Safe Practice Protocol
- **Immutable Updates**: Use **Immutable** or **Blue/Green** deployment policies for production to ensure zero downtime and easy rollback.
- **Managed Updates**: Enable **Managed Platform Updates** to ensure Beanstalk automatically patches the underlying OS and platform.
- **X-Ray Integration**: Enable AWS X-Ray in the configuration to gain deep insights into application performance and bottlenecks.
- **Log Management**: Configure log streaming to **Amazon CloudWatch Logs** for persistent audit trails.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
