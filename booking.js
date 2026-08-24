/**
 * Travesía Paine - Motor de Reservas Cliente Multi-Asiento & Pasajeros
 */

// Generar o recuperar sessionId único de 15 minutos en localStorage
let sessionId = localStorage.getItem('tp_session_id');
if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('tp_session_id', sessionId);
}

let currentTourDateId = null;
let currentTour = null;
let selectedSeats = []; // Array de números de asientos seleccionados [1, 2, ...]
let seatsPollInterval = null;
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
                const match = json.data.find(t => t.id.toLowerCase().includes(queryTour.toLowerCase()) || (queryTour === 'fullday' && t.id === '1') || (queryTour === 'basetorres' && t.id === '2'));
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

    nameEl.innerHTML = `📍 ${tour.name} <span style="color: #4ADE80; font-size: 0.9rem; margin-left: 0.5rem;">($${tour.price_clp.toLocaleString('es-CL')} CLP por asiento)</span>`;
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

            selectedSeats = [];
            renderPassengerForms();
            updateSummary();
            await refreshSeats();
            startSeatsPolling();
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
        await releaseAllSelectedSeats();
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
                infoEl.style.color = '#4ADE80';
            }
            await releaseAllSelectedSeats();
            updateSummary();
            await refreshSeats();
        } else {
            alert('La fecha seleccionada no tiene salidas programadas. Por favor elige una fecha dentro de la temporada.');
            if (infoEl) {
                infoEl.textContent = '⚠️ Fecha sin salidas programadas.';
                infoEl.style.color = '#F87171';
            }
        }
    });

    // Seats click delegation
    document.querySelectorAll('.seat').forEach(seatEl => {
        seatEl.addEventListener('click', async () => {
            const seatNumber = parseInt(seatEl.getAttribute('data-seat'), 10);
            await handleSeatClick(seatNumber);
        });
    });

    // Checkout form submit
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await initiateWebpayPayment();
    });
}

async function refreshSeats() {
    if (!currentTourDateId) return;

    try {
        const res = await fetch(`/api/seats?tourDateId=${currentTourDateId}&sessionId=${sessionId}`);
        const json = await res.json();

        if (json.success) {
            renderSeats(json.data);
        }
    } catch (err) {
        console.error('Error refreshing seats:', err);
    }
}

function startSeatsPolling() {
    if (seatsPollInterval) clearInterval(seatsPollInterval);
    seatsPollInterval = setInterval(refreshSeats, 10000); // Refresca cada 10s
}

function renderSeats(seatsList) {
    const myLockedSeats = [];
    let latestLockExpiry = null;

    seatsList.forEach(s => {
        const seatEl = document.getElementById(`seat-${s.seat_number}`);
        if (!seatEl) return;

        seatEl.className = 'seat';

        if (s.status === 'PAID') {
            seatEl.classList.add('paid');
            seatEl.title = 'Asiento vendido';
        } else if (s.status === 'LOCKED') {
            if (s.is_my_lock) {
                seatEl.classList.add('selected');
                seatEl.title = 'Tu selección (Bloqueado por 15 min)';
                myLockedSeats.push(s.seat_number);
                if (s.locked_until) {
                    const expTime = new Date(s.locked_until).getTime();
                    if (!latestLockExpiry || expTime > latestLockExpiry) {
                        latestLockExpiry = expTime;
                    }
                }
            } else {
                seatEl.classList.add('locked');
                seatEl.title = 'En proceso de compra por otro usuario';
            }
        } else {
            seatEl.classList.add('available');
            seatEl.title = 'Disponible';
        }
    });

    // Sincronizar array de asientos seleccionados
    selectedSeats = myLockedSeats.sort((a, b) => a - b);
    
    if (selectedSeats.length > 0 && latestLockExpiry && !lockInterval) {
        startLockTimer(latestLockExpiry);
    } else if (selectedSeats.length === 0 && lockInterval) {
        stopLockTimer();
    }

    renderPassengerForms();
    updateSummary();
}

