// What the admin's Content tab can edit. Shared by the page (to draw the form) and the API (to
// check what is saved). Each section edits a few keys of one file in content/; anything not
// listed here stays exactly as it is in that file.
export const WEEKDAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']];

export const CONTENT_SECTIONS = [
  {
    id: 'home', label: 'Homepage', file: 'content/site.json',
    lede: 'The greeting and short biography on the first screen, and how people reach you.',
    fields: [
      {key: 'intro', label: 'Greeting', type: 'text', rows: 2, max: 80, required: true,
        hint: 'Typed out on the homepage. Press Return to start the second line.'},
      {key: 'heroBio', label: 'Short biography', type: 'text', rows: 3, max: 320, required: true,
        hint: 'Appears under the greeting when someone starts writing.'},
      {key: 'contactEmail', label: 'Contact email', type: 'email', required: true,
        hint: 'Shown in the footer. Meeting emails are set separately in Cloudflare.'},
      {key: 'linkedinUrl', label: 'LinkedIn', type: 'url', hint: 'Leave empty to hide the icon.'},
      {key: 'instagramUrl', label: 'Instagram', type: 'url', hint: 'Leave empty to hide the icon.'}
    ]
  },
  {
    id: 'about', label: 'About', file: 'content/site.json',
    lede: 'Your photo and story in the About section and the About panel.',
    fields: [
      {key: 'aboutPhoto', label: 'Photo', type: 'image', required: true,
        hint: 'Shown as a square, cropped from the centre. JPG, PNG or WebP; large photos are resized before upload.'},
      {key: 'aboutBody', label: 'Your story', type: 'text', rows: 14, max: 6000, required: true,
        hint: 'Leave an empty line between paragraphs.'}
    ]
  },
  {
    id: 'cases', label: 'Case studies', file: 'content/case-studies.json',
    lede: 'Words, cover and extra photos for each case study, and their order. The first four show on the homepage; the rest appear under “Show more work”.',
    fields: [
      {key: 'studies', label: 'Case studies', type: 'studies'}
    ]
  },
  {
    id: 'meetings', label: 'Meeting availability', file: 'content/booking.json',
    lede: 'When visitors can request a discovery call. Times already busy in Google Calendar are never offered.',
    fields: [
      {key: 'weekdays', label: 'Days', type: 'weekdays', required: true},
      {key: 'workingHours', label: 'Hours', type: 'hours', required: true,
        hint: 'Add a second block for a break, for example 10:00–12:00 and 14:00–17:00.'},
      {key: 'timeZone', label: 'Time zone', type: 'timezone', required: true},
      {key: 'durationMinutes', label: 'Call length', type: 'choice', unit: 'min', options: [15, 20, 30, 45, 60, 90]},
      {key: 'stepMinutes', label: 'Start times every', type: 'choice', unit: 'min', options: [15, 30, 60]},
      {key: 'bufferMinutes', label: 'Break between calls', type: 'number', unit: 'min', min: 0, max: 60},
      {key: 'noticeHours', label: 'Minimum notice', type: 'number', unit: 'hours', min: 1, max: 168},
      {key: 'horizonDays', label: 'Bookable ahead', type: 'number', unit: 'days', min: 1, max: 180},
      {key: 'blockedDates', label: 'Days off', type: 'dates',
        hint: 'Holidays or days you’re away. Nobody can request a call on these days.'}
    ]
  }
];

export const sectionById = id => CONTENT_SECTIONS.find(section => section.id === id);

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RANGE = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/;
export const IMAGE_PATH = /^\/assets\/(about|uploads)\/[a-z0-9_.-]+\.(jpe?g|png|webp)$/i;
// A photo chosen in the admin but not published yet travels as "upload:<token>"; the server swaps
// it for the uploaded file's path before checking again.
export const UPLOAD_TOKEN = /^upload:[a-z0-9]{8,40}$/;
const imageValue = value => IMAGE_PATH.test(value) || UPLOAD_TOKEN.test(value);

