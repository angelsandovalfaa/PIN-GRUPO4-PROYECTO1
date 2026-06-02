output "state_bucket_name" {
  description = "Bucket S3 del state remoto (= secret TF_STATE_BUCKET)"
  value       = aws_s3_bucket.tfstate.id
}

output "lock_table_name" {
  description = "Tabla DynamoDB de lock (= secret TF_LOCK_TABLE)"
  value       = aws_dynamodb_table.tflock.name
}

output "state_bucket_region" {
  description = "Region del backend (= secret AWS_REGION)"
  value       = var.aws_region
}
