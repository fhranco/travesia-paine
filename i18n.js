// Motor de Traducción Multiidioma Global Completo y Exhaustivo (Español, English, Português) para Travesía Paine

const siteTranslations = {
    es: {
        // Navegación
        navHome: "Inicio",
        navTours: "Excursiones",
        navAbout: "Quiénes Somos",
        navBook: "Reserva Online",
        navPolicies: "Políticas",
        navBookTransfer: "Reservar Cupos",

        // Hero
        heroTag: "Temporada 2026 / 2027 Disponible",
        heroTitle: "Descubre Torres del Paine con Tarifas Convenientes",
        heroSubtitle: "Somos una empresa familiar de turismo en Puerto Natales. Ofrecemos traslados y excursiones accesibles, responsables y directas hacia los rincones más impresionantes de la Patagonia.",
        heroBtnTours: "Ver Excursiones",
        heroBtnBook: "Reservar Cupos",

        // Buscador Recorrido.cl Style
        searchTabTours: "Excursiones y Pasajes de Van",
        searchLiveStatus: "Salidas Confirmadas Diarias",
        searchLabelOrigin: "📍 Origen",
        searchLabelDest: "🏔️ Destino / Excursión",
        searchLabelDate: "📅 Fecha de Salida",
        searchBtnSubmit: "Consultar Cupos",
        searchPill1: "Disponibilidad de Cupos en Vivo",
        searchPill2: "Pago Seguro Webpay Plus",
        searchPill3: "Pasaje Digital Inmediato",
        searchPill4: "Van Máx. 16 Pasajeros",

        // Stats
        stat1Num: "07:00 AM",
        stat1Text: "Pick-up en tu Alojamiento",
        stat2Num: "100%",
        stat2Text: "Empresa Familiar Local",
        stat3Num: "Bajo Costo",
        stat3Text: "Tarifas Justas y Accesibles",
        stat4Num: "Webpay",
        stat4Text: "Pago Seguro y Pasaje Digital",

        // Excursiones
        toursTag: "Nuestras Rutas",
        toursTitle: "Excursiones y Traslados",
        toursSubtitle: "Tarifas claras, salidas diarias desde Puerto Natales y reserva directa de cupos.",
        
        tour1Badge: "Bajo Costo",
        tour1Time: "⏱ Salida 07:00 AM · Todo el Día",
        tour1Title: "Full Day Torres del Paine",
        tour1Desc: "Una alternativa económica para conocer el Parque Nacional y Cueva del Milodón.",
        tour1BtnDetails: "ℹ️ Ver Detalles",
        tour1BtnBook: "Reservar Cupo",

        tour2Badge: "Transporte Directo",
        tour2Time: "⏱ Salida 06:30 AM · Espera en Parque hasta 19:00 hrs",
        tour2Title: "Trekking Base Torres",
        tour2Desc: "Exclusivo transporte ida y regreso al Mirador Base Torres (sin guía). Pick-up desde 06:30 AM y retorno a sus hostales.",

        // Quiénes somos
        aboutTag: "Nuestra Identidad",
        aboutTitle: "Somos una Empresa Familiar",
        aboutDesc1: "Somos una empresa familiar de turismo, lo que nos permite ofrecer tarifas más convenientes al administrar directamente gran parte de nuestra operación.",
        aboutDesc2: "Nosotros mismos nos encargamos de la atención de nuestros pasajeros, reservas, coordinación, logística y transporte, buscando entregar un servicio cercano, responsable y a un precio accesible.",
        aboutGoalTitle: "Nuestro Objetivo",
        aboutGoalText: "Que más personas puedan conocer y disfrutar de los increíbles paisajes de la Patagonia sin pagar de más.",

        // Reserva Online Steps
        stepsTag: "Fácil y Rápido",
        stepsTitle: "Reserva Online",
        stepsSubtitle: "Asegura tus cupos en la van en 3 simples pasos con confirmación instantánea.",
        step1Title: "Elige Tour y Pasajeros",
        step1Desc: "Selecciona tu excursión, fecha y cantidad de pasajeros con disponibilidad de cupos en tiempo real (Van de 16 asientos).",
        step2Title: "Datos y Alojamiento",
        step2Desc: "Ingresa los datos de tus pasajeros y la dirección de tu alojamiento en Puerto Natales para coordinar tu horario exacto de pick-up.",
        step3Title: "Pago Seguro & Pasaje Digital",
        step3Desc: "Paga con Webpay Plus y descarga tu comprobante digital. El chofer verificará directamente tus datos con su manifiesto de abordaje.",

        // Transfers / Booking Page (transfers.html)
        bookingBannerTag: "Reserva Directa Online",
        bookingBannerTitle: "Formulario de Reserva de Cupos",
        bookingBannerDesc: "Selecciona tu excursión, indica la cantidad de pasajeros y completa los datos de tu alojamiento para coordinar tu pick-up en Puerto Natales.",
        
        bookingStep1Title: "1. Selecciona tu Excursión y Fecha",
        labelTour: "Excursión o Servicio:",
        labelDate: "Fecha de la Excursión (Selecciona en el Calendario):",
        dateInfoAvailable: "📅 Fechas disponibles para la temporada actual.",

        bookingStep2Title: "2. Cantidad de Pasajeros / Cupos (Van Máx. 16 Pasajeros)",
        timerText: "Tiempo restante para completar tu compra:",
        openSeatingTitle: "Ubicación libre por orden de recogida:",
        openSeatingDesc: "Los asientos no se numeran. Cada pasajero se ubica libremente en la van al momento de su recogida en el alojamiento en Puerto Natales.",
        labelNumPassengers: "¿Cuántos pasajeros viajan?",
        passengersWord: "pasajero(s)",
        subtotalLabel: "Subtotal Cupos Seleccionados:",

        bookingStep3Title: "3. Formulario de Reserva & Datos del Pasajero",
        emptySeatsNotice: "👈 <strong>Por favor selecciona la cantidad de pasajeros</strong> para habilitar los formularios de datos individuales.",
        
        passengerLabel: "Pasajero",
        seatLabel: "Cupo N°",
        labelFullName: "Nombre Completo *",
        placeholderFullName: "Ej: Juan Pérez",
        labelAge: "Edad *",
        placeholderAge: "Ej: 32",
        labelDoc: "RUT o Pasaporte *",
        placeholderDoc: "Ej: 12.345.678-9 o Pasaporte",
        labelEmail: "Correo Electrónico (para envío de pasaje) *",
        placeholderEmail: "Ej: juan@gmail.com",
        labelPhone: "Teléfono de Contacto *",
        placeholderPhone: "Ej: +56 9 1234 5678",
        labelWa: "WhatsApp de Contacto (con código de país) *",
        placeholderWa: "Ej: +56912345678",

        hotelSectionTitle: "📍 Datos de Alojamiento en Puerto Natales (Pick-up)",
        hotelSectionSubtitle: "La información del alojamiento es necesaria para coordinar correctamente el horario y lugar de pick-up de todos los pasajeros.",
        labelHotelName: "Nombre del Alojamiento / Hotel / Hostal *",
        placeholderHotelName: "Ej: Hotel Costaustralis / Hostal Patagonia",
        labelStreet: "Calle *",
        placeholderStreet: "Ej: Pedro Montt",
        labelNumber: "Número *",
        placeholderNumber: "Ej: 160",

        summarySeatLabel: "Asiento(s) Seleccionado(s):",
        summaryTourLabel: "Excursión:",
        summaryDateLabel: "Fecha & Pick-up:",
        summaryTotalLabel: "Total a Pagar:",
        
        policyAgreeText: "<strong>☐ ACEPTO</strong> haber leído, comprendido y aceptado las <a href=\"index.html#politicas\" target=\"_blank\" style=\"color: var(--color-accent); text-decoration: underline;\">Políticas de Reserva, Cancelación y Reembolso</a> de Travesía Paine.",
        btnPayText: "Pagar con Webpay Plus (Tarjetas)",
        securityBadgeText: "Pago 100% seguro y encriptado por Transbank Webpay Plus. Emisión automática de Pasaje Digital oficial.",

        // Políticas en Acordeón
        policiesTag: "Términos y Condiciones",
        policiesTitle: "Políticas de Reserva, Cancelación y Reembolso",
        policiesSubtitle: "Haz clic en cada sección para desplegar y revisar los términos del servicio.",
        
        pol1Header: "1. Política de Reservas",
        pol1Body: "<p>El cliente podrá realizar la reserva y/o compra de nuestros servicios a través de nuestra página web o mediante los enlaces de reserva disponibles en ella.</p><p>Para realizar una reserva, el cliente deberá proporcionar la siguiente información:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li>Excursión o servicio que desea contratar.</li><li>Fecha de la excursión.</li><li>Cantidad de pasajeros.</li><li>Nombre y datos de contacto del responsable de la reserva.</li><li>Lugar de alojamiento en Puerto Natales, cuando corresponda, para coordinar el horario y lugar de pick-up.</li></ul><p>Una vez realizada la reserva, el cliente deberá revisar y verificar que los datos proporcionados sean correctos.</p>",

        pol2Header: "2. Política de Cancelaciones & Condiciones de Transporte",
        pol2Body: "<p>El cliente podrá cancelar su reserva según las siguientes condiciones:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li><strong>Más de 3 días de anticipación:</strong> Devolución del 60% del valor pagado.</li><li><strong>Menos de 24 horas:</strong> Sin devolución (0%).</li><li><strong>No Show:</strong> Sin devolución (0%).</li></ul><div style=\"background: rgba(30, 90, 64, 0.06); border-left: 4px solid var(--color-primary); padding: 0.8rem 1rem; margin: 0.8rem 0;\"><h4 style=\"color: var(--color-primary); font-size: 0.92rem; margin-bottom: 0.3rem;\">🚐 Traslado Base Torres:</h4><p style=\"margin: 0; font-size: 0.86rem;\">Servicio exclusivo de transporte. Pick-up desde 06:30 AM en hostales de Natales (alojados fuera esperan en Plaza de Armas). En Centro de Bienvenida se espera a los pasajeros hasta las 19:00 hrs.</p></div><p>Cierre de reservas web: 17:00 hrs del día anterior. Cupos completos o solicitudes de última hora se derivan a WhatsApp.</p>",

        pol3Header: "3. Política de Reembolso por Condiciones Climáticas",
        pol3Body: "<p>En caso de que una excursión sea cancelada por condiciones climáticas adversas, y dicha cancelación sea determinada por el proveedor del servicio antes del inicio de la actividad, se realizará el reembolso del 100% del valor pagado, según corresponda.</p><div style=\"background: var(--color-bg-dark); padding: 0.9rem; border-radius: var(--radius-sm); margin: 0.8rem 0;\"><strong style=\"color: var(--color-accent);\">Trekking Base Torres:</strong> En el caso específico del Trekking Base Torres, si la actividad es cancelada por condiciones climáticas o de seguridad por CONAF durante el desarrollo de la excursión, no se realizará reembolso. Esta situación puede producirse in situ, en un punto del sendero determinado por la autoridad competente, sin previo aviso y una vez que la actividad ya se encuentra en desarrollo. En estos casos, la decisión corresponde a CONAF y está fuera del control de nuestra empresa.</div><p>Los reembolsos que correspondan serán gestionados en un plazo de hasta 7 días, de acuerdo con el medio de pago utilizado y las condiciones aplicables.</p>",

        pol4Header: "4. Medios de Pago Online",
        pol4Body: "<p>Nuestros servicios podrán ser pagados mediante:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li>Tarjetas de crédito y débito (vía Webpay Plus).</li><li>Transferencia bancaria.</li><li>PayPal.</li></ul>",

        pol5Header: "5. No Presentación (No Show)",
        pol5Body: "<p>Si el pasajero no se presenta, no se encuentra disponible o no está preparado para realizar el tour en el horario previamente informado y coordinado por nuestra agencia, el servicio será considerado como No Presentación (No Show) y no tendrá derecho a reembolso.</p><p>El pasajero deberá encontrarse preparado y disponible en el lugar de recogida y dentro del horario informado previamente por nuestra agencia. Cualquier retraso ocasionado por el pasajero que impida realizar el servicio, incluyendo no encontrarse disponible al momento del pick-up, será registrado como No Presentación (No Show).</p>",

        pol6Header: "6. Aceptación de las Políticas",
        pol6Body: "<p>Al realizar una reserva y/o efectuar el pago del servicio, el cliente declara haber leído, comprendido y aceptado las presentes Políticas de Reserva, Cancelación y Reembolso.</p>",

        // Footer
        footerAboutText: "Empresa familiar de turismo en Puerto Natales. Excursiones y traslados de bajo costo al Parque Nacional Torres del Paine.",
        footerToursTitle: "Excursiones",
        footerInfoTitle: "Información",
        footerContactTitle: "Contacto & Excursiones",
        footerHours: "⏱ Atención diaria: 07:00 - 21:00 hrs",
        footerCopy: "© 2026 TRAVESÍA PAINE. TODOS LOS DERECHOS RESERVADOS. EMPRESA FAMILIAR DE TURISMO.",
        btnFooterWa: "💬 WhatsApp Directo Chofer / Base",
        floatingWaBadge: "💬 ¿Dudas? Escríbenos"
    },

    en: {
        // Navigation
        navHome: "Home",
        navTours: "Tours",
        navAbout: "About Us",
        navBook: "Book Online",
        navPolicies: "Policies",
        navBookTransfer: "Book Tickets",

        // Hero
        heroTag: "Season 2026 / 2027 Available",
        heroTitle: "Discover Torres del Paine with Affordable Rates",
        heroSubtitle: "We are a family-owned tourism company based in Puerto Natales. We provide accessible, reliable, and direct transfers and excursions to the most breathtaking locations in Patagonia.",
        heroBtnTours: "Explore Tours",
        heroBtnBook: "Book Tickets",

        // Bus Search Recorrido.cl Style (EN)
        searchTabTours: "Tours & Van Tickets",
        searchLiveStatus: "Daily Confirmed Departures",
        searchLabelOrigin: "📍 Origin",
        searchLabelDest: "🏔️ Destination / Tour",
        searchLabelDate: "📅 Departure Date",
        searchBtnSubmit: "Check Availability",
        searchPill1: "Live Quota Availability",
        searchPill2: "Secure Webpay Plus",
        searchPill3: "Instant Digital Ticket",
        searchPill4: "Van Max. 16 Passengers",

        // Stats
        stat1Num: "07:00 AM",
        stat1Text: "Pick-up at your Accommodation",
        stat2Num: "100%",
        stat2Text: "Local Family Business",
        stat3Num: "Low Cost",
        stat3Text: "Fair & Affordable Fares",
        stat4Num: "Webpay",
        stat4Text: "Secure Payment & Digital Ticket",

        // Tours
        toursTag: "Our Routes",
        toursTitle: "Tours & Transfers",
        toursSubtitle: "Clear rates, daily departures from Puerto Natales, and direct ticket reservations.",
        
        tour1Badge: "Budget-Friendly",
        tour1Time: "⏱ Departure 07:00 AM · Full Day",
        tour1Title: "Full Day Torres del Paine",
        tour1Desc: "An economical option to explore the National Park and Milodon Cave.",
        tour1BtnDetails: "ℹ️ View Details",
        tour1BtnBook: "Book Ticket",

        tour2Badge: "Direct Transport",
        tour2Time: "⏱ Departure 06:30 AM · Shuttle waiting until 19:00 hrs",
        tour2Title: "Base Torres Trekking Transport",
        tour2Desc: "Direct roundtrip transport to the Base Torres trail (no guide). Pick-up from 06:30 AM and return to your hostels.",

        // About Us
        aboutTag: "Our Identity",
        aboutTitle: "We Are a Family Business",
        aboutDesc1: "We are a family-owned tour operator, allowing us to offer lower rates by directly managing our operations and logistics.",
        aboutDesc2: "We personally take care of passenger service, bookings, coordination, and transportation, aiming to provide a friendly, responsible, and affordable experience.",
        aboutGoalTitle: "Our Mission",
        aboutGoalText: "Enabling more travelers to discover and enjoy the spectacular landscapes of Patagonia without overpaying.",

        // Steps
        stepsTag: "Easy & Fast",
        stepsTitle: "Book Online",
        stepsSubtitle: "Secure your seats on our 16-passenger van in 3 simple steps with instant confirmation.",
        step1Title: "Choose Tour & Passengers",
        step1Desc: "Select your excursion, date, and number of passengers with real-time seat availability (16-passenger van).",
        step2Title: "Passenger Details & Hotel",
        step2Desc: "Enter passenger information and your Puerto Natales accommodation address for pick-up coordination.",
        step3Title: "Secure Payment & Digital Voucher",
        step3Desc: "Pay with Webpay Plus and get your digital ticket instantly. The driver will cross-check your name on the manifest.",

        // Transfers / Booking Page
        bookingBannerTag: "Direct Online Booking",
        bookingBannerTitle: "Online Booking Form",
        bookingBannerDesc: "Select your excursion, choose the number of passengers, and fill in accommodation details for Puerto Natales pick-up.",
        
        bookingStep1Title: "1. Select Tour & Date",
        labelTour: "Excursion or Service:",
        labelDate: "Excursion Date (Choose in Calendar):",
        dateInfoAvailable: "📅 Available dates for the current season.",

        bookingStep2Title: "2. Number of Passengers / Tickets (Van Max. 16 Passengers)",
        timerText: "Time remaining to complete your booking:",
        openSeatingTitle: "Open seating by pick-up order:",
        openSeatingDesc: "Seats are not numbered. Each passenger freely takes a seat upon boarding the van during the Puerto Natales pick-up route.",
        labelNumPassengers: "How many passengers are travelling?",
        passengersWord: "passenger(s)",
        subtotalLabel: "Selected Tickets Subtotal:",

        bookingStep3Title: "3. Passenger Information & Hotel",
        emptySeatsNotice: "👈 <strong>Please select the number of passengers</strong> to enable individual passenger forms.",
        
        passengerLabel: "Passenger",
        seatLabel: "Ticket N°",
        labelFullName: "Full Name *",
        placeholderFullName: "E.g. John Doe",
        labelAge: "Age *",
        placeholderAge: "E.g. 32",
        labelDoc: "ID / Passport Number *",
        placeholderDoc: "E.g. Passport number",
        labelEmail: "Email (for ticket delivery) *",
        placeholderEmail: "E.g. john@gmail.com",
        labelPhone: "Contact Phone *",
        placeholderPhone: "E.g. +1 555 123 4567",
        labelWa: "WhatsApp (with country code) *",
        placeholderWa: "E.g. +15551234567",

        hotelSectionTitle: "📍 Accommodation in Puerto Natales (Pick-up)",
        hotelSectionSubtitle: "Accommodation information is required to coordinate exact morning pick-up location and time.",
        labelHotelName: "Hotel / Hostel / Lodging Name *",
        placeholderHotelName: "E.g. Hotel Costaustralis / Patagonia Hostel",
        labelStreet: "Street *",
        placeholderStreet: "E.g. Pedro Montt",
        labelNumber: "Street Number *",
        placeholderNumber: "E.g. 160",

        summarySeatLabel: "Selected Ticket(s):",
        summaryTourLabel: "Tour:",
        summaryDateLabel: "Date & Pick-up:",
        summaryTotalLabel: "Total Amount:",
        
        policyAgreeText: "<strong>☐ I AGREE</strong> to have read, understood, and accepted Travesía Paine's <a href=\"index.html#politicas\" target=\"_blank\" style=\"color: var(--color-accent); text-decoration: underline;\">Booking, Cancellation, and Refund Policies</a>.",
        btnPayText: "Pay with Webpay Plus (Cards)",
        securityBadgeText: "100% secure encrypted payment via Transbank Webpay Plus. Instant digital ticket issuance.",

        // Policies in Accordion
        policiesTag: "Terms & Conditions",
        policiesTitle: "Booking, Cancellation & Refund Policies",
        policiesSubtitle: "Click on each section to expand and review the terms of service.",

        pol1Header: "1. Booking Policy",
        pol1Body: "<p>Customers can book or purchase our services directly through our website.</p><p>To make a booking, the customer must provide:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li>Excursion or service to hire.</li><li>Date of excursion.</li><li>Number of passengers.</li><li>Lead passenger contact details.</li><li>Hotel name & address in Puerto Natales for pick-up.</li></ul><p>Once booked, please verify that all submitted details are accurate.</p>",

        pol2Header: "2. Cancellation Policy & Transport Terms",
        pol2Body: "<p>Bookings can be cancelled under the following commercial terms:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li><strong>More than 3 days prior:</strong> 60% refund.</li><li><strong>Less than 24 hours prior:</strong> Non-refundable (0%).</li><li><strong>No Show:</strong> Non-refundable (0%).</li></ul><div style=\"background: rgba(30, 90, 64, 0.06); border-left: 4px solid var(--color-primary); padding: 0.8rem 1rem; margin: 0.8rem 0;\"><h4 style=\"color: var(--color-primary); font-size: 0.92rem; margin-bottom: 0.3rem;\">🚐 Base Torres Shuttle:</h4><p style=\"margin: 0; font-size: 0.86rem;\">Roundtrip transport service only. Pick-up from 06:30 AM at Natales hostels (outside town: Plaza de Armas meeting point). At the Welcome Center, the van waits until 19:00 hrs for the return.</p></div><p>Online booking cutoff: 17:00 hrs on the day prior. Fully booked dates or late inquiries are handled via WhatsApp.</p>",

        pol3Header: "3. Weather & Force Majeure Refund Policy",
        pol3Body: "<p>If an excursion is cancelled due to adverse weather conditions decided by the operator prior to departure, a 100% full refund will be processed.</p><div style=\"background: var(--color-bg-dark); padding: 0.9rem; border-radius: var(--radius-sm); margin: 0.8rem 0;\"><strong style=\"color: var(--color-accent);\">Base Torres Trekking:</strong> If CONAF closes trail access during the hike for safety/weather reasons, no refund applies as the decision is made on-trail by park authorities outside our control.</div><p>Refunds will be processed within 7 business days to the original payment method.</p>",

        pol4Header: "4. Online Payment Methods",
        pol4Body: "<p>Our services can be paid via:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li>Credit & Debit Cards (via Webpay Plus).</li><li>Bank wire transfer.</li><li>PayPal.</li></ul>",

        pol5Header: "5. No Show Policy",
        pol5Body: "<p>If a passenger fails to appear or is not ready at the coordinated pick-up time, the service will be classified as No Show and will not be eligible for a refund.</p><p>Passengers must be ready in the lobby during the scheduled morning pick-up window. Any delay that prevents departure will be logged as No Show.</p>",

        pol6Header: "6. Acceptance of Policies",
        pol6Body: "<p>By completing a booking and/or payment, the client acknowledges having read, understood, and agreed to these Booking, Cancellation, and Refund Policies.</p>",

        // Footer
        footerAboutText: "Family-owned transport and tour company in Puerto Natales and Torres del Paine. Affordable rates and direct management.",
        footerToursTitle: "Tours",
        footerInfoTitle: "Information",
        footerContactTitle: "Contact & Tours",
        footerHours: "⏱ Daily Support: 07:00 - 21:00 hrs",
        footerCopy: "© 2026 TRAVESÍA PAINE. ALL RIGHTS RESERVED. FAMILY TOUR OPERATOR.",
        btnFooterWa: "💬 Direct WhatsApp Support / Driver",
        floatingWaBadge: "💬 Questions? Chat with us"
    },

    pt: {
        // Navegação
        navHome: "Início",
        navTours: "Excursões",
        navAbout: "Quem Somos",
        navBook: "Reserva Online",
        navPolicies: "Políticas",
        navBookTransfer: "Reservar Vagas",

        // Hero
        heroTag: "Temporada 2026 / 2027 Disponível",
        heroTitle: "Descubra Torres del Paine com Tarifas Acessíveis",
        heroSubtitle: "Somos uma empresa familiar de turismo em Puerto Natales. Oferecemos traslados e passeios acessíveis, responsáveis e diretos para a Patagônia.",
        heroBtnTours: "Ver Passeios",
        heroBtnBook: "Reservar Vagas",

        // Buscador Recorrido.cl Style (PT)
        searchTabTours: "Passeios e Passagens de Van",
        searchLiveStatus: "Saídas Confirmadas Diárias",
        searchLabelOrigin: "📍 Origem",
        searchLabelDest: "🏔️ Destino / Passeio",
        searchLabelDate: "📅 Data de Saída",
        searchBtnSubmit: "Consultar Vagas",
        searchPill1: "Disponibilidade de Vagas em Tempo Real",
        searchPill2: "Pagamento Seguro Webpay Plus",
        searchPill3: "Passagem Digital Imediata",
        searchPill4: "Van Máx. 16 Passageiros",

        // Stats
        stat1Num: "07:00 AM",
        stat1Text: "Pick-up no seu Alojamento",
        stat2Num: "100%",
        stat2Text: "Empresa Familiar Local",
        stat3Num: "Econômico",
        stat3Text: "Tarifas Justas e Acessíveis",
        stat4Num: "Webpay",
        stat4Text: "Pagamento Seguro e Passagem Digital",

        // Passeios
        toursTag: "Nossas Rotas",
        toursTitle: "Passeios e Traslados",
        toursSubtitle: "Preços claros, saídas diárias de Puerto Natales e reserva direta de vagas.",
        
        tour1Badge: "Econômico",
        tour1Time: "⏱ Saída 07:00 AM · Dia Todo",
        tour1Title: "Full Day Torres del Paine",
        tour1Desc: "Uma opção econômica para conhecer o Parque Nacional e a Caverna do Milodón.",
        tour1BtnDetails: "ℹ️ Ver Detalhes",
        tour1BtnBook: "Reservar Vaga",

        tour2Badge: "Transporte Direto",
        tour2Time: "⏱ Saída 06:30 AM · Van aguarda até 19:00 hrs",
        tour2Title: "Trekking Base Torres (Transporte)",
        tour2Desc: "Transporte exclusivo de ida e volta ao mirante (sem guia). Pick-up a partir das 06:30 AM e retorno aos seus hotéis.",

        // Quem somos
        aboutTag: "Nossa Identidade",
        aboutTitle: "Somos uma Empresa Familiar",
        aboutDesc1: "Somos uma empresa familiar de turismo, o que nos permite oferecer tarifas mais convenientes gerenciando diretamente nossas operações.",
        aboutDesc2: "Nós mesmos cuidamos do atendimento, reservas, coordenação e transporte, oferecendo um serviço atencioso, responsável e acessível.",
        aboutGoalTitle: "Nossa Missão",
        aboutGoalText: "Permitir que mais pessoas conheçam as incríveis paisagens da Patagônia sem pagar a mais.",

        // Passos
        stepsTag: "Fácil e Rápido",
        stepsTitle: "Reserva Online",
        stepsSubtitle: "Garanta suas vagas na van de 16 passageiros em 3 passos simples com confirmação imediata.",
        step1Title: "Escolha Passeio e Passageiros",
        step1Desc: "Selecione seu passeio, data e quantidade de passageiros com disponibilidade em tempo real (Van de 16 lugares).",
        step2Title: "Dados e Alojamento",
        step2Desc: "Insira os dados dos passageiros e o endereço do seu hotel em Puerto Natales para coordenar o horário de pick-up.",
        step3Title: "Pagamento Seguro & Voucher Digital",
        step3Desc: "Pague com Webpay Plus e receba sua passagem digital. O motorista conferirá seus dados diretamente no manifesto.",

        // Transfers / Página de Reserva
        bookingBannerTag: "Reserva Direta Online",
        bookingBannerTitle: "Formulário de Reserva de Vagas",
        bookingBannerDesc: "Selecione seu passeio, indique o número de passageiros e preencha os dados do alojamento para pick-up em Puerto Natales.",
        
        bookingStep1Title: "1. Selecione Passeio e Data",
        labelTour: "Passeio ou Serviço:",
        labelDate: "Data do Passeio (Escolha no Calendário):",
        dateInfoAvailable: "📅 Datas disponíveis para a temporada atual.",

        bookingStep2Title: "2. Quantidade de Passageiros / Vagas (Van Máx. 16 Passageiros)",
        timerText: "Tempo restante para concluir sua compra:",
        openSeatingTitle: "Assentos livres por ordem de embarque:",
        openSeatingDesc: "Os assentos não são numerados. Cada passageiro escolhe seu assento livremente ao embarcar na van no seu hotel em Puerto Natales.",
        labelNumPassengers: "Quantos passageiros vão viajar?",
        passengersWord: "passageiro(s)",
        subtotalLabel: "Subtotal de Vagas Selecionadas:",

        bookingStep3Title: "3. Dados dos Passageiros & Alojamento",
        emptySeatsNotice: "👈 <strong>Por favor selecione a quantidade de passageiros</strong> para habilitar os formulários individuais.",
        
        passengerLabel: "Passageiro",
        seatLabel: "Vaga N°",
        labelFullName: "Nome Completo *",
        placeholderFullName: "Ex: João Silva",
        labelAge: "Idade *",
        placeholderAge: "Ex: 32",
        labelDoc: "Documento / Passaporte *",
        placeholderDoc: "Ex: Passaporte ou RG",
        labelEmail: "E-mail (para envio da passagem) *",
        placeholderEmail: "Ex: joao@gmail.com",
        labelPhone: "Telefone de Contato *",
        placeholderPhone: "Ex: +55 11 91234 5678",
        labelWa: "WhatsApp (com código do país) *",
        placeholderWa: "Ex: +5511912345678",

        hotelSectionTitle: "📍 Dados de Hospedagem em Puerto Natales (Pick-up)",
        hotelSectionSubtitle: "A informação do hotel é necessária para coordenar o horário e ponto exato de pick-up dos passageiros.",
        labelHotelName: "Nome do Hotel / Pousada / Hostel *",
        placeholderHotelName: "Ex: Hotel Costaustralis / Hostel Patagonia",
        labelStreet: "Rua *",
        placeholderStreet: "Ex: Pedro Montt",
        labelNumber: "Número *",
        placeholderNumber: "Ex: 160",

        summarySeatLabel: "Assento(s) Selecionado(s):",
        summaryTourLabel: "Passeio:",
        summaryDateLabel: "Data & Pick-up:",
        summaryTotalLabel: "Total a Pagar:",
        
        policyAgreeText: "<strong>☐ ACEPTO</strong> ter lido, compreendido e aceito as <a href=\"index.html#politicas\" target=\"_blank\" style=\"color: var(--color-accent); text-decoration: underline;\">Políticas de Reserva, Cancelamento e Reembolso</a> da Travesía Paine.",
        btnPayText: "Pagar com Webpay Plus (Cartões)",
        securityBadgeText: "Pagamento 100% seguro e criptografado via Transbank Webpay Plus. Emissão instantânea de passagem digital.",

        // Políticas em Acordeão
        policiesTag: "Termos e Condições",
        policiesTitle: "Políticas de Reserva, Cancelamento e Reembolso",
        policiesSubtitle: "Clique em cada seção para abrir e revisar os termos do serviço.",

        pol1Header: "1. Política de Reservas",
        pol1Body: "<p>O cliente poderá realizar a reserva ou compra através do nosso site.</p><p>Para efetuar a reserva, informe:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li>Passeio ou serviço desejado.</li><li>Data do passeio.</li><li>Quantidade de passageiros.</li><li>Nome e contato do responsável.</li><li>Hotel em Puerto Natales para o pick-up.</li></ul><p>Revise todos os dados antes de finalizar.</p>",

        pol2Header: "2. Política de Cancelamento & Condições de Transporte",
        pol2Body: "<p>Cancelamentos seguem as seguintes condições comerciais:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li><strong>Mais de 3 dias de antecedência:</strong> Reembolso de 60% do valor pago.</li><li><strong>Menos de 24 horas:</strong> Sem reembolso (0%).</li><li><strong>No Show:</strong> Sem reembolso (0%).</li></ul><div style=\"background: rgba(30, 90, 64, 0.06); border-left: 4px solid var(--color-primary); padding: 0.8rem 1rem; margin: 0.8rem 0;\"><h4 style=\"color: var(--color-primary); font-size: 0.92rem; margin-bottom: 0.3rem;\">🚐 Traslado Base Torres:</h4><p style=\"margin: 0; font-size: 0.86rem;\">Serviço exclusivo de transporte. Pick-up a partir das 06:30 AM nos hotéis de Natales (fora da cidade: ponto de encontro na Plaza de Armas). No Centro de Boas-Vindas a van aguarda até as 19:00 hrs.</p></div><p>Encerramento web: 17:00 hrs do dia anterior. Vagas esgotadas ou reservas de última hora são consultadas pelo WhatsApp.</p>",

        pol3Header: "3. Reembolso por Condições Climáticas",
        pol3Body: "<p>Se o passeio for cancelado por condições climáticas pela operadora antes da saída, 100% do valor será reembolsado.</p><div style=\"background: var(--color-bg-dark); padding: 0.9rem; border-radius: var(--radius-sm); margin: 0.8rem 0;\"><strong style=\"color: var(--color-accent);\">Trekking Base Torres:</strong> Se a CONAF fechar a trilha durante o percurso por segurança/clima, não haverá reembolso, pois é uma decisão local fora do controle da empresa.</div><p>Reembolsos serão processados em até 7 dias úteis.</p>",

        pol4Header: "4. Meios de Pagamento Online",
        pol4Body: "<p>Nossos serviços podem ser pagos via:</p><ul style=\"padding-left: 1.2rem; margin: 0.5rem 0;\"><li>Cartões de Crédito e Débito (Webpay Plus).</li><li>Transferência Bancária.</li><li>PayPal.</li></ul>",

        pol5Header: "5. Não Comparecimento (No Show)",
        pol5Body: "<p>Se o passageiro não estiver pronto no horário e hotel coordenados, o serviço será considerado No Show sem direito a reembolso.</p><p>O passageiro deve aguardar na recepção dentro da janela informada.</p>",

        pol6Header: "6. Aceitação das Políticas",
        pol6Body: "<p>Ao reservar e efetuar o pagamento, o cliente declara ter lido e aceito integralmente estas Políticas de Reserva, Cancelamento e Reembolso.</p>",

        // Footer
        footerAboutText: "Empresa familiar de transporte turístico e passeios em Puerto Natales e Torres del Paine.",
        footerToursTitle: "Passeios",
        footerInfoTitle: "Informação",
        footerContactTitle: "Contato & Passeios",
        footerHours: "⏱ Atendimento diário: 07:00 - 21:00 hrs",
        footerCopy: "© 2026 TRAVESÍA PAINE. TODOS OS DIREITOS RESERVADOS. EMPRESA FAMILIAR DE TURISMO.",
        btnFooterWa: "💬 WhatsApp Direto Motorista / Base",
        floatingWaBadge: "💬 Dúvidas? Fale conosco"
    }
};

