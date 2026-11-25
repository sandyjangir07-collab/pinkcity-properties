// The internal CRM (pinkcity-crm) is a separate Vite/React app on its own
// Vercel deployment — not a route inside this Next.js site. Centralized here
// so the URL only needs updating in one place if it moves to a custom domain.
export const CRM_URL = "https://team.pinkcityproperties.com";
export const CRM_LOGIN_URL = `${CRM_URL}/login`;
