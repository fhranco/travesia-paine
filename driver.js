// Driver Engine for Manifest Control (Tour Selector + Native Date Picker Calendar)

let currentTourId = null;
let currentTourDateId = null;
let driverDatesMap = {}; // travel_date -> tour_date_id

document.addEventListener('DOMContentLoaded', () => {
    initDriverApp();
});

async function initDriverApp() {
    setupEventListeners();
    await loadTours();
}

async function loadTours() {
    try {
        const res = await fetch('/api/tours');
        const json = await res.json();

        if (json.success && json.data.length > 0) {
            const tourSelect = document.getElementById('driver-tour-select');
            tourSelect.innerHTML = json.data.map(t => `
                <option value="${t.id}">${t.name} (Salida ${t.departure_time})</option>
            `).join('');

            currentTourId = json.data[0].id;
            await loadDatesForDriverTour(currentTourId);
        }
    } catch (err) {
        console.error('Error loading tours for driver:', err);
    }
}

async function loadDatesForDriverTour(tourId) {
    try {
        const datePicker = document.getElementById('driver-date-picker');
        const dateInfo = document.getElementById('driver-date-info');
        datePicker.disabled = true;

        const res = await fetch(`/api/tours/${tourId}/dates`);
        const json = await res.json();

        if (json.success && json.data.length > 0) {
            driverDatesMap = {};
            json.data.forEach(d => {
                driverDatesMap[d.travel_date] = d.id;
            });

            const dates = json.data.map(d => d.travel_date).sort();
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];

            datePicker.min = minDate;
            datePicker.max = maxDate;
            
            // Si la fecha actual seleccionada existe en el mapa, mantenerla; si no, ir al día 1
            if (!driverDatesMap[datePicker.value]) {
                datePicker.value = minDate;
            }

            datePicker.disabled = false;
            currentTourDateId = driverDatesMap[datePicker.value];

            if (dateInfo) {
                dateInfo.textContent = `📅 Temporada disponible: ${minDate} al ${maxDate}.`;
            }

            await refreshManifest();
        } else {
            datePicker.disabled = true;
            if (dateInfo) {
                dateInfo.textContent = '❌ No hay salidas programadas para este tour.';
            }
        }
    } catch (err) {
        console.error('Error loading dates for driver:', err);
    }
}

function setupEventListeners() {
    const tourSelect = document.getElementById('driver-tour-select');
    if (tourSelect) {
        tourSelect.addEventListener('change', async (e) => {
            currentTourId = e.target.value;
            await loadDatesForDriverTour(currentTourId);
        });
    }

    const datePicker = document.getElementById('driver-date-picker');
    if (datePicker) {
        datePicker.addEventListener('change', async (e) => {
            const selectedDate = e.target.value;
            const dateInfo = document.getElementById('driver-date-info');

            if (driverDatesMap[selectedDate]) {
                currentTourDateId = driverDatesMap[selectedDate];
                if (dateInfo) {
                    dateInfo.textContent = `✓ Fecha seleccionada: ${selectedDate}`;
                    dateInfo.style.color = '#4ADE80';
                }
                await refreshManifest();
            } else {
                alert('No hay salidas programadas para esa fecha.');
            }
        });
    }
}

async function refreshManifest() {
    if (!currentTourDateId) return;

    try {
        const res = await fetch(`/api/driver/manifest/${currentTourDateId}`);
        const json = await res.json();

        if (json.success) {
            // Update stats
            const statCap = document.getElementById('stat-capacity');
            const statPaid = document.getElementById('stat-paid');
            if (statCap) statCap.textContent = json.data.stats.totalCapacity;
            if (statPaid) statPaid.textContent = json.data.stats.totalPaid;

            // Configure Export URLs (PDF Landscape & CSV)
            const btnPdf = document.getElementById('btn-export-pdf');
            if (btnPdf) btnPdf.href = `/api/driver/manifest/${currentTourDateId}/export-pdf`;
            
            const btnCsv = document.getElementById('btn-export-csv');
            if (btnCsv) btnCsv.href = `/api/driver/manifest/${currentTourDateId}/export-csv`;

            // Render passengers table
            const tbody = document.getElementById('manifest-tbody');
            if (!tbody) return;

            if (json.data.passengers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
                            No hay reservas pagadas para esta fecha y tour aún.
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = json.data.passengers.map(p => {
                    const hotelInfo = p.hotel_name 
                        ? `<strong>${p.hotel_name}</strong><br><span style="font-size: 0.8rem; color: var(--color-text-muted);">${p.hotel_street || ''} ${p.hotel_number || ''}</span>`
                        : `<span style="color: var(--color-text-muted);">Sin especificar</span>`;

                    const contactInfo = `Tel: ${p.passenger_phone || '-'}<br><span style="color: #4ADE80; font-size: 0.8rem;">WA: ${p.passenger_whatsapp || p.passenger_phone || '-'}</span>`;

                    return `
                    <tr id="row-passenger-${p.id}">
                        <td><strong style="color: var(--color-accent); font-size: 1.05rem;">N° ${p.seat_number.toString().padStart(2, '0')}</strong></td>
                        <td><strong>${p.passenger_name}</strong> (${p.passenger_age || '-'} años)<br><span style="font-size: 0.75rem; color: var(--color-text-muted);">${p.booking_code}</span></td>
                        <td style="font-weight: 600;">${p.passenger_doc}</td>
                        <td>${contactInfo}</td>
                        <td>${hotelInfo}</td>
                    </tr>
                `}).join('');
            }
        }
    } catch (err) {
        console.error('Error loading manifest:', err);
    }
}