let currentLang = 'es';

function setLanguage(lang) {
    if (!siteTranslations[lang]) lang = 'es';
    currentLang = lang;
    try {
        localStorage.setItem('tp_lang', lang);
    } catch(e) {}

    // 1. Traducir elementos con atributo data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (siteTranslations[lang] && siteTranslations[lang][key]) {
            const val = siteTranslations[lang][key];
            if (val.includes('<') && val.includes('>')) {
                el.innerHTML = val;
            } else {
                el.textContent = val;
            }
        }
    });

    // 2. Traducir placeholders de inputs con data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (siteTranslations[lang] && siteTranslations[lang][key]) {
            el.placeholder = siteTranslations[lang][key];
        }
    });

    // 3. Actualizar estado activo en botones de idioma
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 4. Actualizar textos dinámicos del Clima en Vivo
    if (typeof renderWeatherWidget === 'function') {
        renderWeatherWidget();
    }
}

function t(key) {
    return (siteTranslations[currentLang] && siteTranslations[currentLang][key]) || key;
}

// Inicialización del traductor
function initTranslator() {
    let savedLang = 'es';
    try {
        savedLang = localStorage.getItem('tp_lang') || 'es';
    } catch(e) {}
    setLanguage(savedLang);

    // Event delegation para botones de idioma
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-btn');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            const lang = btn.getAttribute('data-lang');
            if (lang) {
                setLanguage(lang);
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslator);
} else {
    initTranslator();
}
