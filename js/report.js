/**
 * report.js — AI Report pro Odhad.Online
 *
 * Logika: načtení dat z sessionStorage, traffic light výpočet,
 * AI API volání, rendering reportu, clipboard, tisk.
 */

// ============================================
// MOCK DATA — pro vývoj a testování
// Odpovídá reálnému příkladu z Pržno (skóre 0.62)
// ============================================
const MOCK_DATA = {
    property: {
        address: "Pržno 674",
        area: 92,
        landArea: 750,
        type: "Rodinný dům",
        location: "Pržno, Frýdek-Místek",
        cadastralTerritory: "Pržno"
    },
    valuation: {
        estimatedPrice: 5309780,
        pricePerSqm: 57715,
        rangeMin: 3597292,
        rangeMax: 7022268,
        rangeMinSqm: 39101,
        rangeMaxSqm: 76329,
        absoluteMin: 3108956,
        absoluteMax: 8578356,
        stdDevSqm: 18614,
        similarityScore: 0.623,
        searchRadius: 6000,
        avgDistance: 2266,
        avgDataAge: 116,
        avgListingDuration: 62,
        comparablesCount: 9,
        currency: "CZK",
        calculatedAt: "2026-03-26T00:00:00"
    },
    ruian: {
        parcelNumber: "674",
        parcelArea: 68,
        landType: "zastavěná plocha a nádvoří",
        ruianCode: "20275927"
    },
    flags: [
        {
            code: "AREA_MISMATCH",
            severity: "warning",
            title: "Nesoulad plochy pozemku",
            detail: "Zadaná plocha pozemku (750 m²) se liší od RUIAN (68 m²).",
            inputArea: 750,
            ruianArea: 68,
            diffPercent: 1003
        },
        {
            code: "LOW_SIMILARITY",
            severity: "info",
            title: "Kvalita odhadu: 62%",
            detail: "Průměrné skóre podobnosti. Odhad je orientační.",
            score: 0.623
        },
        {
            code: "LARGE_DISTANCE",
            severity: "info",
            title: "Velká vzdálenost srovnávacích nemovitostí",
            detail: "Průměrná vzdálenost srovnávacích nemovitostí je 2266 m.",
            avgDistance: 2266,
            maxRadius: 6000
        },
        {
            code: "OLD_DATA",
            severity: "info",
            title: "Starší srovnávací data",
            detail: "Průměrné stáří použitých inzerátů je 116 dní.",
            avgAge: 116
        }
    ]
};

