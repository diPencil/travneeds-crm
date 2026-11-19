import { createHash, randomBytes } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  LicenseStatus,
  MonthlyLicenseActivation,
} from '../../../../shared/settings/settings.contracts.js';
import { pool, transaction } from '../../database/pool.js';
import { HttpError } from '../../http/errors.js';
import { writeAuditEvent } from '../audit/audit.repository.js';

export async function readLicense(
  connection: Pick<PoolConnection, 'execute'> = pool,
): Promise<LicenseStatus> {
  const [[license]] = await connection.execute<
    (RowDataPacket &
      Omit<LicenseStatus, 'activationAvailable'> & {
        activationAvailable: number;
      })[]
  >(
    `SELECT CASE WHEN status='active' AND expires_at<=UTC_TIMESTAMP(6) THEN 'expired' ELSE status END AS status,
      plan, serial_suffix AS serialSuffix,
      DATE_FORMAT(activated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS activatedAt,
      DATE_FORMAT(expires_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS expiresAt,
      DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') AS serverTime,
      status='inactive' AND serial_digest IS NULL AS activationAvailable
     FROM installation_license WHERE id=1`,
  );
  if (!license) throw new HttpError(503, 'SETTINGS_UNAVAILABLE');
  return { ...license, activationAvailable: Boolean(license.activationAvailable) };
}

export async function activateMonthlyLicense(
  actorId: string | null,
): Promise<MonthlyLicenseActivation> {
  const first = randomBytes(8).toString('hex').toUpperCase();
  const second = randomBytes(8).toString('hex').toUpperCase();
  const serial = `TN-${first}-${second}`;
  const digest = createHash('sha256').update(serial).digest('hex');
  return transaction(async (connection) => {
    const [claimed] = await connection.execute<ResultSetHeader>(
      `UPDATE installation_license SET status='active',plan='monthly', serial_digest=?,serial_suffix=?,
       activated_at=UTC_TIMESTAMP(6),expires_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 MONTH)
       WHERE id=1 AND status='inactive' AND serial_digest IS NULL`,
      [digest, serial.slice(-6)],
    );
    if (claimed.affectedRows !== 1) throw new HttpError(409, 'LOCAL_LICENSE_ALREADY_ISSUED');
    await writeAuditEvent(connection, {
      actorId,
      action: 'settings.license_activated',
      entityType: 'installation_license',
      entityId: '1',
      module: 'settings',
    });
    return { license: await readLicense(connection), serial };
  });
}
