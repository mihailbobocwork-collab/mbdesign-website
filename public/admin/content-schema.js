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
    id: 'search', label: 'Google & sharing', file: 'content/site.json',
    lede: 'How the homepage appears in Google results and in link previews. Each case study uses its own name, title and first paragraph.',
    fields: [
      {key: 'seoTitle', label: 'Page title', type: 'short', max: 70, required: true,
        hint: 'The blue headline in Google. Lead with your name and what you do; around 60 characters shows in full.'},
      {key: 'seoDescription', label: 'Description', type: 'text', rows: 3, max: 170, required: true,
        hint: 'The grey text under the headline. Say who you help and how; around 155 characters shows in full.'}
    ]
  },
  {
    id: 'service-product', label: 'Product Design', file: 'content/service-product-design.json',
    lede: 'The Product Design page at /services/product-design/: what Google shows, the introduction, what you offer, how you work and common questions. The related case studies are set in the file.',
    fields: [
      {key: 'name', label: 'Name', type: 'short', max: 40, required: true, group: 'Page', hint: 'Used in the menu, the footer and the list of services.'},
      {key: 'summary', label: 'Summary', type: 'text', rows: 2, max: 160, required: true, hint: 'One sentence on the Services page and under “Other services”.'},
      {key: 'seoTitle', label: 'Google title', type: 'short', max: 70, required: true, hint: 'Around 60 characters shows in full.'},
      {key: 'seoDescription', label: 'Google description', type: 'text', rows: 3, max: 170, required: true, hint: 'Around 155 characters shows in full.'},
      {key: 'headline', label: 'Heading', type: 'text', rows: 2, max: 120, required: true, group: 'Introduction'},
      {key: 'intro', label: 'Introduction', type: 'text', rows: 7, max: 1500, required: true, hint: 'Leave an empty line between paragraphs.'},
      {key: 'offers', label: 'What I can help with', type: 'pairs', first: 'title', second: 'text', group: 'What I can help with',
        firstName: 'Offer', secondName: 'Description', firstMax: 60, secondMax: 220, multiline: true, max: 9, add: 'Add an offer', hint: 'Remove them all to hide this part.'},
      {key: 'process', label: 'How we’ll work', type: 'pairs', first: 'title', second: 'text', group: 'How we’ll work',
        firstName: 'Step', secondName: 'Description', firstMax: 40, secondMax: 220, multiline: true, max: 6, add: 'Add a step', hint: 'Numbered in this order. Remove them all to hide this part.'},
      {key: 'faq', label: 'Questions', type: 'pairs', first: 'title', second: 'text', group: 'Questions',
        firstName: 'Question', secondName: 'Answer', firstMax: 120, secondMax: 400, multiline: true, max: 10, add: 'Add a question', hint: 'Also shown to Google as frequently asked questions.'},
      {key: 'ctaTitle', label: 'Title', type: 'short', max: 80, required: true, group: 'Closing invitation'},
      {key: 'ctaText', label: 'Text', type: 'short', max: 200, required: true}
    ]
  },
  {
    id: 'service-brand', label: 'Brand Identity', file: 'content/service-brand-identity.json',
    lede: 'The Brand Identity page at /services/brand-identity/: what Google shows, the introduction, what you offer, how you work and common questions. The related case studies are set in the file.',
    fields: [
      {key: 'name', label: 'Name', type: 'short', max: 40, required: true, group: 'Page', hint: 'Used in the menu, the footer and the list of services.'},
      {key: 'summary', label: 'Summary', type: 'text', rows: 2, max: 160, required: true, hint: 'One sentence on the Services page and under “Other services”.'},
      {key: 'seoTitle', label: 'Google title', type: 'short', max: 70, required: true, hint: 'Around 60 characters shows in full.'},
      {key: 'seoDescription', label: 'Google description', type: 'text', rows: 3, max: 170, required: true, hint: 'Around 155 characters shows in full.'},
      {key: 'headline', label: 'Heading', type: 'text', rows: 2, max: 120, required: true, group: 'Introduction'},
      {key: 'intro', label: 'Introduction', type: 'text', rows: 7, max: 1500, required: true, hint: 'Leave an empty line between paragraphs.'},
      {key: 'offers', label: 'What I can help with', type: 'pairs', first: 'title', second: 'text', group: 'What I can help with',
        firstName: 'Offer', secondName: 'Description', firstMax: 60, secondMax: 220, multiline: true, max: 9, add: 'Add an offer', hint: 'Remove them all to hide this part.'},
      {key: 'process', label: 'How we’ll work', type: 'pairs', first: 'title', second: 'text', group: 'How we’ll work',
        firstName: 'Step', secondName: 'Description', firstMax: 40, secondMax: 220, multiline: true, max: 6, add: 'Add a step', hint: 'Numbered in this order. Remove them all to hide this part.'},
      {key: 'faq', label: 'Questions', type: 'pairs', first: 'title', second: 'text', group: 'Questions',
        firstName: 'Question', secondName: 'Answer', firstMax: 120, secondMax: 400, multiline: true, max: 10, add: 'Add a question', hint: 'Also shown to Google as frequently asked questions.'},
      {key: 'ctaTitle', label: 'Title', type: 'short', max: 80, required: true, group: 'Closing invitation'},
      {key: 'ctaText', label: 'Text', type: 'short', max: 200, required: true}
    ]
  },
  {
    id: 'service-graphic', label: 'Graphic Design', file: 'content/service-graphic-design.json',
    lede: 'The Graphic Design page at /services/graphic-design/: what Google shows, the introduction, what you offer, how you work and common questions. The related case studies are set in the file.',
    fields: [
      {key: 'name', label: 'Name', type: 'short', max: 40, required: true, group: 'Page', hint: 'Used in the menu, the footer and the list of services.'},
      {key: 'summary', label: 'Summary', type: 'text', rows: 2, max: 160, required: true, hint: 'One sentence on the Services page and under “Other services”.'},
      {key: 'seoTitle', label: 'Google title', type: 'short', max: 70, required: true, hint: 'Around 60 characters shows in full.'},
      {key: 'seoDescription', label: 'Google description', type: 'text', rows: 3, max: 170, required: true, hint: 'Around 155 characters shows in full.'},
      {key: 'headline', label: 'Heading', type: 'text', rows: 2, max: 120, required: true, group: 'Introduction'},
      {key: 'intro', label: 'Introduction', type: 'text', rows: 7, max: 1500, required: true, hint: 'Leave an empty line between paragraphs.'},
      {key: 'offers', label: 'What I can help with', type: 'pairs', first: 'title', second: 'text', group: 'What I can help with',
        firstName: 'Offer', secondName: 'Description', firstMax: 60, secondMax: 220, multiline: true, max: 9, add: 'Add an offer', hint: 'Remove them all to hide this part.'},
      {key: 'process', label: 'How we’ll work', type: 'pairs', first: 'title', second: 'text', group: 'How we’ll work',
        firstName: 'Step', secondName: 'Description', firstMax: 40, secondMax: 220, multiline: true, max: 6, add: 'Add a step', hint: 'Numbered in this order. Remove them all to hide this part.'},
      {key: 'faq', label: 'Questions', type: 'pairs', first: 'title', second: 'text', group: 'Questions',
        firstName: 'Question', secondName: 'Answer', firstMax: 120, secondMax: 400, multiline: true, max: 10, add: 'Add a question', hint: 'Also shown to Google as frequently asked questions.'},
      {key: 'ctaTitle', label: 'Title', type: 'short', max: 80, required: true, group: 'Closing invitation'},
      {key: 'ctaText', label: 'Text', type: 'short', max: 200, required: true}
    ]
  },
  {
    id: 'about', label: 'About', file: 'content/site.json',
    lede: 'Everything in the About panel: photo, heading, story, the details beside the photo, your principles and the closing invitation.',
    fields: [
      {key: 'aboutPhoto', label: 'Photo', type: 'image', required: true,
        hint: 'Shown as a square, cropped from the centre. JPG, PNG or WebP; large photos are resized before upload.'},
      {key: 'aboutHeading', label: 'Heading', type: 'short', max: 80, required: true},
      {key: 'aboutBody', label: 'Your story', type: 'text', rows: 14, max: 6000, required: true,
        hint: 'Leave an empty line between paragraphs.'},
      {key: 'aboutFacts', label: 'Details', type: 'pairs', group: 'Details beside the photo', first: 'label', second: 'value',
        firstName: 'Label', secondName: 'Value', firstMax: 30, secondMax: 160, multiline: true, max: 8, add: 'Add a detail',
        hint: 'For example Role, Location or Experience. Press Return in a value to start a new line.'},
      {key: 'aboutPrinciplesTitle', label: 'Title', type: 'short', max: 80, required: true, group: 'Things I come back to'},
      {key: 'aboutPrinciples', label: 'Principles', type: 'pairs', first: 'title', second: 'text',
        firstName: 'Principle', secondName: 'Explanation', firstMax: 60, secondMax: 240, multiline: true, max: 6, add: 'Add a principle',
        hint: 'Remove them all to hide this part.'},
      {key: 'aboutCtaTitle', label: 'Title', type: 'short', max: 80, required: true, group: 'Closing invitation'},
      {key: 'aboutCtaText', label: 'Text', type: 'short', max: 200, required: true}
    ]
  },
  {
    id: 'cases', label: 'Case studies', file: 'content/case-studies.json',
    lede: 'Everything in the work preview: each case study’s words, cover and images, and their order. The first four shown on the website are the homepage cards; the rest appear under “Show more work”.',
    fields: [
      {key: 'studies', label: 'Case studies', type: 'studies'}
    ]
  },
  {
    id: 'logos', label: 'Brand strip', file: 'content/featured.json',
    lede: 'The logos that scroll under the introduction, in this order. They show in grey; each size is set by eye so the logos look balanced together.',
    fields: [
      {key: 'brands', label: 'Logos', type: 'logos'}
    ]
  },
  {
    id: 'inquiry', label: 'Inquiry wording', file: 'content/inquiry.json',
    lede: 'What visitors read in the inquiry, step by step. The steps themselves, and what each answer means, stay the same.',
    fields: [
      {key: 'heroPlaceholder', label: 'Placeholder in the homepage field', type: 'text', max: 60, required: true, rows: 2, hint: 'Press Return to start the second line.', group: 'Homepage field'},
      {key: 'subjectProduct', label: 'Suggestion 1', type: 'short', max: 30, required: true, hint: 'The suggestions under the field. The same names appear in your emails and the admin.'},
      {key: 'subjectGraphic', label: 'Suggestion 2', type: 'short', max: 30, required: true},
      {key: 'subjectBrand', label: 'Suggestion 3', type: 'short', max: 30, required: true},
      {key: 'topicQuestion', label: 'Question', type: 'short', max: 80, required: true, group: '1 · Your project'},
      {key: 'topicPlaceholder', label: 'Placeholder', type: 'short', max: 60, required: true},
      {key: 'topicPlaceholderSubject', label: 'Placeholder when a suggestion is chosen', type: 'short', max: 60, required: true},
      {key: 'topicError', label: 'Message when the field is empty', type: 'short', max: 120, required: true},
      {key: 'engagementQuestion', label: 'Question', type: 'short', max: 80, required: true, group: '2 · Working together'},
      {key: 'engagementHelper', label: 'Helper line', type: 'text', max: 200, required: true, rows: 2},
      {key: 'engagementPartnership', label: 'Option: long-term', type: 'short', max: 40, required: true},
      {key: 'engagementProject', label: 'Option: one project', type: 'short', max: 40, required: true},
      {key: 'budgetQuestion', label: 'Question', type: 'short', max: 80, required: true, group: '3 · Budget'},
      {key: 'budgetHelperMonthly', label: 'Helper for long-term work', type: 'short', max: 160, required: true, hint: '“per month” is added to the amounts automatically for long-term work.'},
      {key: 'budgetHelperProject', label: 'Helper for a project', type: 'short', max: 160, required: true},
      {key: 'budgetUnder1000', label: 'Option: under €1,000', type: 'short', max: 40, required: true},
      {key: 'budget1000', label: 'Option: €1,000–€2,999', type: 'short', max: 40, required: true},
      {key: 'budget3000', label: 'Option: €3,000–€4,999', type: 'short', max: 40, required: true},
      {key: 'budget5000', label: 'Option: €5,000–€9,999', type: 'short', max: 40, required: true},
      {key: 'budget10000', label: 'Option: €10,000+', type: 'short', max: 40, required: true},
      {key: 'budgetUnsure', label: 'Option: not sure yet', type: 'short', max: 40, required: true},
      {key: 'startQuestion', label: 'Question', type: 'short', max: 80, required: true, group: '4 · Call or message'},
      {key: 'startHelper', label: 'Helper line', type: 'text', max: 200, required: true, rows: 2},
      {key: 'startMeeting', label: 'Call button', type: 'short', max: 40, required: true},
      {key: 'startMessage', label: 'Message button', type: 'short', max: 40, required: true},
      {key: 'calendarQuestion', label: 'Calendar title', type: 'short', max: 80, required: true},
      {key: 'calendarHelper', label: 'Calendar helper', type: 'text', max: 200, required: true, rows: 2},
      {key: 'writeQuestion', label: 'Question', type: 'short', max: 80, required: true, group: '5 · Your message', hint: 'Only shown when the visitor chooses to send a message. What they typed on the homepage goes into the subject when it reads like one, otherwise into the message.'},
      {key: 'writeSubjectLabel', label: 'Subject placeholder', type: 'short', max: 30, required: true},
      {key: 'writePlaceholder', label: 'Placeholder in the message box', type: 'short', max: 60, required: true},
      {key: 'writeError', label: 'Message when the box is empty', type: 'short', max: 120, required: true},
      {key: 'emailQuestionMeeting', label: 'Question for a call', type: 'short', max: 80, required: true, group: '6 · Email'},
      {key: 'emailHelperMeeting', label: 'Helper for a call', type: 'text', max: 200, required: true, rows: 2},
      {key: 'emailQuestionMessage', label: 'Question for a message', type: 'short', max: 80, required: true},
      {key: 'emailHelperMessage', label: 'Helper for a message', type: 'text', max: 200, required: true, rows: 2},
      {key: 'reviewQuestion', label: 'Title', type: 'short', max: 80, required: true, group: '7 · Review'},
      {key: 'reviewHelperMeeting', label: 'Helper for a call', type: 'short', max: 160, required: true},
      {key: 'reviewHelperMessage', label: 'Helper for a message', type: 'short', max: 160, required: true},
      {key: 'submitMeeting', label: 'Button for a call', type: 'short', max: 40, required: true},
      {key: 'submitMessage', label: 'Button for a message', type: 'short', max: 40, required: true},
      {key: 'doneMeetingTitle', label: 'After a call request: title', type: 'short', max: 80, required: true, group: 'Done'},
      {key: 'doneMeetingText', label: 'After a call request: text', type: 'text', max: 300, required: true, rows: 3, hint: 'Keep it honest: the call still needs your approval.'},
      {key: 'doneMessageTitle', label: 'After a message: title', type: 'short', max: 80, required: true},
      {key: 'doneMessageText', label: 'After a message: text', type: 'text', max: 300, required: true, rows: 2},
      {key: 'privacyNote', label: 'Note under every step', type: 'text', max: 200, required: true, rows: 2}
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
      case 'short': {
        const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
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
        if (list.length > STUDY_LIMITS.studies) fail(`Keep it to ${STUDY_LIMITS.studies} case studies.`);
        else if (!list.length) fail('There are no case studies.');
        else if (problems.length) fail(problems[0]);
        else if (new Set(ids).size !== ids.length) fail('A case study appears twice.');
        values[field.key] = clean.map(item => item.study);
        break;
      }
      case 'pairs': {
        const list = Array.isArray(raw) ? raw : [];
        const clean = list.map(item => ({
          [field.first]: String(item?.[field.first] ?? '').replace(/\s+/g, ' ').trim(),
          [field.second]: String(item?.[field.second] ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim()
        })).filter(item => item[field.first] || item[field.second]);
        if (clean.length > field.max) fail(`Keep it to ${field.max}.`);
        else if (clean.some(item => !item[field.first] || !item[field.second])) fail(`Each one needs a ${field.firstName.toLowerCase()} and a ${field.secondName.toLowerCase()}.`);
        else if (clean.some(item => item[field.first].length > field.firstMax || item[field.second].length > field.secondMax)) fail(`Keep each ${field.firstName.toLowerCase()} under ${field.firstMax} characters and each ${field.secondName.toLowerCase()} under ${field.secondMax}.`);
        values[field.key] = clean;
        break;
      }
      case 'logos': {
        const list = Array.isArray(raw) ? raw : [];
        const clean = [];
        for (const brand of list) {
          const name = line(brand?.name), image = String(brand?.image ?? '');
          const width = Math.round(Number(brand?.width) * 1000) / 1000, height = Math.round(Number(brand?.height) * 1000) / 1000;
          if (!name || name.length > 40) { fail('Each logo needs a short name (it’s read out to screen readers).'); break; }
          if (!studyImage(image)) { fail(`${name}: the image isn’t usable.`); break; }
          if (!(width >= 30 && width <= 400 && height >= 10 && height <= 140)) { fail(`${name}: the size is out of range.`); break; }
          clean.push({name, image, width, height, ...(typeof brand.node === 'string' && /^[\d:]+$/.test(brand.node) ? {node: brand.node} : {})});
        }
        if (!errors[field.key] && !clean.length) fail('Keep at least one logo.');
        else if (!errors[field.key] && clean.length > 24) fail('Keep it to 24 logos.');
        values[field.key] = clean;
        break;
      }
      default: fail('Unknown field.');
    }
  }
  return Object.keys(errors).length ? {errors} : {values};
}

