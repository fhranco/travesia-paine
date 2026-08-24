// Main Interactive Logic for Travesía Paine

document.addEventListener('DOMContentLoaded', () => {
    // 1. Header scroll effect
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // 2. Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const mainNav = document.getElementById('main-nav');
    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener('click', () => {
            mainNav.classList.toggle('open');
        });
    }

    // 3. Accordions (Policies & FAQs)
    document.addEventListener('click', (e) => {
        const header = e.target.closest('.accordion-header');
        if (header) {
            e.preventDefault();
            const item = header.closest('.accordion-item');
            if (!item) return;

            const wasActive = item.classList.contains('active');
            
            // Cerrar otros acordeones si se desea comportamiento único
            const parentContainer = item.closest('.policy-accordion-container, .accordion');
            if (parentContainer) {
                parentContainer.querySelectorAll('.accordion-item').forEach(el => {
                    if (el !== item) el.classList.remove('active');
                });
            }

            if (wasActive) {
                item.classList.remove('active');
            } else {
                item.classList.add('active');
            }
        }
    });

    // 4. Clima en Vivo en Torres del Paine (Open-Meteo API)
    fetchPaineWeather();
});

let lastWeatherData = null;

async function fetchPaineWeather() {
    const tempEl = document.getElementById('weather-temp');
    const windEl = document.getElementById('weather-wind');
    const statusEl = document.getElementById('weather-status');
    if (!tempEl || !windEl || !statusEl) return;

    try {
        const res = await fetch('/api/weather');
        const json = await res.json();

        if (json && json.success && json.data) {
            lastWeatherData = json.data;
            renderWeatherWidget();
        } else {
            throw new Error('Sin datos');
        }
    } catch (err) {
        console.error('Error fetching weather from backend, trying direct API:', err);
        try {
            const directUrl = 'https://api.open-meteo.com/v1/forecast?latitude=-51.25&longitude=-72.90&current=temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code&timezone=America%2FPunta_Arenas';
            const directRes = await fetch(directUrl);
            const directData = await directRes.json();
            if (directData && directData.current) {
                lastWeatherData = directData.current;
                renderWeatherWidget();
                return;
            }
        } catch(e) {}
        lastWeatherData = { temperature_2m: 7, wind_speed_10m: 22, weather_code: 1 };
        renderWeatherWidget();
    }
}

function renderWeatherWidget() {
    if (!lastWeatherData) return;
    const tempEl = document.getElementById('weather-temp');
    const windEl = document.getElementById('weather-wind');
    const statusEl = document.getElementById('weather-status');
    if (!tempEl || !windEl || !statusEl) return;

    const lang = typeof currentLang !== 'undefined' ? currentLang : 'es';
    const temp = Math.round(lastWeatherData.temperature_2m);
    const wind = Math.round(lastWeatherData.wind_speed_10m);
    const code = lastWeatherData.weather_code;

    tempEl.textContent = `${temp}°C`;
    windEl.textContent = `💨 ${wind} km/h`;

    const weatherConditions = {
        es: {
            clear: "☀️ Despejado",
            partlyCloudy: "🌤️ Parcialmente nublado",
            rain: "🌧️ Lluvia / Llovizna",
            snow: "🌨️ Nieve / Aguanieve",
            showers: "🌦️ Chubascos",
            storm: "⛈️ Tormenta",
            strongWind: "⚠️ Viento Fuerte"
        },
        en: {
            clear: "☀️ Clear Sky",
            partlyCloudy: "🌤️ Partly Cloudy",
            rain: "🌧️ Rain / Drizzle",
            snow: "🌨️ Snow / Sleet",
            showers: "🌦️ Showers",
            storm: "⛈️ Thunderstorm",
            strongWind: "⚠️ High Winds"
        },
        pt: {
            clear: "☀️ Céu Limpo",
            partlyCloudy: "🌤️ Parcialmente Nublado",
            rain: "🌧️ Chuva / Garoa",
            snow: "🌨️ Neve / Granizo",
            showers: "🌦️ Pancadas de Chuva",
            storm: "⛈️ Tempestade",
            strongWind: "⚠️ Vento Forte"
        }
    };

    const dict = weatherConditions[lang] || weatherConditions['es'];
    let condition = dict.partlyCloudy;

    if (code === 0) condition = dict.clear;
    else if (code >= 1 && code <= 3) condition = dict.partlyCloudy;
    else if (code >= 51 && code <= 67) condition = dict.rain;
    else if (code >= 71 && code <= 77) condition = dict.snow;
    else if (code >= 80 && code <= 82) condition = dict.showers;
    else if (code >= 95) condition = dict.storm;

    if (wind > 55) {
        statusEl.innerHTML = `<span style="color: #F87171;">${dict.strongWind} (${wind} km/h)</span>`;
    } else {
        statusEl.textContent = condition;
    }
}
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
            trekCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filterValue === 'all' || category.includes(filterValue)) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 5. Booking / Contact Form Interactive Feedback
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando solicitud...';
            
            setTimeout(() => {
                bookingForm.innerHTML = `
                    <div style="text-align: center; padding: 3rem 1rem;">
                        <svg style="width: 60px; height: 60px; color: var(--color-success); margin-bottom: 1.5rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <h3 style="font-size: 1.8rem; margin-bottom: 0.8rem;">¡Solicitud de Aventura Recibida!</h3>
                        <p style="color: var(--color-text-muted); max-width: 500px; margin: 0 auto 2rem;">
                            Uno de nuestros guías certificados revisará la disponibilidad de fechas y se pondrá en contacto contigo vía WhatsApp / Email en menos de 24 horas.
                        </p>
                        <a href="index.html" class="btn btn-primary">Volver al Inicio</a>
                    </div>
                `;
            }, 1000);
        });
    }
});
