# Original portfolio project pages

Imported on 20 November 2026 from Mihai’s current website, using the original public stories and artwork. The shared website header, Excon Variable typography and footer remain in place. The homepage cover artwork and ordering are unchanged; the Lendit identity cover now opens its own branding project.

| Project | Local route | Original source | Images |
| --- | --- | --- | ---: |
| Lendit product | `/work/lendit/` | https://mihailboboc.com/p/lendit-case-study | 24 |
| Lendit A5 flyers | `/work/lendit-flyers/` | https://mihailboboc.com/p/21a999fd | 4 |
| Angen AI | `/work/angen-ai/` | https://mihailboboc.com/p/angenai | 29 |
| Lendit event gazebo | `/work/lendit-gazebo/` | https://mihailboboc.com/p/f7fcb9e5 | 8 |
| WholeSum | `/work/wholesum/` | https://mihailboboc.com/p/wholesum | 16 |
| Lendit brand identity | `/work/lendit-branding/` | https://mihailboboc.com/p/branding-kit-lendit | 7 |
| 7code brand identity | `/work/7code/` | https://mihailboboc.com/p/brand-guidelines-7code | 8 |
| 7code Tech website | `/work/7code-tech/` | https://mihailboboc.com/p/2d54480d | Shared on request |

The source portfolio presents 7code Tech behind a password. Per Mihai’s instruction, the new website offers a friendly request page rather than importing or exposing its private content. “Request this case study” opens the existing contact page, explains the request and prefills an editable message. The draft is scoped to that project, preserving any general inquiry draft. Nothing is sent by the link. The visitor can choose a meeting or message, review, and confirm using the existing flow. The local preview remains explicitly simulated until Google delivery is connected.

## Content and media

- `content/projects/*.json` contains each story’s original section order, text, image sequences, column spans, gallery groups and prototype links. Published project text replaces the former illustrative copy. Original findings and dates are retained as authored, without adding performance claims.
- `content/project-sources.json` records the source page, source media URL, local original file, dimensions, bytes and responsive previews. There are 96 original images, all downloaded locally. No expiring media URLs are required at runtime.
- Original images in `public/assets/projects/` are unchanged. WebP previews at up to 640, 1280 and 1920 pixels reduce initial transfer. Images reserve their dimensions, load lazily after the first artwork, and open the original local file when enlarged.
- Original device-framed screen groups are presented using simple responsive frames around the original screens. Galleries stack on phones. Decorative device frames are recreated in CSS; original project artwork is retained.
- Angen AI’s two Figma prototypes remain available in expandable sections, with a separate link to open each prototype. Their availability is controlled by the original Figma file’s sharing settings.
- `scripts/case-study.mjs` renders reusable story sections. Basic rich-text formatting is allowlisted; unsupported markup is escaped, image paths are local, and prototype embeds are limited to Figma.
- In Decap CMS, **Projects** offers text, image and prototype blocks grouped into columns and sections. Edit text with basic paragraph/heading/list formatting, images with alt text and dimensions, and categories/order. If replacing an original image, its old previews are automatically ignored. Regenerate previews for the replacement when preparing publication.

The Work collection now groups Product Design, Graphic Design and Brand Design. Services match Mihai’s supplied list: UI/UX and Design Engineering; Creative Design, Print Design and Social Media; Logo Design, Icon Design and Logo Reveal Design.

## Preview and deployment

Run `npm run build` and `npm run dev`, then open `http://127.0.0.1:4173/work/`. The source ZIP excludes generated `dist/`; building recreates it. Cloudflare Pages continues to use `npm run build` with output directory `dist`. CMS authentication and private Google delivery setup remain documented in README.md and GOOGLE-SETUP.md. No production deployment or authentication change was made for this import.

## Lendit presentation update

Lendit now uses a focused seven-chapter presentation at `/work/lendit/`. Ordinary downward page scrolling drives the horizontal story, and upward scrolling reverses it. Native scroll snapping settles each chapter; no wheel events are intercepted. Longer chapter content scrolls within its reading area before scrolling continues through the story. Previous/Continue, chapter links, keyboard arrow keys and touch gestures provide alternative controls. Chapter URLs can be shared directly, such as `/work/lendit/#experience`.

`content/lendit-story.json` contains the new narrative and references the original project’s 24 artworks and research notes. The CMS exposes **Lendit chapter story** for copy and gallery edits. The presentation explains design decisions without inventing research participants or commercial outcomes. Validation distinguishes the original internal stakeholder review from future user testing. Original notes remain available within each chapter. Static screenshots currently demonstrate the experiences; animated prototype recordings can replace or supplement the relevant media groups when supplied. No fake video or simulated product interaction was added.

Selecting artwork opens its original file in an accessible detail dialog, with keyboard Escape/Close and focus restoration. Reduced motion replaces continuous sideways travel with immediate chapter changes. Without the chapter module, the story remains a readable vertical sequence. The shared Excon typography, background, logo and contact-button treatment are retained.

The separate Work collection and homepage subtitle have been removed. `/work` and `/work/` temporarily redirect to `/#work` in the preview server and Cloudflare Pages. Existing case-study return links now point there. Additional print/private-project links remain reachable underneath the unchanged homepage covers. A floating circular Back to top button appears after scrolling throughout the website and returns Lendit to its opening chapter.


## Restored original vertical case studies

At Mihai’s request, Lendit again uses the original imported story, artwork sequence and vertical case-study layout, with shared navigation and footer. The horizontal chapter experiment is archived under experiments/lendit-horizontal and is not loaded or shown in the CMS. Other project pages retain their original imported layouts. The floating circular Back to top button, removed homepage subtitle, and homepage Work destination remain in place.

## iPhone mockups and process timelines

Mobile screenshots now sit inside CSS-built iPhone mockups with a metal bezel, camera island, side controls and home indicator. All ten Lendit mobile screens use the treatment. The original screen files and enlargement links remain unchanged.

Cases with process chapters use a connected, numbered timeline overview and a continuous vertical chapter rail. The overview appears in a bottom dock while reading the process, highlights the current stage and links to the original section anchors. It scrolls sideways within its own strip on narrow screens. On phones, each mobile experience introduces its text before its mockup. Original stories and artwork order remain in the content files; the page continues to scroll vertically.


## Roomier sections and bottom process dock

Section gaps are increased to 104px outside the process and 88px within it on desktop, with 64px/60px spacing on phones and larger gaps between stages. The borderless timeline now floats at the bottom while the process is in view and clears before the footer. It stays separate from Back to top and retains original chapter anchors and active-stage highlighting.
