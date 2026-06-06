#!/bin/bash
exec > /var/log/user-data-simulator.log 2>&1
set -e

echo "--- INICIANDO IoT GATEWAY ---"

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs git

git clone ${git_repo_url} /opt/iot-gateway
cd /opt/iot-gateway/Backend
npm install
npm run build

# Install systemd service for the IoT simulator
cat > /etc/systemd/system/iot-gateway.service << EOF
[Unit]
Description=IoT Gateway Simulator
After=network.target

[Service]
WorkingDirectory=/opt/iot-gateway/Backend
ExecStart=/usr/bin/node dist/iot-simulator/index.js
Restart=always
RestartSec=10
User=ec2-user
Environment=NODE_ENV=production
Environment=MQTT_MODE=local
Environment=BACKEND_URL=http://${backend_ip}:3000
Environment=ACTIVE_DEVICES=20
Environment=PUBLISH_INTERVAL_MS=5000
Environment=ANOMALY_PROBABILITY=0.05
Environment=SIM_SYSTEM_EMAIL=${sim_system_email}
Environment=SIM_SYSTEM_PASSWORD=${sim_system_password}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable iot-gateway
systemctl start iot-gateway

echo "--- IoT GATEWAY DESPLEGADO ---"
