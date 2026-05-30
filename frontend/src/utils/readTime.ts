/** 按正文字数估算阅读时长（约 400 字/分钟，至少 1 分钟） */
export function getReadTime(content: string | undefined): number {
  if (!content) return 1;
  const words = content.length;
  const speed = 400;
  const minutes = Math.ceil(words / speed);
  return minutes > 0 ? minutes : 1;
}
