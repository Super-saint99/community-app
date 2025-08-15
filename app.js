let members = [];

// Load from localStorage when page opens
window.onload = function () {
    members = JSON.parse(localStorage.getItem("members")) || [];
    renderTable();
};

function addMember() {
    let name = document.getElementById("memberName").value.trim();
    if (!name) {
        alert("Please enter a member name");
        return;
    }

    let share = parseFloat(document.getElementById("shareAmount").value) || 0;
    let addition = parseFloat(document.getElementById("amountAddition").value) || 0;
    let loan = parseFloat(document.getElementById("loanAmount").value) || 0;
    let interest = parseFloat(document.getElementById("interestRate").value) || 0;
    let tenor = parseInt(document.getElementById("tenor").value) || 0;
    let monthsPaid = parseInt(document.getElementById("monthsPaid").value) || 0;

    let emi = calculateEMI(loan, interest, tenor);
    let outstanding = calculateOutstanding(loan, interest, tenor, monthsPaid);

    members.push({ name, share, addition, loan, interest, tenor, monthsPaid, emi, outstanding });

    // Save to localStorage
    localStorage.setItem("members", JSON.stringify(members));

    renderTable();

    // Clear form
    document.querySelectorAll(".form-section input").forEach(i => i.value = "");
}

function calculateEMI(principal, annualRate, months) {
    let monthlyRate = (annualRate / 100) / 12;
    return principal > 0 && months > 0
        ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
        : 0;
}

function calculateOutstanding(principal, annualRate, months, monthsPaid) {
    let emi = calculateEMI(principal, annualRate, months);
    let monthlyRate = (annualRate / 100) / 12;
    let outstanding = principal;
    for (let i = 0; i < monthsPaid; i++) {
        let interestPayment = outstanding * monthlyRate;
        let principalPayment = emi - interestPayment;
        outstanding -= principalPayment;
    }
    return Math.max(outstanding, 0);
}

function renderTable() {
    let tbody = document.querySelector("#membersTable tbody");
    tbody.innerHTML = "";

    let totalShare = 0, totalAdditions = 0, totalEMI = 0;

    members.forEach((m, index) => {
        totalShare += m.share;
        totalAdditions += m.addition;
        totalEMI += m.emi;

        let row = `<tr>
            <td><input type="checkbox" data-index="${index}"></td>
            <td>${m.name}</td>
            <td>${m.share}</td>
            <td>${m.addition}</td>
            <td>${m.loan}</td>
            <td>${m.interest}%</td>
            <td>${m.tenor}</td>
            <td>${m.monthsPaid}</td>
            <td>${m.emi.toFixed(2)}</td>
            <td>${m.outstanding.toFixed(2)}</td>
        </tr>`;
        tbody.innerHTML += row;
    });

    document.getElementById("totalMembers").innerText = members.length;
    document.getElementById("totalShare").innerText = totalShare;
    document.getElementById("totalAdditions").innerText = totalAdditions;
    document.getElementById("totalEMI").innerText = totalEMI.toFixed(2);
}

function sendToWhatsApp() {
    let message = `Kummari Sangham Summary:\nMembers: ${members.length}\nTotal Share/month: ₹${document.getElementById("totalShare").innerText}\nTotal Additions/month: ₹${document.getElementById("totalAdditions").innerText}\nTotal EMI this month: ₹${document.getElementById("totalEMI").innerText}`;
    let url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
}
