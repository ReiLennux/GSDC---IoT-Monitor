# --- AWS IOT CORE ---
resource "aws_iot_thing" "gateway" {
  name = "${var.project_name}-gateway-simulator"
}

resource "aws_iot_certificate" "gateway" {
  active = true
}

resource "aws_iot_policy" "gateway" {
  name = "${var.project_name}-gateway-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["iot:Connect", "iot:Publish", "iot:Subscribe", "iot:Receive"]
      Resource = "*"
    }]
  })
}

resource "aws_iot_policy_attachment" "gateway" {
  policy = aws_iot_policy.gateway.name
  target = aws_iot_certificate.gateway.arn
}

resource "aws_iot_thing_principal_attachment" "gateway" {
  thing     = aws_iot_thing.gateway.name
  principal = aws_iot_certificate.gateway.arn
}

# --- LAMBDA PARA IOT RULE ---
data "aws_iot_endpoint" "main" {
  endpoint_type = "iot:Data-ATS"
}

resource "aws_iam_role" "lambda_iot" {
  name = "${var.project_name}-lambda-iot-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_iot.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "iot_ingest" {
  filename         = "${path.module}/iot-lambda.zip"
  function_name    = "${var.project_name}-iot-ingest"
  role             = aws_iam_role.lambda_iot.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.module}/iot-lambda.zip")

  environment {
    variables = {
      BACKEND_URL = "http://${aws_eip.backend.public_ip}:3000"
      IOT_API_KEY = var.iot_api_key
    }
  }
}

resource "aws_lambda_permission" "iot_invoke" {
  statement_id  = "iot-rule-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.iot_ingest.function_name
  principal     = "iot.amazonaws.com"
  source_arn    = aws_iot_topic_rule.telemetry.arn
}

resource "aws_iot_topic_rule" "telemetry" {
  name        = "${replace(var.project_name, "-", "_")}_telemetry_rule"
  description = "Reenvia telemetria MQTT al backend via Lambda"
  sql         = "SELECT * FROM 'dt/devices/+/telemetry'"
  sql_version = "2016-03-23"
  enabled     = true

  lambda {
    function_arn = aws_lambda_function.iot_ingest.arn
  }
}

# --- API GATEWAY WEBSOCKET ---
resource "aws_apigatewayv2_api" "ws" {
  name                       = "${var.project_name}-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "ws" {
  api_id             = aws_apigatewayv2_api.ws.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = "http://${aws_eip.backend.public_ip}:3000"
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws.id}"
}

resource "aws_apigatewayv2_route" "ws_default" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.ws.id}"
}

resource "aws_apigatewayv2_stage" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  name        = "v1"
  auto_deploy = true
}
