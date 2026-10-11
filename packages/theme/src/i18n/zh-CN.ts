/**
 * 中文语言包（键源）：UiKey 由本文件的键推导。
 * 约定：占位符用 {name} 形式，t(key, vars) 调用处替换。
 * 新增文案先在这里加键，再同步 en.ts（类型会强制检查完整性）。
 */
const zhCN = {
  /* 全局框架（BaseLayout） */
  skipToContent: '跳到主要内容',
  backToTop: '回到顶部',
  /* Header */
  mainNav: '主导航',
  toggleMode: '切换深浅模式',
  menu: '菜单',
  palette: '调色',
  paletteTitle: '主题色',
  reset: '重置',
  hueValue: '色相 {n}',
  /* PostCard / 文章元信息 */
  pinned: '置顶',
  wordsCount: '{n} 字',
  minutesCount: '约 {n} 分钟',
  /* PostNav */
  prevNext: '上下篇',
  prevPost: '上一篇',
  nextPost: '下一篇',
  firstPost: '已经是最早的一篇',
  lastPost: '已经是最新的一篇',
  /* License */
  licensePrefix: '本文采用',
  licenseSuffix: '许可，转载请注明出处与作者。',
  /* Toc */
  toc: '目录',
  tocTitle: '目 录',
  /* Pagination */
  pagination: '分页',
  prevPage: '上一页',
  nextPage: '下一页',
  pageOf: '第 {current} / {total} 页',
  /* Sidebar */
  closeAnnouncement: '关闭公告',
  closeAd: '关闭广告',
  categories: '分类',
  tags: '标签',
  friendLinks: '友链',
  siteInfo: '站点信息',
  posts: '文章',
  running: '已运行',
  daysCount: '{n} 天',
  /* 列表 / 聚合页 */
  recentPosts: '近期文章',
  emptyPosts: '还没有文章，去 content/posts 里写一篇吧。',
  pageN: '第 {n} 页',
  archive: '归档',
  totalPosts: '共 {n} 篇文章',
  postsInYear: '{n} 篇',
  yearUnit: '{n} 年',
  totalTags: '共 {n} 个标签',
  tagTitle: '标签：{tag}',
  totalCategories: '共 {n} 个分类',
  categoryTitle: '分类：{category}',
  publishedOn: '{date} 发布',
  updatedOn: '{date} 更新',
  /* 404 */
  notFound: '页面不存在',
  notFoundDesc: '页面不存在，或已被移动到别处。',
  backHome: '返回首页',
  /* 独立页 */
  about: '关于',
  aboutEmpty: '在 src/content/spec/about.md 中编写本页内容',
  avatarAlt: '{name} 的头像',
  noFriends: '还没有友链',
  applyFriend: '申请友链',
  guestbook: '留言板',
  guestbookSub: '欢迎留下你的足迹',
  commentComingSoon: '评论区即将开放，敬请期待。',
  qrAlt: '{name} 收款码',
  goSponsor: '前往打赏',
  qrPlaceholder: '收款码占位',
  sponsorList: '打赏名单',
  noSponsors: '还没有打赏，快来做第一个吧',
  /* 搜索（M3b-b6）：search 用于 placeholder（服务端渲染），其余经 #qy-ui-labels 带入客户端 */
  search: '搜索',
  searchLoading: '搜索中…',
  searchNoResults: '没有找到相关结果',
  searchUnavailable: '搜索索引需构建后可用',
  searchTypeSomething: '输入关键词开始搜索',
  /* 画廊（M3b-b8）：title/description 走主题配置，这里只放 UI 通用文案 */
  galleryPhotos: '{n} 张照片',
  backToAlbums: '返回相册',
  searchAlbums: '搜索相册…',
  allTags: '全部',
  galleryNoAlbums: '还没有相册，在主题配置 gallery.albums 中添加。',
  galleryNoPhotos: '相册里还没有照片',
  encryptedAlbum: '加密相册',
  searchAlbumNoResults: '没有匹配的相册',
  /* 加密文章（M3b-b7）：postEncrypted 用于列表/文章 meta 标记，其余构建期渲染进锁 UI */
  postEncrypted: '已加密',
  passwordProtected: '密码保护',
  passwordProtectedDesc: '此内容已被密码保护，请输入密码查看。',
  passwordHint: '提示',
  passwordPlaceholder: '请输入密码',
  passwordSubmit: '解锁',
  passwordError: '密码错误，请重试。',
  /* 客户端动态文案（构建期经 BaseLayout 的 #qy-ui-labels JSON 载体带入） */
  lightbox: '图片查看',
  close: '关闭',
  prevImage: '上一张',
  nextImage: '下一张',
  copy: '复制',
  copied: '已复制',
} as const;

export type UiKey = keyof typeof zhCN;
export default zhCN;
