// State Management (loaded from Firestore, cached in localStorage as fallback)
let clients = JSON.parse(localStorage.getItem('cfl_clients')) || [];
let quotes = JSON.parse(localStorage.getItem('cfl_quotes')) || [];
let quoteCounter = parseInt(localStorage.getItem('cfl_quote_count')) || 1000;
let currentMarkup = 0.18;

// ── Firestore Helpers ──────────────────────────────────────
function saveClientsToCloud() {
    if (typeof db === 'undefined') return;
    db.collection('appData').doc('clients').set({ list: clients });
    localStorage.setItem('cfl_clients', JSON.stringify(clients));
}

function saveQuotesToCloud() {
    if (typeof db === 'undefined') return;
    db.collection('appData').doc('quotes').set({ list: quotes });
    localStorage.setItem('cfl_quotes', JSON.stringify(quotes));
}

function saveCounterToCloud() {
    if (typeof db === 'undefined') return;
    db.collection('appData').doc('counter').set({ value: quoteCounter });
    localStorage.setItem('cfl_quote_count', quoteCounter);
}

function saveTemplateToCloud(settings) {
    if (typeof db === 'undefined') return;
    db.collection('appData').doc('templateSettings').set(settings);
}

function setupRealtimeListeners() {
    if (typeof db === 'undefined') return;

    // Listen for client changes from other users
    db.collection('appData').doc('clients').onSnapshot(doc => {
        if (doc.exists && doc.data().list) {
            clients = doc.data().list;
            localStorage.setItem('cfl_clients', JSON.stringify(clients));
            loadClients();
            renderClientsTable();
            updateDashboard();
        }
    });

    // Listen for quote changes from other users
    db.collection('appData').doc('quotes').onSnapshot(doc => {
        if (doc.exists && doc.data().list) {
            quotes = doc.data().list;
            localStorage.setItem('cfl_quotes', JSON.stringify(quotes));
            renderHistoryTable();
            updateDashboard();
        }
    });

    // Listen for counter changes
    db.collection('appData').doc('counter').onSnapshot(doc => {
        if (doc.exists && doc.data().value) {
            quoteCounter = doc.data().value;
            localStorage.setItem('cfl_quote_count', quoteCounter);
            updateQuoteIdDisplay();
        }
    });

    // Listen for template settings changes
    db.collection('appData').doc('templateSettings').onSnapshot(doc => {
        if (doc.exists) {
            templateSettings = doc.data();
            localStorage.setItem('cfl_template_settings', JSON.stringify(templateSettings));
            if (typeof applySettingsToPreview === 'function') {
                applySettingsToPreview();
            }
        }
    });
}

async function loadInitialDataFromCloud() {
    if (typeof db === 'undefined') { console.log("⚠️ Firebase not available, using localStorage"); return; }
    try {
        const [clientsDoc, quotesDoc, counterDoc, templateDoc] = await Promise.all([
            db.collection('appData').doc('clients').get(),
            db.collection('appData').doc('quotes').get(),
            db.collection('appData').doc('counter').get(),
            db.collection('appData').doc('templateSettings').get()
        ]);
        if (clientsDoc.exists && clientsDoc.data().list) {
            clients = clientsDoc.data().list;
            localStorage.setItem('cfl_clients', JSON.stringify(clients));
        }
        if (quotesDoc.exists && quotesDoc.data().list) {
            quotes = quotesDoc.data().list;
            localStorage.setItem('cfl_quotes', JSON.stringify(quotes));
        }
        if (counterDoc.exists && counterDoc.data().value) {
            quoteCounter = counterDoc.data().value;
            localStorage.setItem('cfl_quote_count', quoteCounter);
        }
        if (templateDoc.exists) {
            templateSettings = templateDoc.data();
            localStorage.setItem('cfl_template_settings', JSON.stringify(templateSettings));
        }
        console.log("✅ Data loaded from Firestore");
    } catch(e) {
        console.warn("⚠️ Could not load from Firestore, using localStorage cache:", e);
    }
}
// ────────────────────────────────────────────────────────────

// DOM Elements
const navDashboard = document.getElementById('nav-dashboard');
const navQuote = document.getElementById('nav-quote');
const navHistory = document.getElementById('nav-history');
const navClients = document.getElementById('nav-clients');
const navTemplate = document.getElementById('nav-template');

const viewDashboard = document.getElementById('view-dashboard');
const viewQuote = document.getElementById('view-quote');
const viewHistory = document.getElementById('view-history');
const viewClients = document.getElementById('view-clients');
const viewTemplate = document.getElementById('view-template-editor');

const clientSelect = document.getElementById('client-select');
const serviceTypeSelect = document.getElementById('service-type');
const btnNewClient = document.getElementById('btn-new-client');
const newClientForm = document.getElementById('new-client-form');
const btnSaveClient = document.getElementById('btn-save-client');
const btnCancelClient = document.getElementById('btn-cancel-client');
const clientsBody = document.getElementById('clients-body');

// Logistics Details Elements
const shipFrom = document.getElementById('ship-from');
const shipTo = document.getElementById('ship-to');
const shipCommodity = document.getElementById('ship-commodity');
const shipAccessorials = document.getElementById('ship-accessorials');

const historyBody = document.getElementById('history-body');

const globalMarkup = document.getElementById('global-markup');
const btnAddPallet = document.getElementById('btn-add-pallet');
const palletsBody = document.getElementById('pallets-body');
const btnSmartParse = document.getElementById('btn-smart-parse');
const smartParseInput = document.getElementById('smart-parse-input');
const btnCarrierParse = document.getElementById('btn-carrier-parse');
const carrierParseInput = document.getElementById('carrier-parse-input');

const carrierRows = document.querySelectorAll('.carrier-row');
const btnGeneratePdf = document.getElementById('btn-generate-pdf');
const btnSaveQuote = document.getElementById('btn-save-quote');

// New Dashboard & CSV Elements
const kpiTotalQuotes = document.getElementById('kpi-total-quotes');
const kpiTotalClients = document.getElementById('kpi-total-clients');
const quoteIdInput = document.getElementById('quote-id-input');
const btnImportCsv = document.getElementById('btn-import-csv');
const csvUpload = document.getElementById('csv-upload');
let quotesChart = null;

// Initialize
async function init() {
    await loadInitialDataFromCloud();
    loadClients();
    updateQuoteIdDisplay();
    updateDashboard();
    setupEventListeners();
    addPalletRow();
    setupRealtimeListeners();
}

