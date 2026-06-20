import { defineWidgetConfig } from "@medusajs/admin-sdk";

const LoginOverrideWidget = () => {
  return (
    <div className="login-override" style={{ display: "none" }}>
      <style>{`
        /* Hide Medusa logo on login page */
        div.flex.w-full.items-center.justify-center.mb-8 > svg {
          display: none !important;
        }
        /* Replace Medusa logo area with custom text or logo if needed */
        div.flex.w-full.items-center.justify-center.mb-8::after {
          content: "Property Dealer Admin";
          font-size: 24px;
          font-weight: bold;
          color: white;
          text-align: center;
          display: block;
        }

        /* Attempt to hide "Medusa" text in the bottom right corner of admin if it exists */
        .admin-footer, .medusa-watermark, span:contains("Medusa") {
           /* Note: generic CSS contains is not standard, we will just use JS for robust text replacement */
        }
      `}</style>
      <script dangerouslySetInnerHTML={{
        __html: `
          setTimeout(() => {
            const walkDOM = (node) => {
              if (node.nodeType === 3) {
                if (node.nodeValue.includes('Medusa')) {
                  node.nodeValue = node.nodeValue.replace(/Medusa/g, 'Property Dealer');
                }
              } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
                for (let i = 0; i < node.childNodes.length; i++) {
                  walkDOM(node.childNodes[i]);
                }
              }
            };
            walkDOM(document.body);
            // Setup a mutation observer to catch dynamically rendered "Medusa" text
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  walkDOM(node);
                });
              });
            });
            observer.observe(document.body, { childList: true, subtree: true });
          }, 100);
        `
      }} />
    </div>
  );
};

export const config = defineWidgetConfig({
  zone: "login.before",
});

export default LoginOverrideWidget;
