// Wersja: 0.5.1

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// KONFIGURACJA FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAlF_XfCacX98_6NYhkrQ0dI5AC1ykKojU",
    authDomain: "kiddodo-32c0e.firebaseapp.com",
    projectId: "kiddodo-32c0e",
    storageBucket: "kiddodo-32c0e.firebasestorage.app",
    messagingSenderId: "655398128952",
    appId: "1:655398128952:web:39b190b5ff4b7ef6ff85cd"
};

let app, db, docRef;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    docRef = doc(db, "kiddodo", "appState");
} catch (e) {
    console.error("Błąd inicjalizacji Firebase:", e);
}

let currentFilter = 'Paweł';
let currentPeriod = 'daily';
let isParentMode = false;
let isTileDeleteMode = false;
const PARENT_PIN = "1234";

let isHappyHourActive = false;
let pendingTaskIdForPhoto = null;

// FABRYCZNE / DOMYŚLNE STRUKTURY DANYCH
const defaultData = {
    lastResetDate: new Date().toISOString().split('T')[0],
    lastResetWeek: getWeekNumber(new Date()),
    lastResetMonth: new Date().getMonth(),
    lastResetYear: new Date().getFullYear(),
    questTilesData: [
        { id: 1, title: "Ścielenie łóżka", points: 5 },
        { id: 2, title: "Zrobienie lekcji", points: 15 },
        { id: 3, title: "Wyniesienie śmieci", points: 5 },
        { id: 4, title: "Wyprowadzenie psa", points: 10 },
        { id: 5, title: "Podlewanie kwiatów", points: 5 }
    ],
    scores: {
        Paweł: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
        Madzia: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
    },
    shopBudget: { Paweł: 0, Madzia: 0 },
    shopItems: [
        { id: 1, icon: "📱", name: "+1h Family Link / Konsola", cost: 20 },
        { id: 2, icon: "⚽", name: "+1h Dodatkowa na dworze", cost: 10 },
        { id: 3, icon: "🍦", name: "Dodatkowa przekąska / słodycz", cost: 15 }
    ],
    goalsData: {
        Paweł: [
            { id: 1, icon: "🍦", name: "Lody", target: 30 },
            { id: 2, icon: "🎮", name: "Gra na konsole", target: 100 }
        ],
        Madzia: [
            { id: 3, icon: "🍦", name: "Lody", target: 30 },
            { id: 4, icon: "🎨", name: "Zestaw artystyczny", target: 80 }
        ],
        Shared: [
            { id: 99, icon: "🚗", name: "Wycieczka Rodzinna", target: 500 }
        ]
    },
    activeTasksList: []
};

let appState = JSON.parse(JSON.stringify(defaultData));

// POMOCNICZA FUNKCJA DO OBLICZANIA NUMERU TYGODNIA
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// BEZPIECZNE SCALANIE DANYCH Z CHMURY I PAMIĘCI
function sanitizeAndMergeState(incomingState) {
    if (!incomingState || typeof incomingState !== 'object') return;

    if (Array.isArray(incomingState.questTilesData) && incomingState.questTilesData.length > 0) {
        appState.questTilesData = incomingState.questTilesData;
    }
    if (Array.isArray(incomingState.activeTasksList)) {
        appState.activeTasksList = incomingState.activeTasksList;
    }
    if (incomingState.scores) {
        appState.scores = { ...defaultData.scores, ...incomingState.scores };
    }
    if (incomingState.shopBudget) {
        appState.shopBudget = { ...defaultData.shopBudget, ...incomingState.shopBudget };
    }
    if (Array.isArray(incomingState.shopItems)) {
        appState.shopItems = incomingState.shopItems;
    }
    if (incomingState.goalsData) {
        appState.goalsData = { ...defaultData.goalsData, ...incomingState.goalsData };
    }
    if (incomingState.lastResetDate) appState.lastResetDate = incomingState.lastResetDate;
    if (incomingState.lastResetWeek) appState.lastResetWeek = incomingState.lastResetWeek;
    if (incomingState.lastResetMonth !== undefined) appState.lastResetMonth = incomingState.lastResetMonth;
    if (incomingState.lastResetYear) appState.lastResetYear = incomingState.lastResetYear;
}

