// components/MobileNavbar.tsx
import { Plus, Home, Users, Bell, Banana } from "lucide-react";
import { useRouter } from "next/navigation";

interface MobileNavbarProps {
  onCreatePost: () => void;
}

export default function MobileNavbar({ onCreatePost }: MobileNavbarProps) {
  const router = useRouter();
  return (
    <div
      className="
        lg:hidden
        fixed bottom-0 left-0 right-0
        h-20
        bg-white dark:bg-black
        border-t border-neutral-200 dark:border-neutral-800
        flex items-center justify-evenly
        z-40
        pt-1
        pb-3
        px-[5vw]
      "
    >
      <button
        onClick={() => router.push("/")}
        className="
          w-16 h-12
          flex items-center justify-center
          transition
          active:scale-95
        "
      >
        <Home size={24} strokeWidth={2} />
      </button>
      <div className="w-[2px] h-12 bg-gray-200 dark:bg-gray-700" />
      <button
        onClick={() => {}}
        className="
          w-16 h-12
          flex items-center justify-center
          transition
          active:scale-95
        "
      >
        <Users size={24} strokeWidth={2} />
      </button>
      <div className="w-[2px] h-12 bg-gray-200 dark:bg-gray-700" />
      <button
        onClick={onCreatePost}
        className="
          w-12 h-12
          mx-2
          bg-blue-600 hover:bg-blue-700
          text-white
          rounded-full
          flex items-center justify-center
          shadow-lg
          transition
          active:scale-95
        "
        aria-label="Create Post"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
      <div className="w-[2px] h-12 bg-gray-200 dark:bg-gray-700" />
      <button
        onClick={() => {}}
        className="
          w-16 h-12
          flex items-center justify-center
          transition
          active:scale-95
        "
      >
        <Bell size={24} strokeWidth={2} />
      </button>
      <div className="w-[2px] h-12 bg-gray-200 dark:bg-gray-700" />
      <button
        onClick={() => {}}
        className="
          w-16 h-12
          flex items-center justify-center
          transition
          active:scale-95
        "
      >
        <Banana size={24} strokeWidth={2} />
      </button>
    </div>
  );
}
