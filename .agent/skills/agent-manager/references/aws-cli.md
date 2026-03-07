# AWS CLI v2: Infrastructure Automation Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and executing infrastructure automation using the AWS Command Line Interface (CLI) version 2.

## 1. Core Concepts
The AWS Command Line Interface (CLI) is a unified tool to manage your AWS services.
- **AWS CLI v2**: The latest major version, featuring simplified installation, enhanced interactive features (e.g., `aws configure sso`), and improved output filtering.
- **Config & Credentials**: Located in `~/.aws/`. `config` stores non-sensitive settings (region, output format), while `credentials` stores sensitive access keys.

## 2. Configuration & Profiles
- **Named Profiles**: Use `--profile profile-name` to manage multiple sets of credentials and settings.
- **IAM Identity Center (SSO)**: Recommended for modern multi-account environments. Configure using `aws configure sso`.
- **Environment Variables**: Override profile settings (e.g., `AWS_PROFILE`, `AWS_REGION`).

## 3. Output Filtering & Formatting
- **--output**: Supports `json` (default), `text`, `table`, and `yaml`.
- **--query (JMESPath)**: Powerful client-side filtering.
  - *Example*: Filter for specific instance IDs: `aws ec2 describe-instances --query 'Reservations[*].Instances[*].InstanceId' --output text`
  - *Example*: Complex filtering with projections: `aws ec2 describe-instances --query 'Reservations[].Instances[?State.Name==`running`].[InstanceId, PublicIpAddress]'`

## 4. Automation & Aliases
- **Cli-Aliases**: Create shortcuts for frequently used commands. Store in `~/.aws/cli/alias`.
- **S3 Command Optimization**: Use `aws s3 sync` for efficient data transfer between local and S3 or between S3 buckets.
- **Wait Commands**: Use `aws <service> wait <condition>` in scripts to block until a resource reaches a specific state (e.g., `aws ec2 wait instance-running`).

## 5. Implementation Workflow (Automation Script)
```bash
#!/bin/bash
# Example: Deploying a simple Lambda function
FUNCTION_NAME="MyAutomationFunction"
ROLE_ARN="arn:aws:iam::123456789012:role/lambda-role"

# 1. Package the function
zip function.zip index.js

# 2. Deploy via CLI
aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --handler index.handler \
    --role $ROLE_ARN \
    --zip-file fileb://function.zip

# 3. Wait for active status
aws lambda wait function-active-v2 --function-name $FUNCTION_NAME
```

## 6. Safe Practice Protocol
- **Version Pinning**: Ensure automation scripts specify CLI v2 requirements.
- **Credential Hygiene**: NEVER hardcode credentials in scripts. Use IAM Roles for EC2/Lambda or temporary credentials via SSO.
- **Client-Side Filtering**: Use `--query` to minimize data transfer and simplify script parsing (favor text output for shell variables).
- **Dry Runs**: Use `--dry-run` where available (e.g., EC2) to validate permissions and parameters before execution.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