// ============================================
// MOCK AI RESPONSE — simuluje odpověď AI
// ============================================
const MOCK_AI_RESPONSE = {
    qualityLevel: "red",
    qualityLabel: "Nespolehlivý odhad",
    confidencePercent: 62,
    heroSubtitle: "Algoritmické ocenění na základě 9 srovnatelných nemovitostí v okruhu 6 km.",
    rangeNote: "Široký cenový rozsah (3,6M–7,0M Kč) odráží nedostatek srovnatelných transakcí v blízkém okolí. Skutečná cena se může pohybovat kdekoli v tomto intervalu.",
    analysisText: `Odhadovaná cena 5,3 milionu Kč odpovídá 57 715 Kč/m² obytné plochy. V katastrálním území Pržno se srovnatelné nemovitosti pohybují v rozmezí 39–76 tisíc Kč/m², což naznačuje velkou variabilitu trhu.

Zásadním problémem je nesoulad ve výměře pozemku — zadaných 750 m² versus 68 m² evidovaných v katastru. Pokud nemovitost stojí na více parcelách, skutečná tržní hodnota bude výrazně vyšší. Pokud je zadání chybné, odhad vychází ze špatných vstupů.

Model použil pouze 9 srovnávacích nemovitostí průměrně vzdálených 2,3 km s daty starými v průměru 116 dní. V takové situaci automatický odhad nedokáže spolehlivě stanovit tržní cenu.`,
    dataQualityText: "V okolí Pržna je málo srovnatelných transakcí. Data jsou 4 měsíce stará a srovnávací nemovitosti jsou průměrně 2,3 km daleko. Spolehlivost modelu je nízká.",
    warnings: [
        {
            title: "Nesoulad plochy pozemku",
            text: "Zadaná plocha 750 m² se zásadně liší od katastru (68 m²). Tento rozdíl 1003% fundamentálně ovlivňuje cenu.",
            advice: "Ověřte, zda nemovitost stojí na více parcelách. Pokud ano, celková plocha pozemku může být správná, ale je třeba to doložit. Pokud ne, opravte zadání a nechte odhad přepočítat."
        },
        {
            title: "Málo srovnatelných transakcí",
            text: "Model našel pouze 9 srovnávacích nemovitostí v okruhu 6 km. Pro spolehlivý odhad je optimální 15+ nemovitostí do 2 km.",
            advice: "V této lokalitě automatický model nestačí. Doporučujeme ruční výběr srovnatelných nemovitostí a komparativní analýzu (CMA)."
        },
        {
            title: "Stará tržní data",
            text: "Průměrné stáří použitých dat je 116 dní (téměř 4 měsíce). Trh se za tu dobu mohl změnit.",
            advice: "Doplňte analýzu o aktuálně inzerované nemovitosti v okolí pro lepší představu o současných cenách."
        }
    ],
    agentAdvice: `<strong>1. Ověřte parcely v katastru</strong> — Nesoulad plochy 750 m² vs. 68 m² je kritický. Zjistěte skutečnou výměru a počet parcel pod nemovitostí.

<strong>2. Proveďte ruční CMA</strong> — Při skóre podobnosti 62% a 9 srovnávacích nemovitostech automatický odhad nestačí. Ručně vyberte 3–5 nejpodobnějších nemovitostí a proveďte komparativní analýzu.

<strong>3. Zkontrolujte aktuální nabídku</strong> — Data jsou 4 měsíce stará. Podívejte se na aktuálně inzerované nemovitosti v Pržně a blízkém okolí pro ověření cenové hladiny.

<strong>4. Komunikujte nejistotu klientovi</strong> — Nepoužívejte číslo 5,3M jako "odhad ceny". Sdělte klientovi reálný rozsah a důvody nejistoty. Profesionální přístup buduje důvěru.`,
    clientText: "Na základě analýzy aktuálních tržních dat a srovnání s podobnými nemovitostmi v širším okolí Pržna odhadujeme orientační hodnotu vaší nemovitosti na přibližně 5,3 milionu Kč. Tento odhad je však zatížen vyšší mírou nejistoty, protože v bezprostředním okolí se prodává málo srovnatelných nemovitostí. Pro přesnější stanovení tržní ceny doporučujeme detailní analýzu, která zohlední specifika vaší nemovitosti včetně pozemku a aktuálního stavu. Rádi vám s tím pomůžeme."
};


// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format price in Czech locale
 */
function formatPrice(value, showDecimals = false) {
    if (!value && value !== 0) return "—";
    return new Intl.NumberFormat('cs-CZ', {
        style: 'decimal',
        maximumFractionDigits: showDecimals ? 2 : 0,
        minimumFractionDigits: 0
    }).format(value) + ' Kč';
}

/**
 * Format price short (e.g. "5,3M Kč")
 */
function formatPriceShort(value) {
    if (!value) return "—";
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace('.', ',') + 'M Kč';
    }
    if (value >= 1000) {
        return Math.round(value / 1000) + ' tis. Kč';
    }
    return formatPrice(value);
}

/**
 * Calculate traffic light level from raw data (fallback if AI unavailable)
 */
function calculateTrafficLightFallback(data) {
    const v = data.valuation;
    if (!v) return { level: 'orange', label: 'Orientační odhad', confidencePercent: 50 };

    const score = v.similarityScore || 0;
    const distance = (v.avgDistance || 0) / 1000; // km
    const age = v.avgDataAge || 999;
    const flagCount = (data.flags || []).filter(f => f.severity === 'warning').length;

    // RED conditions (any one triggers)
    if (score < 0.65 || distance > 2 || flagCount > 0) {
        return {
            level: 'red',
            label: 'Nespolehlivý odhad',
            confidencePercent: Math.round(score * 100)
        };
    }

    // GREEN conditions (all must be true)
    if (score > 0.8 && distance < 1 && age < 60 && flagCount === 0) {
        return {
            level: 'green',
            label: 'Spolehlivý odhad',
            confidencePercent: Math.round(score * 100)
        };
    }

    // ORANGE: everything else
    return {
        level: 'orange',
        label: 'Orientační odhad',
        confidencePercent: Math.round(score * 100)
    };
}

/**
 * Get CSS classes for traffic light level
 */
function getTrafficLightClasses(level) {
    const map = {
        green: {
            badge: 'bg-emerald-100 text-emerald-800',
            circle: 'bg-emerald-500',
            icon: 'verified',
            iconColor: 'text-emerald-600'
        },
        orange: {
            badge: 'bg-amber-100 text-amber-800',
            circle: 'bg-amber-500',
            icon: 'info',
            iconColor: 'text-amber-600'
        },
        red: {
            badge: 'bg-red-100 text-red-800',
            circle: 'bg-red-500',
            icon: 'error',
            iconColor: 'text-red-600'
        }
    };
    return map[level] || map.orange;
}

