const Database = require('better-sqlite3');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbPath = process.env.DB_FILE || path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
    // 1. Tours table
    db.exec(`
        CREATE TABLE IF NOT EXISTS tours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            tagline TEXT,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            return_time TEXT,
            price_clp INTEGER NOT NULL,
            capacity INTEGER NOT NULL DEFAULT 16,
            description TEXT,
            important_note TEXT,
            tour_type TEXT NOT NULL DEFAULT 'TRANSFER',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Tour Dates table
    db.exec(`
        CREATE TABLE IF NOT EXISTS tour_dates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tour_id INTEGER NOT NULL,
            travel_date TEXT NOT NULL, -- YYYY-MM-DD
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
            UNIQUE(tour_id, travel_date)
        );
    `);

    // 3. Seats table (Atomic seat status)
    db.exec(`
        CREATE TABLE IF NOT EXISTS seats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tour_date_id INTEGER NOT NULL,
            seat_number INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'LOCKED', 'PAID'
            locked_until DATETIME,
            lock_session_id TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tour_date_id) REFERENCES tour_dates(id) ON DELETE CASCADE,
            UNIQUE(tour_date_id, seat_number)
        );
    `);

    // 4. Bookings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_code TEXT NOT NULL UNIQUE,
            security_token TEXT NOT NULL UNIQUE,
            tour_date_id INTEGER NOT NULL,
            seat_id INTEGER NOT NULL,
            seat_number INTEGER NOT NULL,
            passenger_name TEXT NOT NULL,
            passenger_age INTEGER,
            passenger_doc TEXT NOT NULL,
            passenger_email TEXT NOT NULL,
            passenger_phone TEXT,
            passenger_whatsapp TEXT,
            hotel_name TEXT,
            hotel_street TEXT,
            hotel_number TEXT,
            policies_accepted INTEGER NOT NULL DEFAULT 1,
            amount_clp INTEGER NOT NULL,
            payment_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'FAILED'
            checked_in INTEGER NOT NULL DEFAULT 0,
            check_in_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tour_date_id) REFERENCES tour_dates(id),
            FOREIGN KEY (seat_id) REFERENCES seats(id)
        );
    `);

    // 5. Transactions table (Webpay log)
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            buy_order TEXT NOT NULL UNIQUE,
            session_id TEXT NOT NULL,
            tbk_token TEXT,
            amount INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'INITIALIZED',
            authorization_code TEXT,
            response_code INTEGER,
            payment_type_code TEXT,
            shares_number INTEGER,
            card_last_digits TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        );
    `);

    seedInitialData();
    migrateTo16Seats();
    migrateTransactionsTable();
    updateSeasonAndPolicies();
}

function migrateTransactionsTable() {
    try {
        const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'`).get();
        if (tableInfo && tableInfo.sql.includes('buy_order TEXT NOT NULL UNIQUE')) {
            db.exec(`
                CREATE TABLE transactions_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    booking_id INTEGER NOT NULL,
                    buy_order TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    tbk_token TEXT,
                    amount INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'INITIALIZED',
                    authorization_code TEXT,
                    response_code INTEGER,
                    payment_type_code TEXT,
                    shares_number INTEGER,
                    card_last_digits TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (booking_id) REFERENCES bookings(id)
                );
                INSERT INTO transactions_new SELECT * FROM transactions;
                DROP TABLE transactions;
                ALTER TABLE transactions_new RENAME TO transactions;
                CREATE INDEX IF NOT EXISTS idx_transactions_buy_order ON transactions(buy_order);
                CREATE INDEX IF NOT EXISTS idx_transactions_tbk_token ON transactions(tbk_token);
            `);
            console.log('✅ Migración de transactions multi-pasajero aplicada exitosamente.');
        }
    } catch (e) {
        console.error('Error migrating transactions table:', e.message);
    }
}

