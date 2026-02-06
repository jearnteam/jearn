export default function ProfileLayout({
    scrollRef,
    children,
  }: {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
  }) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
        <main
          ref={scrollRef}
          className="
            absolute top-[4.3rem]
            left-0 right-0
            h-[calc(100vh-4.3rem)]
            overflow-y-auto no-scrollbar
            pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
          "
        >
          {children}
        </main>
      </div>
    );
  }
  