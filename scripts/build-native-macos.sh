#!/bin/sh
# Run from repo root, or from an extracted corresponding-source archive.
# No Homebrew libraries are linked into the result. pkg-config is a build tool.
set -eu
TASK_ROOT=$(pwd)
TASK_SOURCE_ROOT=${EDITAI_NATIVE_SOURCES:-"$TASK_ROOT/work/native-sources"}
TASK_PREFIX="$TASK_SOURCE_ROOT/prefix"
TASK_JOBS=$(sysctl -n hw.logicalcpu)
mkdir -p "$TASK_SOURCE_ROOT"
if [ ! -f "$TASK_SOURCE_ROOT/ffmpeg-9.0.2/configure" ]; then
  if [ ! -f "$TASK_SOURCE_ROOT/ffmpeg-9.0.2.tar.xz" ]; then
    curl -fsSL https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz -o "$TASK_SOURCE_ROOT/ffmpeg-9.0.2.tar.xz"
  fi
  printf '%s  %s\n' 8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e "$TASK_SOURCE_ROOT/ffmpeg-9.0.2.tar.xz" | shasum -a 256 -c -
  tar -xf "$TASK_SOURCE_ROOT/ffmpeg-9.0.2.tar.xz" -C "$TASK_SOURCE_ROOT"
fi
if [ ! -d "$TASK_SOURCE_ROOT/x264" ] && [ -f "$TASK_SOURCE_ROOT/x264-source.tar" ]; then
  mkdir -p "$TASK_SOURCE_ROOT/x264"
  tar -xf "$TASK_SOURCE_ROOT/x264-source.tar" -C "$TASK_SOURCE_ROOT/x264"
  printf '%s\n' 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee > "$TASK_SOURCE_ROOT/x264/SOURCE-COMMIT"
fi
if [ ! -d "$TASK_SOURCE_ROOT/x264" ]; then
  git init "$TASK_SOURCE_ROOT/x264"
  git -C "$TASK_SOURCE_ROOT/x264" remote add origin https://code.videolan.org/videolan/x264.git
  git -C "$TASK_SOURCE_ROOT/x264" fetch --depth 1 origin 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee
  git -C "$TASK_SOURCE_ROOT/x264" checkout --detach FETCH_HEAD
fi
if [ -d "$TASK_SOURCE_ROOT/x264/.git" ]; then
  [ "$(git -C "$TASK_SOURCE_ROOT/x264" rev-parse HEAD)" = 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee ]
else
  [ "$(cat "$TASK_SOURCE_ROOT/x264/SOURCE-COMMIT")" = 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee ]
fi
(
  cd "$TASK_SOURCE_ROOT/x264"
  ./configure --prefix="$TASK_PREFIX" --enable-static --disable-cli --disable-opencl
  make -j "$TASK_JOBS"
  make install
)
(
  cd "$TASK_SOURCE_ROOT/ffmpeg-9.0.2"
  PKG_CONFIG_PATH="$TASK_PREFIX/lib/pkgconfig" ./configure --prefix="$TASK_PREFIX" --disable-autodetect --disable-shared --enable-static --enable-gpl --enable-version3 --enable-videotoolbox --enable-audiotoolbox --enable-zlib --enable-libx264 --disable-doc --disable-debug --disable-network --disable-ffplay --extra-cflags="-I$TASK_PREFIX/include" --extra-ldflags="-L$TASK_PREFIX/lib" --pkg-config-flags=--static
  make -j "$TASK_JOBS"
  make install
)
mkdir -p "$TASK_ROOT/desktop/bin" "$TASK_ROOT/outputs"
cp "$TASK_PREFIX/bin/ffmpeg" "$TASK_ROOT/desktop/bin/ffmpeg"
cp "$TASK_PREFIX/bin/ffprobe" "$TASK_ROOT/desktop/bin/ffprobe"
cp "$TASK_SOURCE_ROOT/ffmpeg-9.0.2/COPYING.GPLv3" "$TASK_ROOT/desktop/bin/FFmpeg-LICENSE.txt"
printf '%s\n' 'EditAI native build: FFmpeg 9.0.2 + x264 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee. GPLv3. Source and build instructions accompany public releases.' > "$TASK_ROOT/desktop/bin/FFmpeg-README.txt"
# Exact source inputs and the executable build script, in the same layout as
# this checkout. No local Git credentials, environment, objects or build output.
TASK_ARCHIVE_ROOT=$(mktemp -d "$TASK_SOURCE_ROOT/source-package.XXXXXX")
mkdir -p "$TASK_ARCHIVE_ROOT/work/native-sources" "$TASK_ARCHIVE_ROOT/scripts"
cp "$TASK_SOURCE_ROOT/ffmpeg-9.0.2.tar.xz" "$TASK_ARCHIVE_ROOT/work/native-sources/ffmpeg-9.0.2.tar.xz"
if [ -d "$TASK_SOURCE_ROOT/x264/.git" ]; then
  git -C "$TASK_SOURCE_ROOT/x264" archive HEAD > "$TASK_SOURCE_ROOT/x264-source.tar"
fi
cp "$TASK_SOURCE_ROOT/x264-source.tar" "$TASK_ARCHIVE_ROOT/work/native-sources/x264-source.tar"
cp "$TASK_ROOT/scripts/build-native-macos.sh" "$TASK_ARCHIVE_ROOT/scripts/build-native-macos.sh"
printf '%s\n' 'FFmpeg 9.0.2 (upstream SHA-256 8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e)' 'x264 commit 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee. Both pristine source tarballs include their licenses.' 'From this directory: sh scripts/build-native-macos.sh' 'Build tools: Apple clang/Xcode Command Line Tools, make, pkg-config, tar. Only Apple system frameworks/libraries and bundled x264 are linked.' > "$TASK_ARCHIVE_ROOT/SOURCEINFO.txt"
tar -cJf "$TASK_ROOT/outputs/EditAI-0.2.0-native-corresponding-source.tar.xz" -C "$TASK_ARCHIVE_ROOT" scripts work SOURCEINFO.txt
rm -rf "$TASK_ARCHIVE_ROOT"
node --input-type=module <<'JS'
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile('desktop/bin/native-build.json',JSON.stringify({platform:process.platform+'-'+process.arch,ffmpegVersion:'9.0.2',x264Commit:'0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee',ffmpegSha256:await sha('desktop/bin/ffmpeg'),ffprobeSha256:await sha('desktop/bin/ffprobe'),sourceSha256:await sha('outputs/EditAI-0.2.0-native-corresponding-source.tar.xz')},null,2));
JS
