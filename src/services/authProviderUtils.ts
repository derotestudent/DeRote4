/**
 * Pure authentication provider detection, password validation, and guidance utilities.
 * Keeps provider logic decoupled from Firebase SDK and UI components for deterministic unit testing.
 */

export const GOOGLE_PROVIDER_ID = 'google.com';
export const PASSWORD_PROVIDER_ID = 'password';

export const DUPLICATE_EMAIL_ERROR_MESSAGE =
  'An account with this email already exists. Please sign in using your existing login method.';

export const GOOGLE_ONLY_LOGIN_GUIDANCE =
  'This account was originally created using Google Sign-In. Please sign in with Google first, then visit Account Settings to set up a password.';

export const ENUMERATION_PROTECTED_LOGIN_GUIDANCE =
  'Incorrect email or password. If you originally created this account using Google Sign-In without a password, please sign in with Google first and set up a password in Account Settings.';

export interface ProviderInfoLike {
  providerId?: string | null;
}

export interface LinkedProvidersState {
  hasGoogle: boolean;
  hasPassword: boolean;
  providerIds: string[];
  canSetUpPassword: boolean;
}

/**
 * Inspects Firebase User.providerData to determine linked authentication providers.
 */
export function getLinkedProvidersState(
  providerData: ReadonlyArray<ProviderInfoLike> | null | undefined
): LinkedProvidersState {
  if (!Array.isArray(providerData)) {
    return {
      hasGoogle: false,
      hasPassword: false,
      providerIds: [],
      canSetUpPassword: false,
    };
  }

  const providerIds = Array.from(
    new Set(
      providerData
        .map((p) => (typeof p?.providerId === 'string' ? p.providerId.trim() : ''))
        .filter((id) => id.length > 0)
    )
  );

  const hasGoogle = providerIds.includes(GOOGLE_PROVIDER_ID);
  const hasPassword = providerIds.includes(PASSWORD_PROVIDER_ID);

  return {
    hasGoogle,
    hasPassword,
    providerIds,
    // Option appears ONLY when user has Google linked and does NOT yet have Email/Password linked
    canSetUpPassword: hasGoogle && !hasPassword,
  };
}

/**
 * Validates new password & confirmation fields before attempting Firebase credential linking.
 */
export function validatePasswordSetup(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Please enter a new password.' };
  }
  if (password.trim().length === 0) {
    return { valid: false, error: 'Password cannot consist only of spaces.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters.' };
  }
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your new password.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match. Please re-enter carefully.' };
  }
  return { valid: true };
}

/**
 * Classifies an email/password login failure using any available sign-in methods
 * or local providerData-derived hints.
 */
export function resolveEmailLoginFailureGuidance(params: {
  errorCode?: string;
  signInMethods?: string[];
  knownProviders?: { hasGoogle: boolean; hasPassword: boolean } | null;
}): {
  errorCode: string;
  message: string;
  suggestGoogleSignIn: boolean;
} {
  const { errorCode = '', signInMethods = [], knownProviders = null } = params;

  const methodsShowGoogleOnly =
    signInMethods.includes(GOOGLE_PROVIDER_ID) && !signInMethods.includes(PASSWORD_PROVIDER_ID);
  const hintShowsGoogleOnly =
    Boolean(knownProviders?.hasGoogle) && !Boolean(knownProviders?.hasPassword);

  if (
    (errorCode === 'auth/invalid-credential' ||
      errorCode === 'auth/wrong-password' ||
      errorCode === 'auth/user-not-found') &&
    (methodsShowGoogleOnly || hintShowsGoogleOnly)
  ) {
    return {
      errorCode: 'auth/google-account-no-password',
      message: GOOGLE_ONLY_LOGIN_GUIDANCE,
      suggestGoogleSignIn: true,
    };
  }

  if (errorCode === 'auth/invalid-credential') {
    return {
      errorCode,
      message: ENUMERATION_PROTECTED_LOGIN_GUIDANCE,
      suggestGoogleSignIn: true,
    };
  }

  if (errorCode === 'auth/wrong-password') {
    return {
      errorCode,
      message: 'Incorrect password. Please verify your password and try again.',
      suggestGoogleSignIn: false,
    };
  }

  if (errorCode === 'auth/user-not-found') {
    return {
      errorCode,
      message: 'No account found with this email. Please check your email or create an account.',
      suggestGoogleSignIn: false,
    };
  }

  return {
    errorCode,
    message: 'Unable to sign in. Please verify your credentials and try again.',
    suggestGoogleSignIn: false,
  };
}

