const urlParams = new URLSearchParams(window.location.search);
const secret_code = urlParams.get('aff');
const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
let earningChart; 

async function loadConfig(env) {
    try {
        const response = await fetch(`./config.${env}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load config file: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        return {}; // Return an empty object on failure
    }
}

function copyLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');

    const copyButton = document.getElementById('copyButton');
    copyButton.innerText = 'Copied!';
    copyButton.disabled = true;

    setTimeout(() => {
        copyButton.innerText = 'Copy';
        copyButton.disabled = false;
    }, 2000);
}

async function initDashboard() {
    const config = await loadConfig(currentEnvironment);

    if (!config || !secret_code) {
        redirectToErrorPage(config?.webUrl || '/');
        return;
    }

    const apiUrl = config.apiUrl;
    const getDashboardDataEndPoints = `${apiUrl}/affiliates/${secret_code}/dashboard`;
    const payoutRequestEndPoint = `${apiUrl}/affiliates/${secret_code}/payouts`;

    setupPayoutModalListeners(payoutRequestEndPoint, getDashboardDataEndPoints);
    loadDashboardData(getDashboardDataEndPoints);
    loadRecentPayouts(payoutRequestEndPoint);
}

async function loadDashboardData(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);

        const data = await response.json();
        if (!data || Object.keys(data).length === 0) {
            console.log('if');
            displayNoDataMessage();
        } else {
            console.log('else');
            populateDashboard(data);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        displayNoDataMessage();
    }
}

async function loadRecentPayouts(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Failed to fetch payout data: ${response.statusText}`);

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            populateRecentPayouts(data);
        } else {
            displayNoPayoutRequestMessage();
        }
    } catch (error) {
        console.error('Error fetching recent payouts:', error);
        displayNoPayoutRequestMessage();
    }
}

function setupPayoutModalListeners(payoutRequestEndPoint, getDashboardDataEndPoints) {
    const payoutModal = document.getElementById('payoutModal');
    const requestPayoutButton = document.getElementById('requestPayoutButton');
    const closeModalButton = document.getElementById('closeModalButton');
    const confirmPayoutButton = document.getElementById('confirmPayoutButton');
    const payoutAmountInput = document.getElementById('payoutAmount');
    const errorText = document.getElementById('errorText');

    requestPayoutButton.addEventListener('click', () => {
        payoutModal.classList.remove('hidden');
    });

    closeModalButton.addEventListener('click', () => {
        payoutModal.classList.add('hidden');
        errorText.classList.add('hidden');
        payoutAmountInput.value = '';
    });

    payoutAmountInput.addEventListener('input', () => {
        errorText.classList.add('hidden');
    });

    confirmPayoutButton.addEventListener('click', async () => {
        const amount = parseFloat(payoutAmountInput.value);
        if (!amount || amount < 1000) {
            errorText.textContent = 'Please enter an amount greater than or equal to 1000.';
            errorText.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch(payoutRequestEndPoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

            await loadDashboardData(getDashboardDataEndPoints);
            payoutModal.classList.add('hidden');
            payoutAmountInput.value = '';
            errorText.classList.add('hidden');
        } catch (error) {
            console.error('Error requesting payout:', error);
            errorText.textContent = 'Requested amount exceeds available amount.';
            errorText.classList.remove('hidden');
        }
    });
}

function populateDashboard(data) {
    document.getElementById('affiliateName').innerText = data.name || 'N/A';
    document.getElementById('welcomeText').innerText = `Hi! ${data.name || 'there'}, welcome back👋`;
    document.getElementById('currentBalance').innerText = `${data.currency_symbol || ''}${data.available_payout_amount || 0}`;
    document.getElementById('totalEarned').innerText = `${data.currency_symbol || ''}${data.overview?.commision_earned || 0}`;
    document.getElementById('referralLink').value = data.link || 'N/A';
    console.log(data.link);
    document.getElementById('commissionHeader').innerText = `Commission (${data.currency_symbol || ''})`;
    document.getElementById('profile_pic').src = data.profile_pic_url || "https://avatar.iran.liara.run/public/2";


    if (data.referees && data.referees.length > 0) {
        data.referees.forEach((customer, index) => {
            const customerTableBody = document.getElementById('customerTableBody');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="border px-4 py-2">${index + 1}</td>
                <td class="border px-4 py-2">${formatDate(new Date(customer.created_at))}</td>
                <td class="border px-4 py-2">${customer.commission}</td>
            `;
            customerTableBody.appendChild(row);
        });
    } else {
        displayNoDataMessage();
    }

    const ctx = document.getElementById('earningChart').getContext('2d');
    if (earningChart) earningChart.destroy();

    earningChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.month_wise_commission?.map(m => m.month) || months,
            datasets: [{
                label: 'Earnings',
                data: data.month_wise_commission?.map(m => m.commission) || [],
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true },
            },
        },
    });
}

function displayNoDataMessage() {
    const customerTableBody = document.getElementById('customerTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="border px-4 py-text-center text-red-500" colspan="3" >You currently have no earnings. Start referring now to begin earning rewards!</td>
    `;
    customerTableBody.appendChild(row);

    if (earningChart) earningChart.destroy();
    const ctx = document.getElementById('earningChart').getContext('2d');
    earningChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Earnings',
                data: [],
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true },
            },
        },
    });
}

function displayNoPayoutRequestMessage() {
    const customerTableBody = document.getElementById('payoutTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="border px-4 py-2 text-center text-red-500" colspan="4">You currently have not raised Payout Request.</td>
    `;
    customerTableBody.appendChild(row);
}

function populateRecentPayouts(data) {
    const customerTableBody = document.getElementById('payoutTableBody');
    data.forEach((payout, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="border px-4 py-2">${index + 1}</td>
            <td class="border px-4 py-2">${formatDate(new Date(payout.created_at))}</td>
            <td class="border px-4 py-2">${payout.amount}</td>
            <td class="border px-4 py-2" style="color: ${
                payout.status === 'processed' ? 'green' : 
                payout.status === 'pending' ? 'blue' : 
                payout.status === 'rejected' ? 'red' : 'black'
            };">${payout.display_status}</td>
        `;
        customerTableBody.appendChild(row);
    });
}

function formatDate(date) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

function redirectToErrorPage(url) {
    window.location.href = `${url}/error`;
}

document.addEventListener('DOMContentLoaded', initDashboard);
