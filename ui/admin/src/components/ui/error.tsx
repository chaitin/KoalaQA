import React from "react";

const ErrorIcon = () => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.30761 1.5L1.5 5.30761L1.5 10.6924L5.30761 14.5H10.6924L14.5 10.6924V5.30761L10.6924 1.5H5.30761ZM5.10051 0C4.83529 0 4.58094 0.105357 4.3934 0.292893L0.292893 4.3934C0.105357 4.58094 0 4.83529 0 5.10051V10.8995C0 11.1647 0.105357 11.4191 0.292894 11.6066L4.3934 15.7071C4.58094 15.8946 4.83529 16 5.10051 16H10.8995C11.1647 16 11.4191 15.8946 11.6066 15.7071L15.7071 11.6066C15.8946 11.4191 16 11.1647 16 10.8995V5.10051C16 4.83529 15.8946 4.58093 15.7071 4.3934L11.6066 0.292893C11.4191 0.105357 11.1647 0 10.8995 0H5.10051ZM8.75 3.75V4.5V8L8.75 8.75H7.25V8V4.5V3.75H8.75ZM8 12C8.55229 12 9 11.5523 9 11C9 10.4477 8.55229 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z"
    />
  </svg>
);

const ErrorLinkIcon = () => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.5 9.75V11.25C11.5 11.3881 11.3881 11.5 11.25 11.5H4.75C4.61193 11.5 4.5 11.3881 4.5 11.25L4.5 4.75C4.5 4.61193 4.61193 4.5 4.75 4.5H6.25H7V3H6.25H4.75C3.7835 3 3 3.7835 3 4.75V11.25C3 12.2165 3.7835 13 4.75 13H11.25C12.2165 13 13 12.2165 13 11.25V9.75V9H11.5V9.75ZM8.5 3H9.25H12.2495C12.6637 3 12.9995 3.33579 12.9995 3.75V6.75V7.5H11.4995V6.75V5.56066L8.53033 8.52978L8 9.06011L6.93934 7.99945L7.46967 7.46912L10.4388 4.5H9.25H8.5V3Z"
    />
  </svg>
);

interface Error {
  message: string;
  action: string;
  link: string;
}

interface ErrorProps {
  error?: Error;
  label?: string;
  size?: "small" | "medium" | "large";
  children?: React.ReactNode;
}

export const Error = ({ error, label, size = "medium", children }: ErrorProps) => {
  return (
    <div
      className={
        `flex items-center gap-2 text-red-900 fill-red-900 font-sans
      ${{
          small: "text-[13px] leading-5",
          medium: "text-sm",
          large: "text-base"
        }[size]}`
      }
      // @ts-ignore
      style={{ "--geist-link-color": "var(--ds-red-900)" }}
    >
      <ErrorIcon />
      {error ? (
        <>
          {error.message}
          <a
            className="font-medium flex items-center gap-0.5 -ml-1 hover:no-underline hover:opacity-60 duration-150 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1px] after:bg-red-900"
            href={error.link}
            target="_blank"
          >
            {error.action}
            <ErrorLinkIcon />
          </a>
        </>
      ) : (
        <>
          {label && <span className="font-medium">{label}:</span>}
          {children}
        </>
      )}
    </div>
  );
};