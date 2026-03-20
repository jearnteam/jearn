"use client";

import IncomingCallModal from "@/components/call/IncomingCallModal";
import CallScreen from "@/components/call/CallScreen";
import OutgoingCallScreen from "@/components/call/OutgoingCallScreen";
import CallBar from "./CallBar";

export default function CallRoot() {
  return (
    <>
      <OutgoingCallScreen />
      <IncomingCallModal />
      <CallScreen />
      <CallBar />
    </>
  );
}
