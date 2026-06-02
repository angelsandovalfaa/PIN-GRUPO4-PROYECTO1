# Modulo "bootstrap": crea el backend remoto que consume el modulo terraform/aws,
# es decir el bucket S3 del state y la tabla DynamoDB de lock. Corre con state
# LOCAL y se aplica una sola vez (action=bootstrap en el pipeline). El reusable
# que lo invoca importa el bucket y la tabla si ya existen, asi el apply es
# idempotente aun con el state local efimero del runner.

resource "aws_s3_bucket" "tfstate" {
  bucket = var.state_bucket_name

  # El bucket del state nunca se borra con un destroy de la app: protege el
  # historial de versiones del state ante un terraform destroy del modulo aws.
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Project = var.project_name
    Purpose = "terraform-remote-state"
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Niega cualquier acceso al bucket del state que no sea por TLS. Es una policy de
# solo-Deny, asi que no cuenta como "publica" para el public_access_block.
resource "aws_s3_bucket_policy" "tfstate_tls_only" {
  bucket = aws_s3_bucket.tfstate.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
    ]
  })

  # Aplica la policy despues del public_access_block para evitar un PutPolicy
  # rechazado por evaluacion de orden.
  depends_on = [aws_s3_bucket_public_access_block.tfstate]
}

resource "aws_dynamodb_table" "tflock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Project = var.project_name
    Purpose = "terraform-state-lock"
  }
}
