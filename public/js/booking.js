/**
 * Travesía Paine - Motor de Reservas y Gestión de Cupos (16 Pasajeros - Ubicación Libre)
 */

// Generar o recuperar sessionId único de 15 minutos en localStorage
let sessionId = localStorage.getItem('tp_session_id');
if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('tp_session_id', sessionId);
}

let currentTourDateId = null;
let currentTour = null;
let selectedQuantity = 1;
let currentAvailability = 16;
let allocatedSeatNumbers = []; // Asignados internamente por el backend
let availabilityPollInterval = null;
let lockInterval = null;
let availableDatesMap = {}; // travel_date -> tour_date_id
let toursData = [];

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    await loadTours();
    setupEventListeners();
}

async function loadTours() {
    try {
        const res = await fetch('/api/tours');
        const json = await res.json();
        if (json.success && json.data.length > 0) {
            toursData = json.data;
            const tourSelect = document.getElementById('tour-select');
            tourSelect.innerHTML = json.data.map(t => `
                <option value="${t.id}" data-price="${t.price_clp}" data-time="${t.departure_time}">${t.name} - $${t.price_clp.toLocaleString('es-CL')} CLP</option>
            `).join('');

            // Leer posibles parámetros de búsqueda desde la URL (ej: ?tour=basetorres&date=2026-08-25)
            const urlParams = new URLSearchParams(window.location.search);
            const queryTour = urlParams.get('tour');
            const queryDate = urlParams.get('date');

            if (queryTour) {
                const match = json.data.find(t => 
                    String(t.id).toLowerCase().includes(queryTour.toLowerCase()) || 
                    (queryTour === 'fullday' && String(t.id) === '1') || 
                    (queryTour === 'basetorres' && String(t.id) === '2')
                );
                if (match) {
                    currentTour = match;
                    tourSelect.value = match.id;
                } else {
                    currentTour = json.data[0];
                }
            } else {
                currentTour = json.data[0];
            }

            updateTourInfoCard(currentTour);
            await loadDatesForTour(currentTour.id);

            // Si vino una fecha seleccionada desde el buscador, seleccionarla en el date-picker
            if (queryDate) {
                const datePicker = document.getElementById('date-picker');
                if (datePicker && availableDatesMap[queryDate]) {
                    datePicker.value = queryDate;
                    currentTourDateId = availableDatesMap[queryDate];
                    await onDateSelected(currentTourDateId);
                }
            }
        }
    } catch (err) {
        console.error('Error loading tours:', err);
    }
}

function updateTourInfoCard(tour) {
    const nameEl = document.getElementById('tour-info-name');
    const descEl = document.getElementById('tour-info-desc');
    if (!nameEl || !descEl || !tour) return;

    nameEl.innerHTML = `📍 ${tour.name} <span style="color: #2e8b57; font-size: 0.9rem; margin-left: 0.5rem;">($${tour.price_clp.toLocaleString('es-CL')} CLP por cupo)</span>`;
    descEl.innerHTML = `
        <div style="margin-top: 0.4rem; line-height: 1.5;">
            <strong>⏱ Salida:</strong> ${tour.departure_time} · <strong>Pick-up:</strong> En tu alojamiento en Puerto Natales.<br>
            <span style="color: var(--color-text-muted);">${tour.description || tour.tagline || ''}</span>
        </div>
    `;
}

async function loadDatesForTour(tourId) {
    try {
        const datePicker = document.getElementById('date-picker');
        const infoEl = document.getElementById('date-available-info');
        datePicker.disabled = true;

        const res = await fetch(`/api/tours/${tourId}/dates`);
        const json = await res.json();

        if (json.success && json.data.length > 0) {
            availableDatesMap = {};
            json.data.forEach(d => {
                availableDatesMap[d.travel_date] = d.id;
            });

            const dates = json.data.map(d => d.travel_date).sort();
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];

            datePicker.min = minDate;
            datePicker.max = maxDate;
            datePicker.value = minDate;
            datePicker.disabled = false;

            currentTourDateId = availableDatesMap[minDate];
            if (infoEl) {
                infoEl.textContent = `📅 Temporada activa disponible desde ${minDate} hasta ${maxDate}.`;
            }

            await onDateSelected(currentTourDateId);
        } else {
            datePicker.disabled = true;
            if (infoEl) {
                infoEl.textContent = '❌ No hay fechas programadas disponibles.';
            }
        }
    } catch (err) {
        console.error('Error loading dates:', err);
    }
}

