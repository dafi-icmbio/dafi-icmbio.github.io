document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    body.classList.add("fade-in");
});

document.addEventListener("DOMContentLoaded", () => {
    const originalDue = document.getElementById("originalDue");
    const paymentDue = document.getElementById("paymentDate");
    
    // Get today's date (in UTC to avoid timezone issues)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set the time to midnight UTC

    // Get tomorrow's date (in UTC)
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1); // Increment date by 1 day

    // Format as YYYY-MM-DD (using toISOString)
    const formattedOriginal = today.toISOString().split('T')[0]; 
    const formattedPayment = tomorrow.toISOString().split('T')[0];

    // Set the input's value to today's and tomorrow's date
    originalDue.value = formattedOriginal;
    paymentDue.value = formattedPayment;
});


document.addEventListener("submit", async (event) => {
    event.preventDefault();

    let originalValue = parseFloat(document.getElementById("originalValue").value);
    let originalDue = document.getElementById("originalDue").value;
    let paymentDate = document.getElementById("paymentDate").value;

    if (originalDue && paymentDate && originalValue) {
        let parsedOriginalDue = new Date(originalDue);
        let parsedPaymentDate = new Date(paymentDate);
        
        parsedOriginalDue.setUTCHours(0, 0, 0, 0);
        parsedPaymentDate.setUTCHours(0, 0, 0, 0);

        // Validate parsed dates
        if (isNaN(parsedOriginalDue) || isNaN(parsedPaymentDate)) {
            alert("Invalid date format. Please use YYYY-MM-DD.");
            return;
        }

        // Check if payment date is before the original due date
        if (parsedPaymentDate < parsedOriginalDue) {
            alert("Payment date cannot be earlier than the original due date.");
            return; // Stop the form submission
        }

        if (isNaN(originalValue) || originalValue <= 0) {
            alert("Please enter a valid amount for the original value.");
            return;
        }

        let nextWorkingDayOriginalDue = new Date(parsedOriginalDue);

        // Only increment the date if the payment is after the due date
        if (parsedPaymentDate > parsedOriginalDue) {
            nextWorkingDayOriginalDue.setDate(nextWorkingDayOriginalDue.getDate() + 1);
        }

        // Check for the next working day (if payment is after due date)
        while (!(await isWorkingDay(nextWorkingDayOriginalDue))) {
            nextWorkingDayOriginalDue.setDate(nextWorkingDayOriginalDue.getDate() + 1);
        }

        // Calculate late days using the getDaysBetweenDates function
        let lateDays = 0;

        if (nextWorkingDayOriginalDue.getTime() == parsedPaymentDate.getTime()) {
            console.log("Equal")
            lateDays = 1
        } else {
            lateDays = getDaysBetweenDates(parsedPaymentDate, nextWorkingDayOriginalDue)
        };

        console.log(`Late Days: ${lateDays}`);
        
        let fine = 0;

        // Calculate fine if payment is late
        if (parsedPaymentDate.getFullYear() === parsedOriginalDue.getFullYear()
        && parsedPaymentDate.getMonth() > parsedOriginalDue.getMonth() && lateDays > 0) {
            
            const selicRate = await getSelic(nextWorkingDayOriginalDue);

            if (selicRate === null) {
                console.error("Failed to retrieve SELIC rate.");
                return null;
            }

            let diff = parsedPaymentDate.getMonth() - parsedOriginalDue.getMonth();

            fine = 0.01 * originalValue + originalValue * (selicRate * diff)

        } else if (parsedPaymentDate.getFullYear() === parsedOriginalDue.getFullYear()
        && parsedPaymentDate.getMonth() === parsedOriginalDue.getMonth() && lateDays > 0) {

            fine = 0.01 * originalValue

        } else if (parsedPaymentDate.getFullYear() > parsedOriginalDue.getFullYear() && lateDays > 0) {
            let dueYear = parsedOriginalDue.getFullYear();
            let paymentYear = parsedPaymentDate.getFullYear();

            let monthsInDueYear = 12 - parsedOriginalDue.getMonth();

            let monthsInPaymentYear = parsedPaymentDate.getMonth();

            let fullYearsDifference = paymentYear - dueYear - 1;

            let totalMonths = fullYearsDifference * 12 + monthsInDueYear + monthsInPaymentYear;

            let selicRate = await getSelic(nextWorkingDayOriginalDue);

            if (selicRate === null) {
                console.error("Failed to retrieve SELIC rate.");
                return null;
            }

            fine = 0.01 * originalValue + originalValue * (selicRate * totalMonths);
        };

        let interest = 0;

        // Check if interest should be applied
        interest = (0.0033 * lateDays < 0.2) ? originalValue * (0.0033 * lateDays) : originalValue * 0.2;

        let totalDebt = interest + fine;

        console.log(`Actual Due: ${parsedOriginalDue}`);
        console.log(`Payment: ${parsedPaymentDate}`);
        console.log(`Late Days: ${lateDays}`);
        console.log(`Beginning Date of Fine: ${nextWorkingDayOriginalDue}`);
        console.log(`Total Debt: ${totalDebt}`);
    } else {
        alert("Please fill out the form completely.");
    }
});

