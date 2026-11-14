import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_PROVIDER_ID,
  PASSWORD_PROVIDER_ID,
  DUPLICATE_EMAIL_ERROR_MESSAGE,
  GOOGLE_ONLY_LOGIN_GUIDANCE,
  ENUMERATION_PROTECTED_LOGIN_GUIDANCE,
  getLinkedProvidersState,
  validatePasswordSetup,
  resolveEmailLoginFailureGuidance,
  hashEmailForHint,
  executePasswordCredentialLink,
  type LinkableFirebaseUser,
} from '../src/services/authProviderUtils';

test('getLinkedProvidersState inspects Firebase providerData accurately', () => {
  // 1. Null or empty providerData
  const empty = getLinkedProvidersState(null);
  assert.deepEqual(empty, {
    hasGoogle: false,
    hasPassword: false,
    providerIds: [],
    canSetUpPassword: false,
  });

  // 2. Google-only user sees Set Up Password option
  const googleOnly = getLinkedProvidersState([{ providerId: GOOGLE_PROVIDER_ID }]);
  assert.equal(googleOnly.hasGoogle, true);
  assert.equal(googleOnly.hasPassword, false);
  assert.equal(googleOnly.canSetUpPassword, true);
  assert.deepEqual(googleOnly.providerIds, ['google.com']);

  // 3. Password-only user does NOT see Set Up Password option
  const passwordOnly = getLinkedProvidersState([{ providerId: PASSWORD_PROVIDER_ID }]);
  assert.equal(passwordOnly.hasGoogle, false);
  assert.equal(passwordOnly.hasPassword, true);
  assert.equal(passwordOnly.canSetUpPassword, false);

  // 4. Google + Password linked user does NOT see Set Up Password option
  const linkedBoth = getLinkedProvidersState([
    { providerId: GOOGLE_PROVIDER_ID },
    { providerId: PASSWORD_PROVIDER_ID },
  ]);
  assert.equal(linkedBoth.hasGoogle, true);
  assert.equal(linkedBoth.hasPassword, true);
  assert.equal(linkedBoth.canSetUpPassword, false);
});

test('validatePasswordSetup enforces required, length, whitespace, and match rules', () => {
  assert.equal(validatePasswordSetup('', 'secret123').valid, false);
  assert.equal(validatePasswordSetup('      ', '      ').valid, false);
  assert.equal(validatePasswordSetup('12345', '12345').valid, false);
  assert.equal(validatePasswordSetup('secret123', '').valid, false);
  assert.equal(validatePasswordSetup('secret123', 'different123').valid, false);

  const ok = validatePasswordSetup('StrongPass!2026', 'StrongPass!2026');
  assert.deepEqual(ok, { valid: true });
});