function migrateTo16Seats() {
    try {
        db.prepare(`UPDATE tours SET capacity = 16 WHERE capacity < 16`).run();
        const dates = db.prepare(`SELECT id FROM tour_dates`).all();
        const insertSeat = db.prepare(`INSERT OR IGNORE INTO seats (tour_date_id, seat_number, status) VALUES (?, ?, 'AVAILABLE')`);
        
        const migrationTx = db.transaction(() => {
            for (const d of dates) {
                for (let s = 1; s <= 16; s++) {
                    insertSeat.run(d.id, s);
                }
            }
        });
        migrationTx();
        console.log('🚐 Capacidad actualizada a 16 pasajeros por salida.');
    } catch (e) {
        console.error('Error migrating to 16 seats:', e.message);
    }
}

function updateSeasonAndPolicies() {
    try {
        // 1. Actualizar descripciones oficiales y políticas de los 2 tours regulares
        db.prepare(`
            UPDATE tours 
            SET departure_time = '06:30 AM',
                return_time = '19:00 PM (Espera en Centro de Bienvenida)',
                description = 'Servicio de transporte de ida y regreso hacia el Centro de Bienvenida (Base Torres del Paine). Pick-up desde las 06:30 AM en tus alojamientos dentro del radio urbano de Puerto Natales. Una vez arriba en el Centro de Bienvenida, la van espera a los pasajeros hasta las 19:00 hrs para el retorno a sus hostales.',
                important_note = 'TRANSPORTE EXCLUSIVO: Este servicio corresponde únicamente a traslado en van (no incluye guía de montaña). Cada pasajero realiza el sendero por su cuenta. Pasajeros alojados fuera del radio urbano de Puerto Natales deberán esperar en la Plaza de Armas. Cancelación con más de 3 días: devolución del 60%. Cancelación con menos de 24 hrs: sin devolución.'
            WHERE tour_type = 'TREKKING_BASE_TORRES' OR id = 2
        `).run();

        db.prepare(`
            UPDATE tours 
            SET departure_time = '07:00 AM',
                important_note = 'MODALIDAD BAJO COSTO: Servicio enfocado en transporte y recorrido de los principales miradores del parque y Cueva del Milodón. No incluye guía de turismo. Cancelación con más de 3 días: devolución del 60%. Cancelación con menos de 24 hrs: sin devolución.'
            WHERE tour_type = 'FULL_DAY_BAJO_COSTO' OR id = 1
        `).run();

        // 2. Generar fechas para la temporada oficial 1 de Noviembre al 30 de Abril
        const tours = db.prepare(`SELECT id FROM tours`).all();
        const insertDate = db.prepare(`INSERT OR IGNORE INTO tour_dates (tour_id, travel_date) VALUES (?, ?)`);
        const insertSeat = db.prepare(`INSERT OR IGNORE INTO seats (tour_date_id, seat_number, status) VALUES (?, ?, 'AVAILABLE')`);

        const seasonTx = db.transaction(() => {
            const today = new Date();
            const datesToSeed = new Set();

            // Incluir próximos 45 días desde hoy para pruebas inmediatas
            for (let i = 0; i < 45; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                datesToSeed.add(d.toISOString().split('T')[0]);
            }

            // Temporada oficial activa: 1 de Noviembre 2026 hasta 30 de Abril 2027
            const start = new Date('2026-11-01T00:00:00');
            const end = new Date('2027-04-30T00:00:00');
            let cur = new Date(start);
            while (cur <= end) {
                datesToSeed.add(cur.toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }

            for (const t of tours) {
                for (const dateStr of datesToSeed) {
                    insertDate.run(t.id, dateStr);
                    const td = db.prepare(`SELECT id FROM tour_dates WHERE tour_id = ? AND travel_date = ?`).get(t.id, dateStr);
                    if (td) {
                        for (let s = 1; s <= 16; s++) {
                            insertSeat.run(td.id, s);
                        }
                    }
                }
            }
        });

        seasonTx();
        console.log('✅ Temporada 1 de Noviembre al 30 de Abril sincronizada con 16 asientos por salida.');
    } catch (err) {
        console.error('Error sincronizando temporada y políticas:', err.message);
    }
}

function seedInitialData() {
    const count = db.prepare(`SELECT count(*) as count FROM tours`).get().count;
    if (count > 0) {
        console.log('📦 Base de datos activa detectada. Manifiestos y reservas protegidos contra borrado.');
        return;
    }

    const insertTour = db.prepare(`
        INSERT INTO tours (name, tagline, origin, destination, departure_time, return_time, price_clp, capacity, description, important_note, tour_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. FULL DAY TORRES DEL PAINE - BAJO COSTO
    const tour1 = insertTour.run(
        'Full Day Torres del Paine – Bajo Costo',
        'Una alternativa económica para conocer el Parque Nacional Torres del Paine',
        'Puerto Natales (Pick-up en tu alojamiento)',
        'Parque Nacional Torres del Paine & Cueva del Milodón',
        '07:00 AM',
        'Retorno vespertino según condiciones',
        38000,
        16,
        'Comenzamos nuestro recorrido a las 07:00 hrs realizando el pick-up en sus alojamientos de Puerto Natales para dirigirnos hacia el Parque Nacional Torres del Paine. Durante el recorrido visitaremos diferentes puntos de interés del parque, realizando diversas paradas fotográficas y contemplativas. Además, visitaremos el Monumento Natural Cueva del Milodón. El ingreso podrá ser por Portería Laguna Amarga o Portería Serrano según condiciones del día.',
        'Esta excursión corresponde a una modalidad de tour de bajo costo y no contempla servicio de guía turístico. El servicio está orientado principalmente al transporte y recorrido por los principales puntos de interés con las mismas paradas de un tour regular.',
        'FULL_DAY_BAJO_COSTO'
    );

    // 2. TREKKING BASE TORRES
    const tour2 = insertTour.run(
        'Trekking Base Torres',
        'Vive uno de los trekkings más emblemáticos de la Patagonia',
        'Puerto Natales (Pick-up en tu alojamiento)',
        'Centro de Bienvenida / Base Torres del Paine',
        '06:30 AM',
        '18:30 PM (Esperamos hasta esta hora para retornar)',
        35000,
        16,
        'Comenzamos a las 06:30 hrs con el pick-up en alojamientos de Puerto Natales hacia Portería Laguna Amarga (control de entradas) y continuamos hasta el Centro de Bienvenida, desde donde comenzarás por cuenta propia el trekking hacia el Mirador Base Torres. El vehículo permanecerá esperando en el punto de encuentro hasta las 18:30 hrs para el retorno.',
        'Este servicio corresponde exclusivamente al transporte de ida y regreso y no incluye guía de trekking. Cada pasajero realiza el sendero por cuenta propia respetando las normas y restricciones de CONAF.',
        'TREKKING_BASE_TORRES'
    );

    // Seed dates for next 45 days
    const insertDate = db.prepare(`INSERT INTO tour_dates (tour_id, travel_date) VALUES (?, ?)`);
    const insertSeat = db.prepare(`INSERT INTO seats (tour_date_id, seat_number, status) VALUES (?, ?, 'AVAILABLE')`);

    const today = new Date();
    for (let i = 0; i < 45; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        // Tour 1 (16 Seats)
        const res1 = insertDate.run(tour1.lastInsertRowid, dateStr);
        const dateId1 = res1.lastInsertRowid;
        for (let s = 1; s <= 16; s++) {
            insertSeat.run(dateId1, s);
        }

        // Tour 2 (16 Seats)
        const res2 = insertDate.run(tour2.lastInsertRowid, dateStr);
        const dateId2 = res2.lastInsertRowid;
        for (let s = 1; s <= 16; s++) {
            insertSeat.run(dateId2, s);
        }
    }
    console.log('✅ Base de datos actualizada con van de 16 asientos y 45 días de salidas disponibles.');
}

initSchema();

module.exports = db;
