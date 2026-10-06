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

let serverTimeOffsetMs = 0;
let officialClockInterval = null;
let serverTimeData = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    await initOfficialClock();
    await loadTours();
    setupEventListeners();
}

async function initOfficialClock() {
    try {
        const res = await fetch('/api/time');
        const json = await res.json();
        if (json.success && json.data) {
            serverTimeData = json.data;
            const serverMs = json.data.timestamp;
            const clientMs = Date.now();
            serverTimeOffsetMs = serverMs - clientMs;

            const displayEl = document.getElementById('official-time-display');
            if (displayEl) {
                displayEl.textContent = json.data.timeString;
            }

            if (officialClockInterval) clearInterval(officialClockInterval);
            officialClockInterval = setInterval(tickOfficialClock, 1000);
        }
    } catch (err) {
        console.warn('Clock sync warning:', err);
    }
}

function tickOfficialClock() {
    const currentServerMs = Date.now() + serverTimeOffsetMs;
    const timeStr = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Punta_Arenas',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date(currentServerMs));

    const displayEl = document.getElementById('official-time-display');
    if (displayEl) {
        displayEl.textContent = timeStr;
    }

    checkLiveCutoffTransition(currentServerMs);
}

function checkLiveCutoffTransition(currentServerMs) {
    const datePicker = document.getElementById('date-picker');
    if (!datePicker || !datePicker.value) return;

    const tomorrowMs = currentServerMs + 24 * 60 * 60 * 1000;
    const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Punta_Arenas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(tomorrowMs));

    if (datePicker.value === tomorrowStr) {
        const [hh, mm, ss] = new Intl.DateTimeFormat('es-CL', {
            timeZone: 'America/Punta_Arenas',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date(currentServerMs)).split(':').map(Number);

        const secondsNow = hh * 3600 + mm * 60 + ss;
        const cutoffSeconds = 20 * 3600;

        const infoEl = document.getElementById('date-available-info');
        if (secondsNow >= cutoffSeconds) {
            if (infoEl) {
                infoEl.innerHTML = `🔒 <strong>Reservas cerradas para mañana:</strong> Límite oficial de las 20:00 hrs alcanzado.`;
                infoEl.style.color = '#F59E0B';
            }
        } else {
            const diff = cutoffSeconds - secondsNow;
            const hRem = Math.floor(diff / 3600);
            const mRem = Math.floor((diff % 3600) / 60);
            const sRem = diff % 60;
            const timeText = hRem > 0 ? `${hRem}h ${mRem}m ${sRem}s` : `${mRem}m ${sRem}s`;
            if (infoEl) {
                infoEl.innerHTML = `⏱️ <strong>Salida para mañana:</strong> Quedan <strong>${timeText}</strong> antes del cierre oficial de las 20:00 hrs.`;
                infoEl.style.color = '#166534';
            }
        }
    }
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

            // Leer posibles parámetros de búsqueda desde la URL (ej: ?tour=basetorres&date=2026-11-15)
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

            syncTourTabsUI(currentTour.id);
            updateTourInfoCard(currentTour);
            await loadDatesForTour(currentTour.id);

            // Si vino una fecha seleccionada desde el buscador, seleccionarla en el date-picker
            if (queryDate) {
                const datePicker = document.getElementById('date-picker');
                if (datePicker && availableDatesMap[queryDate]) {
                    datePicker.value = queryDate;
                    currentTourDateId = availableDatesMap[queryDate].id;
                    await onDateSelected(currentTourDateId);
                }
            }
        }
    } catch (err) {
        console.error('Error loading tours:', err);
    }
}

function syncTourTabsUI(tourId) {
    const tabBase = document.getElementById('tab-tour-basetorres');
    const tabFull = document.getElementById('tab-tour-fullday');
    if (!tabBase || !tabFull) return;

    if (parseInt(tourId, 10) === 2) {
        tabBase.classList.add('active');
        tabFull.classList.remove('active');
    } else {
        tabFull.classList.add('active');
        tabBase.classList.remove('active');
    }
}