export const STUDY_LIMITS = {name: 40, category: 60, title: 90, paragraph: 1200, paragraphs: 6, factLabel: 30, factValue: 120, facts: 8, images: 60, alt: 160, studies: 24};
export const IMAGE_STYLES = [['photo', 'Photo'], ['screen', 'Screen'], ['phone', 'Phone']];
// Images already in the site (project galleries, exported screens) or uploaded from the admin.
const ASSET_IMAGE = /^\/assets\/(?!.*\.\.)[a-z0-9/_.-]+\.(jpe?g|png|webp|gif|svg)$/i;
const studyImage = value => ASSET_IMAGE.test(value) || UPLOAD_TOKEN.test(value);
const size = value => Number.isInteger(value) && value > 0 && value <= 12000;
const line = value => String(value ?? '').replace(/\s+/g, ' ').trim();
function checkStudy(study) {
  const L = STUDY_LIMITS;
  if (!study || typeof study !== 'object' || !/^[a-z0-9-]{1,60}$/.test(String(study.id))) return {error: 'it isn’t a known case study.'};
  const hidden = Boolean(study.hidden), originalCover = Boolean(study.originalCover);
  const name = line(study.name), category = line(study.category), title = line(study.title);
  const body = (Array.isArray(study.body) ? study.body : []).map(p => String(p ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const facts = (Array.isArray(study.facts) ? study.facts : []).map(f => ({label: line(f?.label), value: String(f?.value ?? '').replace(/\r\n?/g, '\n').trim(), placeholder: Boolean(f?.placeholder)})).filter(f => f.label || f.value);
  if (!name) return {error: 'it needs a name.'};
  if (name.length > L.name || category.length > L.category || title.length > L.title) return {error: 'the name, category or title is too long.'};
  if (body.length > L.paragraphs || body.some(p => p.length > L.paragraph)) return {error: `keep the story to ${L.paragraphs} paragraphs of up to ${L.paragraph} characters.`};
  if (facts.length > L.facts || facts.some(f => !f.label || !f.value || f.label.length > L.factLabel || f.value.length > L.factValue)) return {error: 'each fact needs a short label and a value.'};
  let thumbnail = null;
  if (study.thumbnail) {
    const t = study.thumbnail;
    if (!studyImage(String(t.src)) || !size(t.width) || !size(t.height) || !['fill', 'fit'].includes(t.fit)) return {error: 'the cover isn’t a usable image.'};
    thumbnail = {src: String(t.src), width: t.width, height: t.height, fit: t.fit};
  }
  const images = Array.isArray(study.images) ? study.images : [];
  if (images.length > L.images) return {error: `keep it to ${L.images} images.`};
  const clean = [];
  for (const image of images) {
    const variants = Array.isArray(image?.variants) ? image.variants : [];
    if (!image || !studyImage(String(image.src)) || !size(image.width) || !size(image.height) || !IMAGE_STYLES.some(([id]) => id === image.style)
      || variants.length > 8 || variants.some(v => !ASSET_IMAGE.test(String(v?.image)) || !size(v?.width))) return {error: 'one of the images isn’t usable.'};
    clean.push({src: String(image.src), ...(variants.length ? {variants: variants.map(v => ({image: String(v.image), width: v.width}))} : {}), width: image.width, height: image.height, alt: line(image.alt).slice(0, L.alt), style: image.style});
  }
  // A hidden study is a draft: only its name is required until it's shown on the site.
  if (!hidden) {
    if (!title) return {error: 'it needs a title before it can be shown.'};
    if (!body.length) return {error: 'the story needs at least one paragraph before it can be shown.'};
    if (!thumbnail && !originalCover) return {error: 'it needs a cover before it can be shown.'};
  }
  return {study: {id: String(study.id), name, category, title, body, facts, hidden, originalCover, thumbnail, images: clean}};
}

export const pick = (section, data) => Object.fromEntries(section.fields.map(field => [field.key, data?.[field.key] ?? (['weekdays', 'dates', 'pairs'].includes(field.type) ? [] : '')]));
