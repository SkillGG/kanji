import { cn } from "cn";
import type { ReactNode } from "react";

export const Spinner = ({
  spinnerText,
  spinnerStyle,
  className,
}: {
  spinnerText?: ReactNode;
  spinnerStyle?: { className: string };
  className?: string;
}) => {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg
        className={cn(
          "h-5 w-5 animate-spin stroke-10 text-cyan-300",
          spinnerStyle?.className,
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 120 120"
      >
        <circle
          className="opacity-20"
          cx="60"
          cy="60"
          r="20"
          stroke="currentColor"
        />
        <path
          className="opacity-80"
          strokeLinecap="round"
          stroke="currentColor"
          d="M 40,60 A 20,20 0 1,1 60,80"
        />
      </svg>
      {spinnerText}
    </span>
  );
};

export const SpinnerOrText = ({
  text,
  loading,
  spinnerText,
  spinnerStyle,
  className,
}: {
  text: ReactNode;
  loading: boolean;
  spinnerText?: string;
  spinnerStyle?: { className: string };
  className?: string;
}) => {
  return !loading ? (
    <>{text}</>
  ) : (
    <Spinner
      className={className}
      spinnerStyle={spinnerStyle}
      spinnerText={spinnerText}
    />
  );
};
