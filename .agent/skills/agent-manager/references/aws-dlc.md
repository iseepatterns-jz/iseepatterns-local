# AWS Deep Learning Containers (DLC): Optimized ML Infrastructure Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and deploying machine learning workloads using AWS Deep Learning Containers (DLC).

## 1. Core Concepts
AWS Deep Learning Containers (DLCs) are a set of Docker images pre-installed with deep learning frameworks to make it easy to deploy custom machine learning (ML) environments.
- **Optimized Runtime**: Pre-configured with frameworks like PyTorch, TensorFlow, and Hugging Face Transformers.
- **Hardware Acceleration**: Built-in support for NVIDIA GPUs (CUDA/cuDNN), AWS Trainium, AWS Inferentia, and Intel Habana Gaudi.
- **Managed Lifecycle**: AWS regularly patches these images for security and framework updates.

## 2. Image Types & ECR URI Patterns
DLCs are hosted in a public AWS ECR repository with the account ID `763104351884`.

**General Pattern**:
`763104351884.dkr.ecr.<region>.amazonaws.com/<framework>-<type>:<tag>`

**Common Repository Names**:
- `pytorch-training` / `pytorch-inference`
- `tensorflow-training` / `tensorflow-inference`
- `huggingface-pytorch-training` / `huggingface-pytorch-inference`

**Tagging Strategy**:
- Tags include framework version, device (CPU/GPU), Python version, and OS (e.g., `2.1.0-gpu-py310-cu118-ubuntu20.04`).
- **Safe Practice**: NEVER use the `:latest` tag in production; always pin to a specific version tag for reproducibility.

## 3. Deployment Platforms
- **Amazon SageMaker**: Default images for notebooks and managed training/inference. Requires the `sagemaker` suffix in some tags for optimal integration.
- **Amazon EKS / ECS**: Optimized for container orchestration. Use the standard ECR URIs in your pod specs or task definitions.
- **Amazon EC2**: For direct control. Pull the image from ECR and run via Docker or NVIDIA Docker.

## 4. Implementation Workflow (EKS Pod Spec)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pytorch-training
spec:
  containers:
  - name: training-container
    image: 763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:2.1.0-gpu-py310-cu118-ubuntu20.04
    resources:
      limits:
        nvidia.com/gpu: 1
```

## 5. Safe Practice Protocol
- **Image Validation**: Always cross-reference the `available_images.md` file in the official AWS DLC GitHub repository for the most recent and secure ECR URIs.
- **Security Scanning**: While DLCs are regularly updated by AWS, always enable **Amazon ECR Image Scanning** on your local/private repositories if you customize these images.
- **Storage Management**: These images can be large (10GB+); ensure your EKS node volumes or EC2 root volumes have sufficient overhead.
- **Inference Optimization**: For high-scale inference, favor the **Inference-optimized** images over Training images to minimize container footprint and startup time.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
