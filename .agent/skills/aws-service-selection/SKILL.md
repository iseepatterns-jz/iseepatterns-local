---
name: aws-service-selection
description: High-level architectural decision framework for selecting the optimal AWS service based on workload requirements, constraints, and cost profiles.
---

# AWS Service Selection: The Architect's Compass

This skill defines the definitive decision framework for choosing AWS services. It synthesizes systemic requirements into architectural choices.

## 1. Decision Tiers

### A. Compute: Where do I run my code?
- **Workflow**: Is it a long-running server, a background task, or a web app?
- **Decision Tree**:
    - *Full OS Control needed?* -> **Amazon EC2**
    - *Standard Web/Worker (No Orchestration overhead)?* -> **AWS Elastic Beanstalk**
    - *Containerized (Docker/K8s)?*
        - *Want to manage instances?* -> **ECS/EKS on EC2**
        - *Serverless (No instance management)?* -> **AWS Fargate**
    - *Event-Driven / Short-lived / Scale-to-Zero?* -> **AWS Lambda**

### B. Storage: Where do I put my data?
- **Decision Tree**:
    - *Relational (SQL, Transactions, Joins)?* -> **Amazon RDS / Aurora**
    - *NoSQL (Key-Value, PB-Scale, Low-Latency)?* -> **Amazon DynamoDB**
    - *Unstructured / Binary (Images, Logs, Backups)?* -> **Amazon S3**
    - *Graph (Relationships, Social, Fraud)?* -> **Amazon Neptune**
    - *In-Memory (Caching, Sub-ms)?*
        - *Transient Cache only?* -> **Amazon ElastiCache**
        - *Durable Primary Redis?* -> **Amazon MemoryDB**
    - *Hierarchical / Directory?* -> **Amazon Cloud Directory (Legacy)** or **DynamoDB (Modern)**

### C. APIs & Integration: How do services talk?
- **Decision Tree**:
    - *Public REST/HTTP endpoint?*
        - *Lightweight/Cheap?* -> **API Gateway HTTP API**
        - *Enterprise/WAF/Usage Plans?* -> **API Gateway REST API**
    - *GraphQL / Real-time sync?* -> **Amazon AppSync**
    - *Async Event Bus?* -> **EventBridge**
    - *Message Queue?* -> **Amazon SQS**

## 2. Decision Matrix: Modernization & AI

| Goal | Primary Recommended Service |
| :--- | :--- |
| **Generative AI Agents** | **Amazon Bedrock (AgentCore)** |
| **Conversational Search** | **Amazon Q Business** |
| **App Migration** | **AWS App2Container** |
| **Programmatic IaC** | **AWS CDK v2** |
| **Serverless Orchestration** | **AWS SAM / Boto3** |

## 3. The "Chief Architect" Protocol
When a user asks "How should I build X?" or "What service should I use for Y?":
1.  **Analyze Constraints**: Identify if they prefer Serverless vs. Managed vs. Unmanaged.
2.  **Apply Decision Trees**: Use the logic above to select the 1-2 most viable services.
3.  **Cross-Reference Units**: Once a service is selected (e.g., Fargate), strictly reference the corresponding knowledge base (e.g., `references/aws-fargate.md`) for implementation details.
4.  **Cost Check**: Always mention **Fargate Spot** or **Lambda** for cost-sensitive dev/test scenarios.

## 4. Trigger Patterns
- "What aws service for..."
- "How do I choose between A and B..."
- "Architect a solution for..."
- "What should I use to store..."
- "How do I scale my web app on aws..."
