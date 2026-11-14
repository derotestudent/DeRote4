import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  School,
  Calendar,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  LogOut,
  Sparkles,
  Loader2,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import {
  getCurrentStudent,
  onLocalAuthChange,
  updateStudentProfile,
  completeStudentProfile,
  isStudentProfileComplete,
  logoutStudent,
  getCurrentUserProviders,
  onProviderStateChange,
  linkPasswordToGoogleAccount,
  LocalStudentAccount,
  LinkedProvidersState,
  KNOWN_PLACEHOLDER_SCHOOLS,
} from '../services/localAuth';
import { validatePasswordSetup } from '../services/authProviderUtils';
import { auth } from '../services/firebase';

interface EditProfilePageProps {
  onNavigate: (route: string) => void;
  mode?: 'completion' | 'edit';
}

const CLASS_OPTIONS = ['8', '9', '10', '11', '12', 'Higher'];

export const EditProfilePage: React.FC<EditProfilePageProps> = ({
  onNavigate,
  mode: propMode,
}) => {
  const [student, setStudent] = useState<LocalStudentAccount | null>(() => getCurrentStudent());

  // Determine if this screen is completing a new/incomplete profile or editing an already completed profile
  const isComplete = isStudentProfileComplete(student);
  const isCompletionMode = propMode ? propMode === 'completion' : !isComplete;

  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [classGrade, setClassGrade] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  // Account Settings & Sign-In Provider Linking state
  const [providers, setProviders] = useState<LinkedProvidersState>(() => getCurrentUserProviders());
  const [showPasswordSetupForm, setShowPasswordSetupForm] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);
  const [isLinkingPassword, setIsLinkingPassword] = useState<boolean>(false);
  const [passwordLinkSuccess, setPasswordLinkSuccess] = useState<string | null>(null);
  const [passwordLinkError, setPasswordLinkError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onLocalAuthChange((curr) => {
      setStudent(curr);
    });
    const unsubProviders = onProviderStateChange((nextProviders) => {
      setProviders(nextProviders);
    });
    return () => {
      unsub();
      unsubProviders();
    };
  }, []);

  // Hydrate fields from authenticated session
  useEffect(() => {
    const authUser = auth.currentUser;
    const initialName = student?.fullName || authUser?.displayName || '';
    setFullName(initialName);

    const initialAge = student?.age || '';
    setAge(initialAge);

    const initialClass = student?.classGrade || '';
    setClassGrade(initialClass);

    // If schoolName is one of the old generated placeholders, clean it so the student supplies their real school
    const currentSchool = student?.schoolName || '';
    if (KNOWN_PLACEHOLDER_SCHOOLS.includes(currentSchool.toLowerCase().trim())) {
      setSchoolName('');
    } else {
      setSchoolName(currentSchool);
    }
  }, [student]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logoutStudent();
      onNavigate('/login');
    } catch {
      onNavigate('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanAge = age.trim();
    if (!cleanAge) {
      setErrorMessage('Please enter your age.');
      return;
    }

    const ageNum = parseInt(cleanAge, 10);
    if (isNaN(ageNum) || ageNum < 8 || ageNum > 25) {
      setErrorMessage('Please enter a realistic age between 8 and 25 years.');
      return;
    }

    if (!classGrade) {
      setErrorMessage('Please select your current class.');
      return;
    }

    const cleanSchool = schoolName.trim();
    if (isCompletionMode) {
      if (!cleanSchool) {
        setErrorMessage('Please enter your School / Institution Name.');
        return;
      }
      if (KNOWN_PLACEHOLDER_SCHOOLS.includes(cleanSchool.toLowerCase())) {
        setErrorMessage('Please enter your actual School / Institution Name.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isCompletionMode) {
        // Complete initial profile and persist directly to Firestore
        const res = await completeStudentProfile({
          fullName: cleanName,
          age: cleanAge,
          classGrade,
          schoolName: cleanSchool,
        });

        if (res.success && res.student) {
          setStudent(res.student);
          setSuccessMessage('Profile completed successfully! Opening your student dashboard...');
          setTimeout(() => {
            onNavigate('/dashboard');
          }, 800);
        } else {
          setErrorMessage(
            res.error ||
              'Failed to save your profile to the database. Please check your connection or contact administrator.'
          );
        }
      } else {
        // Edit existing profile (age & class only)
        const res = await updateStudentProfile({
          age: cleanAge,
          classGrade,
        });

        if (res.success && res.student) {
          setStudent(res.student);
          setSuccessMessage('Your profile has been updated! Returning to your dashboard...');
          setTimeout(() => {
            onNavigate('/dashboard');
          }, 900);
        } else {
          setErrorMessage(res.error || 'Failed to update profile. Please try again.');
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLinkError(null);
    setPasswordLinkSuccess(null);

    const validation = validatePasswordSetup(newPassword, confirmNewPassword);
    if (!validation.valid) {
      setPasswordLinkError(validation.error || 'Please check your password details.');
      return;
    }

    setIsLinkingPassword(true);
    try {
      const outcome = await linkPasswordToGoogleAccount(newPassword, confirmNewPassword);
      if (outcome.success) {
        if (outcome.providers) {
          setProviders(outcome.providers);
        }
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordSetupForm(false);
        setPasswordLinkSuccess(
          outcome.message ||
            'Password set up successfully! You can now sign in with either Google or your Email & Password.'
        );
      } else {
        if (outcome.providers) {
          setProviders(outcome.providers);
        }
        setPasswordLinkError(
          outcome.error || 'Could not set up password for your account. Please try again.'
        );
      }
    } catch {
      setPasswordLinkError('An unexpected error occurred while linking your password.');
    } finally {
      setIsLinkingPassword(false);
    }
  };

  const authEmail = auth.currentUser?.email || student?.email || '';

  // If no authenticated user exists, invite them to sign in
  if (!student && !auth.currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] flex flex-col justify-center items-center p-6 text-[#102C46]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8F3FF] shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF4FE] text-[#0866C6] flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#062B50]">Sign In Required</h2>
          <p className="text-sm text-[#5A6E85]">
            Please sign in to access or complete your student profile.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="w-full py-3 rounded-xl bg-[#0866C6] text-white font-bold text-sm hover:bg-[#062B50] transition-colors cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
      {/* Header bar */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E8F3FF] transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => (isCompletionMode ? onNavigate('/') : onNavigate('/dashboard'))}
            className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
            aria-label="DeRote Student Insight - Home"
          >
            <DeRoteWordmark showDescriptor={false} size="sm" />
          </button>

          {isCompletionMode ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E2EDF8] bg-white hover:bg-[#F2F7FC] text-xs font-bold text-[#64778C] hover:text-[#062B50] transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E2EDF8] bg-white hover:bg-[#F2F7FC] text-xs font-bold text-[#062B50] hover:text-[#0866C6] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="bg-white rounded-3xl border border-[#E2EDF8] p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header Title */}
          <div className="border-b border-[#E8F3FF] pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold mb-2">
              {isCompletionMode ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              <span>{isCompletionMode ? 'Required Student Onboarding' : 'Personal Student Settings'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
              {isCompletionMode ? 'Complete Your Student Profile' : 'Edit Profile'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6E85] mt-1.5 leading-relaxed">
              {isCompletionMode
                ? 'Welcome to DeRote! Please enter your age, class, and school to activate your student dashboard and start your self-discovery reflections.'
                : 'You can update your age and class grade below. Your name and school remain locked according to enrollment verification.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field 1: Full Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="student-fullname-input"
                  className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-[#0866C6]" />
                  <span>Student Full Name</span>
                </label>
                {isCompletionMode ? (
                  <span className="text-[11px] font-bold text-[#0866C6] bg-[#EBF4FE] px-2 py-0.5 rounded-md">
                    Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8EA3B8] bg-[#F2F5F8] px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3 text-[#8EA3B8]" />
                    <span>Cannot be edited</span>
                  </span>
                )}
              </div>

              {isCompletionMode ? (
                <input
                  id="student-fullname-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maya Sharma"
                  className="w-full px-4 py-3 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] font-semibold text-sm sm:text-base focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  required
                />
              ) : (
                <input
                  type="text"
                  value={student?.fullName || fullName}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-[#E2EDF8] bg-[#F7FAFD] text-[#64778C] font-semibold text-sm sm:text-base cursor-not-allowed select-none"
                />
              )}
            </div>

            {/* Field 2: Email (Account-bound, Read-only) */}
            {authEmail && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0866C6]" />
                    <span>Registered Email Address</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8EA3B8] bg-[#F2F5F8] px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3 text-[#8EA3B8]" />
                    <span>Account Identifier</span>
                  </span>
                </div>
                <input
                  type="email"
                  value={authEmail}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-[#E2EDF8] bg-[#F7FAFD] text-[#64778C] font-semibold text-sm sm:text-base cursor-not-allowed select-none"
                />
              </div>
            )}

            {/* Field 3: School / Institution Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="school-name-input"
                  className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2"
                >
                  <School className="w-4 h-4 text-[#0866C6]" />
                  <span>School / Institution Name</span>
                </label>
                {isCompletionMode ? (
                  <span className="text-[11px] font-bold text-[#0866C6] bg-[#EBF4FE] px-2 py-0.5 rounded-md">
                    Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8EA3B8] bg-[#F2F5F8] px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3 text-[#8EA3B8]" />
                    <span>Cannot be edited</span>
                  </span>
                )}
              </div>

              {isCompletionMode ? (
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64778C]">
                    <School className="w-4 h-4 text-[#0866C6]" />
                  </div>
                  <input
                    id="school-name-input"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Enter your school or institution name..."
                    required
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 bg-white text-sm sm:text-base text-[#102C46] placeholder-[#64778C]/60 outline-none transition-all shadow-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={student?.schoolName || schoolName}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-[#E2EDF8] bg-[#F7FAFD] text-[#64778C] font-semibold text-sm sm:text-base cursor-not-allowed select-none shadow-none"
                />
              )}
            </div>

            {/* Field 4: Age */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="student-age-input"
                  className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-[#0866C6]" />
                  <span>Age (in years)</span>
                </label>
                <span className="text-[11px] font-bold text-[#0866C6] bg-[#EBF4FE] px-2 py-0.5 rounded-md">
                  {isCompletionMode ? 'Required' : 'Editable'}
                </span>
              </div>
              <input
                id="student-age-input"
                type="number"
                min="8"
                max="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-4 py-3 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] font-semibold text-sm sm:text-base focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                required
              />
            </div>

            {/* Field 5: Class Grade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0866C6]" />
                  <span>Current Class / Grade</span>
                </label>
                <span className="text-[11px] font-bold text-[#0866C6] bg-[#EBF4FE] px-2 py-0.5 rounded-md">
                  {isCompletionMode ? 'Required' : 'Editable'}
                </span>
              </div>

              {/* Class Pill Selectors */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CLASS_OPTIONS.map((c) => {
                  const isSelected = classGrade === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setClassGrade(c)}
                      className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#0866C6] text-white border-[#0866C6] shadow-sm'
                          : 'bg-white border-[#D5E4F3] text-[#062B50] hover:border-[#0866C6]/40 hover:bg-[#F2F7FC]'
                      }`}
                    >
                      {c === 'Higher' ? 'Higher' : `Class ${c}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reassurance Callout Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EBF4FE] border border-[#D5E4F3] text-xs sm:text-sm text-[#062B50] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#0866C6]">
                <ShieldCheck className="w-4 h-4" />
                <span>{isCompletionMode ? 'Safe & Private Profile' : 'Submitted Answers Are Safe'}</span>
              </div>
              <p className="text-[#5A6E85] leading-relaxed">
                {isCompletionMode
                  ? 'Your profile information is saved securely to your private DeRote student account. Dashboard access is activated immediately once confirmed.'
                  : 'Updating your age or class will immediately update your dashboard view. It will never change, overwrite, or delete any answers you previously submitted.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#E8F3FF] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              {isCompletionMode ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSubmitting || isSigningOut}
                  className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel &amp; Return
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to DeRote cloud...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isCompletionMode ? 'Save Profile & Enter Dashboard' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Account Settings & Sign-In Methods (Only shown in Edit / Account Settings mode) */}
        {!isCompletionMode && (
          <section
            aria-labelledby="account-settings-heading"
            className="bg-white rounded-3xl border border-[#E2EDF8] p-6 sm:p-10 shadow-sm space-y-6"
          >
            <div className="border-b border-[#E8F3FF] pb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold mb-2">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </div>
              <h2
                id="account-settings-heading"
                className="text-xl sm:text-2xl font-extrabold text-[#062B50] tracking-tight"
              >
                Sign-In Methods
              </h2>
              <p className="text-xs sm:text-sm text-[#5A6E85] mt-1.5 leading-relaxed">
                Manage how you sign in to your DeRote student account. All your saved reflections and profile details stay connected to the same account.
              </p>
            </div>

            {passwordLinkSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">{passwordLinkSuccess}</p>
              </div>
            )}

            {passwordLinkError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">{passwordLinkError}</p>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Google Sign-In Status Row */}
              <div className="p-4 rounded-2xl border border-[#E2EDF8] bg-[#F8FAFD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#D5E4F3] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#062B50]">Google Sign-In</p>
                    <p className="text-xs text-[#5A6E85] truncate">
                      {providers.hasGoogle
                        ? authEmail || 'Connected via Google Account'
                        : 'Not connected to Google Sign-In'}
                    </p>
                  </div>
                </div>

                {providers.hasGoogle ? (
                  <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center self-start sm:self-auto px-3 py-1 rounded-full bg-[#F2F5F8] border border-[#E2EDF8] text-[#64778C] text-xs font-semibold shrink-0">
                    Not Linked
                  </span>
                )}
              </div>

              {/* Email & Password Status / Set Up Password Row */}
              <div className="p-4 rounded-2xl border border-[#E2EDF8] bg-[#F8FAFD] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#D5E4F3] text-[#0866C6] flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#062B50]">Email &amp; Password</p>
                      <p className="text-xs text-[#5A6E85] leading-relaxed">
                        {providers.hasPassword
                          ? `Enabled for ${authEmail || 'your verified email'}.`
                          : providers.canSetUpPassword
                          ? `Set up a password so you can also sign in using ${authEmail || 'your email'}.`
                          : 'Email & password sign-in status for your account.'}
                      </p>
                    </div>
                  </div>

                  {providers.hasPassword ? (
                    <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Email / Password Enabled</span>
                    </span>
                  ) : providers.canSetUpPassword && !showPasswordSetupForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordLinkError(null);
                        setPasswordLinkSuccess(null);
                        setShowPasswordSetupForm(true);
                      }}
                      className="self-start sm:self-auto min-h-[40px] px-4 py-2 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Set Up Password</span>
                    </button>
                  ) : null}
                </div>

                {/* Inline Password Setup Form for Google-only users */}
                {providers.canSetUpPassword && showPasswordSetupForm && (
                  <form
                    onSubmit={handleLinkPasswordSubmit}
                    className="pt-4 border-t border-[#E2EDF8] space-y-4"
                  >
                    <div className="p-3 rounded-xl bg-white border border-[#E2EDF8] flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[#64778C] font-semibold">Verified Account Email: </span>
                        <span className="font-bold text-[#062B50] break-all">{authEmail}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8EA3B8] bg-[#F2F5F8] px-2 py-0.5 rounded-md shrink-0">
                        <Lock className="w-3 h-3" />
                        <span>Fixed</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="link-new-password"
                          className="block text-xs font-bold text-[#062B50] mb-1.5"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                          <input
                            id="link-new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLinkingPassword}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            placeholder="Minimum 6 characters"
                            className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] focus:border-[#0866C6] focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="link-confirm-password"
                          className="block text-xs font-bold text-[#062B50] mb-1.5"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                          <input
                            id="link-confirm-password"
                            type={showConfirmNewPassword ? 'text' : 'password'}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            disabled={isLinkingPassword}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            placeholder="Re-enter password"
                            className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] focus:border-[#0866C6] focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                            className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                            aria-label={
                              showConfirmNewPassword ? 'Hide confirm password' : 'Show confirm password'
                            }
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordSetupForm(false);
                          setNewPassword('');
                          setConfirmNewPassword('');
                          setPasswordLinkError(null);
                        }}
                        disabled={isLinkingPassword}
                        className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl border border-[#D5E4F3] bg-white text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLinkingPassword}
                        className="w-full sm:w-auto min-h-[42px] px-6 py-2 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isLinkingPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Linking Password...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            <span>Save Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
