output "alb_dns_name" {
  description = "Application Load Balancer DNS Endpoint"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront Global CDN Domain Name (React UI Dashboard URL)"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "ecr_repository_url" {
  description = "Amazon ECR Repository URI for Docker pushes"
  value       = aws_ecr_repository.api.repository_url
}

output "redis_endpoint" {
  description = "ElastiCache Redis Primary Endpoint Address"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "waf_acl_id" {
  description = "AWS WAF v2 Web ACL Identifier"
  value       = aws_wafv2_web_acl.main.id
}

output "s3_bucket_name" {
  description = "S3 Bucket Name for Static React UI assets"
  value       = aws_s3_bucket.frontend.id
}
