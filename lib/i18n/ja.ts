import { TranslationSchema } from "./en";

const ja: TranslationSchema = {
  translation: {
    loading: "読み込み中",
    loadingPosts: "投稿を読み込み中",
    jearn: "JEARN",
    logout: "ログアウト",
    login: "ログイン",
    notLoggedIn: "ログインしていません",
    post: "投稿",
    question: "質問",
    questionEnter: "質問を入力してください",
    answer: "回答",
    title: "タイトル",
    placeholder: "みんなと共有したいことを入力してください",
    cancel: "キャンセル",
    share: "共有",
    edit: "編集",
    delete: "削除",
    report: "通報",
    reported: "通報済み",
    createPost: "投稿を作成",
    editPost: "投稿を編集",
    saveChanges: "変更を保存",
    postingAsBefore: "",
    postingAsAfter: "として投稿",
    editingAsBefore: "Editing as",
    editingAsAfter: "",
    checkCategories: "カテゴリーをチェック",
    submit: "送信",
    showMore: "展開",
    showLess: "縮小",
    deletePost: "投稿を削除しますか？",
    deletePostDesc:
      "この操作は取り消せません。この投稿を永久的に削除しますか？",
    shareThisPost: "投稿を共有",
    copied: "コピーしました！",
    copyLink: "リンクをコピー",
    categoryName: "カテゴリー名",
    search: "検索",
    categoryReason: "申請理由(オプション)",
    whyReason: "このカテゴリーを申請する理由を教えてください",
    loadingUser: "Loading User",
    requestSent: "リクエストが正常に送信されました！",
    sendRequest: "申請する",
    answerToQuestion: "Answer to Question",
    postAnswer: "Post Answer",
    answers: "Answers",
    noAnswersYet: "No answers yet.",
    followedYou: "さんがあなたをフォローしました",

    // home page
    home: "ホーム",
    follow: "フォロー",
    notifications: "通知",
    videos: "ビデオ",
    chat: "チャット",

    //poll
    createPoll: "投票を作成",
    createPollOpt: "投票を作成する（選択肢2～5個）",
    addOption: "選択肢を追加",
    multipleChoice: "複数選択を許可する",
    pollExpiration: "投票有効期限（任意）",

    //videos
    noVideo: "動画が選択されていません",
    selectVideo: "動画を選択",
    notSeletThumbnail: "サムネイルが選択されていない場合、最初のフレームが使用されます",
    seletThumbnail: "サムネイルを選択",

    notiPage: {
      no_noti_yet: "通知はありません",
      upvote_noti: "さんがあなたの投稿を高評価しました",
      mention_noti: "さんがあなたを＠メンションしました",
      comment_noti: "さんがあなたの投稿にコメントしました",
      answer_noti: "さんがあなたの質問に回答しました",
      follow_noti: "さんがあなたをフォローしました",
      system_noti: "System notification",
    },

    // comment
    comments: "コメント",
    addComment: "コメントを追加",
    writeComment: "コメントを書く",
    editComment: "コメントを編集",
    postComment: "コメントを投稿",
    reply: "返信",

    userMenu: {
      profile: "プロフィール",
      toggleTheme: "ダークモード",
      requestCategory: "カテゴリー申請",
    },
    dashboard: "ダッシュボード",

    profilePage: {
      userNotFound: "ユーザーが見つかりませんでした。",
      postsByBefore: "",
      postsByAfter: "の投稿",
      following: "フォロー済み",
      yourPosts: "あなたの投稿",
    },

    profileSetting: {
      settings: "プロフィール設定",
      name: "名前",
      bio: "自己紹介",
      uniqueId: "Unique ID",
      change: "変更",
      save: "変更を保存",
      saving: "保存中...",
    },

    // dashboard
    overview: "概要",
    analytics: "分析",
    database: "データベース",
    settings: "設定",
    notification: "通知",
    reports: "通報",
    categoryRequest: "カテゴリー申請",
    loadingDashboard: "ダッシュボードを読み込み中",
  },
};

export default ja;
