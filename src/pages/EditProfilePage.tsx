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
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import {
  getCurrentStudent,
  updateStudentProfile,
  LocalStudentAccount,
} from '../services/localAuth';

interface EditProfilePageProps {
  onNavigate: (route: string) => void;
}

const CLASS_OPTIONS = ['8', '9', '10', '11', '12', 'Others'];

export const EditProfilePage: React.FC<EditProfilePageProps> = ({ onNavigate }) => {
  const [student, setStudent] = useState<LocalStudentAccount | null>(() => getCurrentStudent());

  const [age, setAge] = useState<string>('');
  const [classGrade, setClassGrade] = useState<string>('10');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (student) {
      setAge(student.age || '');
      setClassGrade(student.classGrade || '10');
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanAge = age.trim();
    if (!cleanAge) {
      setErrorMessage('Please enter your age.');
      return;
    }

    const ageNum = parseInt(cleanAge, 10);
    if (isNaN(ageNum) || ageNum < 8 || ageNum > 25) {
      setErrorMessage('Please enter a realistic age between 8 and 25.');
      return;
    }

    if (!classGrade) {
      setErrorMessage('Please select your class.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = updateStudentProfile({
        age: cleanAge,
        classGrade,
      });

      if (res.success && res.student) {
        setStudent(res.student);
        setSuccessMessage('Your profile has been successfully updated! Returning to your dashboard...');
        setTimeout(() => {
          onNavigate('/dashboard');
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to update profile. Please try again.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] flex flex-col justify-center items-center p-6 text-[#102C46]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8F3FF] shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF4FE] text-[#0866C6] flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#062B50]">No Student Account Found</h2>
          <p className="text-sm text-[#5A6E85]">
            Please sign in or complete About Me (Part 1) to edit your profile.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="w-full py-3 rounded-xl bg-[#0866C6] text-white font-bold text-sm hover:bg-[#062B50] transition-colors"
          >
            Go to Dashboard
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
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
            aria-label="DeRote Student Insight - Return to Dashboard"
          >
            <DeRoteWordmark showDescriptor={false} size="sm" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E2EDF8] bg-white hover:bg-[#F2F7FC] text-xs font-bold text-[#062B50] hover:text-[#0866C6] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-[#E2EDF8] p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header Title */}
          <div className="border-b border-[#E8F3FF] pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold mb-2">
              <User className="w-3.5 h-3.5" />
              <span>Personal Student Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
              Edit Profile
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6E85] mt-1.5 leading-relaxed">
              You can update your age and class grade below. Your name and school remain locked according to enrollment verification.
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
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field 1: Full Name (LOCKED) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0866C6]" />
                  <span>Student Full Name</span>
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8EA3B8] bg-[#F2F5F8] px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3 text-[#8EA3B8]" />
                  <span>Cannot be edited</span>
                </span>
              </div>
              <input
                type="text"
                value={student.fullName}
                disabled
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-[#E2EDF8] bg-[#F7FAFD] text-[#64778C] font-semibold text-sm sm:text-base cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-[#8EA3B8] flex items-center gap-1.5 pl-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0866C6]" />
                <span>Name is permanently recorded for your academic verification records.</span>
              </p>
            </div>

            {/* Field 2: School and Institution (LOCKED) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2">
                  <School className="w-4 h-4 text-[#0866C6]" />
                  <span>School / Institution</span>
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8EA3B8] bg-[#F2F5F8] px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3 text-[#8EA3B8]" />
                  <span>Cannot be edited</span>
                </span>
              </div>
              <input
                type="text"
                value={student.schoolName}
                disabled
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-[#E2EDF8] bg-[#F7FAFD] text-[#64778C] font-semibold text-sm sm:text-base cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-[#8EA3B8] flex items-center gap-1.5 pl-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0866C6]" />
                <span>Institution is assigned and fixed by school administrative coordination.</span>
              </p>
            </div>

            {/* Field 3: Age (EDITABLE) */}
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
                  Editable
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
              <p className="text-[11px] text-[#5A6E85] pl-1">
                Enter your current age to keep your student profile accurate.
              </p>
            </div>

            {/* Field 4: Class (EDITABLE) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-[#062B50] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0866C6]" />
                  <span>Class / Grade</span>
                </label>
                <span className="text-[11px] font-bold text-[#0866C6] bg-[#EBF4FE] px-2 py-0.5 rounded-md">
                  Editable
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
                      {c === 'Others' ? 'Others' : `Class ${c}`}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#5A6E85] pl-1">
                Select your current grade level (8th through 12th, or Others).
              </p>
            </div>

            {/* Reassurance Callout Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EBF4FE] border border-[#D5E4F3] text-xs sm:text-sm text-[#062B50] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#0866C6]">
                <ShieldCheck className="w-4 h-4" />
                <span>Submitted Answers Are Safe</span>
              </div>
              <p className="text-[#5A6E85] leading-relaxed">
                Updating your age or class will immediately update your dashboard view. It will <strong>never change, overwrite, or delete</strong> any answers you previously submitted in the questionnaire.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#E8F3FF] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                Cancel &amp; Return
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Profile...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