/**
 * Lightweight non-PII FNV-1a 64-bit hex hash of normalized email for local UX hint keying.
 */
export function hashEmailForHint(email: string): string {
  const clean = email.trim().toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}`;
}

export interface LinkableFirebaseUser {
  uid: string;
  email: string | null;
  providerData: ReadonlyArray<ProviderInfoLike>;
  reload: () => Promise<void>;
}

export interface LinkPasswordDependencies<TCredential = unknown> {
  getCurrentUser: () => LinkableFirebaseUser | null;
  createEmailCredential: (email: string, password: string) => TCredential;
  linkCredential: (user: LinkableFirebaseUser, credential: TCredential) => Promise<void>;
  reauthenticateWithGoogle: (user: LinkableFirebaseUser, email: string) => Promise<void>;
  onProvidersUpdated?: (email: string, providers: LinkedProvidersState) => void;
  mapErrorMessage?: (err: unknown) => string;
}

export interface LinkPasswordOutcome {
  success: boolean;
  providers?: LinkedProvidersState;
  message?: string;
  error?: string;
  errorCode?: string;
  reauthenticated?: boolean;
}

/**
 * Orchestrates linking an Email/Password credential to the CURRENT authenticated Google Firebase user.
 * Never creates a new account, never changes email, handles auth/requires-recent-login via Google reauth,
 * and reloads the Firebase user to refresh providerData.
 */
export async function executePasswordCredentialLink<TCredential>(
  newPassword: string,
  confirmPassword: string,
  deps: LinkPasswordDependencies<TCredential>
): Promise<LinkPasswordOutcome> {
  const user = deps.getCurrentUser();
  if (!user) {
    return {
      success: false,
      errorCode: 'auth/no-current-user',
      error: 'Your session is not active. Please sign in with Google again and retry.',
    };
  }

  const email = (user.email || '').trim().toLowerCase();
  if (!email) {
    return {
      success: false,
      errorCode: 'auth/missing-email',
      error: 'A verified email address on your Google account is required before setting up a password.',
    };
  }

  const currentProviders = getLinkedProvidersState(user.providerData);
  if (currentProviders.hasPassword) {
    return {
      success: false,
      errorCode: 'auth/provider-already-linked',
      providers: currentProviders,
      error: 'Email & Password sign-in is already enabled for this account.',
    };
  }

  if (!currentProviders.hasGoogle) {
    return {
      success: false,
      errorCode: 'auth/requires-google-provider',
      providers: currentProviders,
      error: 'Password setup is only available for accounts signed in with Google.',
    };
  }

  const validation = validatePasswordSetup(newPassword, confirmPassword);
  if (!validation.valid) {
    return {
      success: false,
      errorCode: 'auth/invalid-password',
      error: validation.error,
    };
  }

  const credential = deps.createEmailCredential(email, newPassword);
  let reauthenticated = false;

  try {
    await deps.linkCredential(user, credential);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/requires-recent-login') {
      try {
        await deps.reauthenticateWithGoogle(user, email);
        reauthenticated = true;
        await deps.linkCredential(user, credential);
      } catch (reauthErr: unknown) {
        const reauthCode = (reauthErr as { code?: string })?.code || '';
        return {
          success: false,
          errorCode: reauthCode,
          error: deps.mapErrorMessage
            ? deps.mapErrorMessage(reauthErr)
            : 'Please reauthenticate with your Google account to finish setting up your password.',
        };
      }
    } else {
      return {
        success: false,
        errorCode: code,
        error: deps.mapErrorMessage
          ? deps.mapErrorMessage(err)
          : 'Could not link password to your account. Please try again.',
      };
    }
  }

  try {
    await user.reload();
  } catch {
    // Reload failure after successful link should not hide the link result
  }

  const refreshedUser = deps.getCurrentUser() || user;
  const refreshedProviders = getLinkedProvidersState(refreshedUser.providerData);
  const resolvedProviders: LinkedProvidersState = refreshedProviders.hasPassword
    ? refreshedProviders
    : {
        hasGoogle: true,
        hasPassword: true,
        providerIds: Array.from(new Set([...refreshedProviders.providerIds, PASSWORD_PROVIDER_ID])),
        canSetUpPassword: false,
      };

  deps.onProvidersUpdated?.(email, resolvedProviders);

  return {
    success: true,
    providers: resolvedProviders,
    reauthenticated,
    message:
      'Password set up successfully! You can now sign in with either Google or your Email & Password.',
  };
}