// AUTOMATYCZNE RESETOWANIE OKRESÓW (DZIEŃ / TYDZIEŃ / MIESIĄC / ROK)
function checkCalendarResets() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentWeek = getWeekNumber(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let hasChanges = false;

    // 1. RESET DZIENNY (Północ 00:00)
    if (!appState.lastResetDate || appState.lastResetDate !== todayStr) {
        appState.activeTasksList = [];
        appState.scores.Paweł.daily = 0;
        appState.scores.Madzia.daily = 0;
        appState.shopBudget.Paweł = 0;
        appState.shopBudget.Madzia = 0;
        appState.lastResetDate = todayStr;
        hasChanges = true;
    }

    // 2. RESET TYGODNIOWY (Nowy tydzień)
    if (appState.lastResetWeek === undefined || appState.lastResetWeek !== currentWeek) {
        appState.scores.Paweł.weekly = 0;
        appState.scores.Madzia.weekly = 0;
        appState.lastResetWeek = currentWeek;
        hasChanges = true;
    }

    // 3. RESET MIESIĘCZNY (Nowy miesiąc)
    if (appState.lastResetMonth === undefined || appState.lastResetMonth !== currentMonth) {
        appState.scores.Paweł.monthly = 0;
        appState.scores.Madzia.monthly = 0;
        appState.lastResetMonth = currentMonth;
        hasChanges = true;
    }

    // 4. RESET ROCZNY (Nowy rok)
    if (appState.lastResetYear === undefined || appState.lastResetYear !== currentYear) {
        appState.scores.Paweł.yearly = 0;
        appState.scores.Madzia.yearly = 0;
        appState.lastResetYear = currentYear;
        hasChanges = true;
    }

    if (hasChanges) {
        saveToStorageAndFirebase();
    }
}

// BACKUP W PAMIĘCI PODRĘCZNEJ TELEFONU
function loadLocalFallback() {
    try {
        const local = localStorage.getItem('kiddodo_backup_v5');
        if (local) {
            sanitizeAndMergeState(JSON.parse(local));
        }
    } catch (e) {}
}

function saveLocalFallback() {
    try {
        localStorage.setItem('kiddodo_backup_v5', JSON.stringify(appState));
    } catch (e) {}
}

loadLocalFallback();
checkCalendarResets();

// SYNCHRONIZACJA Z CHMURĄ FIREBASE
if (docRef) {
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            sanitizeAndMergeState(docSnap.data());
            checkCalendarResets();
            saveLocalFallback();
            renderAllUI();
        } else {
            saveToStorageAndFirebase();
        }
    }, (err) => {
        console.warn("Tryb offline, dane ładowane z telefonu.");
    });
}

async function saveToStorageAndFirebase() {
    saveLocalFallback();
    if (docRef) {
        try {
            await setDoc(docRef, appState);
        } catch (e) {}
    }
}

function renderAllUI() {
    renderTasksList();
    renderTiles();
    updateVials();
    updateShopUI();
}

// WBUDOWANY MODAL PINU
function openPinModal() {
    if (isParentMode) {
        toggleParentMode(false);
    } else {
        document.getElementById('pin-input').value = '';
        document.getElementById('pin-modal').classList.add('open');
    }
}

function closePinModal() {
    document.getElementById('pin-modal').classList.remove('open');
}

function submitPin() {
    const val = document.getElementById('pin-input').value.trim();
    if (val === PARENT_PIN) {
        closePinModal();
        toggleParentMode(true);
    } else {
        alert("Błędny PIN!");
    }
}

function toggleParentMode(state) {
    isParentMode = state;
    const lockBtn = document.getElementById('parent-lock');
    const lockIcon = document.getElementById('lock-icon');

    if (isParentMode) {
        document.body.classList.add('parent-mode');
        lockBtn.classList.add('unlocked');
        lockIcon.className = "fa-solid fa-lock-open";
    } else {
        isTileDeleteMode = false;
        document.body.classList.remove('parent-mode');
        document.body.classList.remove('tile-delete-mode');
        lockBtn.classList.remove('unlocked');
        document.getElementById('btn-tile-delete-toggle').classList.remove('delete-mode-active');
        lockIcon.className = "fa-solid fa-lock";
    }

    updateVials();
    updateShopUI();
}

