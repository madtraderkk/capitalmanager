let currentDayCount = 1;
let initialCapital = 0.00;
let liveBalance = 0.00;
let targetPopupShown = false;
let csvDownloaded = false;
let initialEditUnlocked = false;
const STORAGE_KEY = "capital_manager_ledger_v1";
const RESET_PIN = "2004";
const EDIT_PIN = "2004";

window.onload = function () {
    loadSavedData();
    recalculateOptimizer();
    document.getElementById('liveBalanceText').innerText = `$${liveBalance.toFixed(2)}`;
    document.getElementById('liveCapitalInput').value = liveBalance.toFixed(2);
    ensureResetButton();
    lockInitialBalance();
};

function ensureResetButton() {
    const footer = document.querySelector('.footer-bar');
    if (!footer || document.getElementById('resetBtn')) return;

    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    resetBtn.className = 'btn btn-secondary';
    resetBtn.style.marginTop = '12px';
    resetBtn.textContent = 'Reset Data';
    resetBtn.onclick = showResetPrompt;

    footer.parentElement.appendChild(resetBtn);
}

function lockInitialBalance() {
    const input = document.getElementById('capitalInput');
    const doneBtn = document.getElementById('doneInitialBtn');
    input.readOnly = true;
    input.disabled = false;
    doneBtn.style.display = 'none';
    initialEditUnlocked = false;
}

function openInitialBalancePrompt() {
    const pin = prompt('Enter password to edit Initial Balance:');
    if (pin !== EDIT_PIN) {
        alert('Wrong password.');
        return;
    }

    const input = document.getElementById('capitalInput');
    const doneBtn = document.getElementById('doneInitialBtn');

    initialEditUnlocked = true;
    input.readOnly = false;
    input.focus();
    input.select();
    doneBtn.style.display = 'block';
}

function saveInitialBalanceEdit() {
    if (!initialEditUnlocked) return;

    const input = document.getElementById('capitalInput');
    const newValue = parseFloat(input.value);

    if (isNaN(newValue) || newValue <= 0) {
        alert('Please enter a valid amount.');
        input.value = initialCapital.toFixed(2);
        return;
    }

    initialCapital = newValue;
    liveBalance = newValue;
    document.getElementById('liveCapitalInput').value = liveBalance.toFixed(2);
    document.getElementById('liveBalanceText').innerText = `$${liveBalance.toFixed(2)}`;
    input.value = initialCapital.toFixed(2);
    recalculateOptimizer();
    saveData();
    lockInitialBalance();
}

function showResetPrompt() {
    if (!csvDownloaded) {
        alert('Please download CSV first, then reset will be allowed.');
        return;
    }

    const pin = prompt('Enter reset PIN to reset data:');
    if (pin === null) return;

    if (pin !== RESET_PIN) {
        alert('Wrong PIN.');
        return;
    }

    localStorage.removeItem(STORAGE_KEY);
    clearAllData();
    csvDownloaded = false;
    alert('Data reset successfully.');
}

function clearAllData() {
    currentDayCount = 1;
    initialCapital = 5000;
    liveBalance = 5000;
    targetPopupShown = false;
    initialEditUnlocked = false;

    document.getElementById('capitalInput').value = 5000;
    document.getElementById('liveCapitalInput').value = 5000;
    document.getElementById('dailyTargetInput').value = 2;
    document.getElementById('totalTargetInput').value = 1000;
    document.getElementById('pipsInput').value = 20;
    document.getElementById('ratioInput').value = 1;
    document.getElementById('assetInput').value = 'XAUUSD';
    document.getElementById('closedPL').value = '';
    document.querySelector('#ledgerTable tbody').innerHTML = '';
    document.getElementById('liveBalanceText').innerText = '$5,000.00';
    lockInitialBalance();
    recalculateOptimizer();
}