function selectTourTab(tourId) {
    const tourSelect = document.getElementById('tour-select');
    if (tourSelect) {
        tourSelect.value = tourId;
        tourSelect.dispatchEvent(new Event('change'));
    }
    syncTourTabsUI(tourId);
}

function updateTourInfoCard(tour) {
    const nameEl = document.getElementById('tour-info-name');
    const descEl = document.getElementById('tour-info-desc');
    if (!nameEl || !descEl || !tour) return;

    nameEl.innerHTML = `📍 ${tour.name} <span style="color: #2e8b57; font-size: 0.95rem; margin-left: 0.5rem; font-weight: 800;">($${tour.price_clp.toLocaleString('es-CL')} CLP por pasajero)</span>`;
    
    const isBaseTorres = parseInt(tour.id, 10) === 2 || String(tour.name).toLowerCase().includes('base');
    if (isBaseTorres) {
        descEl.innerHTML = `
            <div style="margin-top: 0.5rem; line-height: 1.55; display: flex; flex-direction: column; gap: 0.35rem;">
                <div>🚐 <strong>Servicio:</strong> Exclusivo Transporte de Ida y Regreso (sin guía de montaña).</div>
                <div>⏱ <strong>Pick-up:</strong> Desde las 06:30 AM en tu alojamiento en Puerto Natales.</div>
                <div>📍 <strong>Pasajeros fuera de la ciudad:</strong> Si alojas fuera del radio urbano de Natales, debes esperar en la <strong>Plaza de Armas</strong>.</div>
                <div>🏔️ <strong>Retorno:</strong> En Centro de Bienvenida la van espera a los pasajeros hasta las <strong>19:00 hrs</strong> para retornar a sus hostales.</div>
                <div style="color: var(--color-accent); font-weight: 700; margin-top: 0.2rem;">
                    🛡️ Cancelaciones: Más de 3 días = 60% de devolución · Menos de 24 hrs = sin devolución.
                </div>
            </div>
        `;
    } else {
        descEl.innerHTML = `
            <div style="margin-top: 0.5rem; line-height: 1.55; display: flex; flex-direction: column; gap: 0.35rem;">
                <div>🚐 <strong>Modalidad:</strong> Tour panorámico de bajo costo con paradas fotográficas y miradores (sin guía de turismo).</div>
                <div>⏱ <strong>Pick-up:</strong> Desde las 07:00 AM en tu alojamiento en Puerto Natales.</div>
                <div>📍 <strong>Puntos de Interés:</strong> Parque Nacional Torres del Paine y Monumento Natural Cueva del Milodón.</div>
                <div style="color: var(--color-accent); font-weight: 700; margin-top: 0.2rem;">
                    🛡️ Cancelaciones: Más de 3 días = 60% de devolución · Menos de 24 hrs = sin devolución.
                </div>
            </div>
        `;
    }
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
                availableDatesMap[d.travel_date] = d;
            });

            const dates = json.data.map(d => d.travel_date).sort();
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];

            datePicker.min = minDate;
            datePicker.max = maxDate;
            datePicker.disabled = false;

            // Seleccionar primera fecha disponible que no esté cerrada
            if (!datePicker.value || !availableDatesMap[datePicker.value]) {
                const firstOpen = json.data.find(d => !d.is_closed) || json.data[0];
                datePicker.value = firstOpen.travel_date;
            }

            const currentData = availableDatesMap[datePicker.value];
            currentTourDateId = currentData ? currentData.id : availableDatesMap[minDate].id;

            if (infoEl) {
                infoEl.innerHTML = `📅 <strong>Temporada oficial:</strong> 1 de Noviembre al 30 de Abril. Cierre web diario a las <strong>20:00 hrs</strong> del día anterior.`;
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
    renderPassengerForms();
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

    // Función global para abrir calendario al tocar cualquier parte del contenedor
    window.openDatePickerCalendar = function(e) {
        const picker = document.getElementById('date-picker');
        if (!picker) return;
        try {
            if (typeof picker.showPicker === 'function') {
                picker.showPicker();
            } else {
                picker.focus();
            }
        } catch (err) {
            picker.focus();
        }
    };

    const datePickerEl = document.getElementById('date-picker');
    if (datePickerEl) {
        // Al tocar cualquier parte del input de fecha
        datePickerEl.addEventListener('click', (e) => {
            try {
                if (typeof datePickerEl.showPicker === 'function') {
                    datePickerEl.showPicker();
                }
            } catch (err) {}
        });

        // Date picker change (Calendar)
        datePickerEl.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            const infoEl = document.getElementById('date-available-info');

            if (availableDatesMap[selectedDate]) {
                const dateObj = availableDatesMap[selectedDate];
                currentTourDateId = dateObj.id;
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
    }

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
    const waOverflowBox = document.getElementById('whatsapp-overflow-box');

    if (!textEl) return;

    const totalFreeInVan = currentAvailability;
    const isClosed = data && data.is_closed;
    const isSoldOut = totalFreeInVan <= 0 || (data && data.is_sold_out);

    // Rebaja automática en vivo restando los pasajeros que el usuario tiene seleccionados
    const remainingAfterSelection = Math.max(0, totalFreeInVan - selectedQuantity);

    if (isClosed) {
        textEl.textContent = 'Reservas web cerradas (Límite: 20:00 hrs del día anterior)';
        if (dotEl) dotEl.textContent = '🔒';
        if (bannerEl) {
            bannerEl.style.borderColor = '#F59E0B';
            bannerEl.style.background = 'rgba(245, 158, 11, 0.12)';
        }
        if (btnMinus) btnMinus.disabled = true;
        if (btnPlus) btnPlus.disabled = true;
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = '0.5';
            btnSubmit.style.cursor = 'not-allowed';
        }
        if (waOverflowBox) {
            waOverflowBox.style.display = 'block';
            const dateStr = document.getElementById('date-picker') ? document.getElementById('date-picker').value : '';
            const tourName = currentTour ? currentTour.name : 'Excursión';
            const waMsg = encodeURIComponent(`Hola Travesía Paine, las reservas web para ${tourName} el día ${dateStr} están cerradas por horario (20:00 hrs). ¿Aún tienen cupos de última hora disponibles?`);
            const waBtn = document.getElementById('wa-overflow-btn');
            if (waBtn) waBtn.href = `https://wa.me/5699632991?text=${waMsg}`;
            const waTitle = document.getElementById('wa-overflow-title');
            if (waTitle) waTitle.textContent = '⏰ Cierre diario de reservas online (20:00 hrs)';
            const waDesc = document.getElementById('wa-overflow-desc');
            if (waDesc) waDesc.textContent = 'Por políticas operativas, el sistema web cierra a las 20:00 hrs del día previo para coordinar las hojas de ruta y pick-ups. Contáctanos directo a WhatsApp para ver cupos de última hora.';
        }
    } else if (isSoldOut) {
        textEl.textContent = 'No quedan asientos disponibles para esta fecha (Agotado)';
        if (dotEl) dotEl.textContent = '🔴';
        if (bannerEl) {
            bannerEl.style.borderColor = '#F87171';
            bannerEl.style.background = 'rgba(248, 113, 113, 0.12)';
        }
        if (btnMinus) btnMinus.disabled = true;
        if (btnPlus) btnPlus.disabled = true;
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = '0.5';
            btnSubmit.style.cursor = 'not-allowed';
        }
        if (waOverflowBox) {
            waOverflowBox.style.display = 'block';
            const dateStr = document.getElementById('date-picker') ? document.getElementById('date-picker').value : '';
            const tourName = currentTour ? currentTour.name : 'Excursión';
            const waMsg = encodeURIComponent(`Hola Travesía Paine, veo que para ${tourName} el ${dateStr} los cupos web están completos (16/16). ¿Tienen disponibilidad o van de apoyo?`);
            const waBtn = document.getElementById('wa-overflow-btn');
            if (waBtn) waBtn.href = `https://wa.me/5699632991?text=${waMsg}`;
            const waTitle = document.getElementById('wa-overflow-title');
            if (waTitle) waTitle.textContent = '🚐 Cupos web completos (Van llena)';
            const waDesc = document.getElementById('wa-overflow-desc');
            if (waDesc) waDesc.textContent = 'La capacidad web de 16 asientos para esta fecha se ha completado. Escríbenos directamente por WhatsApp para consultar lista de espera, cupos adicionales o servicio privado.';
        }
    } else {
        if (waOverflowBox) waOverflowBox.style.display = 'none';
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.style.opacity = '1';
            btnSubmit.style.cursor = 'pointer';
        }

        if (remainingAfterSelection === 0) {
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
            <div class="empty-passengers-notice">
                👈 <strong>Por favor indica la cantidad de pasajeros</strong> para habilitar los datos de viaje.
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

        if (idx === 1) {
            html += `
                <div class="passenger-card-modern lead-passenger-card" id="passenger-card-1">
                    <div class="passenger-header-modern">
                        <div class="passenger-badge-title">
                            <span class="p-num">1</span>
                            <div>
                                <strong style="font-size: 1rem; color: #0E1A16; display: block;">Pasajero 1 (Titular de la Reserva)</strong>
                                <span style="font-size: 0.8rem; color: #64748B;">Recibirá los pasajes digitales y coordinaremos el pick-up</span>
                            </div>
                        </div>
                        <span class="seat-type-tag">Ubicación libre</span>
                    </div>

                    <div class="passenger-inputs-grid">
                        <div class="form-group">
                            <label for="passenger-name-1">Nombre Completo *</label>
                            <input type="text" id="passenger-name-1" class="form-input" placeholder="Ej: Juan Pérez" value="${prev.name || ''}" autocomplete="name" required>
                        </div>
                        <div class="form-group">
                            <label for="passenger-age-1">Edad *</label>
                            <input type="number" id="passenger-age-1" class="form-input" placeholder="Ej: 32" min="1" max="110" inputmode="numeric" value="${prev.age || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="passenger-doc-1">RUT o Pasaporte *</label>
                            <input type="text" id="passenger-doc-1" class="form-input" placeholder="Ej: 12.345.678-9 o Pasaporte" value="${prev.doc || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="passenger-email-1">Correo Electrónico (para envío de pasajes) *</label>
                            <input type="email" id="passenger-email-1" class="form-input" placeholder="Ej: juan@gmail.com" autocomplete="email" value="${prev.email || ''}" required>
                        </div>
                        <div class="form-group full-width">
                            <label for="passenger-phone-1">WhatsApp / Teléfono Móvil *</label>
                            <input type="tel" id="passenger-phone-1" class="form-input" placeholder="Ej: +56 9 1234 5678" autocomplete="tel" inputmode="tel" value="${prev.phone || ''}" required>
                            <input type="hidden" id="passenger-wa-1" value="${prev.wa || prev.phone || ''}">
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="passenger-card-modern companion-passenger-card" id="passenger-card-${idx}">
                    <div class="passenger-header-modern">
                        <div class="passenger-badge-title">
                            <span class="p-num companion-num">${idx}</span>
                            <div>
                                <strong style="font-size: 0.96rem; color: #0E1A16; display: block;">Pasajero ${idx} (Acompañante)</strong>
                                <span style="font-size: 0.78rem; color: #64748B;">Pasajes asociados al correo del Titular</span>
                            </div>
                        </div>
                        <span class="seat-type-tag">Ubicación libre</span>
                    </div>

                    <div class="passenger-inputs-grid companion-grid">
                        <div class="form-group">
                            <label for="passenger-name-${idx}">Nombre Completo *</label>
                            <input type="text" id="passenger-name-${idx}" class="form-input" placeholder="Ej: María González" value="${prev.name || ''}" autocomplete="name" required>
                        </div>
                        <div class="form-group">
                            <label for="passenger-age-${idx}">Edad *</label>
                            <input type="number" id="passenger-age-${idx}" class="form-input" placeholder="Ej: 28" min="1" max="110" inputmode="numeric" value="${prev.age || ''}" required>
                        </div>
                        <div class="form-group full-width">
                            <label for="passenger-doc-${idx}">RUT o Pasaporte *</label>
                            <input type="text" id="passenger-doc-${idx}" class="form-input" placeholder="Ej: 15.678.901-2 o Pasaporte" value="${prev.doc || ''}" required>
                        </div>
                        <input type="hidden" id="passenger-email-${idx}" value="${prev.email || ''}">
                        <input type="hidden" id="passenger-phone-${idx}" value="${prev.phone || ''}">
                        <input type="hidden" id="passenger-wa-${idx}" value="${prev.wa || ''}">
                    </div>
                </div>
            `;
        }
    }

    container.innerHTML = html;
}

