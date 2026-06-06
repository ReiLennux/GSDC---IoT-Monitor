output "URL_API_GATEWAY" {
  value = "${aws_api_gateway_stage.main.invoke_url}/"
}

output "IP_PUBLICA_BACKEND" {
  value = aws_eip.backend.public_ip
}

output "NOMBRE_TABLA_DYNAMODB" {
  value = aws_dynamodb_table.main.name
}

output "FRONTEND_S3_URL" {
  value = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "FRONTEND_CLOUDFRONT_URL" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "S3_BUCKET_NAME" {
  value = aws_s3_bucket.frontend.id
}