function downloadCSV() {
    const rows = [["Day", "Date", "Starting Balance", "Target $", "Target Pips", "Lot Size", "Actual P/L", "Ending Balance", "Status"]];
    document.querySelectorAll("#ledgerTable tbody tr").forEach(tr => {
        const tds = [...tr.querySelectorAll("td")].map(td => td.innerText);
        rows.push(tds);
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "capital_manager_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    csvDownloaded = true;
}

window.downloadCSV = downloadCSV;
window.openInitialBalancePrompt = openInitialBalancePrompt;
window.saveInitialBalanceEdit = saveInitialBalanceEdit;
window.showResetPrompt = showResetPrompt;
window.toggleTheme = toggleTheme;

function toggleTheme() {
    document.body.classList.toggle('light');
}

function getSelectedRatioValue() {
    const ratio = parseFloat(document.getElementById('ratioInput').value);
    return isNaN(ratio) || ratio <= 0 ? 1 : ratio;
}

function getPipValue() {
    const asset = document.getElementById('assetInput').value;
    if (asset === 'XAUUSD') return 10;
    if (asset === 'GER30') return 1;
    if (asset === 'US100') return 1;
    return 1;
}

function recalculateOptimizer() {
    const capital = parseFloat(document.getElementById('capitalInput').value) || initialCapital;
    const dailyTargetPct = parseFloat(document.getElementById('dailyTargetInput').value) || 0;
    const totalTargetProfit = parseFloat(document.getElementById('totalTargetInput').value) || 0;
    const targetPips = parseFloat(document.getElementById('pipsInput').value) || 1;
    const ratioValue = getSelectedRatioValue();
    const pipValue = getPipValue();

    initialCapital = capital;

    const dailyTargetProfit = capital * (dailyTargetPct / 100);
    let rawLot = 0;

    if (capital > 0 && targetPips > 0 && pipValue > 0) {
        rawLot = dailyTargetProfit / (targetPips * pipValue);
    }

    if (rawLot < 0.01) rawLot = 0.01;
    if (rawLot > 0.10) rawLot = 0.10;

    document.getElementById('liveBalanceText').innerText = `$${liveBalance.toFixed(2)}`;
    document.getElementById('liveCapitalInput').value = liveBalance.toFixed(2);
    document.getElementById('dailyProfitText').innerText = `$${dailyTargetProfit.toFixed(2)}`;
    document.getElementById('totalProfitText').innerText = `$${totalTargetProfit.toFixed(2)}`;
    document.getElementById('recommendedLot').innerText = `${rawLot.toFixed(2)} Lots`;
    document.getElementById('estimatedProfitText').innerText = `$${(dailyTargetProfit * ratioValue).toFixed(2)}`;

    checkTargetPopup();
    saveData();
}

function checkTargetPopup() {
    const totalTargetProfit = parseFloat(document.getElementById('totalTargetInput').value) || 0;
    const targetBalance = initialCapital + totalTargetProfit;

    if (totalTargetProfit > 0 && liveBalance >= targetBalance && !targetPopupShown) {
        targetPopupShown = true;
        alert(`Congratulations! Target reached: ${targetBalance.toFixed(2)}`);
    }

    if (liveBalance < targetBalance) {
        targetPopupShown = false;
    }
}

function journalizeDay() {
    const closedPLInput = document.getElementById('closedPL');
    const actualPL = parseFloat(closedPLInput.value);

    if (isNaN(actualPL)) {
        alert("Please enter valid profit/loss.");
        return;
    }

    const startingBalance = liveBalance;
    const dailyTargetPct = parseFloat(document.getElementById('dailyTargetInput').value) || 0;
    const targetPips = parseFloat(document.getElementById('pipsInput').value) || 1;
    const ratioValue = getSelectedRatioValue();
    const dailyTargetProfit = startingBalance * (dailyTargetPct / 100);
    const lotUsed = document.getElementById('recommendedLot').innerText;
    const endingBalance = startingBalance + actualPL;
    const status = actualPL >= dailyTargetProfit * ratioValue ? "GREEN" : "RED";
    const dateTime = new Date().toLocaleString();

    addRowToLedger({
        day: currentDayCount,
        dateTime,
        startingBalance,
        targetProfit: dailyTargetProfit,
        targetPips,
        lotUsed,
        actualPL,
        endingBalance,
        status
    });

    currentDayCount++;
    liveBalance = endingBalance;
    document.getElementById('liveBalanceText').innerText = `$${liveBalance.toFixed(2)}`;
    document.getElementById('liveCapitalInput').value = liveBalance.toFixed(2);
    document.getElementById('closedPL').value = "";
    recalculateOptimizer();
    saveData();
}

function addRowToLedger(data) {
    const row = document.querySelector("#ledgerTable tbody").insertRow();
    row.innerHTML = `
        <td>Day ${data.day}</td>
        <td>${data.dateTime}</td>
        <td>$${data.startingBalance.toFixed(2)}</td>
        <td>$${data.targetProfit.toFixed(2)}</td>
        <td>${data.targetPips}</td>
        <td>${data.lotUsed}</td>
        <td style="color:${data.actualPL >= 0 ? 'var(--neon)' : 'var(--danger)'}">${data.actualPL >= 0 ? '+' : ''}$${data.actualPL.toFixed(2)}</td>
        <td>$${data.endingBalance.toFixed(2)}</td>
        <td style="color:${data.status === 'GREEN' ? 'var(--neon2)' : 'var(--danger)'}">${data.status}</td>
    `;
}

function saveData() {
    const rows = [];
    document.querySelectorAll("#ledgerTable tbody tr").forEach(tr => {
        rows.push([...tr.querySelectorAll("td")].map(td => td.innerText));
    });

    const payload = {
        currentDayCount,
        initialCapital,
        liveBalance,
        capitalInput: document.getElementById('capitalInput').value,
        liveCapitalInput: document.getElementById('liveCapitalInput').value,
        dailyTargetInput: document.getElementById('dailyTargetInput').value,
        totalTargetInput: document.getElementById('totalTargetInput').value,
        pipsInput: document.getElementById('pipsInput').value,
        ratioInput: document.getElementById('ratioInput').value,
        assetInput: document.getElementById('assetInput').value,
        rows
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSavedData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const payload = JSON.parse(saved);

    currentDayCount = payload.currentDayCount || 1;
    initialCapital = payload.initialCapital || 5000;
    liveBalance = payload.liveBalance || 5000;

    document.getElementById('capitalInput').value = payload.capitalInput || 5000;
    document.getElementById('capitalInput').readOnly = true;
    document.getElementById('liveCapitalInput').value = payload.liveCapitalInput || 5000;
    document.getElementById('dailyTargetInput').value = payload.dailyTargetInput || 2;
    document.getElementById('totalTargetInput').value = payload.totalTargetInput || 1000;
    document.getElementById('pipsInput').value = payload.pipsInput || 20;
    document.getElementById('ratioInput').value = payload.ratioInput || 1;
    document.getElementById('assetInput').value = payload.assetInput || 'XAUUSD';

    const tbody = document.querySelector("#ledgerTable tbody");
    tbody.innerHTML = "";

    (payload.rows || []).forEach(cols => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${cols[0] || ''}</td>
            <td>${cols[1] || ''}</td>
            <td>${cols[2] || ''}</td>
            <td>${cols[3] || ''}</td>
            <td>${cols[4] || ''}</td>
            <td>${cols[5] || ''}</td>
            <td style="color:${String(cols[6] || '').includes('-') ? 'var(--danger)' : 'var(--neon)'}">${cols[6] || ''}</td>
            <td>${cols[7] || ''}</td>
            <td style="color:${cols[8] === 'GREEN' ? 'var(--neon2)' : 'var(--danger)'}">${cols[8] || ''}</td>
        `;
    });
}
