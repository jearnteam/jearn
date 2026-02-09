const en = {
  translation: {
    loading: "Loading",
    loadingPosts: "Loading posts",
    jearn: "JEARN",
    logout: "Logout",
    login: "Login",
    notLoggedIn: "Not logged in",
    post: "Post",
    question: "Question",
    questionEnter: "Please enter your question",
    answer: "Answer",
    title: "title",
    placeholder: "Type in what you wanna share with everyone",
    cancel: "Cancel",
    share: "Share",
    edit: "Edit",
    delete: "Delete",
    report: "Report",
    reported: "Reported",
    createPost: "Create Post",
    editPost: "Edit Post",
    saveChanges: "Save Changes",
    postingAsBefore: "Posting as",
    postingAsAfter: "",
    editingAsBefore: "Editing as",
    editingAsAfter: "",
    checkCategories: "Check Categories",
    submit: "Submit",
    showMore: "Show more",
    showLess: "Show less",
    deletePost: "Delete this post?",
    deletePostDesc:
      "This action cannot be undone. Are you sure you want to permanently delete this post?",
    shareThisPost: "Share this post",
    copied: "Copied!",
    copyLink: "Copy Link",
    requestCategory: "Request Category",
    categoryName: "Category Name",
    search: "Search",
    categoryReason: "Reason (Optional)",
    loadingUser: "Loading User",
    requestSent: "Request sent successfully!",
    sendRequest: "Send Request",
    answerToQuestion: "Answer to Question",
    postAnswer: "Post Answer",
    answers: "Answers",
    noAnswersYet: "No answers yet.",

    // home page
    home: "Home",
    follow: "Follow",
    notifications: "Notifications",

    // notification page
    no_noti_yet: "No notifications yet",
    upvote_noti: "upvoted your post.",
    mention_noti: "mentioned you!",
    comment_noti: "commented on your post.",
    system_noti: "System notification",

    // comment
    comments: "Comments",
    addComment: "Add Comment",
    writeComment: "Write a Comment",
    editComment: "Edit Comment",
    postComment: "Post Comment",
    reply: "reply",

    // UserMenus
    profile: "Profile",
    toggleTheme: "Toggle Theme",
    dashboard: "Dashboard",

    // profile
    userNotFound: "User not found.",
    postsByBefore: "Posts by",
    postsByAfter: "",
    following: "following",
    
    profileSetting: {
      settings: "Profile Settings",
      name: "Name",
      bio: "Bio",
      uniqueId: "Unique ID",
      change: "Change",
      save: "Save changes",
      saving: "Saving...",
    },

    // dashboard
    overview: "Overview",
    analytics: "Analytics",
    database: "DataBase",
    settings: "Settings",
    notification: "Notification",
    reports: "Reports",
    categoryRequest: "Category Request",
    loadingDashboard: "Loading dashboard",
  },
} as const;

type ToTranslationType<T> = {
  [K in keyof T]: T[K] extends object ? ToTranslationType<T[K]> : string;
};
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export type TranslationSchema = DeepPartial<ToTranslationType<typeof en>>;

export default en;
