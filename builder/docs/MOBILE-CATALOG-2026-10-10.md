# Mobile catalog navigation — 10 October 2026

- The collection grid uses two equal columns up to 820px, with compact card text and 44px minimum action buttons. Desktop keeps three columns.
- The header button reads **Catalog** while editing and **My bouquet** while browsing. Browsing does not replace the current design; selecting a recipe still uses the existing template and Undo behavior.
- Returning to the catalog scrolls to its heading and moves keyboard focus there. The gallery header stays visible while scrolling. The same controls work in Spanish.
- CSS and script cache versions are now `20261010a`.

Verified locally: all 27 existing collection-preview checks passed. Additional browser checks covered two-column layout and horizontal overflow at 320, 390, 430 and 768px in English and Spanish, a round trip preserving the exact bouquet state, and selecting another recipe through the top catalog button. No deployment performed.
