const paths = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
  shop: '<path d="M3 10h18M4 10v11h16V10M3 10l2-7h14l2 7M9 21v-7h6v7"/>',
  flower:
    '<circle cx="12" cy="12" r="3"/><path d="M9 9C1 3 12-1 12 6c0-7 11-3 3 3 8-6 12 5 5 5 7 0 3 11-3 3 6 8-5 12-5 5 0 7-11 3-3-3-8 6-12-5-5-5-7 0-3-11 5-5Z"/>',
  bouquet:
    '<path d="m5 12 7 9 7-9-7 3-7-3Zm7 3V5m0 5L6 5m6 5 6-5"/><circle cx="5" cy="4" r="2"/><circle cx="12" cy="3" r="2"/><circle cx="19" cy="4" r="2"/>',
  gift: '<path d="M4 10h16v11H4zM2 6h20v4H2zM12 6v15"/><path d="M12 6C3 6 6-3 12 6c6-9 9 0 0 0Z"/>',
  orders:
    '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 11h6m-6 4h6m-6 4h4"/>',
  square:
    '<rect x="3" y="3" width="18" height="18" rx="4" stroke-width="3"/><rect x="8" y="8" width="8" height="8" rx="1" stroke-width="2.5"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="var(--surface,#fffefa)"/><circle cx="16" cy="17" r="3" fill="var(--surface,#fffefa)"/>',
  plan: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20m-16 5h4"/>',
  message:
    '<path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z"/><path d="M8 9h8m-8 4h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  link: '<path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1"/>',
};
export const icon = (name, className = "ui-icon") =>
  `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.flower}</svg>`;