/**
 * Calculate range slider positions as percentages
 */
function calculateRangePositions(min, max, estimated, absoluteMin, absoluteMax) {
    const fullMin = absoluteMin || min;
    const fullMax = absoluteMax || max;
    const range = fullMax - fullMin;
    if (range <= 0) return { barLeft: 10, barRight: 10, markerLeft: 50 };

    const barLeft = Math.max(2, ((min - fullMin) / range) * 100);
    const barRight = Math.max(2, ((fullMax - max) / range) * 100);
    const markerLeft = ((estimated - fullMin) / range) * 100;

    return {
        barLeft: barLeft.toFixed(1),
        barRight: barRight.toFixed(1),
        markerLeft: Math.max(5, Math.min(95, markerLeft)).toFixed(1)
    };
}

/**
 * Copy text to clipboard and show toast
 */
function copyClientText() {
    const el = document.querySelector('[data-report-client-text]');
    if (!el) return;

    const text = el.innerText || el.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Text zkopírován do schránky');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Text zkopírován do schránky');
    });
}

/**
 * Show a toast notification
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-3 px-6 py-4 bg-inverse-surface text-inverse-on-surface rounded-2xl shadow-xl font-medium text-sm';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-base">check_circle</span>
        ${message}
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}


// ============================================
// AI API CALL (placeholder — needs real API key)
// ============================================

/**
 * Call AI to generate report content.
 * For now returns mock data. Replace with real API call.
 */
async function callAI(reportData) {
    // TODO: Replace with real Claude API call via serverless proxy
    // const response = await fetch('/api/ai-report', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(reportData)
    // });
    // return await response.json();

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_AI_RESPONSE;
}


// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Set text content of an element by data attribute
 */
function setText(attr, value) {
    const el = document.querySelector(`[${attr}]`);
    if (el) el.textContent = value;
}

/**
 * Set HTML content of an element by data attribute
 */
function setHtml(attr, value) {
    const el = document.querySelector(`[${attr}]`);
    if (el) el.innerHTML = value;
}

/**
 * Render the complete report
 */