function updateSummary() {
    const summaryTour = document.getElementById('summary-tour');
    const summaryDate = document.getElementById('summary-date');
    const summarySeats = document.getElementById('summary-seats');
    const summaryTotal = document.getElementById('summary-total');
    const btnSubmit = document.getElementById('btn-submit-booking');

    // Elementos de la barra flotante móvil inferior
    const mobileBarTotal = document.getElementById('mobile-bar-total');
    const mobileBarSeats = document.getElementById('mobile-bar-seats');

    const total = currentTour ? currentTour.price_clp * selectedQuantity : 0;
    const formattedTotal = `$${total.toLocaleString('es-CL')} CLP`;

    if (summaryTour && currentTour) {
        summaryTour.textContent = currentTour.name;
    }

    const datePicker = document.getElementById('date-picker');
    if (datePicker && datePicker.value) {
        if (summaryDate) {
            summaryDate.textContent = `${datePicker.value} (Pick-up: ${currentTour ? currentTour.departure_time : '06:30 AM'})`;
        }
    }

    const seatsText = `${selectedQuantity} Pasajero${selectedQuantity > 1 ? 's' : ''}`;
    if (summarySeats) {
        summarySeats.textContent = seatsText;
    }

    if (summaryTotal) {
        summaryTotal.textContent = formattedTotal;
    }

    if (mobileBarTotal) mobileBarTotal.textContent = formattedTotal;
    if (mobileBarSeats) mobileBarSeats.textContent = seatsText;

    if (btnSubmit) {
        btnSubmit.disabled = selectedQuantity <= 0;
        btnSubmit.innerHTML = `🔒 Pagar ${formattedTotal} con Webpay Plus`;
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

    const hotelNameInput = document.getElementById('hotel-name');
    const hotelStreetInput = document.getElementById('hotel-street');
    const hotelNumberInput = document.getElementById('hotel-number');

    const hotelName = hotelNameInput?.value.trim();
    const hotelStreet = hotelStreetInput?.value.trim();
    const hotelNumber = hotelNumberInput?.value.trim();

    if (!hotelName) {
        alert('Por favor indica el nombre de tu hotel, hostal o alojamiento en Puerto Natales.');
        hotelNameInput?.focus();
        hotelNameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (!hotelStreet) {
        alert('Por favor indica la calle o dirección de tu alojamiento.');
        hotelStreetInput?.focus();
        hotelStreetInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (!hotelNumber) {
        alert('Por favor indica el número de tu alojamiento (o s/n si no tiene número).');
        hotelNumberInput?.focus();
        hotelNumberInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Validar Pasajero 1 (Titular)
    const p1NameInput = document.getElementById('passenger-name-1');
    const p1DocInput = document.getElementById('passenger-doc-1');
    const p1AgeInput = document.getElementById('passenger-age-1');
    const p1EmailInput = document.getElementById('passenger-email-1');
    const p1PhoneInput = document.getElementById('passenger-phone-1');
    const p1WaInput = document.getElementById('passenger-wa-1');

    const p1Name = p1NameInput?.value.trim();
    const p1Doc = p1DocInput?.value.trim();
    const p1Age = p1AgeInput?.value.trim();
    const p1Email = p1EmailInput?.value.trim();
    const p1Phone = p1PhoneInput?.value.trim();
    const p1Wa = p1WaInput?.value.trim() || p1Phone;

    if (!p1Name) {
        alert('Por favor ingresa el nombre y apellido del Pasajero 1 (Titular).');
        p1NameInput?.focus();
        p1NameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (!p1Age) {
        alert('Por favor ingresa la edad del Pasajero 1.');
        p1AgeInput?.focus();
        p1AgeInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (!p1Doc) {
        alert('Por favor ingresa el RUT o Pasaporte del Pasajero 1.');
        p1DocInput?.focus();
        p1DocInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (!p1Email || !p1Email.includes('@')) {
        alert('Por favor ingresa un correo electrónico válido para enviar los pasajes digitales.');
        p1EmailInput?.focus();
        p1EmailInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (!p1Phone) {
        alert('Por favor ingresa un teléfono o WhatsApp de contacto para coordinar el pick-up.');
        p1PhoneInput?.focus();
        p1PhoneInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const passengers = [];
    passengers.push({
        seatNumber: allocatedSeatNumbers[0] || 1,
        name: p1Name,
        passengerName: p1Name,
        age: parseInt(p1Age, 10),
        passengerAge: parseInt(p1Age, 10),
        doc: p1Doc,
        passengerDoc: p1Doc,
        email: p1Email,
        passengerEmail: p1Email,
        phone: p1Phone,
        passengerPhone: p1Phone,
        whatsapp: p1Wa,
        passengerWhatsapp: p1Wa
    });

    for (let idx = 2; idx <= selectedQuantity; idx++) {
        const nameInput = document.getElementById(`passenger-name-${idx}`);
        const ageInput = document.getElementById(`passenger-age-${idx}`);
        const docInput = document.getElementById(`passenger-doc-${idx}`);

        const name = nameInput?.value.trim();
        const age = ageInput?.value.trim();
        const doc = docInput?.value.trim();
        const email = document.getElementById(`passenger-email-${idx}`)?.value.trim() || p1Email;
        const phone = document.getElementById(`passenger-phone-${idx}`)?.value.trim() || p1Phone;
        const wa = document.getElementById(`passenger-wa-${idx}`)?.value.trim() || p1Wa;

        if (!name) {
            alert(`Por favor ingresa el nombre del Pasajero N° ${idx}.`);
            nameInput?.focus();
            nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (!age) {
            alert(`Por favor ingresa la edad del Pasajero N° ${idx}.`);
            ageInput?.focus();
            ageInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (!doc) {
            alert(`Por favor ingresa el RUT o Pasaporte del Pasajero N° ${idx}.`);
            docInput?.focus();
            docInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

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

    const mobileBarBtn = document.getElementById('mobile-bar-action-btn');
    if (mobileBarBtn) {
        mobileBarBtn.disabled = true;
        mobileBarBtn.innerHTML = 'Conectando...';
    }

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

        const textResponse = await res.text();
        let json;
        try {
            json = JSON.parse(textResponse);
        } catch (e) {
            console.error('Non-JSON response from server:', textResponse);
            throw new Error(`El servidor respondió con un error (${res.status}). Por favor recarga e intenta nuevamente.`);
        }

        if (json.success && json.data.webpayUrl && json.data.token) {
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
        if (mobileBarBtn) {
            mobileBarBtn.disabled = false;
            mobileBarBtn.innerHTML = 'Pagar Webpay →';
        }
    }
}

// Handler global para la barra flotante móvil inferior
window.handleMobileBottomAction = function() {
    initiateWebpayPayment();
};