// Navigation
function switchView(view) {
    // Hide all
    viewDashboard.classList.remove('active');
    viewQuote.classList.remove('active');
    viewHistory.classList.remove('active');
    viewClients.classList.remove('active');
    viewTemplate.classList.remove('active');
    
    viewDashboard.classList.add('hidden');
    viewQuote.classList.add('hidden');
    viewHistory.classList.add('hidden');
    viewClients.classList.add('hidden');
    viewTemplate.classList.add('hidden');
    
    navDashboard.classList.remove('active');
    navQuote.classList.remove('active');
    navHistory.classList.remove('active');
    navClients.classList.remove('active');
    if (navTemplate) navTemplate.classList.remove('active');

    if (view === 'dashboard') {
        viewDashboard.classList.add('active');
        viewDashboard.classList.remove('hidden');
        navDashboard.classList.add('active');
        updateDashboard();
    } else if (view === 'quote') {
        viewQuote.classList.add('active');
        viewQuote.classList.remove('hidden');
        navQuote.classList.add('active');
    } else if (view === 'history') {
        viewHistory.classList.add('active');
        viewHistory.classList.remove('hidden');
        navHistory.classList.add('active');
        renderHistoryTable();
    } else if (view === 'clients') {
        viewClients.classList.add('active');
        viewClients.classList.remove('hidden');
        navClients.classList.add('active');
        renderClientsTable();
    } else if (view === 'template') {
        viewTemplate.classList.add('active');
        viewTemplate.classList.remove('hidden');
        if (navTemplate) navTemplate.classList.add('active');
        if (typeof populateTemplatePreview === 'function') populateTemplatePreview();
    }
}

// Dashboard & Analytics
function updateDashboard() {
    kpiTotalQuotes.textContent = quotes.length;
    kpiTotalClients.textContent = clients.length;

    const clientQuoteCounts = {};
    quotes.forEach(q => {
        clientQuoteCounts[q.clientName] = (clientQuoteCounts[q.clientName] || 0) + 1;
    });

    const labels = Object.keys(clientQuoteCounts).slice(0, 10);
    const data = Object.values(clientQuoteCounts).slice(0, 10);

    const ctx = document.getElementById('quotesChart').getContext('2d');
    
    if (quotesChart) {
        quotesChart.destroy();
    }

    quotesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quotes per Client',
                data: data,
                backgroundColor: 'rgba(252, 76, 2, 0.7)',
                borderColor: '#fc4c02',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', stepSize: 1 },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function updateQuoteIdDisplay() {
    quoteIdInput.value = `CFL-${quoteCounter}`;
}

// History Management
function renderHistoryTable() {
    historyBody.innerHTML = '';

    // Get filter values
    const searchInput = document.getElementById('search-quotes');
    const filterService = document.getElementById('filter-service');
    const filterDateFrom = document.getElementById('filter-date-from');
    const filterDateTo = document.getElementById('filter-date-to');
    const resultsCount = document.getElementById('search-results-count');

    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const serviceFilter = filterService ? filterService.value : '';
    const dateFrom = filterDateFrom && filterDateFrom.value ? new Date(filterDateFrom.value) : null;
    const dateTo = filterDateTo && filterDateTo.value ? new Date(filterDateTo.value + 'T23:59:59') : null;

    // Sort quotes by date descending
    let filteredQuotes = [...quotes].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply filters
    filteredQuotes = filteredQuotes.filter(quote => {
        // Text search (ID, client, origin, destination, commodity)
        if (searchTerm) {
            const searchable = [
                quote.id, quote.clientName, quote.clientEmail,
                quote.shipFrom, quote.shipTo, quote.shipCommodity,
                quote.serviceType
            ].filter(Boolean).join(' ').toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }
        // Service type filter
        if (serviceFilter && (quote.serviceType || 'LTL') !== serviceFilter) return false;
        // Date range
        const quoteDate = new Date(quote.date);
        if (dateFrom && quoteDate < dateFrom) return false;
        if (dateTo && quoteDate > dateTo) return false;
        return true;
    });

    // Show results count
    if (resultsCount) {
        if (searchTerm || serviceFilter || dateFrom || dateTo) {
            resultsCount.textContent = `${filteredQuotes.length} of ${quotes.length} quotes`;
        } else {
            resultsCount.textContent = `${quotes.length} quotes`;
        }
    }

    filteredQuotes.forEach((quote) => {
        const tr = document.createElement('tr');
        
        let totalCost = 0;
        if(quote.carriers && quote.carriers.length > 0) {
            const validCosts = quote.carriers.map(c => parseFloat(c.cost) || 0).filter(c => c > 0);
            if(validCosts.length > 0) {
                totalCost = Math.min(...validCosts) * (1 + (quote.markup || 0.18));
            }
        }

        tr.innerHTML = `
            <td><strong>${quote.id}</strong></td>
            <td>${new Date(quote.date).toLocaleDateString()}</td>
            <td><span class="badge" style="background: rgba(252, 76, 2, 0.2); padding: 2px 8px; border-radius: 4px; color: #fc4c02;">${quote.serviceType || 'LTL'}</span></td>
            <td>${quote.clientName}</td>
            <td>$${totalCost.toFixed(2)}</td>
            <td style="display: flex; gap: 6px;">
                <button class="btn btn-outline btn-sm" onclick="loadQuote('${quote.id}')">Load / Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteQuote('${quote.id}')" title="Delete">🗑</button>
            </td>
        `;
        historyBody.appendChild(tr);
    });

    if (filteredQuotes.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No quotes found matching your filters.</td></tr>`;
    }
}

// Search & filter event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchEl = document.getElementById('search-quotes');
    const serviceEl = document.getElementById('filter-service');
    const dateFromEl = document.getElementById('filter-date-from');
    const dateToEl = document.getElementById('filter-date-to');
    const clearBtn = document.getElementById('btn-clear-filters');

    if (searchEl) searchEl.addEventListener('input', renderHistoryTable);
    if (serviceEl) serviceEl.addEventListener('change', renderHistoryTable);
    if (dateFromEl) dateFromEl.addEventListener('change', renderHistoryTable);
    if (dateToEl) dateToEl.addEventListener('change', renderHistoryTable);
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (searchEl) searchEl.value = '';
        if (serviceEl) serviceEl.value = '';
        if (dateFromEl) dateFromEl.value = '';
        if (dateToEl) dateToEl.value = '';
        renderHistoryTable();
    });
});

window.deleteQuote = function(quoteId) {
    if (!confirm(`Are you sure you want to delete quote ${quoteId}? This cannot be undone.`)) return;
    quotes = quotes.filter(q => q.id !== quoteId);
    saveQuotesToCloud();
    renderHistoryTable();
    updateDashboard();
};

window.loadQuote = function(quoteId) {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    // Load ID
    quoteIdInput.value = quote.id || '';

    // Load Client
    if (quote.clientIndex !== undefined) {
        clientSelect.value = quote.clientIndex;
    }

    // Load Logistics Fields
    if (typeof shipFrom !== 'undefined') shipFrom.value = quote.shipFrom || '';
    if (typeof shipTo !== 'undefined') shipTo.value = quote.shipTo || '';
    if (typeof shipCommodity !== 'undefined') shipCommodity.value = quote.shipCommodity || '';
    if (typeof shipAccessorials !== 'undefined') shipAccessorials.value = quote.shipAccessorials || '';

    // Load Service Type
    if (quote.serviceType) {
        serviceTypeSelect.value = quote.serviceType;
    } else {
        serviceTypeSelect.value = 'LTL';
    }

    // Load Markup
    if (quote.markup !== undefined && quote.markup !== null) {
        globalMarkup.value = quote.markup.toFixed(2);
    } else {
        globalMarkup.value = "0.18"; // default
    }

    // Load Pallets
    palletsBody.innerHTML = ''; // Clear existing
    if (quote.pallets && quote.pallets.length > 0) {
        quote.pallets.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="number" class="p-qty" value="${p.qty}" min="1" style="width: 60px;"></td>
                <td><input type="text" class="p-desc" value="${p.desc}" placeholder="Ex. Auto Parts"></td>
                <td><input type="number" class="p-weight" value="${p.weight}" placeholder="0" style="width: 80px;"></td>
                <td><input type="text" class="p-class" value="${p.class}" placeholder="Ex. 50" style="width: 80px;"></td>
                <td><input type="text" class="p-dims" value="${p.dims}" placeholder="48x40x48"></td>
                <td><button type="button" class="btn btn-danger btn-remove-pallet">X</button></td>
            `;
            tr.querySelector('.btn-remove-pallet').addEventListener('click', () => tr.remove());
            palletsBody.appendChild(tr);
        });
    } else {
        addPalletRow();
    }

    // Load Carriers
    if (quote.carriers && quote.carriers.length === 5) {
        carrierRows.forEach((row, i) => {
            const savedCarrier = quote.carriers[i];
            row.querySelector('.c-name').value = savedCarrier.name || '';
            row.querySelector('.c-transit').value = savedCarrier.transit || '';
            row.querySelector('.c-perf').value = savedCarrier.perf || '';
            row.querySelector('.c-cost').value = savedCarrier.cost || '';
        });
    } else {
        carrierRows.forEach(row => {
            row.querySelector('.c-cost').value = '';
        });
    }

    // Recalculate
    calculatePrices();

    // Switch view
    switchView('quote');
}

