import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 14,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)"}`,
          color: "white",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error
            ? "rgba(248,113,113,0.6)"
            : "rgba(255,138,31,0.5)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "rgba(248,113,113,0.5)"
            : "rgba(255,255,255,0.1)";
        }}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
