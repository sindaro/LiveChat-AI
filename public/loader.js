(function() {
  // AI Bouncer Widget Loader
  // Usage: <script src="https://your-domain.com/loader.js" data-business-id="YOUR_BUSINESS_ID"></script>

  const script = document.currentScript;
  const businessId = script.getAttribute('data-business-id');
  
  if (!businessId) {
    console.error('AI Bouncer: data-business-id is missing from the script tag.');
    return;
  }

  const baseUrl = new URL(script.src).origin;
  const widgetUrl = `${baseUrl}/widget/${businessId}`;

  // Create Iframe
  const iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '400px';
  iframe.style.height = '650px';
  iframe.style.maxHeight = '90vh';
  iframe.style.maxWidth = 'calc(100vw - 40px)';
  iframe.style.border = 'none';
  iframe.style.zIndex = '999999';
  iframe.style.borderRadius = '24px';
  iframe.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
  iframe.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
  iframe.allowTransparency = 'true';
  iframe.id = 'ai-bouncer-widget';

  // Responsive handling
  const checkMobile = () => {
    if (window.innerWidth < 640) {
      iframe.style.width = 'calc(100vw - 40px)';
      iframe.style.height = '80vh';
      iframe.style.bottom = '10px';
      iframe.style.right = '20px';
    } else {
      iframe.style.width = '400px';
      iframe.style.height = '650px';
      iframe.style.bottom = '20px';
      iframe.style.right = '20px';
    }
  };

  window.addEventListener('resize', checkMobile);
  checkMobile();

  // Listen for messages from the widget (e.g. to resize or close)
  window.addEventListener('message', (event) => {
    if (event.origin !== baseUrl) return;
    
    if (event.data.type === 'ai-bouncer-resize') {
       iframe.style.height = event.data.height;
    }
  });

  document.body.appendChild(iframe);
})();