function isWeekDay(date) {
    let day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return day >= 1 && day <= 5;
};

async function isHoliday(date) {
    let year = date.getFullYear();
    let holidays = await getHolidays(year);

    if (!holidays) {
        console.error("Failed to fetch holidays");
        return false;
    }

    let dateString = date.toISOString().split("T")[0];

    for (const holiday of holidays) {
        if (holiday.date === dateString) {
            return true;
        };
    };

    return false;
};

async function isWorkingDay(date) {
    if (!isWeekDay(date)) {
        return false; // Not a weekday
    };

    let holiday = await isHoliday(date); // Await the result of isHoliday
    return !holiday; // If it's a holiday, it's not a working day
};

async function getHolidays(year) {
    const url = `https://brasilapi.com.br/api/feriados/v1/${year}`;

    try {
        let response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching holidays:", error);
        return null;
    };
};

function getDaysBetweenDates(end, start) {
    let parsedEnd = new Date(end);
    let parsedStart = new Date(start);

    if (isNaN(parsedEnd) || isNaN(parsedStart)) {
        console.error('Invalid date(s) passed to getDaysBetweenDates:', end, start);
        return 0;
    }

    // Normalize to UTC midnight by setting the time to 00:00:00 UTC for both dates
    parsedEnd.setUTCHours(0, 0, 0, 0);
    parsedStart.setUTCHours(0, 0, 0, 0);

    // Debug: Output normalized date strings
    console.log(`Normalized End (UTC): ${parsedEnd}`);
    console.log(`Normalized Start (UTC): ${parsedStart}`);

    // Get the difference in milliseconds
    const diffInMilliseconds = parsedEnd.getTime() - parsedStart.getTime();
    console.log(`Difference in milliseconds: ${diffInMilliseconds}`);

    // Convert milliseconds to days
    const diffInDays = (diffInMilliseconds / (1000 * 60 * 60 * 24)) + 1;
    console.log(`Difference in days: ${diffInDays}`);

    // If the difference is negative (end < start), set it to 1 day of late
    if (diffInDays < 0) {
        return 1;
    }

    // Return the maximum between 0 and the number of days
    return Math.max(0, Math.floor(diffInDays));
};

async function getSelic(date) {
    const url = "http://www.ipeadata.gov.br/api/odata4/Metadados('GM366_TJOVER366')/Valores"
    let dateString = date.toISOString().split("T")[0];

    let data = null;

    try {
        let response = await fetch(url);

        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let jsonResponse = await response.json();
        data = jsonResponse.value;

    } catch (error){
        console.error("Error fetching SELIC data:", error);
    };

    if (data) {
        let result = data.find(entry => entry.VALDATA.startsWith(dateString));
        console.log(dateString)
        return result ? (result.VALVALOR ** (1/12))/100 : null;
    }

    return null;
};