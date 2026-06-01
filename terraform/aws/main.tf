data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

data "aws_ec2_instance_type_offerings" "selected_type" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
}

locals {
  compatible_azs = sort(tolist(data.aws_ec2_instance_type_offerings.selected_type.locations))
  selected_az    = var.availability_zone != "" ? var.availability_zone : local.compatible_azs[0]

  prometheus_config = templatefile("${path.module}/../../monitoring/templates/prometheus.yml.tftpl", {})

  dashboard_json = replace(file("${path.module}/../../monitoring/dashboard.json"), "$", "$$")

  provisioning_dashboards_yml = replace(file("${path.module}/../../monitoring/provisioning/dashboards/dashboards.yml"), "$", "$$")
  provisioning_datasources_yml = replace(file("${path.module}/../../monitoring/provisioning/datasources/prometheus.yml"), "$", "$$")

  docker_compose = templatefile("${path.module}/../../monitoring/templates/docker-compose.yml.tftpl", {
    app_image                = var.app_image
    app_external_port        = var.app_external_port
    prometheus_external_port = var.prometheus_external_port
    grafana_external_port    = var.grafana_external_port
    grafana_admin_user       = var.grafana_admin_user
    grafana_admin_password   = var.grafana_admin_password
  })
}

resource "aws_vpc" "this" {
  cidr_block           = "10.50.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = "10.50.1.0/24"
  availability_zone       = local.selected_az
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "pin" {
  name        = "${var.project_name}-sg"
  description = "PIN security group"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "App"
    from_port   = var.app_external_port
    to_port     = var.app_external_port
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "Prometheus"
    from_port   = var.prometheus_external_port
    to_port     = var.prometheus_external_port
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "Grafana"
    from_port   = var.grafana_external_port
    to_port     = var.grafana_external_port
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "cAdvisor"
    from_port   = 8081
    to_port     = 8081
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "Node Exporter"
    from_port   = 9100
    to_port     = 9100
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "ICMP (ping)"
    from_port   = 8
    to_port     = 0
    protocol    = "icmp"
    cidr_blocks = [var.allowed_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

resource "aws_instance" "pin" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.pin.id]
  key_name               = var.key_name

  user_data_base64 = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    prometheus_config        = local.prometheus_config
    docker_compose           = local.docker_compose
    dashboard_json           = local.dashboard_json
    provisioning_dashboards  = local.provisioning_dashboards_yml
    provisioning_datasources = local.provisioning_datasources_yml
    ghcr_username            = var.ghcr_username
    ghcr_token               = var.ghcr_token
  }))

  tags = {
    Name = "${var.project_name}-ec2"
  }
}