async function onDateSelected(tourDateId) {
    currentTourDateId = tourDateId;
    await checkAndLockQuantity(selectedQuantity);
    startAvailabilityPolling();
}

function setupEventListeners() {
    // Tour select change
    document.getElementById('tour-select').addEventListener('change', async (e) => {
        const tourId = parseInt(e.target.value, 10);
        currentTour = toursData.find(t => t.id === tourId);
        if (!currentTour) {
            const selectedOption = e.target.selectedOptions[0];
            currentTour = {
                id: tourId,
                name: selectedOption.text.split(' - ')[0],
                price_clp: parseInt(selectedOption.getAttribute('data-price'), 10),
                departure_time: selectedOption.getAttribute('data-time')
            };
        }
        updateTourInfoCard(currentTour);
        await releaseSessionLocks();
        await loadDatesForTour(tourId);
    });

    // Date picker change (Calendar)
    document.getElementById('date-picker').addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        const infoEl = document.getElementById('date-available-info');

        if (availableDatesMap[selectedDate]) {
            currentTourDateId = availableDatesMap[selectedDate];
            if (infoEl) {
                infoEl.textContent = `✓ Fecha seleccionada: ${selectedDate}`;
                infoEl.style.color = '#2e8b57';
            }
            await releaseSessionLocks();
            await onDateSelected(currentTourDateId);
        } else {
            alert('La fecha seleccionada no tiene salidas programadas. Por favor elige una fecha dentro de la temporada.');
            if (infoEl) {
                infoEl.textContent = '⚠️ Fecha sin salidas programadas.';
                infoEl.style.color = '#F87171';
            }
        }
    });

    // Stepper Aumento / Disminución Numérico 1 a 1
    const btnMinus = document.getElementById('btn-qty-minus');
    if (btnMinus) {
        btnMinus.addEventListener('click', async () => {
            if (selectedQuantity > 1) {
                await checkAndLockQuantity(selectedQuantity - 1);
            }
        });
    }

    const btnPlus = document.getElementById('btn-qty-plus');
    if (btnPlus) {
        btnPlus.addEventListener('click', async () => {
            const maxAllowed = Math.min(16, currentAvailability);
            if (selectedQuantity < maxAllowed) {
                await checkAndLockQuantity(selectedQuantity + 1);
            }
        });
    }

    // Checkout form submit
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await initiateWebpayPayment();
        });
    }
}

async function checkAndLockQuantity(quantity) {
    if (!currentTourDateId) return;

    try {
        const res = await fetch('/api/seats/lock-quantity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tourDateId: currentTourDateId,
                quantity: quantity,
                sessionId: sessionId
            })
        });

        const json = await res.json();
        if (json.success) {
            selectedQuantity = json.data.quantity;
            allocatedSeatNumbers = json.data.lockedSeats || [];
            updateStepperUI();
            renderPassengerForms();
            updateSummary();

            if (json.data.locked_until_ts) {
                startLockTimer(json.data.locked_until_ts);
            } else if (json.data.locked_until) {
                const expTime = new Date(json.data.locked_until).getTime();
                startLockTimer(Math.min(expTime, Date.now() + 10 * 60 * 1000));
            } else {
                startLockTimer(Date.now() + 10 * 60 * 1000);
            }
        } else {
            alert(json.error || 'No fue posible reservar la cantidad solicitada.');
        }

        await fetchAvailability();
    } catch (err) {
        console.error('Error locking quantity:', err);
    }
}

async function fetchAvailability() {
    if (!currentTourDateId) return;

    try {
        const res = await fetch(`/api/availability?tourDateId=${currentTourDateId}&sessionId=${sessionId}`);
        const json = await res.json();

        if (json.success) {
            currentAvailability = json.data.available_seats;
            updateAvailabilityBadge(json.data);
            updateStepperUI();
        }
    } catch (err) {
        console.error('Error fetching availability:', err);
    }
}

