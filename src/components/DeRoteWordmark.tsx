import React from 'react';
import deroteLogo from '../assets/images/derote_logo_fitted.png';

interface DeRoteWordmarkProps {
  showDescriptor?: boolean;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
}

export const DeRoteWordmark: React.FC<DeRoteWordmarkProps> = ({
  showDescriptor = false,
  size = 'md',
}) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-11 h-11',
  };

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 select-none">
      {/* DeRote Logo Image */}
      <span
        className={`${iconSizes[size]} rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center bg-white border border-[#D5E4F3]`}
        aria-hidden="true"
      >
        <img
          src={deroteLogo}
          alt="DeRote logo"
          className="w-full h-full object-cover object-center select-none"
          loading="eager"
        />
      </span>

      <div className="flex items-baseline gap-2">
        <span
          className={`${textSizes[size]} font-extrabold tracking-tight text-[#062B50] font-sans`}
        >
          DeRote
        </span>

        {showDescriptor && (
          <span className="hidden sm:inline-block text-[10px] tracking-wider uppercase font-bold text-[#0866C6] bg-[#E8F3FF] px-2 py-0.5 rounded-full border border-[#D5E4F3]">
            Student Insight
          </span>
        )}
      </div>
    </div>
  );
};