// Client Management
function loadClients() {
    clientSelect.innerHTML = '<option value="">-- Select --</option>';
    clients.forEach((client, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${client.name} (${client.company || 'No Company'})`;
        clientSelect.appendChild(option);
    });
}

function getClientQuoteCount(email) {
    return quotes.filter(q => q.clientEmail === email).length;
}

function renderClientsTable() {
    clientsBody.innerHTML = '';
    clients.forEach((client, index) => {
        const tr = document.createElement('tr');
        const qCount = getClientQuoteCount(client.email);
        tr.innerHTML = `
            <td>${client.name} <br><small class="text-muted">${client.company || '-'}</small></td>
            <td>${client.email}</td>
            <td>${client.phone || '-'}</td>
            <td>${client.address || '-'}</td>
            <td><strong>${qCount}</strong></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteClient(${index})">Delete</button>
            </td>
        `;
        clientsBody.appendChild(tr);
    });
}

function saveClient() {
    const name = document.getElementById('nc-name').value;
    const email = document.getElementById('nc-email').value;
    const phone = document.getElementById('nc-phone').value;
    const address = document.getElementById('nc-address').value;

    if (!name) {
        alert("Company or Contact name is required.");
        return;
    }

    const newClient = { name, company: name, email, phone, address };
    clients.push(newClient);
    saveClientsToCloud();
    
    document.getElementById('nc-name').value = '';
    document.getElementById('nc-email').value = '';
    document.getElementById('nc-phone').value = '';
    document.getElementById('nc-address').value = '';
    newClientForm.classList.add('hidden');
    
    loadClients();
    clientSelect.value = clients.length - 1;
}

window.deleteClient = function(index) {
    if(confirm("Are you sure you want to delete this client?")) {
        clients.splice(index, 1);
        saveClientsToCloud();
        renderClientsTable();
        loadClients();
        updateDashboard();
    }
}

// CSV Import via PapaParse
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            let importedCount = 0;
            results.data.forEach(row => {
                const getCol = (keywords) => {
                    const keys = Object.keys(row);
                    for (let key of keys) {
                        for (let kw of keywords) {
                            if (key.toLowerCase().includes(kw.toLowerCase())) {
                                return row[key];
                            }
                        }
                    }
                    return '';
                };

                const company = getCol(['company name', 'empresa', 'company']);
                const nameStr = getCol(['contact', 'contacto', 'name', 'nombre']) || company;
                const email = getCol(['email', 'correo']);
                const phone = getCol(['phone', 'telefono', 'teléfono']);
                const address = getCol(['address', 'direccion', 'dirección']);
                
                if (nameStr || company) {
                    clients.push({
                        name: nameStr,
                        company: company,
                        email: email,
                        phone: phone,
                        address: address
                    });
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                saveClientsToCloud();
                loadClients();
                renderClientsTable();
                updateDashboard();
                alert(`Successfully imported ${importedCount} clients!`);
            } else {
                alert("No valid records found in the CSV. Please make sure you have headers like 'Name', 'Company', 'Email'.");
            }
            
            csvUpload.value = '';
        },
        error: function(error) {
            alert("Error reading CSV file: " + error.message);
        }
    });
}

// Pallets Management
function addPalletRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="number" class="p-qty" value="1" min="1" style="width: 60px;"></td>
        <td><input type="text" class="p-desc" placeholder="Ex. Auto Parts"></td>
        <td><input type="number" class="p-weight" placeholder="0" style="width: 80px;"></td>
        <td><input type="text" class="p-class" placeholder="Ex. 50" style="width: 80px;"></td>
        <td><input type="text" class="p-dims" placeholder="48x40x48"></td>
        <td><button type="button" class="btn btn-danger btn-remove-pallet">X</button></td>
    `;
    
    tr.querySelector('.btn-remove-pallet').addEventListener('click', () => {
        tr.remove();
    });
    
    palletsBody.appendChild(tr);
}

// Smart Parse Logic
function handleSmartParse() {
    const rawText = smartParseInput.value;
    if (!rawText.trim()) return;
    const text = rawText.toLowerCase();

    let foundItems = [];

    // ── ORIGIN / FROM PARSING ──────────────────────────────
    // Try multiple patterns for pickup/origin
    let originFound = '';

    // Pattern 1: "Pick up:" or "Pick Up Address:" followed by company + address block
    let pickupBlockMatch = rawText.match(/(?:Pick\s*Up\s*(?:Address)?)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:Hours|Horario|Detalle|Delivery|Destino|Total|Image|Special|\n\s*\n))/i);
    if (pickupBlockMatch) {
        // Extract city, state, zip from the address block
        let addrBlock = pickupBlockMatch[1].trim();
        let csz = addrBlock.match(/([A-Za-z\s]+),?\s+([A-Z]{2})\s+(\d{5})/);
        if (csz) {
            originFound = csz[1].trim() + ', ' + csz[2] + ' ' + csz[3];
        } else {
            // Take last meaningful line as location
            let lines = addrBlock.split('\n').map(l => l.trim()).filter(l => l && !/^(Hours|Contact|Phone)/i.test(l));
            if (lines.length > 0) originFound = lines[lines.length - 1];
        }
    }

    // Pattern 2: "Pick up: CompanyName, Address, City STATE ZIP"
    if (!originFound) {
        let pickupInline = rawText.match(/Pick\s*up\s*:\s*.*?,\s*.*?,\s*([^,]+?)\s+([A-Z]{2})\s+(\d{5})/i);
        if (pickupInline) originFound = pickupInline[1].trim() + ', ' + pickupInline[2] + ' ' + pickupInline[3];
    }

    // Pattern 3: "Origin:" or "From:"
    if (!originFound) {
        let originMatch = rawText.match(/(?:Origin|From)\s*:\s*(.*?)(?:\n|$)/i);
        if (originMatch) originFound = originMatch[1].trim();
    }

    if (originFound && shipFrom) shipFrom.value = originFound;

    // ── DESTINATION / TO PARSING ───────────────────────────
    let destFound = '';

    // Pattern 1: "Destino:" followed by address
    let destinoMatch = rawText.match(/Destino\s*:\s*([\s\S]*?)(?=\n\s*(?:Aguardo|Puertas|Hours|Horario|Special|\n\s*\n|$))/i);
    if (destinoMatch) {
        let destBlock = destinoMatch[1].trim();
        let csz = destBlock.match(/([A-Za-z\s]+),?\s+([A-Z]{2})\s+(\d{5})/);
        if (csz) {
            destFound = csz[1].trim() + ', ' + csz[2] + ' ' + csz[3];
        } else {
            destFound = destBlock.split('\n')[0].trim();
        }
    }

    // Pattern 2: "Delivery:" inline
    if (!destFound) {
        let deliveryInline = rawText.match(/Delivery\s*:\s*.*?,\s*.*?,\s*([^,]+?)\s+([A-Z]{2})\s+(\d{5})/i);
        if (deliveryInline) destFound = deliveryInline[1].trim() + ', ' + deliveryInline[2] + ' ' + deliveryInline[3];
    }

    // Pattern 3: "Destination:" or "To:"
    if (!destFound) {
        let destMatch = rawText.match(/(?:Destination|To|Deliver\s*to)\s*:\s*(.*?)(?:\n|$)/i);
        if (destMatch) destFound = destMatch[1].trim();
    }

    if (destFound && shipTo) shipTo.value = destFound;

    // ── COMMODITY PARSING ──────────────────────────────────
    let commMatch = rawText.match(/Commodit(?:y|ies)\s*\(?s?\)?\s*:\s*([\s\S]*?)(?=\n(?:NO HAZMAT|HAZMAT|Special|Reference|\n))/i);
    if (commMatch && shipCommodity) {
        shipCommodity.value = commMatch[1].trim().replace(/§\s*/, '');
    }

    // ── ACCESSORIALS / SPECIAL REQUIREMENTS ────────────────
    let reqMatch = rawText.match(/Special\s*requirements?\s*(?:if any)?\s*:\s*(.*?)(?=\n[A-Z]+:|$)/i);
    if (reqMatch && shipAccessorials) {
        shipAccessorials.value = reqMatch[1].trim();
    }

    // ── PALLET / CARGO PARSING (OPTIONAL) ──────────────────
    const lines = rawText.split(/[\n\r·•]+/);
    let parsedItems = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        const qtyMatch = line.match(/(\d+)\s*(?:pallet|plt|skid|piece|pc|box)s?/i);
        const dimsMatch = line.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
        const weightMatch = line.match(/(?:@\s*)?(\d+(?:[.,]\d+)?)\s*(?:lbs|lb|pound|pds|#)/i);

        if (dimsMatch && weightMatch) {
            let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
            let l = parseFloat(dimsMatch[1]);
            let w = parseFloat(dimsMatch[2]);
            let h = parseFloat(dimsMatch[3]);
            let weight = parseFloat(weightMatch[1].replace(',', ''));
            const isEach = /(?:ea|each|c\/u|cada|c\/uno)\b/i.test(line.substring(weightMatch.index));
            if (isEach && qty > 1 && weight > 0) weight = weight * qty;
            parsedItems.push({ qty, l, w, h, weight });
        }
    });

    // Fallback global regex for pallets
    if (parsedItems.length === 0) {
        const globalPattern = /(?:(?:(\d+)\s*(?:pallet|plt|skid|piece|pc|box)s?[^\d]*?)?)(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)[^\d]*?(?:@\s*)?(\d+(?:[.,]\d+)?)\s*(?:lbs|lb|pound|pds|#)/gi;
        let match;
        while ((match = globalPattern.exec(rawText)) !== null) {
            let qty = match[1] ? parseInt(match[1]) : 1;
            parsedItems.push({ qty, l: parseFloat(match[2]), w: parseFloat(match[3]), h: parseFloat(match[4]), weight: parseFloat(match[5].replace(',', '')) });
        }
    }

    // If pallets found, populate the table
    if (parsedItems.length > 0) {
        palletsBody.innerHTML = '';
        let totalWeightAll = 0, totalVolumeAllCubicFeet = 0, totalQtyAll = 0;

        parsedItems.forEach((item, index) => {
            const volumeCubicInches = (item.l * item.w * item.h) * item.qty;
            const volumeCubicFeet = volumeCubicInches / 1728;
            const pcf = item.weight / volumeCubicFeet;

            let freightClass = "50";
            if (pcf < 1) freightClass = "400";
            else if (pcf < 2) freightClass = "300";
            else if (pcf < 4) freightClass = "250";
            else if (pcf < 6) freightClass = "150";
            else if (pcf < 8) freightClass = "125";
            else if (pcf < 10) freightClass = "100";
            else if (pcf < 12) freightClass = "92.5";
            else if (pcf < 15) freightClass = "85";
            else if (pcf < 22.5) freightClass = "70";
            else if (pcf < 30) freightClass = "65";
            else if (pcf < 35) freightClass = "60";

            totalWeightAll += item.weight;
            totalVolumeAllCubicFeet += volumeCubicFeet;
            totalQtyAll += item.qty;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="number" class="p-qty" value="${item.qty}" min="1" style="width: 60px;"></td>
                <td><input type="text" class="p-desc" value="Parsed Cargo ${index+1}" placeholder="Ex. Auto Parts"></td>
                <td><input type="number" class="p-weight" value="${item.weight}" placeholder="0" style="width: 80px;"></td>
                <td><input type="text" class="p-class" value="${freightClass}" placeholder="Ex. 50" style="width: 80px;"></td>
                <td><input type="text" class="p-dims" value="${item.l}x${item.w}x${item.h}" placeholder="48x40x48"></td>
                <td><button type="button" class="btn btn-danger btn-remove-pallet">X</button></td>
            `;
            tr.querySelector('.btn-remove-pallet').addEventListener('click', () => tr.remove());
            palletsBody.appendChild(tr);
        });
    }

    // ── SUCCESS SUMMARY ────────────────────────────────────
    let summary = '✅ Smart Parser Results:\n';
    if (originFound) summary += `📍 Origin: ${originFound}\n`;
    if (destFound) summary += `📍 Destination: ${destFound}\n`;
    if (shipCommodity && shipCommodity.value) summary += `📦 Commodity: ${shipCommodity.value}\n`;
    if (shipAccessorials && shipAccessorials.value) summary += `⚙️ Accessorials: ${shipAccessorials.value}\n`;
    if (parsedItems.length > 0) {
        const totalQ = parsedItems.reduce((s, i) => s + i.qty, 0);
        const totalW = parsedItems.reduce((s, i) => s + i.weight, 0);
        summary += `🧮 Pallets: ${totalQ} units, ${totalW} lbs total\n`;
    } else {
        summary += `\nNo pallet data detected — add pallets manually below.`;
    }

    if (!originFound && !destFound && parsedItems.length === 0) {
        alert('Could not detect any shipment data. Try pasting a more complete email.');
    } else {
        smartParseInput.value = '';
        alert(summary);
    }
}

// Carrier Parse Logic
function handleCarrierParse() {
    const text = carrierParseInput.value;
    if (!text) return;

    // Split text by "Carrier Logo"
    const blocks = text.split(/Carrier Logo/i).map(b => b.trim()).filter(b => b.length > 0);
    
    let carriersParsed = [];

    blocks.forEach(block => {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return;
        
        const carrierName = lines[0]; // The first line after "Carrier Logo"

        // Search for all transit days and prices in this block
        const pattern = /(\d+)\s+DAYS.*?\$([0-9,.]+)/gis;
        let matches = [...block.matchAll(pattern)];

        // Check if Guaranteed is NOT available
        const hasNoGuaranteed = /GUARANTEED IS NOT AVAILABLE/i.test(block);

        if (matches.length > 0) {
            const standardTransit = matches[0][1];
            const standardCost = parseFloat(matches[0][2].replace(/,/g, ''));

            let guaranteedCost = null;
            let guaranteedTransit = null;

            if (matches.length > 1 && !hasNoGuaranteed) {
                guaranteedTransit = matches[1][1];
                guaranteedCost = parseFloat(matches[1][2].replace(/,/g, ''));
            }

            carriersParsed.push({
                name: carrierName,
                standardTransit: standardTransit,
                standardCost: standardCost,
                guaranteedTransit: guaranteedTransit,
                guaranteedCost: guaranteedCost
            });
        }
    });

    if (carriersParsed.length === 0) {
        alert("Could not detect carriers. Please make sure the text contains 'Carrier Logo', Transit Days, and '$' prices.");
        return;
    }

    // Sort by Standard Cost ascending
    const standardOptions = [...carriersParsed].sort((a, b) => a.standardCost - b.standardCost);
    
    // For Guaranteed, we only want carriers that actually have a guaranteed cost
    const guaranteedOptions = [...carriersParsed]
        .filter(c => c.guaranteedCost !== null)
        .sort((a, b) => a.guaranteedCost - b.guaranteedCost);

    // Fill UI (carrierRows)
    // Row 0, 1, 2 = Standard
    for (let i = 0; i < 3; i++) {
        if (standardOptions[i]) {
            carrierRows[i].querySelector('.c-name').value = standardOptions[i].name;
            carrierRows[i].querySelector('.c-transit').value = standardOptions[i].standardTransit;
            carrierRows[i].querySelector('.c-perf').value = "98"; 
            carrierRows[i].querySelector('.c-cost').value = standardOptions[i].standardCost;
        } else {
            carrierRows[i].querySelector('.c-name').value = '';
            carrierRows[i].querySelector('.c-transit').value = '';
            carrierRows[i].querySelector('.c-perf').value = '';
            carrierRows[i].querySelector('.c-cost').value = '';
        }
    }

    // Row 3, 4 = Guaranteed
    for (let i = 0; i < 2; i++) {
        const rowIndex = i + 3;
        if (guaranteedOptions[i]) {
            carrierRows[rowIndex].querySelector('.c-name').value = guaranteedOptions[i].name;
            carrierRows[rowIndex].querySelector('.c-transit').value = guaranteedOptions[i].guaranteedTransit;
            carrierRows[rowIndex].querySelector('.c-perf').value = "99";
            carrierRows[rowIndex].querySelector('.c-cost').value = guaranteedOptions[i].guaranteedCost;
        } else {
            carrierRows[rowIndex].querySelector('.c-name').value = '';
            carrierRows[rowIndex].querySelector('.c-transit').value = '';
            carrierRows[rowIndex].querySelector('.c-perf').value = '';
            carrierRows[rowIndex].querySelector('.c-cost').value = '';
        }
    }

    calculatePrices();

    carrierParseInput.value = '';
    alert(`Success! Parsed ${carriersParsed.length} carriers.\nFilled ${Math.min(3, standardOptions.length)} Standard and ${Math.min(2, guaranteedOptions.length)} Guaranteed options.`);
}

// Pricing Logic
function calculatePrices() {
    currentMarkup = parseFloat(globalMarkup.value);
    
    carrierRows.forEach(row => {
        const costInput = row.querySelector('.c-cost');
        const priceDisplay = row.querySelector('.c-price');
        
        const cost = parseFloat(costInput.value) || 0;
        const finalPrice = cost * (1 + currentMarkup);
        
        priceDisplay.textContent = finalPrice.toFixed(2);
    });
}

// Event Listeners Setup
function setupEventListeners() {
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    navQuote.addEventListener('click', (e) => { e.preventDefault(); switchView('quote'); });
    navHistory.addEventListener('click', (e) => { e.preventDefault(); switchView('history'); });
    navClients.addEventListener('click', (e) => { e.preventDefault(); switchView('clients'); });
    if(navTemplate) navTemplate.addEventListener('click', (e) => { e.preventDefault(); switchView('template'); });

    btnNewClient.addEventListener('click', () => newClientForm.classList.remove('hidden'));
    btnCancelClient.addEventListener('click', () => newClientForm.classList.add('hidden'));
    btnSaveClient.addEventListener('click', saveClient);

    btnImportCsv.addEventListener('click', () => csvUpload.click());
    csvUpload.addEventListener('change', handleCSVUpload);

    btnAddPallet.addEventListener('click', addPalletRow);
    btnSmartParse.addEventListener('click', handleSmartParse);
    btnCarrierParse.addEventListener('click', handleCarrierParse);
    
    globalMarkup.addEventListener('change', calculatePrices);
    
    carrierRows.forEach(row => {
        const costInput = row.querySelector('.c-cost');
        costInput.addEventListener('input', calculatePrices);
    });

    btnGeneratePdf.addEventListener('click', () => processQuote(true));
    btnSaveQuote.addEventListener('click', () => processQuote(false));
}

// Main processing logic (Save State & Optional PDF)
function processQuote(generatePdf) {
    const clientIndex = clientSelect.value;
    if (clientIndex === "") {
        alert("Please select a client before saving or generating.");
        return;
    }
    const client = clients[clientIndex];
    const currentQuoteId = quoteIdInput.value;
    const currentService = serviceTypeSelect.value;
    
    const pallets = [];
    const palletsDataToSave = [];
    palletsBody.querySelectorAll('tr').forEach(row => {
        const qty = row.querySelector('.p-qty').value;
        const desc = row.querySelector('.p-desc').value;
        const weight = row.querySelector('.p-weight').value;
        const cls = row.querySelector('.p-class').value;
        const dims = row.querySelector('.p-dims').value;

        pallets.push([
            qty,
            desc || 'N/A',
            weight || '0',
            cls || 'N/A',
            dims || 'N/A'
        ]);

        palletsDataToSave.push({ qty, desc, weight, class: cls, dims });
    });

    const carriersStandard = [];
    const carriersGuaranteed = [];
    const carriersDataToSave = [];
    
    carrierRows.forEach((row, index) => {
        const name = row.querySelector('.c-name').value;
        const transit = row.querySelector('.c-transit').value;
        const perf = row.querySelector('.c-perf').value;
        const cost = row.querySelector('.c-cost').value;

        const data = [
            name || '-',
            transit || '-',
            perf || '-',
            '$' + row.querySelector('.c-price').textContent
        ];
        
        if(index < 3) {
            carriersStandard.push(data);
        } else {
            carriersGuaranteed.push(data);
        }

        carriersDataToSave.push({ name, transit, perf, cost });
    });

    // Record FULL Quote in Analytics History
    const quotePayload = {
        id: currentQuoteId,
        date: new Date().toISOString(),
        clientIndex: clientIndex,
        serviceType: currentService,
        clientName: client.company,
        clientEmail: client.email,
        markup: currentMarkup,
        pallets: palletsDataToSave,
        carriers: carriersDataToSave,
        shipFrom: shipFrom.value,
        shipTo: shipTo.value,
        shipCommodity: shipCommodity.value,
        shipAccessorials: shipAccessorials.value
    };

    const existingIndex = quotes.findIndex(q => q.id === currentQuoteId);
    if (existingIndex > -1) {
        quotes[existingIndex] = quotePayload;
    } else {
        quotes.push(quotePayload);
    }
    
    saveQuotesToCloud();

    // Handle PDF Generation
    if (generatePdf) {
        generatePDFDocument(quotePayload);
        
        // If the user left it as CFL-XXXX, increment standard counter
        if (currentQuoteId === `CFL-${quoteCounter}`) {
            quoteCounter++;
            saveCounterToCloud();
            updateQuoteIdDisplay();
        }
    } else {
        alert("Quote data successfully saved!");
    }
    
    updateDashboard();
}

// --- Template Editor Logic ---

const defaultDisclaimer = `Notice & Disclaimer: All shipments are subject to National Motor Freight Classification (NMFC) rules and the carrier's specific rules tariff. Rates provided are estimates based on the information provided and are subject to change if actual freight characteristics (weight, dimensions, class) differ from the quoted parameters. Any pickup request received after 3pm shipper's local time will be scheduled for the following business day. Standard transit times are estimates and are not guaranteed unless explicitly stated as "Guaranteed". Liability is limited as per the carrier's tariff.`;

let templateSettings = JSON.parse(localStorage.getItem('cfl_template_settings')) || {
    primaryColor: '#fc4c02',
    secondaryColor: '#020617',
    logoBase64: (typeof cflLogos !== 'undefined' && cflLogos['CFL_Azul_Celeste']) ? cflLogos['CFL_Azul_Celeste'] : '',
    disclaimer: defaultDisclaimer,
    logoW: 40, logoH: 15, logoY: 10,
    titleSize: 22, bodySize: 10,
    marginLeft: 14, marginRight: 196
};

// DOM Elements
const tmplPrimaryColor = document.getElementById('tmpl-primary-color');
const tmplSecondaryColor = document.getElementById('tmpl-secondary-color');
const tmplLogoSelect = document.getElementById('tmpl-logo-select');
const tmplDisclaimer = document.getElementById('tmpl-disclaimer');
const btnSaveTemplate = document.getElementById('btn-save-template');

if (tmplPrimaryColor) {
    // Init settings
    tmplPrimaryColor.value = templateSettings.primaryColor;
    tmplSecondaryColor.value = templateSettings.secondaryColor;
    tmplDisclaimer.value = templateSettings.disclaimer;

    // Init layout controls
    const tmplLogoW = document.getElementById('tmpl-logo-w');
    const tmplLogoH = document.getElementById('tmpl-logo-h');
    const tmplLogoY = document.getElementById('tmpl-logo-y');
    const tmplTitleSize = document.getElementById('tmpl-title-size');
    const tmplBodySize = document.getElementById('tmpl-body-size');
    const tmplMarginLeft = document.getElementById('tmpl-margin-left');
    const tmplMarginRight = document.getElementById('tmpl-margin-right');

    if (tmplLogoW) tmplLogoW.value = templateSettings.logoW || 40;
    if (tmplLogoH) tmplLogoH.value = templateSettings.logoH || 15;
    if (tmplLogoY) tmplLogoY.value = templateSettings.logoY || 10;
    if (tmplTitleSize) tmplTitleSize.value = templateSettings.titleSize || 22;
    if (tmplBodySize) tmplBodySize.value = templateSettings.bodySize || 10;
    if (tmplMarginLeft) tmplMarginLeft.value = templateSettings.marginLeft || 14;
    if (tmplMarginRight) tmplMarginRight.value = templateSettings.marginRight || 196;

    // Layout change listeners — update settings AND refresh preview
    [tmplLogoW, tmplLogoH, tmplLogoY, tmplTitleSize, tmplBodySize, tmplMarginLeft, tmplMarginRight].forEach(el => {
        if (el) el.addEventListener('input', () => {
            templateSettings.logoW = parseFloat(tmplLogoW.value) || 40;
            templateSettings.logoH = parseFloat(tmplLogoH.value) || 15;
            templateSettings.logoY = parseFloat(tmplLogoY.value) || 10;
            templateSettings.titleSize = parseFloat(tmplTitleSize.value) || 22;
            templateSettings.bodySize = parseFloat(tmplBodySize.value) || 10;
            templateSettings.marginLeft = parseFloat(tmplMarginLeft.value) || 14;
            templateSettings.marginRight = parseFloat(tmplMarginRight.value) || 196;
            applySettingsToPreview();
        });
    });

    const renderZone = document.getElementById('pdf-render-zone');

    function applySettingsToPreview() {
        // Colors
        renderZone.style.setProperty('--pdf-primary', templateSettings.primaryColor);
        renderZone.style.setProperty('--pdf-secondary', templateSettings.secondaryColor);

        // Logo
        const logoImg = document.getElementById('pdf-logo-img');
        logoImg.src = templateSettings.logoBase64;
        // Convert mm to px (approx 3.78 px per mm) for the preview
        const pxPerMm = 3.78;
        logoImg.style.width = (templateSettings.logoW || 40) * pxPerMm + 'px';
        logoImg.style.height = (templateSettings.logoH || 15) * pxPerMm + 'px';
        logoImg.style.marginTop = ((templateSettings.logoY || 10) - 10) * pxPerMm + 'px';

        // Title font size
        const titleEl = document.getElementById('pdf-title');
        if (titleEl) titleEl.style.fontSize = ((templateSettings.titleSize || 22) * 1.2) + 'px';

        // Body font size — apply to date/quote/service lines
        const bodyPx = ((templateSettings.bodySize || 10) * 1.2) + 'px';
        ['pdf-date-line', 'pdf-quoteid-line', 'pdf-service-line'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.fontSize = bodyPx;
        });

        // Margins → padding on renderZone
        const padL = ((templateSettings.marginLeft || 14) * pxPerMm) + 'px';
        const padR = ((210 - (templateSettings.marginRight || 196)) * pxPerMm) + 'px';
        renderZone.style.paddingLeft = padL;
        renderZone.style.paddingRight = padR;

        // Disclaimer
        document.getElementById('pdf-disclaimer-text').textContent = templateSettings.disclaimer;
    }

    tmplPrimaryColor.addEventListener('input', (e) => {
        templateSettings.primaryColor = e.target.value;
        applySettingsToPreview();
    });

    tmplSecondaryColor.addEventListener('input', (e) => {
        templateSettings.secondaryColor = e.target.value;
        applySettingsToPreview();
    });

    tmplDisclaimer.addEventListener('input', (e) => {
        templateSettings.disclaimer = e.target.value;
        applySettingsToPreview();
    });

    if (tmplLogoSelect) {
        tmplLogoSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val && typeof cflLogos !== 'undefined' && cflLogos[val]) {
                templateSettings.logoBase64 = cflLogos[val];
            } else {
                templateSettings.logoBase64 = '';
            }
            applySettingsToPreview();
        });
    }

    // Custom logo upload
    const tmplLogoUpload = document.getElementById('tmpl-logo-upload');
    if (tmplLogoUpload) {
        tmplLogoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                templateSettings.logoBase64 = evt.target.result;
                // Reset dropdown since user uploaded custom
                if (tmplLogoSelect) tmplLogoSelect.value = '';
                applySettingsToPreview();
            };
            reader.readAsDataURL(file);
        });
    }

    btnSaveTemplate.addEventListener('click', () => {
        localStorage.setItem('cfl_template_settings', JSON.stringify(templateSettings));
        saveTemplateToCloud(templateSettings);
        alert('Template settings saved successfully!');
    });

    // Run once on load
    applySettingsToPreview();
}

