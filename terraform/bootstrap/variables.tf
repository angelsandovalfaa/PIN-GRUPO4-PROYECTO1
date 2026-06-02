variable "aws_region" {
  description = "Region de AWS donde vive el backend remoto"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region debe tener formato de region AWS, ej: us-east-1."
  }
}

variable "project_name" {
  description = "Prefijo/tag de proyecto (alinea con terraform/aws)"
  type        = string
  default     = "pin"
}

variable "state_bucket_name" {
  # Sin default a proposito: debe pasarse igual al secret TF_STATE_BUCKET que
  # usa el deploy (40). Si difiere, el init del deploy crearia un backend nuevo.
  description = "Nombre del bucket S3 del state remoto. Debe coincidir con el secret TF_STATE_BUCKET."
  type        = string
}

variable "lock_table_name" {
  # Sin default a proposito: debe pasarse igual al secret TF_LOCK_TABLE.
  description = "Nombre de la tabla DynamoDB de lock. Debe coincidir con el secret TF_LOCK_TABLE."
  type        = string
}
