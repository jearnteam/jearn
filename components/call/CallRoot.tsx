"use client";

import IncomingCallModal from "@/components/call/IncomingCallModal";
import CallScreen from "@/components/call/CallScreen";

export default function CallRoot() {
  return (
    <>
      <IncomingCallModal />
      <CallScreen />
    </>
  );
}