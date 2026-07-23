let currentFilter = 'all';
let currentPeriod = 'daily';
let isParentMode = false;
let isTileDeleteMode = false;
const PARENT_PIN = "1234";

let boostMultiplier = 1;
let boostTimerInterval = null;

let scores = {
    Paweł: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    Madzia: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
};

// Dedykowane cele/nagrody dla Pawła, Madzi oraz Rodziny
let goalsData = {
    Paweł: [
        { id: 1, icon: "🍦", name: "Lody", target: 30 },
        { id: 2, name: "🎮 Gra na konsole", icon: "🎮", target: 100 }
    ],
    Madzia: [
        { id: 3, icon: "🍦", name: "Lody", target: 30 },
        { id: 4, icon: "🎨 Zestaw plastyczny", name: "Zestaw artystyczny", target: 80 }
    ],
    Shared: [
        { id: 99, icon: "🚗", name: "Wycieczka Rodzinna", target: 500 }
    ]
};

let questTilesData = [
    { id: 1, title: "Ścielenie łóżka", points: 5 },
    { id: 2, title: "Zrobienie lekcji", points: 15 },
    { id: 3, title: "Wyniesienie śmieci", points: 5 },
    { id: 4, title: "Wyprowadzenie psa", points: 10 },
    { id: 5, title: "Podlewanie kwiatów", points: 5 },
    { id: 6, title: "Bałagan w pokoju", points: -10 } // Kafelek ujemny!
];

function openRankingModal() {
    document.getElementById('ranking-modal').classList.add('open');
    updateVials();
}

function closeRankingModal() {
    document.getElementById('ranking-modal').classList.remove('open');
}

function triggerConfetti() {
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
}

function switchPeriod(period, tabBtn) {
    currentPeriod = period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    updateVials();
}

