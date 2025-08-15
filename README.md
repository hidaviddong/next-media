# Next Media

Next media is a media management system (eg. Jellyfin, Emby, Plex) powered by Next.js.

## TODO

- [x] Sign Up / Sign In
- [x] ffprobe 返回电影信息给客户端？
- [x] safari 不支持 mkv 播放，用 ffmpeg 来 remux mkv -> mp4
- [x] 支持字幕
    -[x] 读取mkv中的单字幕用ffmpeg转换成webvtt
    -[x] 读取mkv 多字幕 / 切换 
    -[ ] 读取文件夹下的单独字幕并转换成webvtt
    -[ ] web端上传自定义字幕
- [x] Add folder 只出现一次，如果用户添加了，那就支持刷新
- [x] 浏览器不支持 DTS 音频，需要转换 (转换后有时还是没声音)
- [x] 支持 m3u8 续传
- [ ] 动态切换播放模式
