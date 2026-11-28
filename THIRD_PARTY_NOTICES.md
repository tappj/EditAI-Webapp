# Third-party notices

The root [LICENSE](LICENSE) applies to EditAI-authored code. It does not
relicense FFmpeg, its codecs, bundled fonts, vendored code or other third-party
components. Those components retain their respective copyright notices and
license terms. In particular, distributing FFmpeg binaries requires the
applicable GPL notices and corresponding source; the MIT license for EditAI
is not a substitute for those obligations.

## Browser FFmpeg WebAssembly core

- Component: `@ffmpeg/core` **0.12.10**, from the ffmpeg.wasm project.
- License: **GNU General Public License, version 2 or later
  (GPL-2.0-or-later)**, as declared by the distributed core package.
- Copyright: the FFmpeg developers and contributors, ffmpeg.wasm contributors,
  and the copyright holders identified in the included codec/library sources.
- Full license: [LICENSES/GPL-2.0-or-later.txt](LICENSES/GPL-2.0-or-later.txt),
  also shipped as [public/ffmpeg/COPYING.GPLv2](public/ffmpeg/COPYING.GPLv2).
- The existing [browser notice](public/ffmpeg/NOTICE.txt) accompanies the core.
- Source and build recipes: <https://github.com/ffmpegwasm/ffmpeg.wasm>.
  The exact distributed package is `@ffmpeg/core@0.12.10`; retain its
  upstream build inputs and third-party source notices when redistributing.
- Upstream FFmpeg source and licensing: <https://github.com/FFmpeg/FFmpeg>
  and <https://ffmpeg.org/legal.html>.

The browser core is distributed as `public/ffmpeg/ffmpeg-core.js` and two
WebAssembly byte chunks, `core-part-1.bin` and `core-part-2.bin`. Concatenating
the chunks reconstructs the original core binary; splitting it for the
hosting asset-size limit does not change its license. FFmpeg and its
third-party codecs are not EditAI-authored MIT code.

## Browser JavaScript wrapper

`@ffmpeg/ffmpeg` **0.12.15** and `@ffmpeg/util` **0.12.x** are MIT-licensed
JavaScript packages, separate from the GPL WebAssembly core. Their upstream
copyright and permission notices remain applicable. The distributed wrapper
notice is preserved in [public/ffmpeg/NOTICE.txt](public/ffmpeg/NOTICE.txt).
Source: <https://github.com/ffmpegwasm/ffmpeg.wasm>.

## Desktop FFmpeg / FFprobe and x264

The signed macOS **v0.2.1** release invokes separate FFmpeg and FFprobe **9.0.2**
executables built with `--enable-gpl --enable-version3` and static x264
commit `0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee`.

- The combined native binaries report **GPL-3.0-or-later**. The x264 source
  retains its own upstream notices; the combined FFmpeg distribution uses
  GPL version 3 or later.
- Full GPLv3 license: [LICENSES/GPL-3.0-or-later.txt](LICENSES/GPL-3.0-or-later.txt).
- Copyright: the FFmpeg developers, x264 developers and the copyright holders
  identified in their respective source distributions.
- The installed app includes `notices/FFmpeg-LICENSE.txt`,
  `notices/FFmpeg-README.txt` and native build provenance. The build script also
  copies this root notice and EditAI's MIT license into future app packages.
