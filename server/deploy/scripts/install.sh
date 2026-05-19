#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/dhp-registry"
USER_NAME="dhp"

# 1. Create user
echo "Creating user ${USER_NAME}..."
if ! id -u "${USER_NAME}" > /dev/null 2>&1; then
    useradd --system --home-dir "${INSTALL_DIR}" --shell /bin/false "${USER_NAME}"
fi

# 2. Copy binary and config
echo "Installing to ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
cp dhp-registry config.yaml "${INSTALL_DIR}/"
chown -R "${USER_NAME}:${USER_NAME}" "${INSTALL_DIR}"

# 3. Create data directory
mkdir -p "${INSTALL_DIR}/halo-data"
chown -R "${USER_NAME}:${USER_NAME}" "${INSTALL_DIR}/halo-data"

# 4. Install systemd service
echo "Installing systemd service..."
cp "${INSTALL_DIR}/../deploy/systemd/dhp-registry.service" /etc/systemd/system/dhp-registry.service || \
    cp deploy/systemd/dhp-registry.service /etc/systemd/system/dhp-registry.service
systemctl daemon-reload
systemctl enable dhp-registry

# 5. Start service
echo "Starting dhp-registry..."
systemctl restart dhp-registry

echo "Done. Check status with: systemctl status dhp-registry"
echo "Logs: journalctl -u dhp-registry -f"