async function handleSeatClick(seatNumber) {
    if (!currentTourDateId) {
        alert('Por favor selecciona una excursión y fecha primero.');
        return;
    }

    const seatEl = document.getElementById(`seat-${seatNumber}`);
    if (seatEl.classList.contains('paid')) {
        alert('Este asiento ya está vendido y ocupado.');
        return;
    }

    if (seatEl.classList.contains('locked') && !selectedSeats.includes(seatNumber)) {
        alert('Este asiento está siendo reservado por otro usuario en este momento.');
        return;
    }

    // Si ya lo tiene seleccionado ➔ Liberar ese asiento
    if (selectedSeats.includes(seatNumber)) {
        await releaseSeat(seatNumber);
        await refreshSeats();
        return;
    }

    // Intentar bloquear el nuevo asiento
    try {
        const res = await fetch('/api/seats/lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tourDateId: currentTourDateId,
                seatNumber,
                sessionId
            })
        });

        const json = await res.json();
        if (json.success) {
            if (!selectedSeats.includes(seatNumber)) {
                selectedSeats.push(seatNumber);
                selectedSeats.sort((a, b) => a - b);
            }
            const expires = new Date(Date.now() + 15 * 60 * 1000).getTime();
            startLockTimer(expires);
            await refreshSeats();
        } else {
            alert(json.error || 'No se pudo reservar el asiento.');
            await refreshSeats();
        }
    } catch (err) {
        console.error('Error locking seat:', err);
        alert('Error de conexión al reservar asiento.');
    }
}

async function releaseSeat(seatNumber) {
    try {
        await fetch('/api/seats/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tourDateId: currentTourDateId,
                seatNumber,
                sessionId
            })
        });
        selectedSeats = selectedSeats.filter(s => s !== seatNumber);
    } catch (err) {
        console.error('Error releasing seat:', err);
    }
}

async function releaseAllSelectedSeats() {
    for (const seatNumber of selectedSeats) {
        await releaseSeat(seatNumber);
    }
    selectedSeats = [];
    stopLockTimer();
    renderPassengerForms();
}

/**
 * Renderiza dinámicamente una tarjeta de datos para CADA asiento seleccionado.
 */
