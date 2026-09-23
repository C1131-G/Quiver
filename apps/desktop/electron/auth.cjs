const {
  randomBytes,
  scrypt: nodeScrypt,
  timingSafeEqual,
} = require("node:crypto");
const { readFileSync, renameSync, writeFileSync } = require("node:fs");
const { promisify } = require("node:util");
const { z } = require("zod");

/**
 * Local owner-account auth, ported from AthleteHub's electron/auth.ts. The
 * single owner record lives in a JSON file under userData instead of a
 * database; hashes and salts are stored base64-encoded.
 */
const scrypt = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const RECOVERY_LENGTH = 16;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 60_000;
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_MIN_LENGTH = 8;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/iu;

const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(USERNAME_PATTERN);
const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH);
const credentialsSchema = z.object({
  password: passwordSchema,
  username: usernameSchema,
});
const recoverySchema = z.object({
  newPassword: passwordSchema,
  recoveryCode: z.string().min(RECOVERY_LENGTH),
  username: usernameSchema,
});
const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});
const storedOwnerSchema = z.object({
  failedAttempts: z.number().int().nonnegative(),
  lockedUntil: z.number().nullable(),
  passwordHash: z.string(),
  passwordSalt: z.string(),
  recoveryHash: z.string(),
  recoverySalt: z.string(),
  username: z.string(),
});

class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

const createRecoveryCode = () => {
  const characters = Array.from(
    randomBytes(RECOVERY_LENGTH),
    (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]
  );
  return [0, 4, 8, 12]
    .map((start) => characters.slice(start, start + 4).join(""))
    .join("-");
};

const normalizeRecoveryCode = (code) => code.replaceAll("-", "").toUpperCase();

const normalizedUsername = (username) => username.trim().toLowerCase();

const derive = async (value, salt) =>
  new Uint8Array(await scrypt(value, salt, PASSWORD_KEY_LENGTH));

const fromBase64 = (value) => new Uint8Array(Buffer.from(value, "base64"));

const toBase64 = (bytes) => Buffer.from(bytes).toString("base64");

const matches = (actual, expected) =>
  actual.length === expected.length && timingSafeEqual(actual, expected);

const hashSecret = async (value) => {
  const salt = new Uint8Array(randomBytes(SALT_LENGTH));
  return { hash: toBase64(await derive(value, salt)), salt: toBase64(salt) };
};

const verifySecret = async (value, hash, salt) =>
  matches(await derive(value, fromBase64(salt)), fromBase64(hash));

/** Reads and writes the owner record; writes go through a rename to stay atomic. */
const createOwnerStore = (filePath) => ({
  get: () => {
    try {
      const parsed = storedOwnerSchema.safeParse(
        JSON.parse(readFileSync(filePath, "utf-8"))
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  set: (owner) => {
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(owner, null, 2), "utf-8");
    renameSync(temporaryPath, filePath);
  },
});

const invalidCredentials = () =>
  new AuthError(
    "INVALID_CREDENTIALS",
    "The username or password is incorrect."
  );

const buildOwner = async (username, password, recoveryCode) => {
  const [passwordSecret, recoverySecret] = await Promise.all([
    hashSecret(password),
    hashSecret(normalizeRecoveryCode(recoveryCode)),
  ]);
  return {
    failedAttempts: 0,
    lockedUntil: null,
    passwordHash: passwordSecret.hash,
    passwordSalt: passwordSecret.salt,
    recoveryHash: recoverySecret.hash,
    recoverySalt: recoverySecret.salt,
    username: normalizedUsername(username),
  };
};

const createAuthService = (ownerFilePath) => {
  const store = createOwnerStore(ownerFilePath);
  let authenticated = false;

  const status = () =>
    Promise.resolve({ authenticated, configured: store.get() !== null });

  const setup = async (input) => {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "A valid username and password are required."
      );
    }
    if (store.get()) {
      throw new AuthError(
        "ALREADY_CONFIGURED",
        "This installation already has an owner."
      );
    }
    const recoveryCode = createRecoveryCode();
    store.set(
      await buildOwner(parsed.data.username, parsed.data.password, recoveryCode)
    );
    authenticated = true;
    return { recoveryCode };
  };

  const login = async (input) => {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "A valid username and password are required."
      );
    }
    const owner = store.get();
    if (!owner || owner.username !== normalizedUsername(parsed.data.username)) {
      throw invalidCredentials();
    }
    if (owner.lockedUntil && owner.lockedUntil > Date.now()) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Too many attempts. Try again shortly."
      );
    }
    const valid = await verifySecret(
      parsed.data.password,
      owner.passwordHash,
      owner.passwordSalt
    );
    if (!valid) {
      const failedAttempts = owner.failedAttempts + 1;
      store.set({
        ...owner,
        failedAttempts,
        lockedUntil:
          failedAttempts >= LOCKOUT_THRESHOLD
            ? Date.now() + LOCKOUT_DURATION_MS
            : null,
      });
      throw invalidCredentials();
    }
    store.set({ ...owner, failedAttempts: 0, lockedUntil: null });
    authenticated = true;
    return { authenticated: true };
  };

  const recover = async (input) => {
    const parsed = recoverySchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "Valid recovery details are required."
      );
    }
    const recoveryError = new AuthError(
      "INVALID_RECOVERY_CODE",
      "The recovery details are incorrect."
    );
    const owner = store.get();
    if (!owner || owner.username !== normalizedUsername(parsed.data.username)) {
      throw recoveryError;
    }
    const valid = await verifySecret(
      normalizeRecoveryCode(parsed.data.recoveryCode),
      owner.recoveryHash,
      owner.recoverySalt
    );
    if (!valid) {
      throw recoveryError;
    }
    // A used recovery code is spent: recovery always issues a fresh one.
    const nextRecoveryCode = createRecoveryCode();
    store.set(
      await buildOwner(
        owner.username,
        parsed.data.newPassword,
        nextRecoveryCode
      )
    );
    authenticated = true;
    return { authenticated: true, recoveryCode: nextRecoveryCode };
  };

  /**
   * Rotates the password from an already-authenticated session. The recovery
   * code is an independent secret and is left untouched.
   */
  const changePassword = async (input) => {
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthError(
        "VALIDATION_ERROR",
        "A valid current and new password are required."
      );
    }
    const owner = store.get();
    if (!owner) {
      throw new AuthError("UNAUTHENTICATED", "Log in to continue.");
    }
    const valid = await verifySecret(
      parsed.data.currentPassword,
      owner.passwordHash,
      owner.passwordSalt
    );
    if (!valid) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "The current password is incorrect."
      );
    }
    const passwordSecret = await hashSecret(parsed.data.newPassword);
    store.set({
      ...owner,
      passwordHash: passwordSecret.hash,
      passwordSalt: passwordSecret.salt,
    });
    return { success: true };
  };

  return {
    changePassword,
    isAuthenticated: () => authenticated,
    login,
    logout: () => {
      authenticated = false;
      return Promise.resolve();
    },
    recover,
    requireSession: () =>
      authenticated
        ? Promise.resolve()
        : Promise.reject(
            new AuthError("UNAUTHENTICATED", "Log in to continue.")
          ),
    setup,
    status,
  };
};

module.exports = { AuthError, createAuthService };
