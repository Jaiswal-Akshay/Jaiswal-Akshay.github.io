const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const dateOptions = document.querySelector('#date-options');
const bookingForm = document.querySelector('#booking-form');
const formStatus = document.querySelector('#form-status');

document.querySelector('#year').textContent = new Date().getFullYear();

if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

const formatDate = (date, options) => new Intl.DateTimeFormat('en-US', options).format(date);
const availableDates = [];
const cursor = new Date();
cursor.setHours(0, 0, 0, 0);

while (availableDates.length < 8) {
  cursor.setDate(cursor.getDate() + 1);
  if (cursor.getDay() !== 0 && cursor.getDay() !== 6) availableDates.push(new Date(cursor));
}

availableDates.forEach((date, index) => {
  const value = date.toISOString().slice(0, 10);
  const id = `date-${value}`;
  const option = document.createElement('div');
  option.className = 'date-option';
  option.innerHTML = `<input id="${id}" type="radio" name="date" value="${value}" ${index === 0 ? 'checked' : ''} required />
    <label for="${id}"><strong>${formatDate(date, { weekday: 'short' })}</strong><span>${formatDate(date, { month: 'short', day: 'numeric' })}</span></label>`;
  dateOptions.appendChild(option);
});

const showStatus = (message, isError = false) => {
  formStatus.textContent = message;
  formStatus.classList.toggle('error', isError);
  formStatus.classList.add('visible');
};

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(bookingForm);
  const date = new Date(`${data.get('date')}T${data.get('time')}:00`);
  const readableDate = date.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const subject = `Meeting request from ${data.get('name')}`;
  const body = [
    `Meeting request for ${readableDate} at ${data.get('time')} PT`,
    '',
    `Name: ${data.get('name')}`,
    `Email: ${data.get('email')}`,
    `Company: ${data.get('company') || 'Not provided'}`,
    `Role / area: ${data.get('role') || 'Not provided'}`,
    '',
    data.get('message') || 'No additional context provided.'
  ].join('\n');

  // Set BOOKING_ENDPOINT when the backend is ready. Until then, this opens a prefilled email request.
  const BOOKING_ENDPOINT = '';
  if (BOOKING_ENDPOINT) {
    fetch(BOOKING_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) })
      .then((response) => { if (!response.ok) throw new Error('Request failed'); showStatus('Thanks—the request was sent. I’ll follow up by email after reviewing the time.'); bookingForm.reset(); })
      .catch(() => showStatus('The request could not be sent. Please try again or email me directly.', true));
    return;
  }

  window.location.href = `mailto:jaiswalakshay57@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showStatus('Your email draft is ready. Send it to complete the meeting request.');
});

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
