"use client";

import IncomingCallModal from "@/components/call/IncomingCallModal";
import CallScreen from "@/components/call/CallScreen";
import OutgoingCallScreen from "@/components/call/OutgoingCallScreen";

export default function CallRoot() {
  return (
    <>
      <OutgoingCallScreen />
      <IncomingCallModal />
      <CallScreen />
    </>
  );
}
