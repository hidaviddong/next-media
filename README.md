# Next Media

Next media is a media management system (eg. Jellyfin, Emby, Plex)

## TODO

- [x] Sign Up / Sign In
- [x] ffprobe 返回电影信息给客户端？
- [x] safari 不支持 mkv 播放，用 ffmpeg 来 remux mkv -> mp4
- [x] 支持字幕
  - [x] 读取 mkv 中的单字幕用 ffmpeg 转换成 webvtt
  - [x] 读取 mkv 多字幕 / 切换
  - [x] 读取文件夹下的单独字幕并转换成 webvtt
  - [ ] 加载文件夹内的字幕，格式不对会自动转换
  - [ ] web 端可以上传字幕
- [x] Add folder 只出现一次，如果用户添加了，那就支持刷新
- [x] 浏览器不支持 DTS 音频，需要转换 (转换后有时还是没声音)
- [x] 支持 m3u8 续传
- [x] 动态切换播放模式(direct play / remux to mp4 / m3u8)
- [x] 全局搜索 cmd+k，回车可以直接跳到电影详情页
- [x] 增加播放记录表，记录上次播放时间

  - [x] 断点续播
  - [x] 保证缓存大小不超过用户设置容量，如果要超过了删除最早播放的那条缓存
  - [x] 标记为已观看

- [x] AI
  - [x] movie chat 
    - [ ] (subtitle as prompt context)
