#!/bin/bash
exec > /var/log/user-data.log 2>&1
set -e

echo "--- INICIANDO ---"

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs git

git clone ${git_repo_url} /opt/iot-monitor
cd /opt/iot-monitor/Backend
npm install
npm run build

cat > /etc/systemd/system/iot-backend.service << EOF
[Unit]
Description=IoT Monitor Backend
After=network.target

[Service]
WorkingDirectory=/opt/iot-monitor/Backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
User=ec2-user
Environment=NODE_ENV=production
Environment=DYNAMODB_TABLE_NAME=${dynamodb_table_name}
Environment=AWS_REGION=${aws_region}
Environment=JWT_SECRET=${jwt_secret}
Environment=JWT_REFRESH_SECRET=${jwt_refresh_secret}
Environment=IOT_API_KEY=${iot_api_key}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable iot-backend
systemctl start iot-backend

echo "--- DESPLIEGUE COMPLETADO ---"
