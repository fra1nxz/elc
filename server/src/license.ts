import {
  createPublicKey,
  randomBytes,
  randomUUID,
  verify,
} from "node:crypto";
import { db } from "./db.js";

const CHALLENGE_TTL_SECONDS = 300;
const PUBLIC_KEY_PREFIX = "ELC-ACTIVATE";

type Challenge = {
  id: string;
  public_key: string;
  nonce: string;
  created_at: number;
  used_at: number | null;
};

type ActivationResult =
  | { ok: true; firstActivation: boolean }
  | {
      ok: false;
      status: 403 | 404;
      error: "unknown_code" | "device_mismatch" | "invalid_signature";
    };

function decodeCanonicalBase64(value: string): Buffer | null {
  try {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      return null;
    }
    const decoded = Buffer.from(value, "base64");
    return decoded.toString("base64") === value ? decoded : null;
  } catch {
    return null;
  }
}

function getP256PublicKey(publicKey: string) {
  const der = decodeCanonicalBase64(publicKey);
  if (!der || der.length < 64 || der.length > 256) return null;

  try {
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    if (
      key.asymmetricKeyType !== "ec" ||
      key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
    ) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

function signedMessage(id: string, nonce: string, publicKey: string): Buffer {
  return Buffer.from(
    `${PUBLIC_KEY_PREFIX}\n${id}\n${nonce}\n${publicKey}`,
    "utf8",
  );
}

export function createChallenge(publicKey: string) {
  if (!getP256PublicKey(publicKey)) {
    return { ok: false as const, error: "invalid_public_key" };
  }

  const id = randomUUID();
  const nonce = randomBytes(32).toString("base64");
  const now = Math.floor(Date.now() / 1000);

  db.prepare("DELETE FROM activation_challenges WHERE created_at < ?")
    .run(now - CHALLENGE_TTL_SECONDS);
  db.prepare(`
    INSERT INTO activation_challenges (id, public_key, nonce, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, publicKey, nonce, now);

  return {
    ok: true as const,
    challengeId: id,
    nonce,
    // Клиент подписывает UTF-8 байты message без изменений.
    message: signedMessage(id, nonce, publicKey).toString("utf8"),
  };
}

function consumeChallenge(
  challengeId: string,
  publicKey: string,
  signature: string,
): boolean {
  const challenge = db.prepare(`
    SELECT id, public_key, nonce, created_at, used_at
    FROM activation_challenges
    WHERE id = ? AND public_key = ? AND used_at IS NULL
  `).get(challengeId, publicKey) as Challenge | undefined;

  if (!challenge) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - challenge.created_at > CHALLENGE_TTL_SECONDS || challenge.created_at > now + 30) {
    return false;
  }

  const signatureBytes = decodeCanonicalBase64(signature);
  const key = getP256PublicKey(publicKey);
  if (!signatureBytes || !key || signatureBytes.length < 64 || signatureBytes.length > 80) {
    return false;
  }

  try {
    const valid = verify(
      "sha256",
      signedMessage(challenge.id, challenge.nonce, publicKey),
      key,
      signatureBytes,
    );
    if (!valid) return false;

    const result = db.prepare(`
      UPDATE activation_challenges
      SET used_at = ?
      WHERE id = ? AND used_at IS NULL
    `).run(now, challengeId);

    return result.changes === 1;
  } catch {
    return false;
  }
}

export const activateWithKey = db.transaction(
  (
    code: string,
    publicKey: string,
    challengeId: string,
    signature: string,
  ): ActivationResult => {
    const row = db.prepare(`
      SELECT device_id, device_public_key
      FROM codes
      WHERE code = ?
    `).get(code) as {
      device_id: string | null;
      device_public_key: string | null;
    } | undefined;

    if (!row) return { ok: false, status: 404, error: "unknown_code" };
    if (!consumeChallenge(challengeId, publicKey, signature)) {
      return { ok: false, status: 403, error: "invalid_signature" };
    }

    // Старые привязки через device_id не переносятся автоматически.
    // Для них требуется ручной сброс поддержкой.
    if (row.device_id !== null) {
      return { ok: false, status: 403, error: "device_mismatch" };
    }

    if (row.device_public_key === null) {
      const updated = db.prepare(`
        UPDATE codes
        SET device_public_key = ?, key_algorithm = 'ECDSA-P256', activated_at = datetime('now')
        WHERE code = ? AND device_public_key IS NULL AND device_id IS NULL
      `).run(publicKey, code);

      if (updated.changes !== 1) {
        return { ok: false, status: 403, error: "device_mismatch" };
      }
      return { ok: true, firstActivation: true };
    }

    if (row.device_public_key === publicKey) {
      return { ok: true, firstActivation: false };
    }

    return { ok: false, status: 403, error: "device_mismatch" };
  },
);

export const checkLicenseWithKey = db.transaction(
  (
    code: string,
    publicKey: string,
    challengeId: string,
    signature: string,
  ): ActivationResult => {
    const row = db.prepare(`
      SELECT device_id, device_public_key
      FROM codes
      WHERE code = ?
    `).get(code) as {
      device_id: string | null;
      device_public_key: string | null;
    } | undefined;

    if (!row) return { ok: false, status: 404, error: "unknown_code" };
    if (!consumeChallenge(challengeId, publicKey, signature)) {
      return { ok: false, status: 403, error: "invalid_signature" };
    }

    if (row.device_id !== null || row.device_public_key !== publicKey) {
      return { ok: false, status: 403, error: "device_mismatch" };
    }

    return { ok: true, firstActivation: false };
  },
);