function renderPassengerForms() {
    const container = document.getElementById('passengers-forms-container');
    if (!container) return;

    if (selectedSeats.length === 0) {
        container.innerHTML = `
            <div style="background: var(--color-bg-dark); border: 1px dashed var(--color-border); border-radius: 12px; padding: 2rem; text-align: center; color: var(--color-text-muted); margin-bottom: 1.5rem;">
                👈 <strong>Por favor haz clic en uno o más asientos en el mapa del bus</strong> para habilitar los datos individuales de cada pasajero.
            </div>
        `;
        return;
    }

    // Mantener valores existentes si el usuario ya había escrito en algunos
    const existingValues = {};
    selectedSeats.forEach(seatNum => {
        const nameEl = document.getElementById(`passenger-name-${seatNum}`);
        const ageEl = document.getElementById(`passenger-age-${seatNum}`);
        const docEl = document.getElementById(`passenger-doc-${seatNum}`);
        const emailEl = document.getElementById(`passenger-email-${seatNum}`);
        const phoneEl = document.getElementById(`passenger-phone-${seatNum}`);
        const waEl = document.getElementById(`passenger-whatsapp-${seatNum}`);

        if (nameEl) {
            existingValues[seatNum] = {
                name: nameEl.value,
                age: ageEl ? ageEl.value : '',
                doc: docEl ? docEl.value : '',
                email: emailEl ? emailEl.value : '',
                phone: phoneEl ? phoneEl.value : '',
                whatsapp: waEl ? waEl.value : ''
            };
        }
    });

    container.innerHTML = selectedSeats.map((seatNum, idx) => {
        const vals = existingValues[seatNum] || {};
        const pLabel = typeof t === 'function' ? t('passengerLabel') : 'Pasajero';
        const sLabel = typeof t === 'function' ? t('seatLabel') : 'Asiento N°';
        const nameLabel = typeof t === 'function' ? t('labelFullName') : 'Nombre Completo *';
        const namePl = typeof t === 'function' ? t('placeholderFullName') : 'Ej: Juan Pérez';
        const ageLabel = typeof t === 'function' ? t('labelAge') : 'Edad *';
        const agePl = typeof t === 'function' ? t('placeholderAge') : 'Ej: 32';
        const docLabel = typeof t === 'function' ? t('labelDoc') : 'RUT o Pasaporte *';
        const docPl = typeof t === 'function' ? t('placeholderDoc') : 'Ej: 12.345.678-9 / Pasaporte';
        const emailLabel = typeof t === 'function' ? t('labelEmail') : 'Correo Electrónico (para envío de pasaje) *';
        const emailPl = typeof t === 'function' ? t('placeholderEmail') : 'Ej: juan@gmail.com';
        const phoneLabel = typeof t === 'function' ? t('labelPhone') : 'Teléfono de Contacto *';
        const phonePl = typeof t === 'function' ? t('placeholderPhone') : 'Ej: +56 9 1234 5678';
        const waLabel = typeof t === 'function' ? t('labelWa') : 'WhatsApp de Contacto (con código país) *';
        const waPl = typeof t === 'function' ? t('placeholderWa') : 'Ej: +56912345678';

        return `
            <div style="background: var(--color-bg-dark); border: 1px solid var(--color-border); border-radius: 12px; padding: 1.4rem; margin-bottom: 1.2rem; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem;">
                    <div style="font-weight: 700; color: var(--color-accent); font-size: 1rem;">
                        👤 ${pLabel} ${idx + 1} &nbsp;·&nbsp; <span style="background: var(--color-accent); color: #FFF; padding: 0.2rem 0.6rem; border-radius: var(--radius-pill); font-size: 0.8rem;">${sLabel} ${seatNum.toString().padStart(2, '0')}</span>
                    </div>
                </div>

                <div class="form-group">
                    <label for="passenger-name-${seatNum}">${nameLabel}</label>
                    <input type="text" id="passenger-name-${seatNum}" class="form-input" placeholder="${namePl}" value="${vals.name || ''}" required>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 0.8rem;">
                    <div class="form-group">
                        <label for="passenger-age-${seatNum}">${ageLabel}</label>
                        <input type="number" id="passenger-age-${seatNum}" class="form-input" placeholder="${agePl}" min="1" max="99" value="${vals.age || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="passenger-doc-${seatNum}">${docLabel}</label>
                        <input type="text" id="passenger-doc-${seatNum}" class="form-input" placeholder="${docPl}" value="${vals.doc || ''}" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="passenger-email-${seatNum}">${emailLabel}</label>
                    <input type="email" id="passenger-email-${seatNum}" class="form-input" placeholder="${emailPl}" value="${vals.email || ''}" required>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">
                    <div class="form-group">
                        <label for="passenger-phone-${seatNum}">${phoneLabel}</label>
                        <input type="tel" id="passenger-phone-${seatNum}" class="form-input" placeholder="${phonePl}" value="${vals.phone || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="passenger-whatsapp-${seatNum}">${waLabel}</label>
                        <input type="tel" id="passenger-whatsapp-${seatNum}" class="form-input" placeholder="${waPl}" value="${vals.whatsapp || ''}" required>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateSummary() {
    const summarySeat = document.getElementById('summary-seat');
    const summaryTour = document.getElementById('summary-tour');
    const summaryDateTime = document.getElementById('summary-datetime');
    const summaryPrice = document.getElementById('summary-total-price');
    const btnPay = document.getElementById('btn-pay');

    const datePicker = document.getElementById('date-picker');
    const dateText = datePicker ? datePicker.value : '';

    if (currentTour) {
        summaryTour.textContent = currentTour.name;
        summaryDateTime.textContent = `${dateText || ''} · ${currentTour.departure_time || ''}`;
    }

    if (selectedSeats.length > 0) {
        const seatsText = selectedSeats.map(s => `N° ${s.toString().padStart(2, '0')}`).join(', ');
        summarySeat.textContent = `${selectedSeats.length} Asiento(s): ${seatsText}`;
        const unitPrice = currentTour ? currentTour.price_clp : 0;
        const total = unitPrice * selectedSeats.length;
        summaryPrice.textContent = `$${total.toLocaleString('es-CL')} CLP`;
        btnPay.disabled = false;
    } else {
        summarySeat.textContent = 'Ninguno seleccionado';
        summaryPrice.textContent = `$0 CLP`;
        btnPay.disabled = true;
    }
}

function startLockTimer(expiresAtTimestamp) {
    const timerBar = document.getElementById('lock-timer');
    const timerDisplay = document.getElementById('timer-display');
    if (!timerBar || !timerDisplay) return;

    timerBar.style.display = 'flex';
    if (lockInterval) clearInterval(lockInterval);

    function update() {
        const now = Date.now();
        const diff = Math.max(0, expiresAtTimestamp - now);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);

        timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (diff <= 0) {
            clearInterval(lockInterval);
            timerBar.style.display = 'none';
            alert('El tiempo de reserva de tus asientos (15 minutos) ha expirado.');
            selectedSeats = [];
            renderPassengerForms();
            refreshSeats();
        }
    }

    update();
    lockInterval = setInterval(update, 1000);
}

function stopLockTimer() {
    if (lockInterval) clearInterval(lockInterval);
    lockInterval = null;
    const timerBar = document.getElementById('lock-timer');
    if (timerBar) timerBar.style.display = 'none';
}

async function initiateWebpayPayment() {
    if (selectedSeats.length === 0 || !currentTourDateId) {
        alert('Por favor selecciona al menos un asiento en el bus antes de continuar.');
        return;
    }

    // Validar y recopilar datos de todos los pasajeros
    const passengersData = [];
    for (const seatNum of selectedSeats) {
        const name = document.getElementById(`passenger-name-${seatNum}`).value.trim();
        const age = document.getElementById(`passenger-age-${seatNum}`).value.trim();
        const doc = document.getElementById(`passenger-doc-${seatNum}`).value.trim();
        const email = document.getElementById(`passenger-email-${seatNum}`).value.trim();
        const phone = document.getElementById(`passenger-phone-${seatNum}`).value.trim();
        const whatsapp = document.getElementById(`passenger-whatsapp-${seatNum}`).value.trim();

        if (!name || !age || !doc || !email || !phone) {
            alert(`Por favor completa todos los datos obligatorios para el Pasajero del Asiento N° ${seatNum}.`);
            return;
        }

        passengersData.push({
            seatNumber: seatNum,
            passengerName: name,
            passengerAge: parseInt(age, 10),
            passengerDoc: doc,
            passengerEmail: email,
            passengerPhone: phone,
            passengerWhatsapp: whatsapp || phone
        });
    }

    const hotelName = document.getElementById('hotel-name').value.trim();
    const hotelStreet = document.getElementById('hotel-street').value.trim();
    const hotelNumber = document.getElementById('hotel-number').value.trim();
    const policyAgree = document.getElementById('policy-agree').checked;

    if (!policyAgree) {
        alert('Debes aceptar las Políticas de Reserva, Cancelación y Reembolso para proceder con el pago.');
        return;
    }

    const btnPay = document.getElementById('btn-pay');
    btnPay.disabled = true;
    btnPay.innerHTML = `<span>⏳ Conectando con Transbank Webpay...</span>`;

    try {
        const res = await fetch('/api/bookings/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tourDateId: currentTourDateId,
                sessionId,
                passengers: passengersData,
                hotelName,
                hotelStreet,
                hotelNumber,
                policiesAccepted: true
            })
        });

        const json = await res.json();
        if (json.success && json.data.webpayUrl) {
            // Redirigir mediante formulario POST a Transbank Webpay
            const form = document.getElementById('webpay-form');
            form.action = json.data.webpayUrl;
            document.getElementById('webpay-token-input').value = json.data.token;
            form.submit();
        } else {
            alert(json.error || 'Error al iniciar la transacción.');
            btnPay.disabled = false;
            btnPay.innerHTML = `<span>Pagar con Webpay Plus (Tarjetas)</span>`;
        }
    } catch (err) {
        console.error('Error initiating payment:', err);
        alert('Error de conexión con el servidor.');
        btnPay.disabled = false;
        btnPay.innerHTML = `<span>Pagar con Webpay Plus (Tarjetas)</span>`;
    }
}