// ZALICZANIE ZADAŃ I FOTOGRAFIE
function toggleTask(id) {
    const task = appState.activeTasksList.find(t => t.id === id);
    if (!task) return;

    if (!task.completed) {
        pendingTaskIdForPhoto = id;
        document.getElementById('camera-input').click();
    } else {
        const assignee = task.assignee;
        const points = task.points;

        task.completed = false;
        delete task.photo;

        appState.scores[assignee].daily = Math.max(0, appState.scores[assignee].daily - points);
        appState.scores[assignee].weekly = Math.max(0, appState.scores[assignee].weekly - points);
        appState.scores[assignee].monthly = Math.max(0, appState.scores[assignee].monthly - points);
        appState.scores[assignee].yearly = Math.max(0, appState.scores[assignee].yearly - points);
        appState.shopBudget[assignee] = Math.max(0, appState.shopBudget[assignee] - points);

        saveToStorageAndFirebase();
        renderAllUI();
    }
}

document.getElementById('camera-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || !pendingTaskIdForPhoto) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxW = 350;
            const scale = maxW / img.width;
            canvas.width = maxW;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            finalizeTaskCompletion(pendingTaskIdForPhoto, compressedBase64);
            pendingTaskIdForPhoto = null;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function finalizeTaskCompletion(taskId, photoData) {
    const task = appState.activeTasksList.find(t => t.id === taskId);
    if (!task) return;

    const assignee = task.assignee;
    let points = task.points;

    if (isHappyHourActive) {
        points = points * 3;
        task.points = points;
        isHappyHourActive = false;
        document.getElementById('boost-banner').classList.remove('active');
        alert("🎉 Zrobiono Quest w trakcie Happy Hour! x3 PKT!");
    }

    task.completed = true;
    task.photo = photoData;

    appState.scores[assignee].daily += points;
    appState.scores[assignee].weekly += points;
    appState.scores[assignee].monthly += points;
    appState.scores[assignee].yearly += points;
    appState.shopBudget[assignee] += points;

    saveToStorageAndFirebase();
    renderAllUI();
    triggerConfetti();
}

function renderTasksList() {
    const container = document.getElementById('tasks-list');
    container.innerHTML = '';

    appState.activeTasksList.forEach(task => {
        if (task.assignee === currentFilter) {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed' : ''}`;
            
            const photoHtml = task.photo ? `<img src="${task.photo}" class="task-photo-thumb" onclick="window.viewPhoto('${task.photo}')" />` : '';

            card.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${task.title} <span class="points-badge">+${task.points} pkt</span></div>
                    <div class="assignee-badge"><i class="fa-solid fa-user"></i> ${task.assignee}</div>
                </div>
                <div class="task-actions">
                    ${photoHtml}
                    <button class="btn-delete" onclick="window.deleteTask('${task.id}')"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-check ${task.completed ? 'done' : ''}" onclick="window.toggleTask('${task.id}')">
                        <i class="fa-solid ${task.completed ? 'fa-check-double' : 'fa-check'}"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        }
    });
}

function viewPhoto(photoUrl) {
    const w = window.open("");
    w.document.write(`<img src="${photoUrl}" style="max-width:100%; display:block; margin:20px auto; border-radius:12px;" />`);
}

function addQuestFromTile(title, points) {
    appState.activeTasksList.push({
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title: title,
        points: points,
        assignee: currentFilter,
        completed: false
    });

    saveToStorageAndFirebase();
    renderAllUI();
}

function deleteTask(id) {
    appState.activeTasksList = appState.activeTasksList.filter(t => t.id !== id);
    saveToStorageAndFirebase();
    renderAllUI();
}

function renderTiles() {
    const container = document.getElementById('tiles-container');
    container.innerHTML = '';

    appState.questTilesData.sort((a, b) => a.title.localeCompare(b.title, 'pl'));

    appState.questTilesData.forEach(tile => {
        const wrapper = document.createElement('div');
        wrapper.className = 'quest-tile-wrapper';
        wrapper.setAttribute('data-title', tile.title.toLowerCase());

        const safeTitle = tile.title.replace(/'/g, "\\'");

        wrapper.innerHTML = `
            <button class="quest-tile" onclick="window.addQuestFromTile('${safeTitle}', ${tile.points})">
                🎯 ${tile.title} (+${tile.points})
            </button>
            <button class="btn-delete-tile" onclick="window.confirmRemoveTile(${tile.id})" title="Usuń kafelek">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(wrapper);
    });
}

function createNewTile() {
    const titleInput = document.getElementById('new-tile-title');
    const pointsInput = document.getElementById('new-tile-points');

    const title = titleInput.value.trim();
    const points = parseInt(pointsInput.value) || 10;

    if (!title) return alert("Wpisz nazwę Questu!");

    appState.questTilesData.push({ id: Date.now(), title: title, points: points });
    saveToStorageAndFirebase();
    renderAllUI();

    titleInput.value = '';
    document.getElementById('tile-search').value = '';
    filterTilesBySearch();
}

function confirmRemoveTile(id) {
    appState.questTilesData = appState.questTilesData.filter(t => t.id !== id);
    saveToStorageAndFirebase();
    renderAllUI();
}

function filterTasks(assignee, chipBtn) {
    currentFilter = assignee;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (chipBtn) chipBtn.classList.add('active');

    renderAllUI();
}

function openRankingModal() {
    document.getElementById('ranking-modal').classList.add('open');
    updateVials();
    updateShopUI();
}

function closeRankingModal() {
    document.getElementById('ranking-modal').classList.remove('open');
}

function selectKidInModal(kidName) {
    const targetChip = kidName === 'Paweł' ? document.getElementById('chip-pawel') : document.getElementById('chip-madzia');
    filterTasks(kidName, targetChip);
}

function triggerConfetti() {
    try {
        if (typeof confetti === 'function') confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}
}

function switchPeriod(period, tabBtn) {
    currentPeriod = period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    updateVials();
}

function updateVials() {
    const pPts = appState.scores.Paweł[currentPeriod] || 0;
    const mPts = appState.scores.Madzia[currentPeriod] || 0;
    const sharedPts = (appState.scores.Paweł.yearly || 0) + (appState.scores.Madzia.yearly || 0);

    document.getElementById('pts-vial-pawel').innerText = `${pPts} pkt`;
    document.getElementById('pts-vial-madzia').innerText = `${mPts} pkt`;
    document.getElementById('pts-vial-shared').innerText = `${sharedPts} pkt`;

    const tPawel = document.getElementById('vial-title-pawel');
    const tMadzia = document.getElementById('vial-title-madzia');

    tPawel.classList.remove('selected');
    tMadzia.classList.remove('selected');

    if (currentFilter === 'Paweł') tPawel.classList.add('selected');
    if (currentFilter === 'Madzia') tMadzia.classList.add('selected');

    renderVialLiquid('pawel', pPts, appState.goalsData.Paweł || []);
    renderVialLiquid('madzia', mPts, appState.goalsData.Madzia || []);
    renderVialLiquid('shared', sharedPts, appState.goalsData.Shared || []);
}

function renderVialLiquid(vialKey, currentPts, goalsList) {
    const maxTarget = goalsList.length > 0 ? Math.max(...goalsList.map(g => g.target)) : 100;
    const heightPercent = Math.min(100, Math.round((currentPts / maxTarget) * 100));

    document.getElementById(`liquid-${vialKey}`).style.height = `${heightPercent}%`;

    const marksContainer = document.getElementById(`marks-${vialKey}`);
    marksContainer.innerHTML = '';

    goalsList.forEach(goal => {
        const markPos = Math.min(100, Math.round((goal.target / maxTarget) * 100));
        const mark = document.createElement('div');
        mark.className = 'mark-item';
        mark.style.bottom = `${markPos}%`;

        mark.innerHTML = `
            <span class="mark-icon" onclick="window.clickGoalIcon('${goal.name}', ${goal.target}, ${currentPts})">${goal.icon}</span>
        `;
        marksContainer.appendChild(mark);
    });
}

function clickGoalIcon(name, target, current) {
    if (current >= target) {
        triggerConfetti();
        alert(`🎉 Cel "${name}" został osiągnięty! Rodzic może wręczyć nagrodę!`);
    } else {
        alert(`Cel: "${name}". Wymagane ${target} pkt (Masz: ${current} pkt). Brakuje: ${target - current} pkt.`);
    }
}

function updateShopUI() {
    const budget = appState.shopBudget[currentFilter] || 0;

    document.getElementById('shop-budget-display').innerText = `Budżet (${currentFilter}): ${budget} pkt`;

    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    appState.shopItems.forEach(item => {
        const canAfford = budget >= item.cost;
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div>
                <div class="shop-item-info">${item.icon} ${item.name}</div>
                <div class="shop-item-cost">Koszt: ${item.cost} pkt dziennych</div>
            </div>
            <button class="btn-buy-coupon" ${canAfford ? '' : 'disabled'} onclick="window.buyCoupon('${item.name}', ${item.cost}, '${currentFilter}')">
                Kup kupon
            </button>
        `;
        container.appendChild(div);
    });
}

function buyCoupon(itemName, cost, kidName) {
    if ((appState.shopBudget[kidName] || 0) < cost) return alert("Brak wystarczającej ilości dziennych punktów!");

    appState.shopBudget[kidName] -= cost;
    saveToStorageAndFirebase();
    renderAllUI();
    triggerConfetti();
    alert(`🎟️ GRATULACJE! ${kidName} kupuje kupon: "${itemName}"!\nPokaż ten komunikat rodzicowi!`);
}

function activateHappyHour() {
    if (!isParentMode) return;
    isHappyHourActive = true;
    document.getElementById('boost-banner').classList.add('active');
    triggerConfetti();
    alert("✨ Aktywowano Magiczne Happy Hour! PIERWSZY zrobiony Quest da x3 punktów!");
}

function filterTilesBySearch() {
    const query = document.getElementById('tile-search').value.toLowerCase();
    const wrappers = document.querySelectorAll('.quest-tile-wrapper');

    wrappers.forEach(w => {
        const title = w.getAttribute('data-title');
        w.style.display = title.includes(query) ? 'flex' : 'none';
    });
}

function toggleTileDeleteMode() {
    isTileDeleteMode = !isTileDeleteMode;
    const btn = document.getElementById('btn-tile-delete-toggle');
    if (isTileDeleteMode) {
        document.body.classList.add('tile-delete-mode');
        btn.classList.add('delete-mode-active');
    } else {
        document.body.classList.remove('tile-delete-mode');
        btn.classList.remove('delete-mode-active');
    }
}

function addNewGoalPrompt() {
    if (!isParentMode) return;
    const owner = prompt("Dla kogo ta nagroda? Wpisz: Paweł, Madzia lub Rodzina").trim();
    if (!['Paweł', 'Madzia', 'Rodzina'].includes(owner)) return alert("Błędny wybór osoby!");

    const icon = prompt("Wpisz emoji dla celu:", "🎁");
    const name = prompt("Podaj nazwę celu/nagrody:");
    const target = parseInt(prompt("Podaj wymagany próg punktowy:"));

    if (!name || !target) return alert("Wypełnij wszystkie dane!");

    const key = owner === 'Rodzina' ? 'Shared' : owner;
    if (!appState.goalsData[key]) appState.goalsData[key] = [];
    appState.goalsData[key].push({ id: Date.now(), icon: icon || "🎁", name: name, target: target });

    saveToStorageAndFirebase();
    renderAllUI();
}

function addNewShopItemPrompt() {
    if (!isParentMode) return;
    const icon = prompt("Wpisz emoji dla kuponu:", "🎟️");
    const name = prompt("Podaj nazwę dziennego kuponu:");
    const cost = parseInt(prompt("Podaj koszt w punktach dziennych:"));

    if (!name || !cost) return alert("Wypełnij wszystkie dane!");

    appState.shopItems.push({ id: Date.now(), icon: icon || "🎟️", name: name, cost: cost });
    saveToStorageAndFirebase();
    renderAllUI();
}

// PRZYPISANIE FUNKCJI DO WINDOW
window.openRankingModal = openRankingModal;
window.closeRankingModal = closeRankingModal;
window.selectKidInModal = selectKidInModal;
window.switchPeriod = switchPeriod;
window.clickGoalIcon = clickGoalIcon;
window.buyCoupon = buyCoupon;
window.activateHappyHour = activateHappyHour;
window.filterTasks = filterTasks;
window.filterTilesBySearch = filterTilesBySearch;
window.toggleTileDeleteMode = toggleTileDeleteMode;
window.confirmRemoveTile = confirmRemoveTile;
window.createNewTile = createNewTile;
window.addQuestFromTile = addQuestFromTile;
window.deleteTask = deleteTask;
window.toggleTask = toggleTask;
window.openPinModal = openPinModal;
window.closePinModal = closePinModal;
window.submitPin = submitPin;
window.viewPhoto = viewPhoto;
window.addNewGoalPrompt = addNewGoalPrompt;
window.addNewShopItemPrompt = addNewShopItemPrompt;

// INICJACJA APLIKACJI
renderAllUI();
