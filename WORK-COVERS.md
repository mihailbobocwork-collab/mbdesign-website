# Supplied homepage covers

Source: Mihai’s Figma file, frame `46:4947` (`3chviwyGZ43nLoMaufQbhl`). These are supplied cover assets, not generated substitute artwork. Source order is preserved in `content/home-work.json`.

| Cover | Source node | Implementation |
| --- | --- | --- |
| Lendit product | 46:4888 | Original composed PNG export, 912 × 622 including phone/shadow bounds |
| 7code identity | 46:4736 | Original transparent SVG; unchanged root 621.209 × 224.032 |
| Lendit identity | 46:4886 | Original transparent SVG; unchanged root 647.761 × 114.44 |
| WholeSum product | 46:4739 | Original device vectors and screen assets assembled from design context |
| Angen AI product | 46:4813 | Original device vectors and screen assets assembled from design context |

All five sit on the existing white square cards. Product artwork occupies 94% of its artwork slot; identities use 70%. The entire composition is contained, preserving the white margin, devices, shadows, logos and screens. One existing placeholder card remains in the sixth position. Both Lendit covers link to the existing Lendit case-study route. Existing case-study text and case-study images remain unchanged and marked as drafts.

Some default composite PNG exports contained the Figma canvas’s dark backdrop. The logos therefore use their original transparent vector sources. WholeSum and Angen AI are composed from their original SVG/PNG layers in `scripts/templates/covers/`, using the design’s relative positions and a scaled 889.653 × 576 coordinate space. SVG source files and their root dimensions are unchanged. No screenshots, redraws, AI edits or background-removal filters are used in the implementation. All runtime references are local under `public/assets/work/covers/`; temporary download URLs are not retained.

Edit cover order, labels, links, descriptions and artwork using **Homepage work covers** in the Git-backed CMS. For the supplied WholeSum/Angen AI artwork, retain the named laptop Cover type. To replace it with an uploaded image, select Uploaded artwork and choose the new image. The project collection is separate from this homepage cover list.

Browser verification: all five white backgrounds, every image loaded, complete artwork within each slot, valid links, and no horizontal overflow at 1440px and 390px. Captured desktop rows and phone layout are in `preview/mb-white-work-covers-*.jpg`.
