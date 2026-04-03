'use client';

import { useEffect, useRef } from 'react';

export default function ApiDocsPage() {
  const containerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    // Load Swagger UI JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      if (window.SwaggerUIBundle && containerRef.current) {
        window.SwaggerUIBundle({
          url: '/api/docs',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">API Documentation</h1>
        <div id="swagger-ui" ref={containerRef} />
      </div>
    </div>
  );
}
