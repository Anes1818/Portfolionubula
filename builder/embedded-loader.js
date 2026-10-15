/* HTTP uses individual cacheable artwork. Keep the self-contained file:// export fallback. */
window.NEBULA_EMBED_READY = location.protocol === 'file:'
  ? new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets-bundle.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Offline artwork bundle could not load.'));
      document.head.append(script);
    })
  : Promise.resolve();
