
const urlParams = new URLSearchParams(window.location.search);
const currentEnv = currentEnvironment;
const secret_code = urlParams.get('aff');
const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function loadConfig(env) {
    return fetch(`./config.${env}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load config file: ${response.statusText}`);
            }
            return response.json();
        })
        .catch(error => {
            return {};
        });
}

function copyLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    referralLink.setSelectionRange(0, 99999);
    document.execCommand('copy');

    const copyButton = document.getElementById('copyButton');
    copyButton.innerText = 'Copied!';
    copyButton.disabled = true;

    setTimeout(() => {
        copyButton.innerText = 'Copy';
        copyButton.disabled = false;
    }, 2000);
}

loadConfig(currentEnv).then(config => {
    const apiUrl = config.apiUrl;
    const getDashboardDataEndPoints = `${apiUrl}/affiliates/${secret_code}/dashboard`;
    const payoutRequestEndPoint = `${apiUrl}/affiliates/${secret_code}/payouts`;
    const webUrl = config.webUrl;
    if (!secret_code) {
        redirectToErrorPage(webUrl);
        return;
    }

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

    confirmPayoutButton.addEventListener('click', () => {
        const amount = payoutAmountInput.value;

        if (!amount || amount < 1000) {
            errorText.textContent = 'Please enter an amount greater than or equal to 1000.';
            errorText.classList.remove('hidden');
            return;
        }

        fetch(payoutRequestEndPoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            const data = JSON.parse(text);
            payoutModal.classList.add('hidden');
            payoutAmountInput.value = '';
            errorText.classList.add('hidden');

            return fetch(getDashboardDataEndPoints);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch dashboard data: ${response.status}`);
            }
            return response.json();
        })
        .then(updatedData => {
            location.reload();
        })
        .catch(error => {
            errorText.textContent = 'Requested amount exceeds available amount.';
            errorText.classList.remove('hidden');
        });
    });

    function populateRecentPayouts(data) {
        const customerTableBody = document.getElementById('payoutTableBody');
        if (data && data.length > 0) {
            data.forEach((payout, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="border px-4 py-2">${index + 1}</td>
                    <td class="border px-4 py-2">${formatDate(new Date(payout.created_at))}</td>
                    <td class="border px-4 py-2">${payout.amount}</td>
                    <td class="border px-4 py-2">${payout.status}</td>
                `;
                customerTableBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.style.color = 'red';
            row.innerHTML = `
                <td class="border px-4 py-2 text-center" colspan="3">You currently have no earnings. Start referring now to begin earning rewards!</td>
            `;
            customerTableBody.appendChild(row);
        }
    }

    fetch(getDashboardDataEndPoints)
        .then(response => response.json())
        .then(data => {
            if (!data || Object.keys(data).length === 0) {
                displayNoDataMessage();
            } else {
                populateDashboard(data);
            }
        })
        .catch(error => {
            displayNoDataMessage();
        });

    function populateDashboard(data) {
        document.getElementById('affiliateName').innerText = data.name || 'N/A';
        document.getElementById('welcomeText').innerText = `Hi! ${data.name || 'there'}, welcome back👋`;
        document.getElementById('currentBalance').innerText = `${data.currency_symbol || ''}${data.available_payout_amount || 0}`;
        document.getElementById('totalEarned').innerText = `${data.currency_symbol || ''}${data.overview?.commision_earned || 0}`;
        document.getElementById('referralLink').value = data.link || 'N/A';
        document.getElementById('commissionHeader').innerText = `Commission (${data.currency_symbol || ''})`;
        document.getElementById('profile_pic').src = data.profile_pic_url;

        const customerTableBody = document.getElementById('customerTableBody');
        if (data.referees && data.referees.length > 0) {
            data.referees.forEach((customer, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="border px-4 py-2">${index + 1}</td>
                    <td class="border px-4 py-2">${formatDate(new Date(customer.created_at))}</td>
                    <td class="border px-4 py-2">${customer.commission}</td>
                `;
                customerTableBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.style.columnSpan = 3;
            row.style.color = 'red';
            row.innerHTML = `
                <td class="border px-4 py-2 text-center" colspan="3">You currently have no earnings. Start referring now to begin earning rewards!</td>
            `;
            customerTableBody.appendChild(row);
        }

        const sortByMonth = arr => {
            const getIndexOfMonth = month => months.indexOf(month);
            return [...arr].sort((left, right) => {
                return getIndexOfMonth(left.month) - getIndexOfMonth(right.month);
            });
        };

        data.month_wise_commission = sortByMonth(data.month_wise_commission);

        const ctx = document.getElementById('earningChart').getContext('2d');
        const earningChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.month_wise_commission && data.month_wise_commission.length > 0 ?
                    data.month_wise_commission.map(m => m.month) :
                    months,
                datasets: [{
                    label: 'Earnings',
                    data: data.month_wise_commission ? data.month_wise_commission.map(m => m.commission) : [],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    fetch(payoutRequestEndPoint)
        .then(response => response.json())
        .then(data1 => {
            if (!data1 || Object.keys(data1).length === 0) {
                displayNoDataMessage();
            } else {
                populateRecentPayouts(data1);
            }
        });

    function displayNoDataMessage() {
        document.getElementById('affiliateName').innerText = '';
        document.getElementById('welcomeText').innerText = 'Hi! there, welcome back👋';
        document.getElementById('currentBalance').innerText = '₹0';
        document.getElementById('totalEarned').innerText = '₹0';
        document.getElementById('referralLink').value = '';
        document.getElementById('profile_pic').src = "https://avatar.iran.liara.run/public/2";

        const customerTableBody = document.getElementById('customerTableBody');
        const row = document.createElement('tr');
        row.style.columnSpan = 3;
        row.style.color = 'red';
        row.innerHTML = `
            <td class="border px-4 py-

2 text-center" colspan="3">You currently have no earnings. Start referring now to begin earning rewards!</td>
        `;
        customerTableBody.appendChild(row);

        const ctx = document.getElementById('earningChart').getContext('2d');
        const earningChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Earnings',
                    data: [],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function formatDate(date) {
        const options = {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-GB', options);
    }

    function redirectToErrorPage(url) {
        window.location.href = `${url}/error`;
    }
});
