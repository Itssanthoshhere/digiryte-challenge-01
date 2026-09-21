# 🏛️ Enterprise AWS Infrastructure as Code (Terraform)
## 🛡️ Aligned with AWS Well-Architected Framework (6 Pillars)

This directory contains production-ready **Infrastructure as Code (IaC)** written in Terraform to deploy the **Digiryte Secure REST API & Security Intelligence Dashboard** on Amazon Web Services (AWS) with **zero-waste cost efficiency** (<$10/month or $0 on AWS Free Tier).

---

## 📐 Architecture Overview & AWS 6 Pillars Alignment

```text
[ Internet Client ]
       │
       ▼
┌──────────────┐      ┌────────────────────────────────────────────────────────┐
│  CloudFront  │ ───► │ S3 Bucket (React 19 Dashboard - $0 Static Hosting)    │
│  Global CDN  │      └────────────────────────────────────────────────────────┘
└──────┬───────┘
       │ Dynamic API (/api/*)
       ▼
┌──────────────┐      ┌────────────────────────────────────────────────────────┐
│  AWS WAF v2  │ ───► │ Rate Limiting (100 req/5m) & Anti-Replay Shield       │
└──────┬───────┘      └────────────────────────────────────────────────────────┘
       │ Filtered Traffic
       ▼
┌──────────────┐      ┌────────────────────────────────────────────────────────┐
│  ALB (HTTP)  │ ───► │ Public Subnets across Multi-AZ (us-east-1a / 1b)       │
└──────┬───────┘      └────────────────────────────────────────────────────────┘
       │ VPC Private Subnet Routing
       ▼
┌──────────────┐      ┌────────────────────────────────────────────────────────┐
│ ECS Fargate  │ ───► │ ARM64 Graviton2 Containers (2x Replicas, Auto Scale)  │
└──────┬───────┘      └────────────────────────────────────────────────────────┘
       │ Low Latency VPC Connection
       ▼
┌──────────────┐      ┌────────────────────────────────────────────────────────┐
│ ElastiCache  │ ───► │ Distributed Redis Cluster (cache.t4g.micro)            │
│  (Redis 7)   │      │ JWT Token Revocation Blocklist & Nonce Verification    │
└──────────────┘      └────────────────────────────────────────────────────────┘
```

---

### 1. ⚡ Operational Excellence
- **Automated IaC**: Entire cloud footprint declaratively defined via Terraform with versioned ECR image scanning (`scan_on_push = true`).
- **CloudWatch Monitoring**: Integrated log streams `/ecs/digiryte-secure-api` with custom metric alarms and HTTP `/health` probes.

### 2. 🛡️ Security
- **AWS WAF v2 Web Application Firewall**: Regional Web ACL enforcing IP Rate Limiting (100 req / 5 min) and packet replay mitigation.
- **Private Subnet Isolation**: Containers run in private VPC subnets with zero public IP addresses assigned.
- **IAM Least Privilege**: Separate execution role (ECR pull, CloudWatch logs) and task role (runtime scope).
- **KMS Secret Encryption**: Encryption at rest for ECR images and environment credentials.

### 3. 🔄 Reliability
- **Multi-Availability Zone (Multi-AZ)**: ECS Fargate tasks and Load Balancers deployed across multiple AZs (`us-east-1a`, `us-east-1b`).
- **Distributed Token Revocation**: ElastiCache Redis 7 cluster for real-time `jti` blocklisting and one-time nonces.

### 4. ⚡ Performance Efficiency
- **CloudFront CDN Edge Caching**: Sub-10ms global delivery for the React 19 UI dashboard.
- **AWS Graviton2 (ARM64 Architecture)**: 20% cost reduction and 40% higher price-performance over standard x86.

### 5. 💰 Cost Optimization (Maximum Cost Efficiency)
- **$0 S3 Serverless Static Web Hosting**: React frontend hosted on S3 + CloudFront with 1 TB free transfer/month.
- **ECS Fargate Spot**: Up to 70% cost discount compared to standard compute instances.
- **Total Estimated AWS Bill**: **$0.00/mo (Free Tier)** or **~$5 - $8/mo** in production!

### 6. 🌱 Sustainability
- **ARM64 Graviton Processors**: Reduces energy consumption by up to 60% compared to equivalent x86 instances.
- **Pay-As-You-Go Compute**: Zero idle EC2 web servers.

---

## 🚀 Quick Deployment Guide

### Prerequisites
1. [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) (>= 1.5.0) installed.
2. [AWS CLI v2](https://aws.amazon.com/cli/) installed and configured (`aws configure`).
3. Docker installed locally.

### Step 1: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 2: Review Infrastructure Plan
```bash
terraform plan
```

### Step 3: Apply Infrastructure to AWS
```bash
terraform apply -auto-approve
```

### Step 4: Build & Push Docker Container to AWS ECR
```bash
# Get ECR Repository URL from Terraform outputs
ECR_URL=$(terraform output -raw ecr_repository_url)

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URL

# Build ARM64 Docker image
cd ..
docker build --platform linux/arm64 -t digiryte-api ./backend

# Tag & Push to AWS ECR
docker tag digiryte-api:latest $ECR_URL:latest
docker push $ECR_URL:latest
```

### Step 5: Deploy React UI to S3 + CloudFront
```bash
# Build React Production Assets
cd client && npm run build && cd ..

# Sync dist assets to S3 Bucket
S3_BUCKET=$(cd terraform && terraform output -raw s3_bucket_name)
aws s3 sync ./client/dist s3://$S3_BUCKET --delete
```

---

## 📊 Outputs

| Output Name | Description |
| :--- | :--- |
| `cloudfront_domain_name` | Public URL for React UI Dashboard |
| `alb_dns_name` | Application Load Balancer Endpoint |
| `ecr_repository_url` | ECR Repository URI |
| `redis_endpoint` | ElastiCache Redis Cluster Address |
| `waf_acl_id` | AWS WAF v2 Web ACL ID |