function updateAvailabilityBadge(data) {
    const textEl = document.getElementById('quota-text');
    const dotEl = document.getElementById('seats-dot');
    const bannerEl = document.getElementById('seats-remaining-banner');
    const btnMinus = document.getElementById('btn-qty-minus');
    const btnPlus = document.getElementById('btn-qty-plus');
    const btnSubmit = document.getElementById('btn-submit-booking');

    if (!textEl) return;

    const totalFreeInVan = currentAvailability;
    // Rebaja automática en vivo restando los pasajeros que el usuario tiene seleccionados
    const remainingAfterSelection = Math.max(0, totalFreeInVan - selectedQuantity);

    if (totalFreeInVan <= 0) {
        textEl.textContent = 'No quedan asientos disponibles para esta fecha (Agotado)';
        if (dotEl) dotEl.textContent = '🔴';
        if (bannerEl) {
            bannerEl.style.borderColor = '#F87171';
            bannerEl.style.background = 'rgba(248, 113, 113, 0.08)';
        }
        if (btnMinus) btnMinus.disabled = true;
        if (btnPlus) btnPlus.disabled = true;
        if (btnSubmit) btnSubmit.disabled = true;
    } else if (remainingAfterSelection === 0) {
        textEl.textContent = `¡Estás seleccionando todos los ${selectedQuantity} asientos disponibles de la van!`;
        if (dotEl) dotEl.textContent = '🟠';
        if (bannerEl) {
            bannerEl.style.borderColor = '#F59E0B';
            bannerEl.style.background = 'rgba(245, 158, 11, 0.08)';
        }
    } else if (remainingAfterSelection <= 4) {
        textEl.textContent = `¡Atención! Quedan ${remainingAfterSelection} asiento${remainingAfterSelection > 1 ? 's' : ''} disponible${remainingAfterSelection > 1 ? 's' : ''}`;
        if (dotEl) dotEl.textContent = '🟠';
        if (bannerEl) {
            bannerEl.style.borderColor = '#F59E0B';
            bannerEl.style.background = 'rgba(245, 158, 11, 0.08)';
        }
    } else {
        textEl.textContent = `Quedan ${remainingAfterSelection} asientos disponibles`;
        if (dotEl) dotEl.textContent = '🟢';
        if (bannerEl) {
            bannerEl.style.borderColor = 'var(--color-primary)';
            bannerEl.style.background = 'rgba(30, 90, 64, 0.08)';
        }
    }
}

function updateStepperUI() {
    const numEl = document.getElementById('qty-number');
    const labelEl = document.getElementById('qty-label');
    const btnMinus = document.getElementById('btn-qty-minus');
    const btnPlus = document.getElementById('btn-qty-plus');
    const subtotalEl = document.getElementById('subtotal-display');

    const maxAllowed = Math.min(16, currentAvailability);

    if (selectedQuantity > maxAllowed && maxAllowed > 0) {
        selectedQuantity = maxAllowed;
    }

    if (numEl) numEl.textContent = selectedQuantity;
    if (labelEl) labelEl.textContent = selectedQuantity === 1 ? 'Pasajero' : 'Pasajeros';

    if (btnMinus) {
        btnMinus.disabled = selectedQuantity <= 1 || currentAvailability <= 0;
    }
    if (btnPlus) {
        btnPlus.disabled = selectedQuantity >= maxAllowed || currentAvailability <= 0;
    }

    if (subtotalEl && currentTour) {
        const total = currentTour.price_clp * selectedQuantity;
        subtotalEl.textContent = `$${total.toLocaleString('es-CL')} CLP`;
    }

    // Actualiza el texto de asientos disponibles rebajando en vivo
    updateAvailabilityBadge();
}

function startAvailabilityPolling() {
    if (availabilityPollInterval) clearInterval(availabilityPollInterval);
    availabilityPollInterval = setInterval(fetchAvailability, 10000);
}

