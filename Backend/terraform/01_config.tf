# 1. CONFIGURACIÓN DE TERRAFORM Y PROVEEDOR
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Datos automáticos de tu cuenta de AWS
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# 2. VARIABLES (Aquí es donde tú editas tus datos)
variable "aws_region" { default = "us-east-1" }
variable "project_name" { default = "gsdc-iot-monitor" }
variable "jwt_secret" { sensitive = true }
variable "jwt_refresh_secret" { sensitive = true }
variable "iot_api_key" { sensitive = true }
variable "git_repo_url" { description = "Tu repo de GitHub" }
variable "instance_type" { default = "t3.micro" }
variable "ssh_key_name" { default = null } # Opcional: tu llave .pem para entrar por SSH
variable "sim_system_email" { default = "system@iot.local" }
variable "sim_system_password" { sensitive = true }
variable "dynamodb_table_name" { default = "IoT_Monitor_Table" }
variable "backend_url" { description = "URL del Backend" }
