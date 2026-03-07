# AWS App2Container (A2C): Application Modernization Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and executing application modernization workflows using AWS App2Container.

## 1. Core Concepts
AWS App2Container (A2C) is a command-line tool for modernizing .NET and Java applications into containerized applications.
- **Inventory & Analysis**: Discovers and analyzes applications running on physical servers or VMs (on-premises or EC2).
- **Automated Containerization**: Generates Docker images for discovered applications without requiring source code changes.
- **Artifact Generation**: Automatically creates CloudFormation templates, ECS task definitions, EKS deployment manifests, and CI/CD pipeline configurations.

## 2. Supported Frameworks
- **Java**: Web applications running on Apache Tomcat, JBoss, or standalone Java applications (Spring Boot).
- **.NET**: Web applications running on IIS (ASP.NET) on Windows. Supports migration to Linux containers (if compatible) or Windows containers.

## 3. Modernization Workflow
1. **Inventory**: `extract` and `inventory` commands to discover running applications.
2. **Analysis**: `analyze` command to identify dependencies (libraries, ports, network connectivity).
3. **Containerization**: `containerize` command to build Docker images and generate Dockerfiles.
4. **Deployment**: `generate-app-deployment` creates manifests for ECS, EKS, or App Runner.

## 4. Implementation Workflow (CLI-based)
```bash
# Initialize App2Container
app2container init

# Analyze a Java application on a server
app2container analyze --application-id java-app-001

# Containerize the application
app2container containerize --application-id java-app-001

# Generate deployment artifacts for EKS
app2container generate-app-deployment --application-id java-app-001 --deployment-target EKS
```

## 5. Security & Governance
- **Least Privilege**: Ensure the A2C tool has appropriate IAM permissions for ECR and CloudFormation.
- **Secret Management**: A2C identifies hardcoded secrets during analysis; these should be migrated to **Amazon Secrets Manager**.
- **Container Security**: Scanning for vulnerabilities in the generated images should be performed via **Amazon ECR**.

## 6. Safe Practice Protocol
- **Source Preservation**: A2C is non-disruptive to the source application during analysis and extraction.
- **Compatibility Check**: Always review the `analysis.json` report to identify binary dependencies that might not be container-friendly (e.g., specific Windows GDI+ dependencies).
- **Linux Migration**: Prioritize migrating .NET applications to Linux containers via .NET Core/5+ whenever possible to reduce licensing costs.
- **Pipeline Integration**: Leverage the generated CI/CD artifacts to establish a modern DevOps lifecycle immediately after containerization.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
