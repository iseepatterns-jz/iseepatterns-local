# AWS Fargate: Serverless Container Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating serverless container workloads using AWS Fargate (ECS/EKS).

## 1. Core Concepts
AWS Fargate is a serverless compute engine for containers that works with both Amazon ECS and Amazon EKS.
- **Serverless**: No EC2 instances to manage, patch, or scale. No operational overhead for the underlying infrastructure.
- **Isolation**: Each Fargate task or pod runs in its own dedicated runtime environment and does not share the kernel, CPU, or memory with other workloads.

## 2. Capacity & Cost Optimization
| Capacity Provider | Cost Factor | Interruption | Best Use Case |
| :--- | :--- | :--- | :--- |
| **FARGATE** | Standard | None | Production, Critical workloads |
| **FARGATE_SPOT** | up to 70% off | 2-min warning | Dev/Test, Batch processing, CI/CD |

## 3. Task Definition Specs (ECS)
Fargate requires both **Task-level CPU** and **Task-level Memory** to be defined.
- **Valid Combinations**:
  - 0.25 vCPU: 512 MiB, 1 GB, 2 GB
  - 0.5 vCPU: 1 GB, 2 GB, 3 GB, 4 GB
  - 1 vCPU: 2 GB to 8 GB (1 GB increments)
  - 2 vCPU: 4 GB to 16 GB (1 GB increments)
  - 4 vCPU: 8 GB to 30 GB (1 GB increments)
  - 8 vCPU: 16 GB to 60 GB (4 GB increments)
  - 16 vCPU: 32 GB to 120 GB (8 GB increments)

## 4. Networking: awsvpc Mode
- **Dedicated ENI**: Each task receives its own Elastic Network Interface (ENI) and private IP from the VPC subnet.
- **Inter-container communication**: Containers within the same task communicate via `localhost` (127.0.0.1).
- **Security Groups**: Granular traffic control is applied directly to the task's ENI.

## 5. Load Balancing
- **Load Balancer Types**: ALB (HTTP/S), NLB (TCP/UDP), and GLB are supported.
- **Target Type**: You MUST use `ip` as the target type (not `instance`) because Fargate tasks are identified by their ENIs.

## 6. Safe Practice Protocol
- **Spot-First for Batch**: Favor **FARGATE_SPOT** for any workload that is interruption-tolerant (e.g., image processing, CI runners) to maximize ROAS.
- **SIGTERM Handling**: Ensure container applications handle `SIGTERM` gracefully for Fargate Spot interruptions or service scaling.
- **Managed Lifecycle**: Platform versions (e.g., `1.4.0`) provide automatic security patching; tasks are retired and replaced if the underlying platform needs updating.
- **Ephemeral Storage**: Fargate provides ephemeral storage (20GB default, configurable up to 200GB) for temporary scratch space.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
