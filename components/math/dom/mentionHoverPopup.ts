import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

type UserData = {
  _id: string;
  name: string;
  uniqueId: string;
  picture?: string | null;
  bio?: string | null;
  followers?: number;
  following?: number;
};

const userCache = new Map<string, UserData>();

export function setupMentionHoverPopups(el: HTMLElement) {
  const mentions = el.querySelectorAll(
    "span[data-mention='true']"
  ) as NodeListOf<HTMLElement>;

  mentions.forEach((mentionEl) => {
    const uid = mentionEl.getAttribute("data-uid");
    if (!uid) return;

    tippy(mentionEl as Element, {
      content: buildSkeletonCard(),
      allowHTML: true,
      interactive: false,
      placement: "top",
      delay: [200, 0],
      animation: "shift-away-subtle",
      theme: "jearn-mention",
      onShow(inst) {
        if (userCache.has(uid)) {
          inst.setContent(buildPokemonCard(userCache.get(uid)!));
          return;
        }

        inst.setContent(buildSkeletonCard());

        fetch(`/api/user/${uid}`, { cache: "no-store" })
          .then((res) => {
            if (!res.ok) throw new Error();
            return res.json();
          })
          .then((data) => {
            if (!data?.ok || !data?.user) throw new Error();

            const user: UserData = {
              _id: data.user.uid,
              name: data.user.name,
              uniqueId: data.user.uniqueId,
              picture: data.user.picture,
              bio: data.user.bio,
              followers: data.user.followers ?? 0,
              following: data.user.following ?? 0,
            };

            userCache.set(uid, user);
            inst.setContent(buildPokemonCard(user));
          })
          .catch(() => {
            inst.setContent(buildErrorCard());
          });
      },
    });
  });
}

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function buildSkeletonCard() {
  const dark = isDarkMode();

  const card = document.createElement("div");
  card.className = `
      w-72 p-5 rounded-2xl border animate-pulse
      ${
        dark
          ? "bg-neutral-900 border-neutral-700"
          : "bg-white border-gray-200 shadow-lg"
      }
    `;

  const blockColor = dark ? "bg-neutral-700" : "bg-gray-200";

  card.innerHTML = `
      <div class="flex flex-col items-center">
        <div class="w-20 h-20 rounded-full ${blockColor} mb-3"></div>
        <div class="h-4 w-32 ${blockColor} rounded mb-2"></div>
        <div class="h-3 w-24 ${blockColor} rounded mb-3"></div>
        <div class="h-3 w-full ${blockColor} rounded mb-2"></div>
        <div class="flex gap-4 mt-3">
          <div class="h-4 w-12 ${blockColor} rounded"></div>
          <div class="h-4 w-12 ${blockColor} rounded"></div>
        </div>
      </div>
    `;

  return card;
}

function buildPokemonCard(user: UserData) {
  const dark = isDarkMode();

  const card = document.createElement("div");
  card.className = `
      w-72 p-5 rounded-2xl relative overflow-hidden
      backdrop-blur-md border
      ${
        dark
          ? "bg-neutral-900 text-white border-neutral-700 shadow-2xl"
          : "bg-white text-black border-gray-200 shadow-xl"
      }
    `;

  // Soft glow (subtle for both modes)
  const glow = document.createElement("div");
  glow.className = "absolute inset-0 rounded-2xl pointer-events-none";
  glow.style.boxShadow = dark
    ? "0 0 40px rgba(59,130,246,0.12)"
    : "0 0 30px rgba(99,102,241,0.10)";

  const content = document.createElement("div");
  content.className = "relative z-10 flex flex-col items-center";

  const avatar = document.createElement("img");
  avatar.className = `
      w-20 h-20 rounded-full object-cover mb-3 shadow-lg
      ${dark ? "border-4 border-neutral-800" : "border-4 border-white"}
    `;
  avatar.src = user.picture || "/default-avatar.png";
  avatar.onerror = () => {
    avatar.onerror = null;
    avatar.src = "/default-avatar.png";
  };

  const name = document.createElement("div");
  name.className = "font-bold text-lg tracking-wide";
  name.textContent = user.name;

  const unique = document.createElement("div");
  unique.className = dark ? "text-sm text-gray-400" : "text-sm text-gray-500";
  unique.textContent = `@${user.uniqueId}`;

  const bio = document.createElement("div");
  bio.className = `
      text-xs mt-3 text-center line-clamp-3
      ${dark ? "text-gray-300" : "text-gray-600"}
    `;
  bio.textContent = user.bio || "";

  const stats = document.createElement("div");
  stats.className = `
      flex justify-between w-full mt-4 px-4 py-2 rounded-xl text-sm font-medium
      ${dark ? "bg-neutral-800" : "bg-gray-100"}
    `;

  stats.innerHTML = `
      <div>Follower <span class="${dark ? "text-blue-400" : "text-blue-600"}">
        ${user.followers ?? 0}
      </span></div>
      <div>Following <span class="${
        dark ? "text-purple-400" : "text-purple-600"
      }">
        ${user.following ?? 0}
      </span></div>
    `;

  content.appendChild(avatar);
  content.appendChild(name);
  content.appendChild(unique);
  if (user.bio) content.appendChild(bio);
  content.appendChild(stats);

  card.appendChild(glow);
  card.appendChild(content);

  return card;
}

function buildErrorCard() {
  const card = document.createElement("div");
  card.className =
    "w-64 p-4 rounded-xl bg-red-500 text-white shadow-xl text-center";
  card.textContent = "User not found";
  return card;
}
