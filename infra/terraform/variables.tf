variable "aws_region" {
  type        = string
  description = "AWS region, e.g. ap-northeast-2"
}

variable "aws_profile" {
  type        = string
  description = "AWS CLI profile name"
  default     = "default"
}

variable "project_name" {
  type        = string
  description = "Tagging prefix"
  default     = "sesac-semi"
}

variable "env" {
  type        = string
  description = "Environment suffix"
  default     = "dev"
}

variable "ssh_allowed_cidr" {
  type        = string
  description = "Your public IP CIDR for SSH, e.g. 203.0.113.10/32"
}

variable "key_name" {
  type        = string
  description = "Existing EC2 Key Pair name"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "s3_bucket_name" {
  type        = string
  description = "Globally unique bucket name"
}

variable "uploads_prefix" {
  type    = string
  default = "uploads/"
}