// Aktualizacja wyglądu 3 fiolek
function updateVials() {
    const pPts = scores.Paweł[currentPeriod];
    const mPts = scores.Madzia[currentPeriod];
    const sharedPts = scores.Paweł.yearly + scores.Madzia.yearly;

    document.getElementById('pts-vial-pawel').innerText = `${pPts} pkt`;
    document.getElementById('pts-vial-madzia').innerText = `${mPts} pkt`;
    document.getElementById('pts-vial-shared').innerText = `${sharedPts} pkt`;

    renderVialLiquid('pawel', pPts, goalsData.Paweł);
    renderVialLiquid('madzia', mPts, goalsData.Madzia);
    renderVialLiquid('shared', sharedPts, goalsData.Shared);
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

// Dodawanie nowej nagrody do fiolki w Trybie Rodzica
function addNewGoalPrompt() {
    if (!isParentMode) return;

    const owner = prompt("Dla kogo ta nagroda? Wpisz: Paweł, Madzia lub Rodzina").trim();
    if (!['Paweł', 'Madzia', 'Rodzina'].includes(owner)) return alert("Błędny wybór osoby!");

    const icon = prompt("Wpisz emoji dla celu (np. 🍦, 🎮, 🚴‍♂️, 🏖️):", "🎁");
    const name = prompt("Podaj nazwę celu/nagrody:");
    const target = parseInt(prompt("Podaj wymagany próg punktowy:"));

    if (!name || !target) return alert("Wypełnij wszystkie dane!");

    const key = owner === 'Rodzina' ? 'Shared' : owner;
    goalsData[key].push({ id: Date.now(), icon: icon || "🎁", name: name, target: target });

    updateVials();
    alert("Dodano nowy cel do fiolki!");
}

// Aktywacja Power-Up x3 na 1 godzinę
function activateBoost() {
    if (!isParentMode) return;

    boostMultiplier = 3;
    const banner = document.getElementById('boost-banner');
    banner.classList.add('active');

    let duration = 3600; // 1 godzina w sekundach
    clearInterval(boostTimerInterval);

    boostTimerInterval = setInterval(() => {
        duration--;
        const m = Math.floor(duration / 60);
        const s = duration % 60;
        document.getElementById('boost-timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

        if (duration <= 0) {
            clearInterval(boostTimerInterval);
            boostMultiplier = 1;
            banner.classList.remove('active');
            alert("Czas Bonusu x3 dobiegł końca!");
        }
    }, 1000);

    triggerConfetti();
    alert("⚡ Aktywowano Bonus x3 na 1 godzinę!");
}

function toggleTask(btn) {
    const card = btn.closest('.task-card');
    const assignee = card.getAttribute('data-assignee');
    let points = parseInt(card.getAttribute('data-points')) || 0;

    // Przelicznik bonusowy x3 działa tylko dla dodatnich punktów
    if (points > 0 && boostMultiplier > 1) {
        points = points * boostMultiplier;
    }

    card.classList.toggle('completed');

    if (card.classList.contains('completed')) {
        btn.classList.add('done');
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i>';

        scores[assignee].daily += points;
        scores[assignee].weekly += points;
        scores[assignee].monthly += points;
        scores[assignee].yearly += points;

        triggerConfetti();
    } else {
        btn.classList.remove('done');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';

        scores[assignee].daily -= points;
        scores[assignee].weekly -= points;
        scores[assignee].monthly -= points;
        scores[assignee].yearly -= points;
    }

    updateVials();
}

function filterTasks(assignee, chipBtn) {
    currentFilter = assignee;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipBtn.classList.add('active');

    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
        const cardAssignee = card.getAttribute('data-assignee');
        if (assignee === 'all' || cardAssignee === assignee) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function renderTiles() {
    const container = document.getElementById('tiles-container');
    container.innerHTML = '';

    questTilesData.sort((a, b) => a.title.localeCompare(b.title, 'pl'));

    questTilesData.forEach(tile => {
        const wrapper = document.createElement('div');
        const isNegative = tile.points < 0;
        wrapper.className = `quest-tile-wrapper ${isNegative ? 'minus' : ''}`;
        wrapper.setAttribute('data-title', tile.title.toLowerCase());

        const safeTitle = tile.title.replace(/'/g, "\\'");
        const ptsLabel = isNegative ? `${tile.points}` : `+${tile.points}`;

        wrapper.innerHTML = `
            <button class="quest-tile" onclick="addQuestFromTile('${safeTitle}', ${tile.points})">
                ${isNegative ? '⚠️' : '🎯'} ${tile.title} (${ptsLabel})
            </button>
            <button class="btn-delete-tile" onclick="confirmRemoveTile(${tile.id}, '${safeTitle}')" title="Usuń kafelek">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(wrapper);
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

function confirmRemoveTile(id, title) {
    const pin = prompt(`Aby usunąć kafelek:\n"${title}"\npodaj PIN rodzica:`);
    if (pin === PARENT_PIN) {
        questTilesData = questTilesData.filter(t => t.id !== id);
        renderTiles();
    } else if (pin !== null) {
        alert("Błędny PIN!");
    }
}

function filterTilesBySearch() {
    const query = document.getElementById('tile-search').value.toLowerCase();
    const wrappers = document.querySelectorAll('.quest-tile-wrapper');

    wrappers.forEach(w => {
        const title = w.getAttribute('data-title');
        if (title.includes(query)) {
            w.style.display = 'flex';
        } else {
            w.style.display = 'none';
        }
    });
}

function createNewTile() {
    const titleInput = document.getElementById('new-tile-title');
    const pointsInput = document.getElementById('new-tile-points');

    const title = titleInput.value.trim();
    const points = parseInt(pointsInput.value) || 10;

    if (!title) return alert("Wpisz nazwę Questu!");

    questTilesData.push({ id: Date.now(), title: title, points: points });
    renderTiles();

    titleInput.value = '';
    document.getElementById('tile-search').value = '';
    filterTilesBySearch();
}

function addQuestFromTile(title, points) {
    let assignee = currentFilter;
    if (assignee === 'all') {
        const choice = confirm("Czy dodajesz ten Quest dla Pawła? (Kliknij 'Anuluj' jeśli dla Madzi)");
        assignee = choice ? 'Paweł' : 'Madzia';
    }
    createQuestCard(title, points, assignee);
}

function createQuestCard(title, points, assignee) {
    const list = document.getElementById('tasks-list');
    const newTask = document.createElement('div');
    const isNegative = points < 0;

    newTask.className = `task-card ${isNegative ? 'negative' : ''}`;
    newTask.setAttribute('data-assignee', assignee);
    newTask.setAttribute('data-points', points);

    const ptsLabel = isNegative ? `${points}` : `+${points}`;

    newTask.innerHTML = `
        <div class="task-info">
            <div class="task-title">${title} <span class="points-badge ${isNegative ? 'minus' : ''}">${ptsLabel} pkt</span></div>
            <div class="assignee-badge"><i class="fa-solid fa-user"></i> ${assignee}</div>
        </div>
        <div class="task-actions">
            <button class="btn-delete" onclick="deleteTask(this)"><i class="fa-solid fa-trash"></i></button>
            <button class="btn-check" onclick="toggleTask(this)"><i class="fa-solid fa-check"></i></button>
        </div>
    `;

    list.appendChild(newTask);

    if (currentFilter !== 'all' && currentFilter !== assignee) {
        newTask.style.display = 'none';
    }
}

function toggleParentMode() {
    const lockBtn = document.getElementById('parent-lock');
    const lockIcon = document.getElementById('lock-icon');

    if (!isParentMode) {
        const pin = prompt("Podaj PIN rodzica:");
        if (pin === PARENT_PIN) {
            isParentMode = true;
            document.body.classList.add('parent-mode');
            lockBtn.classList.add('unlocked');
            lockIcon.className = "fa-solid fa-lock-open";
        } else if (pin !== null) {
            alert("Błędny PIN!");
        }
    } else {
        isParentMode = false;
        isTileDeleteMode = false;
        document.body.classList.remove('parent-mode');
        document.body.classList.remove('tile-delete-mode');
        lockBtn.classList.remove('unlocked');
        document.getElementById('btn-tile-delete-toggle').classList.remove('delete-mode-active');
        lockIcon.className = "fa-solid fa-lock";
    }
    updateVials();
}

function deleteTask(btn) {
    const card = btn.closest('.task-card');
    card.remove();
}

renderTiles();