function renderPassengerForms() {
    const container = document.getElementById('passengers-forms-container');
    if (!container) return;

    if (selectedQuantity <= 0) {
        container.innerHTML = `
            <div style="background: var(--color-bg-dark); border: 1px dashed var(--color-border); border-radius: 12px; padding: 2rem; text-align: center; color: var(--color-text-muted); margin-bottom: 1.5rem;">
                👈 <strong>Por favor selecciona la cantidad de pasajeros</strong> para habilitar los datos individuales.
            </div>
        `;
        return;
    }

    // Preservar datos previamente ingresados
    const existingData = {};
    for (let i = 1; i <= 16; i++) {
        const nameInput = document.getElementById(`passenger-name-${i}`);
        const ageInput = document.getElementById(`passenger-age-${i}`);
        const docInput = document.getElementById(`passenger-doc-${i}`);
        const emailInput = document.getElementById(`passenger-email-${i}`);
        const phoneInput = document.getElementById(`passenger-phone-${i}`);
        const waInput = document.getElementById(`passenger-wa-${i}`);

        if (nameInput) {
            existingData[i] = {
                name: nameInput.value,
                age: ageInput ? ageInput.value : '',
                doc: docInput ? docInput.value : '',
                email: emailInput ? emailInput.value : '',
                phone: phoneInput ? phoneInput.value : '',
                wa: waInput ? waInput.value : ''
            };
        }
    }

    let html = '';
    for (let idx = 1; idx <= selectedQuantity; idx++) {
        const prev = existingData[idx] || {};

        html += `
            <div class="passenger-card" id="passenger-card-${idx}" style="background: var(--color-bg-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 1.4rem; margin-bottom: 1.2rem; box-shadow: var(--shadow-soft);">
                <div class="passenger-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--color-border);">
                    <div style="font-weight: 800; font-size: 1.05rem; color: var(--color-text-light);">
                        👤 Pasajero N° ${idx}
                    </div>
                    <span style="background: rgba(30, 90, 64, 0.08); color: var(--color-primary); font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px;">
                        Ubicación libre al abordar
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="passenger-name-${idx}">Nombre Completo *</label>
                        <input type="text" id="passenger-name-${idx}" class="form-input" placeholder="Ej: Juan Pérez" value="${prev.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="passenger-age-${idx}">Edad *</label>
                        <input type="number" id="passenger-age-${idx}" class="form-input" placeholder="Ej: 32" min="1" max="110" value="${prev.age || ''}" required>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="passenger-doc-${idx}">RUT o Pasaporte *</label>
                        <input type="text" id="passenger-doc-${idx}" class="form-input" placeholder="Ej: 12.345.678-9 o Pasaporte" value="${prev.doc || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="passenger-email-${idx}">Correo Electrónico (para pasaje digital) *</label>
                        <input type="email" id="passenger-email-${idx}" class="form-input" placeholder="Ej: pasajero@gmail.com" value="${prev.email || ''}" required>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label for="passenger-phone-${idx}">Teléfono Móvil *</label>
                        <input type="tel" id="passenger-phone-${idx}" class="form-input" placeholder="Ej: +56 9 1234 5678" value="${prev.phone || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="passenger-wa-${idx}">WhatsApp de Contacto *</label>
                        <input type="tel" id="passenger-wa-${idx}" class="form-input" placeholder="Ej: +56 9 1234 5678" value="${prev.wa || ''}" required>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function updateSummary() {
    const summaryTour = document.getElementById('summary-tour');
    const summaryDate = document.getElementById('summary-date');
    const summarySeats = document.getElementById('summary-seats');
    const summaryTotal = document.getElementById('summary-total');
    const btnSubmit = document.getElementById('btn-submit-booking');

    if (!summaryTour || !summaryDate || !summarySeats || !summaryTotal) return;

    if (currentTour) {
        summaryTour.textContent = currentTour.name;
    }

    const datePicker = document.getElementById('date-picker');
    if (datePicker && datePicker.value) {
        summaryDate.textContent = `${datePicker.value} (Pick-up: ${currentTour ? currentTour.departure_time : '07:00 AM'})`;
    }

    summarySeats.textContent = `${selectedQuantity} Pasajero(s) (Ubicación libre por orden de recogida)`;

    if (currentTour) {
        const total = currentTour.price_clp * selectedQuantity;
        summaryTotal.textContent = `$${total.toLocaleString('es-CL')} CLP`;
    }

    if (btnSubmit) {
        btnSubmit.disabled = selectedQuantity <= 0;
        btnSubmit.innerHTML = `🔒 Pagar $${(currentTour ? currentTour.price_clp * selectedQuantity : 0).toLocaleString('es-CL')} CLP con Webpay Plus`;
    }
}

function startLockTimer(expiryTimestamp) {
    if (lockInterval) clearInterval(lockInterval);

    const timerBar = document.getElementById('lock-timer');
    const display = document.getElementById('timer-display');
    if (!timerBar || !display) return;

    timerBar.classList.add('active');

    // Garantizar que la expiración máxima sea exactamente 10 minutos desde ahora
    const maxExpiry = Date.now() + 10 * 60 * 1000;
    const targetExpiry = (expiryTimestamp && expiryTimestamp > Date.now()) 
        ? Math.min(expiryTimestamp, maxExpiry) 
        : maxExpiry;

    function update() {
        const now = Date.now();
        const diff = targetExpiry - now;

        if (diff <= 0) {
            clearInterval(lockInterval);
            lockInterval = null;
            display.textContent = '00:00';
            timerBar.classList.remove('active');
            alert('⏱ Tu tiempo de reserva de 10 minutos ha expirado. Por favor selecciona tus cupos nuevamente.');
            checkAndLockQuantity(selectedQuantity);
            return;
        }

        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    update();
    lockInterval = setInterval(update, 1000);
}

async function releaseSessionLocks() {
    if (!currentTourDateId) return;
    try {
        await fetch('/api/seats/release-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tourDateId: currentTourDateId, sessionId: sessionId })
        });
    } catch (e) {}
}

async function initiateWebpayPayment() {
    if (selectedQuantity <= 0) {
        alert('Por favor selecciona al menos 1 cupo para continuar.');
        return;
    }

    const hotelName = document.getElementById('hotel-name')?.value.trim();
    const hotelStreet = document.getElementById('hotel-street')?.value.trim();
    const hotelNumber = document.getElementById('hotel-number')?.value.trim();

    if (!hotelName || !hotelStreet || !hotelNumber) {
        alert('Por favor completa todos los datos de tu alojamiento en Puerto Natales para coordinar tu pick-up.');
        return;
    }

    const passengers = [];
    for (let idx = 1; idx <= selectedQuantity; idx++) {
        const name = document.getElementById(`passenger-name-${idx}`)?.value.trim();
        const age = document.getElementById(`passenger-age-${idx}`)?.value.trim();
        const doc = document.getElementById(`passenger-doc-${idx}`)?.value.trim();
        const email = document.getElementById(`passenger-email-${idx}`)?.value.trim();
        const phone = document.getElementById(`passenger-phone-${idx}`)?.value.trim();
        const wa = document.getElementById(`passenger-wa-${idx}`)?.value.trim();

        if (!name || !age || !doc || !email || !phone || !wa) {
            alert(`Por favor completa todos los campos del Pasajero N° ${idx}.`);
            return;
        }

        // Asignar número de asiento del pool bloqueado por el backend
        const seatNum = allocatedSeatNumbers[idx - 1] || idx;

        passengers.push({
            seatNumber: seatNum,
            name,
            passengerName: name,
            age: parseInt(age, 10),
            passengerAge: parseInt(age, 10),
            doc,
            passengerDoc: doc,
            email,
            passengerEmail: email,
            phone,
            passengerPhone: phone,
            whatsapp: wa,
            passengerWhatsapp: wa
        });
    }

    const submitBtn = document.getElementById('btn-submit-booking');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '🔄 Conectando con Webpay Plus...';

    try {
        const policyChecked = document.getElementById('policy-agree')?.checked ?? true;

        const res = await fetch('/api/bookings/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tourDateId: currentTourDateId,
                sessionId: sessionId,
                passengers: passengers,
                hotelName: hotelName,
                hotelStreet: hotelStreet,
                hotelNumber: hotelNumber,
                policiesAccepted: policyChecked,
                hotelInfo: {
                    name: hotelName,
                    street: hotelStreet,
                    number: hotelNumber
                }
            })
        });

        const json = await res.json();

        if (json.success && json.data.webpayUrl && json.data.token) {
            // Crear formulario POST automático hacia Transbank Webpay
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = json.data.webpayUrl;

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'token_ws';
            input.value = json.data.token;

            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
        } else {
            throw new Error(json.error || 'No fue posible iniciar el pago con Webpay.');
        }
    } catch (err) {
        alert('Error al iniciar pago: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}
