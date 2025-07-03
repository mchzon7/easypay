// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Auto-close alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.add('fade');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    });

    // Account number validation
    const accountNumberInput = document.getElementById('accountNumber');
    if (accountNumberInput) {
        accountNumberInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }
});

// Currency conversion calculator
document.addEventListener('DOMContentLoaded', function() {
    const amountInput = document.querySelector('input[name="amount"]');
    const fromCurrency = document.querySelector('select[name="from"]');
    const toCurrency = document.querySelector('select[name="to"]');
    const resultDisplay = document.getElementById('conversionResult');

    if (amountInput && fromCurrency && toCurrency) {
        const calculateConversion = () => {
            const amount = parseFloat(amountInput.value);
            if (isNaN(amount) || amount <= 0) return;

            // In a real app, you would fetch rates from an API
            const rates = {
                NGN: { USD: 0.0022, EUR: 0.0019, GBP: 0.0016 },
                USD: { NGN: 450, EUR: 0.85, GBP: 0.73 },
                EUR: { NGN: 530, USD: 1.18, GBP: 0.86 },
                GBP: { NGN: 620, USD: 1.37, EUR: 1.16 }
            };

            const from = fromCurrency.value;
            const to = toCurrency.value;
            
            if (from === to) {
                resultDisplay.textContent = `${amount} ${from} = ${amount} ${to}`;
                return;
            }

            const rate = rates[from][to];
            const result = (amount * rate).toFixed(2);
            resultDisplay.textContent = `${amount} ${from} = ${result} ${to}`;
        };

        amountInput.addEventListener('input', calculateConversion);
        fromCurrency.addEventListener('change', calculateConversion);
        toCurrency.addEventListener('change', calculateConversion);
    }
});