function populateTemplatePreview(quoteData = null) {
    let clientIndex = clientSelect.value;
    let currentService = serviceTypeSelect.value;
    let currentQuoteId = quoteIdInput.value;
    
    // Extract direct values or fallbacks if loading from history (quoteData passed)
    let cFrom = typeof shipFrom !== 'undefined' ? shipFrom.value : '';
    let cTo = typeof shipTo !== 'undefined' ? shipTo.value : '';
    let cComm = typeof shipCommodity !== 'undefined' ? shipCommodity.value : '';
    let cAcc = typeof shipAccessorials !== 'undefined' ? shipAccessorials.value : '';
    
    if (quoteData) {
        cFrom = quoteData.shipFrom || '';
        cTo = quoteData.shipTo || '';
        cComm = quoteData.shipCommodity || '';
        cAcc = quoteData.shipAccessorials || '';
        currentService = quoteData.serviceType;
        currentQuoteId = quoteData.id;
    }

    if (clientIndex !== "" && !quoteData) {
        const client = clients[clientIndex];
        document.getElementById('pdf-client-company').textContent = client.company;
        document.getElementById('pdf-client-name').textContent = client.name;
        document.getElementById('pdf-client-email').textContent = client.email;
    } else if (quoteData) {
        document.getElementById('pdf-client-company').textContent = quoteData.clientName;
        document.getElementById('pdf-client-name').textContent = "Client Contact";
        document.getElementById('pdf-client-email').textContent = quoteData.clientEmail;
    } else {
        document.getElementById('pdf-client-company').textContent = "Client Company";
        document.getElementById('pdf-client-name').textContent = "Client Name";
        document.getElementById('pdf-client-email').textContent = "client@example.com";
    }

    document.getElementById('pdf-date').textContent = quoteData ? new Date(quoteData.date).toLocaleDateString() : new Date().toLocaleDateString();
    document.getElementById('pdf-quote-id').textContent = currentQuoteId;
    document.getElementById('pdf-service-type').textContent = currentService;

    // Logistics fields
    document.getElementById('pdf-ship-from').textContent = cFrom || 'Not specified';
    document.getElementById('pdf-ship-to').textContent = cTo || 'Not specified';
    document.getElementById('pdf-ship-commodity').textContent = cComm || 'Not specified';
    document.getElementById('pdf-ship-accessorials').textContent = cAcc || 'None';

    // Pallets
    const palletsTable = document.getElementById('pdf-cargo-table');
    palletsTable.innerHTML = '';
    
    let activePallets = [];
    if (quoteData) {
        activePallets = quoteData.pallets;
    } else {
        palletsBody.querySelectorAll('tr').forEach(row => {
            activePallets.push({
                qty: row.querySelector('.p-qty').value,
                desc: row.querySelector('.p-desc').value,
                weight: row.querySelector('.p-weight').value,
                class: row.querySelector('.p-class').value,
                dims: row.querySelector('.p-dims').value
            });
        });
    }

    if (activePallets.length > 0) {
        activePallets.forEach(p => {
            palletsTable.innerHTML += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${p.qty}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${p.desc}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.weight}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.dims}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.class}</td>
                </tr>
            `;
        });
    } else {
        palletsTable.innerHTML = `<tr><td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No cargo specified</td></tr>`;
    }

    // Carriers Standard & Guaranteed
    const standardTable = document.getElementById('pdf-standard-table');
    const guaranteedTable = document.getElementById('pdf-guaranteed-table');
    const guaranteedContainer = document.getElementById('pdf-guaranteed-container');
    
    standardTable.innerHTML = '';
    guaranteedTable.innerHTML = '';
    let hasStandard = false;
    let hasGuar = false;

    let activeCarriers = [];
    if (quoteData) {
        activeCarriers = quoteData.carriers;
    } else {
        carrierRows.forEach((row, i) => {
            activeCarriers.push({
                name: row.querySelector('.c-name').value,
                transit: row.querySelector('.c-transit').value,
                cost: row.querySelector('.c-sale').value, // Used sale here for display directly
                isStandard: i < 3
            });
        });
    }

    activeCarriers.forEach((c, i) => {
        let isStandard = quoteData ? (i < 3) : c.isStandard;
        let priceStr = quoteData ? (parseFloat(c.cost) * (1 + quoteData.markup)).toFixed(2) : parseFloat(c.cost || 0).toFixed(2);
        
        if (c.name && priceStr > 0) {
            let rowHTML = `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${c.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${c.transit}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; ${isStandard ? 'color: var(--pdf-primary, #fc4c02);' : ''}">$${priceStr}</td>
                </tr>
            `;
            if (isStandard) {
                standardTable.innerHTML += rowHTML;
                hasStandard = true;
            } else {
                guaranteedTable.innerHTML += rowHTML;
                hasGuar = true;
            }
        }
    });

    if (!hasStandard) standardTable.innerHTML = `<tr><td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No standard options</td></tr>`;
    
    if (hasGuar) {
        guaranteedContainer.style.display = 'block';
    } else {
        guaranteedContainer.style.display = 'none';
    }
}

// Helper: hex color to RGB array
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16)];
}

// Generate PDF using jsPDF with template settings
function generatePDFDocument(quotePayload) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const primaryColor = hexToRgb(templateSettings.primaryColor);
    const navyColor = hexToRgb(templateSettings.secondaryColor);
    const logoSrc = templateSettings.logoBase64;
    const mL = templateSettings.marginLeft || 14;
    const mR = templateSettings.marginRight || 196;
    const tSize = templateSettings.titleSize || 22;
    const bSize = templateSettings.bodySize || 10;
    const lW = templateSettings.logoW || 40;
    const lH = templateSettings.logoH || 15;
    const lY = templateSettings.logoY || 10;

    const client = { company: quotePayload.clientName, email: quotePayload.clientEmail };
    const currentQuoteId = quotePayload.id;
    const currentService = quotePayload.serviceType;
    const markup = quotePayload.markup;

    // Header with logo (left) and quote info (right)
    if (logoSrc) {
        try { doc.addImage(logoSrc, 'PNG', mL, lY, lW, lH); } catch(e) { /* skip */ }
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(tSize);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text("OFFICIAL QUOTE", mR, lY + 6, { align: 'right' });

    doc.setFontSize(bSize); doc.setFont("helvetica", "normal"); doc.setTextColor(100,100,100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, mR, lY + 12, { align: 'right' });
    doc.text(`Quote #: ${currentQuoteId}  |  Service: ${currentService}`, mR, lY + 17, { align: 'right' });

    // Accent line
    const lineY = lY + lH + 7;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.setLineWidth(0.8);
    doc.line(mL, lineY, mR, lineY);

    // Client
    let y = lineY + 9;
    doc.setFontSize(bSize + 3); doc.setFont("helvetica","bold"); doc.setTextColor(primaryColor[0],primaryColor[1],primaryColor[2]);
    doc.text("PREPARED FOR:", mL, y); y += 7;
    doc.setFontSize(bSize + 1); doc.setFont("helvetica","normal"); doc.setTextColor(50,50,50);
    doc.text(`Company: ${client.company}`, mL, y); y += 5;
    doc.text(`Email: ${client.email}`, mL, y); y += 10;

    // Shipment details
    doc.setFontSize(bSize + 3); doc.setFont("helvetica","bold"); doc.setTextColor(navyColor[0],navyColor[1],navyColor[2]);
    doc.text("SHIPMENT DETAILS", mL, y); y += 7;
    doc.setFontSize(bSize); doc.setFont("helvetica","normal"); doc.setTextColor(50,50,50);
    doc.text(`From: ${quotePayload.shipFrom || 'N/A'}`, mL, y);
    doc.text(`Commodity: ${quotePayload.shipCommodity || 'N/A'}`, 110, y); y += 5;
    doc.text(`To: ${quotePayload.shipTo || 'N/A'}`, mL, y);
    doc.text(`Accessorials: ${quotePayload.shipAccessorials || 'None'}`, 110, y); y += 10;

    // Cargo table
    doc.setFontSize(bSize + 3); doc.setFont("helvetica","bold"); doc.setTextColor(navyColor[0],navyColor[1],navyColor[2]);
    doc.text("CARGO DETAILS", mL, y); y += 3;
    const palletRows = quotePayload.pallets.map(p => [p.qty, p.desc||'N/A', p.weight||'0', p.class||'N/A', p.dims||'N/A']);
    doc.autoTable({ startY: y, head:[['Qty','Description','Weight (lbs)','Class','Dimensions']], body: palletRows, theme:'striped', headStyles:{fillColor:navyColor, textColor:255}, styles:{fontSize:bSize}, margin:{left:mL} });
    y = doc.lastAutoTable.finalY + 10;

    // Standard carriers
    const stdRows = []; const guarRows = [];
    quotePayload.carriers.forEach((c, i) => {
        const price = '$' + (parseFloat(c.cost) * (1 + markup)).toFixed(2);
        const row = [c.name||'-', c.transit||'-', c.perf||'-', price];
        if (i < 3) stdRows.push(row); else guarRows.push(row);
    });

    if (stdRows.length > 0) {
        doc.setFontSize(bSize + 3); doc.setFont("helvetica","bold"); doc.setTextColor(navyColor[0],navyColor[1],navyColor[2]);
        doc.text("STANDARD OPTIONS (Not Guaranteed)", mL, y); y += 3;
        doc.autoTable({ startY: y, head:[['Carrier','Transit','Performance','Price']], body: stdRows, theme:'grid', headStyles:{fillColor:primaryColor, textColor:255}, columnStyles:{3:{fontStyle:'bold',textColor:[0,128,0]}}, styles:{fontSize:bSize}, margin:{left:mL} });
        y = doc.lastAutoTable.finalY + 10;
    }
    if (guarRows.length > 0) {
        doc.setFontSize(bSize + 3); doc.setFont("helvetica","bold"); doc.setTextColor(navyColor[0],navyColor[1],navyColor[2]);
        doc.text("GUARANTEED OPTIONS", mL, y); y += 3;
        doc.autoTable({ startY: y, head:[['Carrier','Transit','Performance','Price']], body: guarRows, theme:'grid', headStyles:{fillColor:navyColor, textColor:255}, columnStyles:{3:{fontStyle:'bold',textColor:[0,128,0]}}, styles:{fontSize:bSize}, margin:{left:mL} });
        y = doc.lastAutoTable.finalY + 10;
    }

    // Disclaimer
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(bSize - 2); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,100);
    const discLines = doc.splitTextToSize(templateSettings.disclaimer, mR - mL);
    doc.text(discLines, mL, y);

    doc.save(`Quote_${currentService}_${currentQuoteId}_${client.company.replace(/[^a-z0-9]/gi,'_')}.pdf`);
    alert("PDF generated successfully!");
}

// Run
document.addEventListener('DOMContentLoaded', init);

