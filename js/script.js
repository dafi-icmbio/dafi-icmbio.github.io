document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    body.classList.add("fade-in");
});

document.addEventListener("DOMContentLoaded", () => {
    const originalDue = document.getElementById("originalDue");
    const paymentDue = document.getElementById("paymentDate");
    const today = new Date(); // Get today's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const formattedOriginal = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const formattedPayment = tomorrow.toISOString().split('T')[0];
    originalDue.value = formattedOriginal; // Set the input's value to today's date
    paymentDue.value = formattedPayment;
});


document.addEventListener("submit", async (event) => {
    event.preventDefault();

    const originalDue = document.getElementById("originalDue").value;
    const paymentDate = document.getElementById("paymentDate").value;
    if (originalDue && paymentDate) {
        const parsedOriginalDue = new Date(originalDue);
        const parsedPaymentDate = new Date(paymentDate);
        console.log(getDaysBetweenDates(parsedPaymentDate, parsedOriginalDue));
        console.log(parsedPaymentDate.getFullYear());
        console.log(parsedOriginalDue.getFullYear());
        const years = yearsToCheck(parsedPaymentDate.getFullYear(), parsedOriginalDue.getFullYear());
        let holidays = [];
        for (const year of years){
            let year_holidays = await getHolidays(year)
            holidays = holidays.concat(year_holidays)
        };
        console.log(holidays)
    } else {
        alert("Please select a date.")
    };
});

function isWorkingDay(date) {

};

function getDaysBetweenDates(end, start) {
    const endDate = new Date(end)
    const startDate = new Date(start)

    const diffInMilliseconds= endDate - startDate;

    const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

    return Math.floor(diffInDays);
}

async function getHolidays(year) {
    const url = `https://brasilapi.com.br/api/feriados/v1/${year}`

    try{
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
};

function yearsToCheck(endYear, startYear) {
    if (endYear - startYear >= 1) {
        const years = [];
        for(let year = startYear; year <= endYear; year++) {
            years.push(year)
        }

        return years
    } else {
        return [endYear]
    }
};