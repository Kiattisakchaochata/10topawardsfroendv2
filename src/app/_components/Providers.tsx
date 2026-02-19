"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Suspense } from "react";
import TrackingInjector from "./TrackingInjector";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";

export default function Providers({
  children,
  googleClientId,
}: {
  children: React.ReactNode;
  googleClientId: string;
}) {
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId} key={googleClientId}>
        <Suspense fallback={null}>
          <TrackingInjector />
        </Suspense>
        <LayoutClientWrapper>{children}</LayoutClientWrapper>
      </GoogleOAuthProvider>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <TrackingInjector />
      </Suspense>
      <LayoutClientWrapper>{children}</LayoutClientWrapper>
    </>
  );
}