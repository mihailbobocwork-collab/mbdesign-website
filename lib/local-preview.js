import {googleConfigured} from './google-calendar.js';
// Only the loopback development server calls this. Built HTML stays unchanged.
export function localPreviewHTML(html,env){
 if(googleConfigured(env))return html;
 return html.replace(/<body\b([^>]*)>/,'<body$1 data-local-booking-preview="true">');
}
