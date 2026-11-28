# Reference text and pacing

Reference attachments are prepared locally. Adding one does not send media to a
provider. Sending the chat message shares bounded JPEG detail frames, ordered
motion strips and numeric measurements through the account's selected AI provider,
under the existing consent gate. Reference audio is decoded locally where the
browser supports its container; it is not transcribed or uploaded by this feature.
The target video's own transcription follows the existing consent/job/cache flow.

## Matching contract

Text matching prioritizes available font glyph shapes and genuine weight, font
size relative to canvas width, line grouping, alignment, normalized box center,
fill/stroke, background opacity/padding/radius, shadow and supported animations.
High-detail vision input replaces the former low-detail four-frame input. Creator
text is distinguished from platform navigation, handles, descriptions and counts.
Speech captions use the target's verbatim source words, never the reference's
words. An explicit text-only prompt preserves pacing and unrelated manual titles.

Video references use at most 900 low-resolution samples spanning their full
length (up to 30 minutes), eight evenly spaced detail frames plus up to two scene
frames, and eight six-tile motion strips. Dense strips sample at 30Hz around six
regular positions and two changes in motion activity. Near-identical transitions
are counted separately. At most 18 JPEGs and 1.5MB of base64 image data fit the
existing 2MB authenticated request limit. Sample times/roles accompany the images.
Long references have coarser scans; this is not continuous full-frame analysis.

Frame differences identify candidate boundaries, not proven editorial cuts.
Low-energy audio windows are not speech detection and music can hide pauses.
Local audio decoding is limited to three minutes to bound decoded memory;
unavailable/long audio leaves visual timing usable. Target word timings are
prepared/reused before video-reference planning, so tight cuts preserve complete
words and relaxed cuts can restore recorded padding. Pacing follows target speech,
not copied reference timestamps or an imposed reference duration.

The `speedRange` operation takes an existing primary UUID, source start/end and
rate .25–4. It resolves its own split IDs atomically, preserves outside rates and
source coverage, and reanchors captions. Multiple ranges on one original clip run
latest first; each piece must retain at least .1 source seconds. This supports
short repeated slow/fast emphasis without guessed new UUIDs. These are piecewise
constant speeds, not optical-flow interpolation or continuous speed ramps.
A baked reference cannot establish exact original speed; estimated matches must
be described as estimates. Music/low motion alone never proves a slowdown.

## Social text placement research

[TikTok's official in-feed guidance](https://ads.tiktok.com/resources/help/article/tiktok-auction-in-feed-ads?lang=en)
was read on November 22, 2026. It explicitly varies safe zones by aspect ratio,
caption length, anchors and device, and distinguishes preview from live display.
Its linked [standard LTR template](https://lf-tt4b.tiktokcdn.com/obj/i18nblog/tt4b_cms/en-US/5jqet0ab9qci-10e7f5Vig4uhAscNP8XPB0.zip)
was downloaded and visually inspected. The 720×1280 template's safe polygon is
(80,160), (640,160), (640,560), (520,560), (520,840), (80,840).
This is an ad placement template, not a universal organic-video guarantee.

Meta's [Reels guidance](https://www.facebook.com/business/help/980593475366490)
and Ads Guide redirected to login/temporary blocking. Their commonly repeated
numeric insets were not independently verified from Meta and are not presented
as official requirements. The owner's TikTok/Reels screenshots show variable
bottom descriptions and a substantial right control rail.

Reference matching preserves each measured title/caption position independently.
Frame-edge padding (x=.05–.95, y=.07–.88) prevents off-screen text; it is not a
platform ad-safe rectangle. Generic ad insets must not shrink/recenter a requested
reference match. Styles, including dark outlines, apply directly when adding a
new title. Generated speech captions are sequential and use Auto captions rows;
manual/persistent titles use Text. Matching rules stay internal. Assistant replies
are brief conversational bubbles; no diagnostic controls are shown.

## Supplied dramatic slowdown example

The owner's Spotify example is 48.937375 seconds, 720×1280, 30fps. Local FFmpeg
inspection found brief repeated-frame groups around 3.4–4.55 and 14.6–16.47s,
a fast montage around 16.5–26s, and white heavy sans single-word captions around
(x=.5,y=.742). Those captions need moving upward for the conservative safe area.
Neither visual inspection nor frame repetition establishes the original exact
speed ratio or exact font identity.

The actual browser preparation implementation processed this example in 21.91s:
10 detail frames, eight motion strips, 12 scene-change candidates, measured audio,
1,201,356 base64 image bytes. Its motion strip near 15.942s contained two repeated
transitions, corroborating the locally inspected slowdown; another near 4.078s
contained one. These are actual local measurements, not provider inference or a
claim of an exact one-to-one generated edit. Ignored research/sample reports live
under outputs/reference-research and outputs/reference-user-sample.json.