// Returns {values} cleaned to the stored shape, or {errors: {key: message}}.
export function checkSection(section, input) {
  const values = {}, errors = {};
  for (const field of section.fields) {
    const raw = input?.[field.key];
    const fail = message => { errors[field.key] = message; };
    switch (field.type) {
      case 'text': {
        const text = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
        if (field.required && !text) fail('This can’t be empty.');
        else if (text.length > field.max) fail(`Keep this under ${field.max} characters.`);
        values[field.key] = text;
        break;
      }
      case 'email': {
        const text = String(raw ?? '').trim();
        if (!EMAIL.test(text)) fail('Enter an email address.');
        values[field.key] = text;
        break;
      }
      case 'url': {
        const text = String(raw ?? '').trim();
        if (text) { try { if (new URL(text).protocol !== 'https:') throw 0; } catch { fail('Enter a full https:// link.'); } }
        values[field.key] = text;
        break;
      }
      case 'weekdays': {
        const days = [...new Set((Array.isArray(raw) ? raw : []).map(Number))].filter(day => Number.isInteger(day) && day >= 1 && day <= 7).sort();
        if (!days.length) fail('Choose at least one day.');
        values[field.key] = days;
        break;
      }
      case 'hours': {
        const ranges = String(raw ?? '').split(',').map(part => part.trim()).filter(Boolean);
        const parsed = ranges.map(range => {
          const match = range.match(RANGE);
          if (!match) return null;
          const [a, b, c, d] = match.slice(1).map(Number);
          return a > 23 || c > 24 || b > 59 || d > 59 || c * 60 + d > 1440 ? null : {start: a * 60 + b, end: c * 60 + d};
        });
        if (!ranges.length) fail('Add the hours you’re available.');
        else if (parsed.some(range => !range || range.end <= range.start)) fail('Each block has to end after it starts.');
        else if ([...parsed].sort((x, y) => x.start - y.start).some((range, i, all) => i && range.start < all[i - 1].end)) fail('These blocks overlap.');
        values[field.key] = ranges.join(', ');
        break;
      }
      case 'timezone': {
        const zone = String(raw ?? '').trim();
        try { if (!zone) throw 0; new Intl.DateTimeFormat('en-GB', {timeZone: zone}); } catch { fail('Choose a time zone.'); }
        values[field.key] = zone;
        break;
      }
      case 'choice': {
        const value = Number(raw);
        if (!field.options.includes(value)) fail('Choose one of the options.');
        values[field.key] = value;
        break;
      }
      case 'number': {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < field.min || value > field.max) fail(`Use a whole number from ${field.min} to ${field.max}.`);
        values[field.key] = value;
        break;
      }
      case 'dates': {
        const days = [...new Set((Array.isArray(raw) ? raw : []).map(String))];
        if (days.some(day => !DAY.test(day) || Number.isNaN(Date.parse(day + 'T00:00:00Z')))) fail('One of the dates isn’t valid.');
        values[field.key] = days.filter(day => DAY.test(day)).sort();
        break;
      }
      case 'image': {
        const path = String(raw ?? '').trim();
        if (!imageValue(path)) fail('Choose a photo.');
        values[field.key] = path;
        break;
      }
      case 'studies': {
        const list = Array.isArray(raw) ? raw : [];
        const clean = list.map(study => checkStudy(study));
        const problems = clean.map((item, index) => item.error && `${list[index]?.name || 'A case study'}: ${item.error}`).filter(Boolean);
        const ids = clean.map(item => item.study?.id);
        if (!list.length) fail('There are no case studies.');
        else if (problems.length) fail(problems[0]);
        else if (new Set(ids).size !== ids.length) fail('A case study appears twice.');
        values[field.key] = clean.map(item => item.study);
        break;
      }
      default: fail('Unknown field.');
    }
  }
  return Object.keys(errors).length ? {errors} : {values};
}

export const STUDY_LIMITS = {name: 40, category: 60, title: 90, paragraph: 1200, paragraphs: 6, factLabel: 30, factValue: 120, facts: 8, photos: 30, alt: 160};
const size = value => Number.isInteger(value) && value > 0 && value <= 12000;
const line = value => String(value ?? '').replace(/\s+/g, ' ').trim();
function checkStudy(study) {
  const L = STUDY_LIMITS;
  if (!study || typeof study !== 'object' || !/^[a-z0-9-]+$/.test(String(study.id))) return {error: 'it isn’t a known case study.'};
  const name = line(study.name), category = line(study.category), title = line(study.title);
  const body = (Array.isArray(study.body) ? study.body : []).map(p => String(p ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const facts = (Array.isArray(study.facts) ? study.facts : []).map(f => ({label: line(f?.label), value: String(f?.value ?? '').replace(/\r\n?/g, '\n').trim(), placeholder: Boolean(f?.placeholder)})).filter(f => f.label || f.value);
  if (!name || !title) return {error: 'the name and title can’t be empty.'};
  if (name.length > L.name || category.length > L.category || title.length > L.title) return {error: 'the name, category or title is too long.'};
  if (!body.length) return {error: 'the story needs at least one paragraph.'};
  if (body.length > L.paragraphs || body.some(p => p.length > L.paragraph)) return {error: `keep the story to ${L.paragraphs} paragraphs of up to ${L.paragraph} characters.`};
  if (facts.length > L.facts || facts.some(f => !f.label || !f.value || f.label.length > L.factLabel || f.value.length > L.factValue)) return {error: 'each fact needs a short label and a value.'};
  let thumbnail = null;
  if (study.thumbnail) {
    const t = study.thumbnail;
    if (!imageValue(String(t.src)) || !size(t.width) || !size(t.height) || !['fill', 'fit'].includes(t.fit)) return {error: 'the cover isn’t a usable image.'};
    thumbnail = {src: String(t.src), width: t.width, height: t.height, fit: t.fit};
  }
  const photos = Array.isArray(study.photos) ? study.photos : [];
  if (photos.length > L.photos) return {error: `keep it to ${L.photos} added photos.`};
  if (photos.some(p => !p || !imageValue(String(p.src)) || !size(p.width) || !size(p.height))) return {error: 'one of the added photos isn’t usable.'};
  const clean = photos.map(p => ({src: String(p.src), width: p.width, height: p.height, alt: line(p.alt).slice(0, L.alt)}));
  return {study: {id: String(study.id), name, category, title, body, facts, thumbnail, photos: clean}};
}

export const pick = (section, data) => Object.fromEntries(section.fields.map(field => [field.key, data?.[field.key] ?? (['weekdays', 'dates'].includes(field.type) ? [] : '')]));
