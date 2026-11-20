# Note-taking portrait

Created with the built-in image-generation tool as an identity-preserving edit of the supplied portrait. This is an AI-edited variation for the hero interaction.

- Source: `public/assets/hero/mihail-portrait.jpg`
- Final project asset: `public/assets/hero/mihail-taking-notes-v2.png`
- Format: 1254 × 1254 PNG, opaque background.
- The source photograph remains the default hero portrait. All three photographs share the existing circle, with local mesh interpolation between poses.

## Initial variation prompt

Use case: identity-preserve. Edit target: the supplied photograph of Mihail Boboc. Create ONE photorealistic alternate portrait for the 102px circular avatar in his personal portfolio. Preserve the exact man's identity: facial proportions, age, short dark hair, beard/stubble, skin tone, and gray crew-neck clothing. Preserve the source photo's subdued cool gray/green-gray color treatment, soft natural lighting, quiet plain background, natural skin texture, and understated photographic style. Change his pose and expression only: he is attentively taking notes, holding a real pen poised on a small notebook, with a warm, subtle closed-mouth smile and a friendly listening expression. Face remains clearly recognizable and mostly directed toward the viewer, with only a slight downward glance toward his notes. Compose a square image designed for a small circular crop: keep his whole head in the upper central portion, his visible pen-holding hand and the notebook in the lower central portion, all essential details within the circle. Keep the composition close and intimate, without a desk scene or extra background objects. The pen and hand must remain legible at small size. One anatomically correct pen-holding hand, a natural supporting hand, no extra fingers or duplicate pens. No illustration, no stylization, no exaggerated grin, no new accessories, no text, logo, watermark, border, collage, or UI. This is the same person and photographic color style as the supplied portrait, now listening and taking notes.

## Current revision

Generated with the built-in image-generation tool as a targeted edit of `public/assets/hero/mihail-taking-notes.png`. Saved in the project as `public/assets/hero/mihail-taking-notes-v2.png`.

### Final revision prompt

Use case: identity-preserve. Edit the supplied note-taking portrait of Mihail Boboc. Make one precise change: he must be looking DOWN INTO THE NOTEBOOK while actively writing with the pen, rather than looking at the camera. His head and chin tilt naturally downward toward the page, and both eyes visibly follow the pen tip and notebook. No eye contact with the viewer. Retain a subtle, friendly, relaxed expression. Preserve his exact identity, age, face proportions, short hair, beard, skin texture, gray crew-neck shirt, existing jewelry, gray-green background, muted cool color grading, soft lighting, square framing, notebook and hand positions, and pen. Keep the pen tip in contact with the page as if making notes. Keep the face, pen-holding hand, and notebook clearly readable within a small circular avatar crop. Photorealistic continuation of the exact same image, not an illustration or new scene. No added text, objects, logos, watermarks, borders, or extra fingers. Change only the gaze and the natural head tilt needed to look into the notebook.

## Current interaction mapping

Both generated versions are now used: `mihail-taking-notes.png` faces the camera when the engaged editor is empty; `mihail-taking-notes-v2.png` looks at the notebook when the message contains text. The original profile photo remains the idle introduction. These assets and the prompts above are unchanged by the interaction update.

## Motion rendering

The current transition interpolates a shared facial mesh across the original photograph and both generated portraits. The original texture reproduces the established CSS crop, and separate landmark grids align each face. A continuous three-pose response creates intermediate frames locally in a small canvas. No additional image generation was used for this motion refinement. The exact source prompts above remain unchanged.

## Detailed notebook-glance sequence

The camera-facing → downward-looking portion now uses **61 precomputed optical-flow frames**, replacing the coarse facial mesh for that movement. The frames were produced locally from the same two PNGs with Apple VideoToolbox's quality-prioritized frame interpolation at 1024px. No generative service or paid account was used. This remains interpolated photography, not a recorded performance.

The 61 frames are packed into an 8×8 WebP atlas, with 256px tiles, at `public/assets/hero/mihail-gaze-sequence.webp` (approximately 504 KiB). The existing continuous motion position selects adjacent frames; clearing or resetting reverses from the current position rather than restarting playback. The browser only draws the local atlas, and reduced motion goes directly to an endpoint. The older mesh remains for the original-photo → engaged-photo transition and as an atlas-load fallback.

`scripts/render-portrait-motion.m` is the optional macOS/Apple Silicon authoring helper. It is not called by the website build. Compile with clang and the AppKit, VideoToolbox, CoreImage, CoreMedia, CoreVideo, and ImageIO frameworks, then pass the listening PNG, writing PNG, and a temporary output directory. Pack the numbered output with ffmpeg using `scale=256:256:flags=lanczos,tile=8x8`, one WebP frame, quality 90. The included atlas makes regeneration unnecessary for deployment.
