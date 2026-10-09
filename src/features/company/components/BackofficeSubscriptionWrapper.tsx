import React from "react";
import { SubscriptionBanner } from "./SubscriptionBanner";

interface BackofficeSubscriptionWrapperProps {
  children?: React.ReactNode;
}

export const BackofficeSubscriptionWrapper: React.FC<BackofficeSubscriptionWrapperProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <SubscriptionBanner />
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {children}
      </div>
    </div>
  );
};

export default BackofficeSubscriptionWrapper;