function renderReport(data, aiResponse) {
    const v = data.valuation;
    const p = data.property;
    const tlClasses = getTrafficLightClasses(aiResponse.qualityLevel);

    // === Badge ===
    const badge = document.querySelector('[data-report-badge]');
    if (badge) {
        badge.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 ${tlClasses.badge}`;
        badge.querySelector('[data-report-badge-text]').textContent = aiResponse.qualityLabel;
        badge.querySelector('.material-symbols-outlined').textContent = tlClasses.icon;
    }

    // === Subtitle ===
    setText('data-report-subtitle', aiResponse.heroSubtitle);

    // === Price ===
    setHtml('data-report-price', `${formatPrice(v.estimatedPrice).replace(' Kč', '')} <span class="text-3xl lg:text-4xl">Kč</span>`);

    // === Confidence ===
    setText('data-report-confidence', `${aiResponse.confidencePercent}%`);

    // === Range ===
    setText('data-report-range-min', formatPrice(v.rangeMin));
    setText('data-report-range-max', formatPrice(v.rangeMax));
    setText('data-report-range-note', aiResponse.rangeNote);

    // Range bar positioning
    const pos = calculateRangePositions(v.rangeMin, v.rangeMax, v.estimatedPrice, v.absoluteMin, v.absoluteMax);
    const bar = document.querySelector('[data-report-range-bar]');
    const marker = document.querySelector('[data-report-range-marker]');
    if (bar) bar.style.cssText = `left: ${pos.barLeft}%; right: ${pos.barRight}%; position: absolute; height: 100%;`;
    if (marker) marker.style.left = `${pos.markerLeft}%`;

    // === Property details ===
    setText('data-report-address', p.address || '—');
    setText('data-report-area', `${p.area || '—'} m²`);
    setText('data-report-type', p.type || '—');
    setText('data-report-location', p.location || '—');
    setText('data-report-price-sqm', v.pricePerSqm ? `${new Intl.NumberFormat('cs-CZ').format(v.pricePerSqm)} Kč` : '—');

    // === AI Analysis ===
    setHtml('data-report-analysis', aiResponse.analysisText.split('\n\n').map(p => `<p>${p}</p>`).join(''));

    // === Traffic Light Circle ===
    const tlCircle = document.querySelector('[data-report-traffic-light]');
    if (tlCircle) {
        tlCircle.className = `w-24 h-24 rounded-full flex items-center justify-center mb-6 ${tlClasses.circle}`;
        tlCircle.innerHTML = `<span class="material-symbols-outlined text-4xl text-white filled">${tlClasses.icon}</span>`;
    }
    setText('data-report-quality-label', aiResponse.qualityLabel);
    setText('data-report-quality-text', aiResponse.dataQualityText);

    // === Mini metrics ===
    setText('data-report-metric-similarity', `${Math.round((v.similarityScore || 0) * 100)}%`);
    setText('data-report-metric-distance', `${((v.avgDistance || 0) / 1000).toFixed(1)} km`);
    setText('data-report-metric-age', `${v.avgDataAge || '—'} dní`);
    setText('data-report-metric-comparables', `${v.comparablesCount || '—'} ks`);

    // === Warnings ===
    if (aiResponse.warnings && aiResponse.warnings.length > 0) {
        const section = document.querySelector('[data-report-warnings-section]');
        const container = document.querySelector('[data-report-warnings]');
        if (section) section.classList.remove('hidden');
        if (container) {
            container.innerHTML = aiResponse.warnings.map(w => `
                <div class="bg-amber-50 border-l-4 border-amber-400 rounded-r-2xl p-6">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-amber-600 mt-0.5">warning</span>
                        <div class="space-y-2">
                            <h4 class="font-headline font-bold text-on-surface">${w.title}</h4>
                            <p class="text-secondary text-sm">${w.text}</p>
                            <div class="flex items-start gap-2 mt-3 p-3 bg-white/60 rounded-xl">
                                <span class="material-symbols-outlined text-primary text-base mt-0.5">lightbulb</span>
                                <p class="text-sm text-on-surface font-medium">${w.advice}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // === Market context ===
    setText('data-report-avg-listing', v.avgListingDuration || '—');
    setText('data-report-comp-count', `${v.comparablesCount || '—'} ks`);
    setText('data-report-comp-distance', `${((v.avgDistance || 0) / 1000).toFixed(1)} km`);
    setText('data-report-comp-age', `${v.avgDataAge || '—'} dní`);
    setText('data-report-locality-name', p.cadastralTerritory || p.location || '—');
    setText('data-report-locality-note', aiResponse.dataQualityText);
    setText('data-report-search-radius', v.searchRadius ? `${(v.searchRadius / 1000).toFixed(0)} km` : '—');

    // === Agent advice ===
    setHtml('data-report-agent-advice', aiResponse.agentAdvice);

    // === Client text ===
    setHtml('data-report-client-text', aiResponse.clientText);

    // === Print date ===
    setText('data-report-date', new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' }));
}


// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    // Try to get data from sessionStorage, fallback to mock
    let reportData;
    const stored = sessionStorage.getItem('valuationResult');
    if (stored) {
        try {
            reportData = JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse stored valuation data, using mock:', e);
            reportData = MOCK_DATA;
        }
    } else {
        console.info('No stored valuation data found, using mock data for development.');
        reportData = MOCK_DATA;
    }

    try {
        // Call AI for analysis
        const aiResponse = await callAI(reportData);
        renderReport(reportData, aiResponse);
    } catch (error) {
        console.error('AI call failed, using fallback:', error);
        // Fallback: generate basic response from rules
        const tl = calculateTrafficLightFallback(reportData);
        const fallbackResponse = {
            qualityLevel: tl.level,
            qualityLabel: tl.label,
            confidencePercent: tl.confidencePercent,
            heroSubtitle: `Ocenění na základě ${reportData.valuation?.comparablesCount || '—'} srovnatelných nemovitostí.`,
            rangeNote: "Cenový rozsah vychází z algoritmického modelu.",
            analysisText: "AI analýza není momentálně dostupná. Níže zobrazujeme surová data z modelu.",
            dataQualityText: `Skóre podobnosti: ${Math.round((reportData.valuation?.similarityScore || 0) * 100)}%`,
            warnings: (reportData.flags || []).map(f => ({
                title: f.title,
                text: f.detail,
                advice: "Doporučujeme konzultaci s odborníkem."
            })),
            agentAdvice: "AI analýza není dostupná. Doporučujeme ruční posouzení odhadu.",
            clientText: "Odhad ceny vaší nemovitosti byl vypočten automatickým modelem. Pro přesnější informace doporučujeme kontaktovat odborníka."
        };
        renderReport(reportData, fallbackResponse);
    }
});
