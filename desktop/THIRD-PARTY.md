EditAI Desktop includes Electron (MIT) and Chromium and their bundled notices. Electron's LICENSE and LICENSES.chromium.html accompany the runtime.

Mac release builds use separate FFmpeg/FFprobe 9.0.2 executables compiled by scripts/build-native-macos.sh, with static x264 commit 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee and Apple system frameworks/zlib only. The binaries are GPLv3. The exact source tarballs and build script are packaged into EditAI-0.2.0-native-corresponding-source.tar.xz. The native-build.json manifest records binary and source-archive SHA-256 values. The release guard verifies the matching archive.

Internal CI/source preview builds may use eugeneware/ffmpeg-static b6.1.1 (FFmpeg 6.1.1) when a custom native build has not been made. These are not approved public native releases. The bundled FFmpeg-LICENSE.txt and FFmpeg-README.txt identify the packaged build.

Binary releases, published checksums and source/build recipes:
https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1
https://github.com/eugeneware/ffmpeg-static
https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz
https://code.videolan.org/videolan/x264/-/tree/0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee
https://ffmpeg.org/legal.html

FFmpeg is invoked as a separate process. EditAI does not claim ownership of these components. Public distributions include the complete corresponding-source archive alongside the installers. No local credentials, environment files, compilation objects or user videos are included. System libraries/frameworks come from macOS; no Homebrew runtime libraries are required. Windows public release remains gated until its native-build source and signing process have been verified.

Other JavaScript dependency license information is generated into the packaged notices directory at build time.
