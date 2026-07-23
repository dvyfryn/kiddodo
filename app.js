// Wersja: 0.4.0

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TWOJA BAZA FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAlF_XfCacX98_6NYhkrQ0dI5AC1ykKojU",
    authDomain: "kiddodo-32c0e.firebaseapp.com",
    projectId: "kiddodo-32c0e",
    storageBucket: "kiddodo-32c0e.firebasestorage.app",
    messagingSenderId: "655398128952",
    appId: "1:655398128952:web:39b190b5ff4b7ef6ff85cd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "kiddodo", "appState");

const allKids = ["Paweł", "Madzia"];

let currentFilter = 'Paweł';
let currentPeriod = 'daily';
let isParentMode = false;
let isTileDeleteMode = false;
const PARENT_PIN = "1234";

let isHappyHourActive = false;
let pendingTaskIdForPhoto = null;

// Domyślny stan aplikacji na wypadek braku połączenia
const defaultData = {
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

// NATYCHMIASTOWE WCZYTANIE Z LOCALSTORAGE (GWARANCJA BRAKU ZNIKANIA KAFELKÓW)
function loadLocalFallback() {
    try {
        const local = localStorage.getItem('kiddodo_backup_v4');
        if (local) {
            appState = JSON.parse(local);
        }
    } catch (e) {}
}

function saveLocalFallback() {
    try {
        localStorage.setItem('kiddodo_backup_v4', JSON.stringify(appState));
    } catch (e) {}
}

loadLocalFallback();

// SYNCHRONIZACJA Z BAZĄ CLOUD FIRESTORE W TLE
onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
        appState = docSnap.data();
        saveLocalFallback();
        renderAllUI();
    } else {
        saveToFirebase();
    }
}, (err) => {
    console.log("Praca w trybie offline/local");
});

async function saveToFirebase() {
    saveLocalFallback();
    try {
        await setDoc(docRef, appState);
    } catch (e) {}
}

function renderAllUI() {
    renderTasksList();
    renderTiles();
    updateVials();
    updateShopUI();
}

// OBSŁUGA WEWNĘTRZNEGO MODALA PINU
function openPinModal() {
    if (isParentMode) {
        // Jeśli już zalogowany -> wyloguj
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

        if (currentFilter === 'all') {
            const chipPawel = document.getElementById('chip-pawel');
            filterTasks('Paweł', chipPawel);
        }
    }

    updateVials();
    updateShopUI();
}

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

        saveToFirebase();
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

    saveToFirebase();
    renderAllUI();
    triggerConfetti();
}

function renderTasksList() {
    const container = document.getElementById('tasks-list');
    container.innerHTML = '';

    appState.activeTasksList.forEach(task => {
        if (currentFilter === 'all' || task.assignee === currentFilter) {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed' : ''}`;
            
            const photoHtml = task.photo ? `<img src="${task.photo}" class="task-photo-thumb" onclick="viewPhoto('${task.photo}')" />` : '';

            card.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${task.title} <span class="points-badge">+${task.points} pkt</span></div>
                    <div class="assignee-badge"><i class="fa-solid fa-user"></i> ${task.assignee}</div>
                </div>
                <div class="task-actions">
                    ${photoHtml}
                    <button class="btn-delete" onclick="deleteTask('${task.id}')"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-check ${task.completed ? 'done' : ''}" onclick="toggleTask('${task.id}')">
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
    if (currentFilter === 'all') {
        allKids.forEach(kid => {
            appState.activeTasksList.push({
                id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                title: title,
                points: points,
                assignee: kid,
                completed: false
            });
        });
    } else {
        appState.activeTasksList.push({
            id: 'task_' + Date.now(),
            title: title,
            points: points,
            assignee: currentFilter,
            completed: false
        });
    }

    saveToFirebase();
    renderAllUI();
}

function deleteTask(id) {
    appState.activeTasksList = appState.activeTasksList.filter(t => t.id !== id);
    saveToFirebase();
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
            <button class="quest-tile" onclick="addQuestFromTile('${safeTitle}', ${tile.points})">
                🎯 ${tile.title} (+${tile.points})
            </button>
            <button class="btn-delete-tile" onclick="confirmRemoveTile(${tile.id})" title="Usuń kafelek">
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
    saveToFirebase();
    renderAllUI();

    titleInput.value = '';
    document.getElementById('tile-search').value = '';
    filterTilesBySearch();
}

function confirmRemoveTile(id) {
    appState.questTilesData = appState.questTilesData.filter(t => t.id !== id);
    saveToFirebase();
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
    const pPts = appState.scores.Paweł[currentPeriod];
    const mPts = appState.scores.Madzia[currentPeriod];
    const sharedPts = appState.scores.Paweł.yearly + appState.scores.Madzia.yearly;

    document.getElementById('pts-vial-pawel').innerText = `${pPts} pkt`;
    document.getElementById('pts-vial-madzia').innerText = `${mPts} pkt`;
    document.getElementById('pts-vial-shared').innerText = `${sharedPts} pkt`;

    const tPawel = document.getElementById('vial-title-pawel');
    const tMadzia = document.getElementById('vial-title-madzia');

    tPawel.classList.remove('selected');
    tMadzia.classList.remove('selected');

    if (currentFilter === 'Paweł') tPawel.classList.add('selected');
    if (currentFilter === 'Madzia') tMadzia.classList.add('selected');

    renderVialLiquid('pawel', pPts, appState.goalsData.Paweł);
    renderVialLiquid('madzia', mPts, appState.goalsData.Madzia);
    renderVialLiquid('shared', sharedPts, appState.goalsData.Shared);
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
            <span class="mark-icon" onclick="clickGoalIcon('${goal.name}', ${goal.target}, ${currentPts})">${goal.icon}</span>
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
    let targetKid = currentFilter === 'all' ? 'Paweł' : currentFilter;
    const budget = appState.shopBudget[targetKid] || 0;

    document.getElementById('shop-budget-display').innerText = `Budżet (${targetKid}): ${budget} pkt`;

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
            <button class="btn-buy-coupon" ${canAfford ? '' : 'disabled'} onclick="buyCoupon('${item.name}', ${item.cost}, '${targetKid}')">
                Kup kupon
            </button>
        `;
        container.appendChild(div);
    });
}

function buyCoupon(itemName, cost, kidName) {
    if (appState.shopBudget[kidName] < cost) return alert("Brak wystarczającej ilości dziennych punktów!");

    appState.shopBudget[kidName] -= cost;
    saveToFirebase();
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

// ODDAJEMY METODY DO GLOBALNEGO ZAKRESU WINDOW
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

// STARTOWA INICJALIZACJA
renderAllUI();
