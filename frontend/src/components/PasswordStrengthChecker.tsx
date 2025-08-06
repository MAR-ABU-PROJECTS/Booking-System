import { Check, Dot } from "lucide-react";
import React from "react";

type Props = {
  strength: number;
  password: string;
};

const PasswordStrengthChecker = (props: Props) => {
  return (
    <div>
      <div className=" flex items-center gap-4">
        <p className=" text-[14px] font-medium whitespace-nowrap text-[#4A4A4A]">
          Password strength
        </p>
        <div
          style={{
            width: "100%",
            backgroundColor: "#e0e0e0",
            borderRadius: "5px",
          }}
        >
          <div
            style={{
              height: "6px",
              width: `${props.strength}%`,
              backgroundColor:
                props.strength >= 90
                  ? "green"
                  : props.strength >= 60
                    ? "orange"
                    : "red",
              borderRadius: "5px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p className=" text-[14px] font-medium">
          {props.strength >= 90 ? (
            <span className=" ">Excellent</span>
          ) : props.strength >= 60 ? (
            <span>Strong</span>
          ) : (
            <span>Weak</span>
          )}
        </p>
      </div>
      <div className="mt-4">
        <p className=" font-medium text-[#4A4A4ACC] text-xs">
          Must contain at least
        </p>
        <ul className="mt-2 text-[13px] text-[#A6A5A5] flex flex-col gap-1">
          <li className=" flex items-center gap-1">
            {props.password.length >= 8 ? (
              <Check className=" size-4" />
            ) : (
              <Dot className=" size-5" />
            )}
            At least 8 characters
          </li>
          <li className=" flex items-center gap-1">
            {/[A-Z]/.test(props.password) ? (
              <Check className=" size-4" />
            ) : (
              <Dot className=" size-5" />
            )}
            At least 1 uppercase character
          </li>
          <li className=" flex items-center gap-1">
            {/\d/.test(props.password) ? (
              <Check className=" size-4" />
            ) : (
              <Dot className=" size-5" />
            )}
            At least 1 number
          </li>
          <li className=" flex items-center gap-1">
            {/[\W_]/.test(props.password) ? (
              <Check className=" size-4" />
            ) : (
              <Dot className=" size-5" />
            )}
            At least 1 special character
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PasswordStrengthChecker;
