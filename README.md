PPI UPM Dashboard
A web dashboard for managing, tracking, and analyzing student organization programs (proker) at PPI UPM. Built with React, TypeScript, Vite, and Tailwind CSS.

Features
Dashboard Overview: Quick summary of all prokers and divisions.
Proker Management: Create, edit, complete, and delete prokers.
Proker Analytics: Multi-criteria rating, engagement metrics, promotion tracking, and visual analytics.
Division View: See prokers grouped by division.
Promotion Tracking: Manual input for views, platforms, and groups shared.
Engagement Metrics: Attendance rate, feedback/satisfaction, social media reach.
Rating System: Score prokers on planning, execution, impact, creativity, teamwork.
Data Storage: Local storage for analytics and proker data; Supabase integration ready.
Responsive UI: Works on desktop and mobile.
Getting Started
1. Install dependencies
2. Run the development server
Open http://localhost:5173 in your browser.

Folder Structure
Supabase Integration
Configure Supabase in src/integrations/supabase/client.ts.
Run SQL migrations in supabase/migrations/ for analytics columns.
Customization
Logo: Replace public/logo.png with your organization’s logo.
Site Name: Update in index.html and src/App.tsx.
Deployment
Static Hosting: Deploy to Vercel, Netlify, or GitHub Pages.
Backend: Supabase required for persistent storage.
License
MIT

Credits
Developed for Persatuan Pelajar Indonesia UPM (PPI UPM).
Logo © PPI Malaysia.

Contact
For questions or contributions, open an issue or contact the maintainer.

Enjoy using PPI UPM Dashboard!