- Complete matching source, pinned inputs and executable build recipe for the
  v0.2.1 binaries are distributed **alongside the installers**:
  [EditAI-0.2.1-native-corresponding-source.tar.xz](https://github.com/tappj/EditAI-Webapp/releases/download/v0.2.1/EditAI-0.2.1-native-corresponding-source.tar.xz).
- Source build instructions: [scripts/build-native-macos.sh](scripts/build-native-macos.sh).
  See also [desktop/THIRD-PARTY.md](desktop/THIRD-PARTY.md).
- Release: <https://github.com/tappj/EditAI-Webapp/releases/tag/v0.2.1>.

Source/CI preview builds may instead use `ffmpeg-static` **5.3.0**, which
packages FFmpeg **6.1.1** from release `b6.1.1`. That package is
GPL-3.0-or-later and is not the verified public v0.2.1 native build. Its
upstream license/build/source information is at
<https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1> and
<https://github.com/eugeneware/ffmpeg-static>. Do not substitute a preview
binary into a signed release without its matching source and verification.

## Electron and Chromium

Electron is MIT-licensed; its own `LICENSE` and `LICENSES.chromium.html`
accompany the packaged runtime. Chromium's components retain their individual
licenses. Electron source: <https://github.com/electron/electron>. The desktop
build additionally generates `notices/DEPENDENCY-LICENSES.txt` with installed
production JavaScript dependency metadata and license notices.

## Fonts and other dependencies

Font-specific license files are retained alongside the font files in
[public/fonts](public/fonts). Vendored UI and build integration licenses are
retained in [vendor](vendor) and [scripts/vite](scripts/vite). Package metadata
and lockfiles identify the exact JavaScript dependencies; their upstream
licenses and notices continue to apply.

FFmpeg is a trademark of Fabrice Bellard. This notice does not imply an
endorsement of EditAI by FFmpeg, ffmpeg.wasm, Electron or their contributors.


### TikTok Sans variable font (November 22, 2026)

`public/fonts/TikTokSans-Variable.ttf` is the unmodified official Google Fonts
release of TikTok Sans, designed by TikTok and Grilli Type. Source:
https://github.com/google/fonts/tree/main/ofl/tiktoksans . Licensed under SIL
Open Font License 1.1; license is bundled at `public/fonts/tiktoksans-OFL.txt`.
SHA-256: `0e7f0a3e924c9a86478fc6fc2946de2e4ab8fc704ed72ee40434ade94bb9b0c6`.
The file contains weight 300–900, width 75–150, optical size 12–36 and slant
−6–0 axes. Normal width is 100; the font's default optical size is 36.

Research references: [TikTok's introduction](https://newsroom.tiktok.com/introducing-tiktok-sans?lang=en),
[Google Fonts specimen](https://fonts.google.com/specimen/TikTok+Sans), and
[official metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/tiktoksans/METADATA.pb).
The newsroom article was accessible. EditAI's Medium weight and subtle shadow
are interface choices, not a claim about a universal TikTok caption preset.
The text palette, wheel and sampler are independently implemented using the
owner's screenshots and [CapCut's picker description](https://www.capcut.com/tools/color-picker);
no CapCut code or assets are bundled.

Local speech detection bundles @ricky0123/vad-web 0.0.31 (ISC), ONNX Runtime Web
1.31.1 (MIT) and the packaged Silero VAD legacy model (MIT). These components run
on device and do not upload audio. License texts are in LICENSES/vad-web-ISC.txt,
LICENSES/ONNX-Runtime-MIT.txt and LICENSES/Silero-VAD-MIT.txt. Upstream sources:
https://github.com/ricky0123/vad, https://github.com/microsoft/onnxruntime,
https://github.com/snakers4/silero-vad. This detector identifies speech activity,
not medical conditions or a guaranteed sound-event label.

Local reference text measurement uses Tesseract.js 7.0.0 and Tesseract.js-core
7.0.0 (Apache-2.0), plus @tesseract.js-data/eng 1.0.0 (MIT package metadata;
Tesseract language training data is distributed under Apache-2.0 upstream).
Only the English LSTM asset is bundled; unsupported scripts retain visual-model
matching. Text recognition runs locally when a reference is attached. Source:
https://github.com/naptha/tesseract.js, https://github.com/naptha/tesseract.js-core,
https://github.com/naptha/tessdata. Apache license: LICENSES/Tesseract-Apache-2.0.txt.

## Local language detection

Automatic interface language detection uses franc-min 6.2.0 (Titus Wormer),
trigram-utils 2.0.1, n-gram 2.0.2 and collapse-white-space 2.1.0 under the MIT
license. Detection runs locally on existing text. Their copyright and permission
notices are retained in LICENSES/franc-MIT.txt, LICENSES/trigram-utils-MIT.txt,
LICENSES/n-gram-MIT.txt and LICENSES/collapse-white-space-MIT.txt and included in
desktop distributions. Source: https://github.com/wooorm/franc.
