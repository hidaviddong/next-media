# Next Media

Next media is a media management system (eg. Jellyfin, Emby, Plex)

## TODO

- [x] Sign Up / Sign In
- [x] ffprobe 返回电影信息给客户端？
- [x] safari 不支持 mkv 播放，用 ffmpeg 来 remux mkv -> mp4
- [x] 支持字幕
    - [x] 读取mkv中的单字幕用ffmpeg转换成webvtt
    - [x] 读取mkv 多字幕 / 切换 
    - [x] 读取文件夹下的单独字幕并转换成webvtt
- [x] Add folder 只出现一次，如果用户添加了，那就支持刷新
- [x] 浏览器不支持 DTS 音频，需要转换 (转换后有时还是没声音)
- [x] 支持 m3u8 续传
- [x] 动态切换播放模式(direct play / remux to mp4 / m3u8)
- [ ] 加载字幕
- [ ] 自定义上传字幕
- [ ] migrate to monorepo

