# Next Media

Next media is a media management system (eg. Jellyfin, Emby, Plex) powered by Next.js.


## TODO

- [x] Sign Up / Sign In
- [ ] 自动添加字幕
- [x] safari不支持mkv播放，用ffmpeg来实时remux mkv -> mp4
    - [x] 退出的时候，需要通知服务端停止remux (abort signal)
    - [ ] 目前的进度条无作用
- [ ] ffprobe返回电影信息给客户端
