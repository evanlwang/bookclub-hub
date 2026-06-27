// @spec AUTH-PASSKEY-REG-001, AUTH-PASSKEY-LOGIN-001, AUTH-PASSKEY-COUNTER-001, AUTH-PASSKEY-RP-001, AUTH-PASSKEY-CHALLENGE-001
//
// Thin wrapper over @simplewebauthn/server (v13). Centralizes RP config and
// translates between our stored `Credential` shape and the library's
// `WebAuthnCredential`. The library enforces challenge/origin/RP-ID matching
// and signature-counter monotonicity; we add a clear-error envelope and an
// explicit counter guard so the cloned-authenticator rule is unit-testable.
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { env } from "@/env";

export class WebAuthnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebAuthnError";
  }
}

export type RpConfig = { rpID: string; origin: string; rpName: string };

export function getRpConfig(): RpConfig {
  return {
    rpID: env.WEBAUTHN_RP_ID,
    origin: env.WEBAUTHN_ORIGIN,
    rpName: env.WEBAUTHN_RP_NAME,
  };
}

/** Our internal stored-credential shape (what `credentials.ts` reads/writes). */
export type StoredCredential = {
  credentialId: string;
  publicKey: Buffer;
  counter: number;
  transports: string[];
};

type ExcludeOrAllow = { credentialId: string; transports: string[] };

function toListEntry(c: ExcludeOrAllow) {
  return {
    id: c.credentialId,
    transports: c.transports as AuthenticatorTransportFuture[],
  };
}

/**
 * Reject an assertion whose signature counter did not advance. Authenticators
 * that don't maintain a counter always report 0 — only enforce monotonicity
 * once a non-zero counter is in play.
 *
 * @spec AUTH-PASSKEY-COUNTER-001
 */
export function assertCounterValid(storedCounter: number, newCounter: number): void {
  if (newCounter === 0 && storedCounter === 0) return;
  if (newCounter <= storedCounter) {
    throw new WebAuthnError(
      "Passkey signature counter did not increase — possible cloned authenticator",
    );
  }
}

export async function buildRegistrationOptions(params: {
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentials: ExcludeOrAllow[];
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID, rpName } = getRpConfig();
  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: params.userName,
    userDisplayName: params.userDisplayName,
    userID: new TextEncoder().encode(params.userId),
    attestationType: "none",
    excludeCredentials: params.excludeCredentials.map(toListEntry),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(params: {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
}): Promise<StoredCredential> {
  const { rpID, origin } = getRpConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      // Platform authenticators (FaceID/Touch ID) do UV; security keys may not.
      // Keep lenient so a Yubikey without a PIN can still register.
      requireUserVerification: false,
    });
  } catch (err) {
    // @spec AUTH-PASSKEY-RP-001 — origin/RP-ID mismatch surfaces here clearly.
    throw new WebAuthnError(`Passkey registration failed: ${(err as Error).message}`);
  }
  if (!verification.verified || !verification.registrationInfo) {
    throw new WebAuthnError("Passkey registration could not be verified");
  }
  const { credential } = verification.registrationInfo;
  return {
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: params.response.response.transports ?? [],
  };
}

export async function buildAuthenticationOptions(params: {
  allowCredentials: ExcludeOrAllow[];
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = getRpConfig();
  return generateAuthenticationOptions({
    rpID,
    // Empty list → discoverable-credential (usernameless) login.
    allowCredentials:
      params.allowCredentials.length > 0
        ? params.allowCredentials.map(toListEntry)
        : undefined,
    userVerification: "preferred",
  });
}

export async function verifyAuthentication(params: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  credential: StoredCredential;
}): Promise<{ newCounter: number }> {
  const { rpID, origin } = getRpConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: params.credential.credentialId,
        publicKey: new Uint8Array(params.credential.publicKey),
        counter: params.credential.counter,
        transports: params.credential.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    });
  } catch (err) {
    throw new WebAuthnError(`Passkey login failed: ${(err as Error).message}`);
  }
  if (!verification.verified) {
    throw new WebAuthnError("Passkey assertion could not be verified");
  }
  const { newCounter } = verification.authenticationInfo;
  // @spec AUTH-PASSKEY-COUNTER-001 — defense in depth atop the library check.
  assertCounterValid(params.credential.counter, newCounter);
  return { newCounter };
}
