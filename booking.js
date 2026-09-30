const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const meetingDate = document.querySelector('#meeting-date');
const meetingTime = document.querySelector('#meeting-time');
const bookingForm = document.querySelector('#booking-form');
const formStatus = document.querySelector('#form-status');

document.querySelector('#year').textContent = new Date().getFullYear();

if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

const pad = (value) => String(value).padStart(2, '0');
const today = new Date();
const minimumDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
meetingDate.min = `${minimumDate.getFullYear()}-${pad(minimumDate.getMonth() + 1)}-${pad(minimumDate.getDate())}`;

for (let minutes = 9 * 60; minutes <= 17 * 60; minutes += 30) {
  const hours = Math.floor(minutes / 60);
  const minuteValue = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const option = document.createElement('option');
  option.value = `${pad(hours)}:${pad(minuteValue)}`;
  option.textContent = `${displayHour}:${pad(minuteValue)} ${period}`;
  meetingTime.appendChild(option);
}

const showStatus = (message, isError = false) => {
  formStatus.textContent = message;
  formStatus.classList.toggle('error', isError);
  formStatus.classList.add('visible');
};

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(bookingForm);
  const selectedDate = new Date(`${data.get('date')}T00:00:00`);
  if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
    showStatus('Please select a weekday. Meetings are available Monday through Friday.', true);
    return;
  }
  const date = new Date(`${data.get('date')}T${data.get('time')}:00`);
  const readableDate = date.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const subject = `Meeting request from ${data.get('name')}`;
  const body = [
    `Meeting request for ${readableDate} PT`,
    '',
    `Name: ${data.get('name')}`,
    `Email: ${data.get('email')}`,
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
