variable "aws_region" {
  description = "AWS Region for deployment (e.g. us-east-1, eu-west-1)"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (production, staging, dev)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "digiryte-secure-api"
}

variable "domain_name" {
  description = "Optional custom domain name (e.g. api.digiryte.com). Leave empty if using default AWS CloudFront/ALB URLs."
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "Cryptographic secret key for signing JWT access tokens (minimum 32 characters)"
  type        = string
  sensitive   = true
  default     = "digiryte_super_secret_jwt_access_key_2026_enterprise_prod"
}

variable "jwt_refresh_secret" {
  description = "Cryptographic secret key for signing JWT refresh tokens (minimum 32 characters)"
  type        = string
  sensitive   = true
  default     = "digiryte_super_secret_jwt_refresh_key_2026_enterprise_prod"
}

variable "container_port" {
  description = "Port exposed by Express container app"
  type        = number
  default     = 4000
}

variable "fargate_cpu" {
  description = "Fargate vCPU units (256 = 0.25 vCPU for maximum cost efficiency)"
  type        = number
  default     = 256
}

variable "fargate_memory" {
  description = "Fargate memory in MB (512 MB RAM)"
  type        = number
  default     = 512
}

variable "use_fargate_spot" {
  description = "Enable Fargate Spot pricing for up to 70% cost savings"
  type        = bool
  default     = true
}
