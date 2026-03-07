# AWS Amplify Gen 2: Account Setup & Local Configuration

This document serves as the authoritative "Documents-Only" source for configuring AWS accounts and local environments for Amplify Gen 2 development.

## 1. Prerequisites
- **AWS CLI**: Installed and accessible in terminal.
- **Node.js/npm**: Standard for Amplify/React projects.

## 2. Infrastructure Setup (IAM Identity Center)
Amplify Gen 2 requires an AWS account with IAM Identity Center enabled for secure workforce access.

### Official Setup Steps:
1. **Enable IAM Identity Center**: In the AWS Console, enable IAM Identity Center with AWS Organizations.
2. **Create Administrative User**: Add a user in the Identity Store for your workforce.
3. **Create Permission Set**: 
    - Choose **Custom permission set**.
    - Attach the managed policy: `AmplifyBackendDeployFullAccess`.
4. **Assign User to Account**: Assign the user to the target AWS account using the new permission set.

> [!NOTE]
> For automation, use `aws identitystore create-user` and `aws sso-admin create-permission-set` as documented in the [AWS CLI Command Reference](https://docs.aws.amazon.com/cli/latest/reference/).

## 3. Local Machine Configuration
### Configure SSO Profile
Run `aws configure sso` and provide the following:
- **SSO session name**: `amplify-admin`
- **SSO start URL**: Obtained from Identity Center dashboard (e.g., `https://d-XXXXXX.awsapps.com/start`)
- **SSO region**: MUST be `us-east-1`.
- **Profile name**: Set to `default` or a named profile (e.g., `amplify-admin`).

### Verify Config
Check `~/.aws/config` to ensure the profile is present:
```ini
[profile default]
sso_session = amplify-admin
sso_account_id = <your-aws-account-id>
sso_role_name = AdministratorAccess
region = <your-region>
```

## 4. Account Bootstrapping (MANDATORY)
Before deploying with `npx ampx sandbox`, the region must be bootstrapped for CDK:
1. Run `npx ampx sandbox`.
2. Follow the prompt to sign in as root/admin.
3. In the Amplify console, choose **Initialize setup now**.
4. This creates the `CDKToolkit` CloudFormation stack (which includes an S3 bucket and IAM roles).

## 5. Troubleshooting
- **401/Expired Session**: Run `aws sso login --profile <your-profile>`.
- **Region Issues**: Verify `AWS_REGION=us-east-1` is set. This project exclusively uses `us-east-1`.