test('executePasswordCredentialLink links Email/Password to existing Google UID without changing UID or email', async () => {
  const originalUid = 'uid_student_google_123';
  const studentEmail = 'maya.sharma@gmail.com';
  let reloadCalls = 0;
  let credentialCreatedWith: { email: string; password: string } | null = null;
  let notifiedUpdate: { email: string; hasPassword: boolean; canSetUpPassword: boolean } | null = null;

  const mockUser: LinkableFirebaseUser = {
    uid: originalUid,
    email: studentEmail,
    providerData: [{ providerId: GOOGLE_PROVIDER_ID }],
    reload: async () => {
      reloadCalls += 1;
      mockUser.providerData = [
        { providerId: GOOGLE_PROVIDER_ID },
        { providerId: PASSWORD_PROVIDER_ID },
      ];
    },
  };

  const result = await executePasswordCredentialLink('MyPass#2026', 'MyPass#2026', {
    getCurrentUser: () => mockUser,
    createEmailCredential: (email, password) => {
      credentialCreatedWith = { email, password };
      return { providerId: PASSWORD_PROVIDER_ID, email, password };
    },
    linkCredential: async (user, _cred) => {
      assert.equal(user.uid, originalUid);
    },
    reauthenticateWithGoogle: async () => {
      throw new Error('Should not reauthenticate when linkCredential succeeds immediately');
    },
    onProvidersUpdated: (email, providers) => {
      notifiedUpdate = {
        email,
        hasPassword: providers.hasPassword,
        canSetUpPassword: providers.canSetUpPassword,
      };
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.reauthenticated, false);
  assert.equal(reloadCalls, 1);
  assert.deepEqual(credentialCreatedWith, { email: studentEmail, password: 'MyPass#2026' });
  assert.equal(mockUser.uid, originalUid);
  assert.equal(result.providers?.hasGoogle, true);
  assert.equal(result.providers?.hasPassword, true);
  assert.equal(result.providers?.canSetUpPassword, false);
  assert.deepEqual(notifiedUpdate, {
    email: studentEmail,
    hasPassword: true,
    canSetUpPassword: false,
  });
});

test('executePasswordCredentialLink handles auth/requires-recent-login via Google reauth and retries link', async () => {
  let linkAttempt = 0;
  let reauthCalledWithEmail = '';
  let reloadCalls = 0;

  const mockUser: LinkableFirebaseUser = {
    uid: 'uid_stale_google_456',
    email: 'aarav@gmail.com',
    providerData: [{ providerId: GOOGLE_PROVIDER_ID }],
    reload: async () => {
      reloadCalls += 1;
      mockUser.providerData = [
        { providerId: GOOGLE_PROVIDER_ID },
        { providerId: PASSWORD_PROVIDER_ID },
      ];
    },
  };

  const result = await executePasswordCredentialLink('SecurePass99', 'SecurePass99', {
    getCurrentUser: () => mockUser,
    createEmailCredential: (email, password) => ({ email, password }),
    linkCredential: async () => {
      linkAttempt += 1;
      if (linkAttempt === 1) {
        throw { code: 'auth/requires-recent-login' };
      }
    },
    reauthenticateWithGoogle: async (_user, email) => {
      reauthCalledWithEmail = email;
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.reauthenticated, true);
  assert.equal(linkAttempt, 2);
  assert.equal(reauthCalledWithEmail, 'aarav@gmail.com');
  assert.equal(reloadCalls, 1);
  assert.equal(result.providers?.hasPassword, true);
  assert.equal(result.providers?.canSetUpPassword, false);
});

test('executePasswordCredentialLink aborts safely on auth/user-mismatch during reauthentication', async () => {
  const mockUser: LinkableFirebaseUser = {
    uid: 'uid_google_789',
    email: 'student@gmail.com',
    providerData: [{ providerId: GOOGLE_PROVIDER_ID }],
    reload: async () => {},
  };

  const result = await executePasswordCredentialLink('SecurePass99', 'SecurePass99', {
    getCurrentUser: () => mockUser,
    createEmailCredential: (email, password) => ({ email, password }),
    linkCredential: async () => {
      throw { code: 'auth/requires-recent-login' };
    },
    reauthenticateWithGoogle: async () => {
      throw { code: 'auth/user-mismatch' };
    },
    mapErrorMessage: () =>
      'The selected Google account does not match your signed-in account. Please select the same Google account.',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'auth/user-mismatch');
  assert.match(result.error || '', /does not match/i);
  // Google-only provider state remains intact
  assert.equal(getLinkedProvidersState(mockUser.providerData).hasPassword, false);
});

test('executePasswordCredentialLink prevents linking when password provider is already linked', async () => {
  let linkCalled = false;
  const mockUser: LinkableFirebaseUser = {
    uid: 'uid_already_linked',
    email: 'dual@gmail.com',
    providerData: [{ providerId: GOOGLE_PROVIDER_ID }, { providerId: PASSWORD_PROVIDER_ID }],
    reload: async () => {},
  };

  const result = await executePasswordCredentialLink('AnotherPass12', 'AnotherPass12', {
    getCurrentUser: () => mockUser,
    createEmailCredential: (email, password) => ({ email, password }),
    linkCredential: async () => {
      linkCalled = true;
    },
    reauthenticateWithGoogle: async () => {},
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'auth/provider-already-linked');
  assert.equal(linkCalled, false);
});

test('resolveEmailLoginFailureGuidance shows exact Google-only guidance via signInMethods or providerData hint', () => {
  // Case A: Legacy Firebase Auth returns ['google.com'] from fetchSignInMethodsForEmail
  const viaMethods = resolveEmailLoginFailureGuidance({
    errorCode: 'auth/invalid-credential',
    signInMethods: [GOOGLE_PROVIDER_ID],
    knownProviders: null,
  });
  assert.equal(viaMethods.errorCode, 'auth/google-account-no-password');
  assert.equal(viaMethods.message, GOOGLE_ONLY_LOGIN_GUIDANCE);
  assert.equal(viaMethods.suggestGoogleSignIn, true);

  // Case B: Firebase Email Enumeration Protection returns [] for fetchSignInMethodsForEmail,
  // but local providerData-derived hint knows account is Google-only
  const viaHint = resolveEmailLoginFailureGuidance({
    errorCode: 'auth/invalid-credential',
    signInMethods: [],
    knownProviders: { hasGoogle: true, hasPassword: false },
  });
  assert.equal(viaHint.errorCode, 'auth/google-account-no-password');
  assert.equal(viaHint.message, GOOGLE_ONLY_LOGIN_GUIDANCE);
  assert.equal(viaHint.suggestGoogleSignIn, true);

  // Case C: Unknown fresh browser with Email Enumeration Protection active (no false "invalid account" claim)
  const freshBrowser = resolveEmailLoginFailureGuidance({
    errorCode: 'auth/invalid-credential',
    signInMethods: [],
    knownProviders: null,
  });
  assert.equal(freshBrowser.errorCode, 'auth/invalid-credential');
  assert.equal(freshBrowser.message, ENUMERATION_PROTECTED_LOGIN_GUIDANCE);
  assert.equal(freshBrowser.suggestGoogleSignIn, true);

  // Case D: Known dual-provider user entering wrong password gets password guidance
  const wrongPassLinked = resolveEmailLoginFailureGuidance({
    errorCode: 'auth/wrong-password',
    signInMethods: [GOOGLE_PROVIDER_ID, PASSWORD_PROVIDER_ID],
    knownProviders: { hasGoogle: true, hasPassword: true },
  });
  assert.equal(wrongPassLinked.suggestGoogleSignIn, false);
  assert.match(wrongPassLinked.message, /Incorrect password/i);
});

test('duplicate registration constant matches required exact user guidance and hashEmailForHint hides PII', () => {
  assert.equal(
    DUPLICATE_EMAIL_ERROR_MESSAGE,
    'An account with this email already exists. Please sign in using your existing login method.'
  );

  const email = 'Student.Name@Gmail.com';
  const hashA = hashEmailForHint(email);
  const hashB = hashEmailForHint('  student.name@gmail.com ');
  assert.equal(hashA, hashB);
  assert.equal(hashA.includes('@'), false);
  assert.equal(hashA.toLowerCase().includes('student'), false);
});
