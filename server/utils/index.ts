/**
 * 将 SRT 格式的字幕内容手动转换为 WebVTT 格式。
 * @param srtContent SRT 文件的完整字符串内容。
 * @returns WebVTT 格式的字符串内容。
 */
export function convertSrtToVtt(srtContent: string): string {
  // 1. 添加 VTT 文件头，并确保前后有两个换行符作为分隔。
  let vttContent = "WEBVTT\n\n";

  // 2. 将 SRT 内容按“块”分割。每个字幕块由两个换行符分隔。
  //    使用 .trim() 去除首尾可能存在的空白。
  const cues = srtContent.trim().split(/\n\n+/);

  // 3. 遍历每一个字幕块并进行转换
  vttContent += cues
    .map((cue) => {
      // 将每个块按行分割
      const lines = cue.split("\n");

      // 第 0 行是序列号，我们直接丢弃
      // 第 1 行是时间戳
      const timestampLine = lines[1];

      // 如果时间戳行不存在，则这是一个无效的块，跳过它
      if (!timestampLine) {
        return "";
      }

      // 规则 #3: 将时间戳中的逗号替换为句点
      const vttTimestamp = timestampLine.replace(/,/g, ".");

      // 第 2 行及之后都是字幕文本
      const textLines = lines.slice(2).join("\n");

      // 重新组合成 VTT 格式的块
      return `${vttTimestamp}\n${textLines}`;
    })
    .join("\n\n"); // 用两个换行符将所有处理好的块重新连接起来

  return vttContent;
}
