
const API_URL =
    "https://script.google.com/macros/s/AKfycbw1ku48HDlJOTtaPknDR7He0_BPZgzd4xOl4pG8k9Imb7TKdpafJtkyum8KHADwJfVz/exec";

const BUSY_STATUS = [
    "กำลังดำเนินงาน",
    "ล่าช้ากว่ากำหนด",
    "เหตุขัดข้องใส่สีผิด",
    "ชั่งน้ำหนักผิด",
    "Standardผิด",
    "สูตรCompoundผิด"
];


let activeOrders = [];

let selectedOrder = null;

let selectedStatus = "";

let isLoading = false;

let isSaving = false;



// ========================================
// DOM
// ========================================

const orderGrid =
    document.getElementById("orderGrid");

const controlPopup =
    document.getElementById("controlPopup");

const closePopup =
    document.getElementById("closePopup");

const refreshBtn =
    document.getElementById("refreshBtn");

const saveStatusBtn =
    document.getElementById("saveStatusBtn");

const remarkInput =
    document.getElementById("remarkInput");

const currentStatusText =
    document.getElementById("currentStatusText");

const statusButtons =
    document.querySelectorAll(".status-btn");

/* ========================================
FINISH POPUP
======================================== */

const finishPopup =
    document.getElementById("finishPopup");

const closeFinishPopup =
    document.getElementById("closeFinishPopup");

const saveFinishDataBtn =
    document.getElementById("saveFinishDataBtn");

let finishData = {

    finishOrder: 0,

    gradeA: 0,

    gradeB: 0,

    lostOrder: 0

};


// ========================================
// HELPER
// ========================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.textContent =
        value === undefined ||
        value === null ||
        value === ""
            ? "-"
            : value;

}

function formatDateTime(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return "-";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(
        "th-TH",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ) + " น.";

}
function formatDateOnly(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return "-";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(
        "th-TH",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}
function escapeHtml(value) {

    return String(value ?? "-")
        .replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[char]
        );

}


function getOrdersFromResponse(data) {

    if (Array.isArray(data)) {

        return data;

    }


    if (
        data &&
        Array.isArray(data.orders)
    ) {

        return data.orders;

    }


    if (
        data &&
        Array.isArray(data.data)
    ) {

        return data.data;

    }


    if (
        data &&
        data.orderNo
    ) {

        return [data];

    }


    return [];

}


function isBusyOrder(order) {

    const status =
        String(order?.status || "").trim();

    return BUSY_STATUS.includes(status);

}



// ========================================
// STATUS STYLE
// ========================================

function getStatusClass(status) {

    const value =
        String(status || "").trim();


    if (value === "กำลังดำเนินงาน") {

        return "running";

    }


    if (value === "ล่าช้ากว่ากำหนด") {

        return "delay";

    }


    if (
        value === "เหตุขัดข้องใส่สีผิด" ||
        value === "ชั่งน้ำหนักผิด" ||
        value === "Standardผิด" ||
        value === "สูตรCompoundผิด"
    ) {

        return "error";

    }


    if (value === "เสร็จสิ้น") {

        return "finish";

    }


    return "";

}


function updateCurrentStatusUI(status) {

    setText(
        "currentStatusText",
        status
    );


    const statusBox =
        document.querySelector(
            ".current-status"
        );

    const statusDot =
        document.querySelector(
            ".status-dot"
        );


    if (statusBox) {

        statusBox.classList.remove(
            "running",
            "delay",
            "error",
            "finish"
        );

        statusBox.classList.add(
            getStatusClass(status)
        );

    }


    if (statusDot) {

        statusDot.classList.remove(
            "running",
            "delay",
            "error",
            "finish"
        );

        statusDot.classList.add(
            getStatusClass(status)
        );

    }

}



// ========================================
// LOAD ORDERS
// ========================================

async function loadRunningOrders() {

    if (isLoading) return;

    isLoading = true;


    try {

        const response =
            await fetch(
                API_URL,
                {

                    method: "POST",

                    body: JSON.stringify({

                        action:
                            "getRunningOrder"

                    })

                }
            );


        const data =
            await response.json();


        console.log(
            "API RESPONSE:",
            data
        );


        const orders =
            getOrdersFromResponse(data);


        activeOrders =
            orders.filter(isBusyOrder);


        console.log(
            "ACTIVE ORDERS:",
            activeOrders
        );


        renderActiveOrders();


        // Realtime popup

        if (selectedOrder) {

            const latestOrder =
                activeOrders.find(
                    order =>
                        String(order.orderNo) ===
                        String(
                            selectedOrder.orderNo
                        )
                );


            if (latestOrder) {

                selectedOrder =
                    latestOrder;


                updatePopupData(
                    latestOrder
                );

            }

        }


    } catch (error) {

        console.error(
            "LOAD ORDER ERROR:",
            error
        );

    } finally {

        isLoading = false;

    }

}



// ========================================
// RENDER ORDERS
// ========================================

function renderActiveOrders() {

    if (!orderGrid) {

        console.error(
            "ไม่พบ #orderGrid"
        );

        return;

    }


    if (
        activeOrders.length === 0
    ) {

        orderGrid.innerHTML = `

            <div class="empty-order">

                ไม่มีงานที่กำลังดำเนินการ

            </div>

        `;

        return;

    }


    orderGrid.innerHTML =
        activeOrders.map(
            (order, index) => {

                const statusClass =
                    getStatusClass(
                        order.status
                    );

                const jobType =
                    String(
                        order.jobType || "NORMAL"
                    )
                    .trim()
                    .toUpperCase();

                const jobTypeClass =
                    jobType === "REWORK"
                        ? "rework"
                        : "normal";
                return `

                <div
                    class="order-card"
                    data-order-index="${index}"
                >

                    <div class="order-header">

                        <div class="order-title">

                            <div class="order-label-row">

                                <span class="order-label">
                                    เลขที่งาน
                                </span>

                                <span
                                    class="job-type-badge ${jobTypeClass}"
                                >
                                    ${escapeHtml(jobType)}
                                </span>

                            </div>

                            <h3>
                                ${escapeHtml(
                                    order.orderNo
                                )}
                            </h3>

                            <p>
                                ลูกค้า :
                                ${escapeHtml(
                                    order.customer
                                )}
                            </p>

                        </div>


                        <span
                            class="status-badge ${statusClass}"
                        >

                            ${escapeHtml(
                                order.status
                            )}

                        </span>

                    </div>


                    <div class="order-info-grid">


                        <div class="info-item">

                            <label>
                                เครื่องผสม
                            </label>

                            <strong>

                                ${escapeHtml(
                                    order.machine || "-"
                                )}

                            </strong>

                        </div>


                        <div class="info-item">

                            <label>
                                จำนวนรอบผลิต
                            </label>

                            <strong>

                                ${escapeHtml(
                                    order.batch || "-"
                                )}
                                รอบ

                            </strong>

                        </div>


                        <div class="info-item">

                            <label>
                                น้ำหนัก
                            </label>

                            <strong>

                                ${escapeHtml(
                                    order.kg || "-"
                                )}
                                kg

                            </strong>

                        </div>


                        <div class="info-item">

                            <label>
                                สถานะปัจจุบัน
                            </label>

                            <strong>

                                ${escapeHtml(
                                    order.status
                                )}

                            </strong>

                        </div>


                    </div>


                    <div class="card-footer">

                        <span>

                            กดเพื่อดูรายละเอียดและจัดการสถานะ

                        </span>

                        <span class="arrow">
                            →
                        </span>

                    </div>


                </div>

                `;

            }

        ).join("");


    document
        .querySelectorAll(
            ".order-card[data-order-index]"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            card.dataset.orderIndex
                        );


                    openOrder(
                        activeOrders[index]
                    );

                }
            );

        });

}



// ========================================
// OPEN ORDER
// ========================================

function openOrder(order) {

    if (!order) return;


    selectedOrder = order;

    selectedStatus =
        String(order.status || "").trim();


    updatePopupData(order);


    statusButtons.forEach(button => {

        button.classList.toggle(

            "active",

            button.dataset.status ===
            selectedStatus

        );

    });


    if (remarkInput) {

        remarkInput.value = "";

    }


    if (controlPopup) {

        controlPopup.classList.add(
            "show"
        );

    }

}


function updatePopupData(order) {

    if (!order) return;


    // ========================================
    // ORDER HEADER
    // ========================================

    setText(
        "popupOrderNo",
        `ORDER : ${order.orderNo || "-"}`
    );


    // ========================================
    // ORDER INFORMATION
    // ========================================

    const jobType =
        String(
            order.jobType || "NORMAL"
        )
        .trim()
        .toUpperCase();


    setText(
        "popupJobType",
        jobType
    );


    setText(
        "popupCustomer",
        order.customer
    );


    setText(
        "popupRequester",
        order.requester
    );


    setText(
        "popupAcknowledge",
        order.acknowledge
    );


    setText(
        "popupOrderDate",
        formatDateOnly(
            order.orderDate
        )
    );


    // ========================================
    // REWORK REASON
    // ========================================

    const reworkReasonBox =
        document.getElementById(
            "popupReworkReasonBox"
        );


    if (jobType === "REWORK") {

        if (reworkReasonBox) {

            reworkReasonBox.style.display =
                "";

        }


        setText(
            "popupReworkReason",
            order.reworkReason
        );

    } else {

        if (reworkReasonBox) {

            reworkReasonBox.style.display =
                "none";

        }


        setText(
            "popupReworkReason",
            "-"
        );

    }


    // ========================================
    // PRODUCT DETAILS
    // ========================================

    setText(
        "popupSheetType",
        order.sheetType
    );


    setText(
        "popupFabric",
        order.fabric
    );


    setText(
        "popupColor",
        order.color
    );


    setText(
        "popupThickness",
        order.thickness
    );


    setText(
        "popupWidth",
        order.width
    );


    setText(
        "popupGsm",
        order.gsm
    );


    // ========================================
    // PRODUCTION DETAILS
    // ========================================

    setText(
        "popupMachine",
        order.machine
    );


    setText(
        "popupCapacity",
        order.capacity
    );


    setText(
        "popupBatch",
        order.batch !== undefined &&
        order.batch !== null &&
        order.batch !== ""
            ? `${order.batch} รอบ`
            : "-"
    );


    setText(
        "popupWeight",
        order.kg !== undefined &&
        order.kg !== null &&
        order.kg !== ""
            ? `${order.kg} kg`
            : "-"
    );


    setText(
        "popupForecast",
        order.forecast
    );


    setText(
        "popupStartDate",
        formatDateTime(
            order.startDate
        )
    );


    setText(
        "popupDueDate",
        formatDateTime(
            order.dueDate
        )
    );


    setText(
        "popupTroubleTime",
        order.troubleTime
    );


    // ========================================
    // CURRENT STATUS
    // ========================================

    updateCurrentStatusUI(
        order.status
    );

}



// ========================================
// SELECT STATUS
// ========================================

statusButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            if (!selectedOrder) {

                alert(
                    "ไม่พบ ORDER ที่เลือก"
                );

                return;

            }

            selectedStatus =
                button.dataset.status;

            // ทำให้ปุ่มทุกปุ่มกลับเป็นปกติ
            statusButtons.forEach(
                item => {

                    item.classList.remove(
                        "active"
                    );

                }
            );

            // ทำให้ปุ่มที่เลือกติด Active
            button.classList.add(
                "active"
            );

            // ถ้าเลือก Finish ให้เปิด Popup
            if (selectedStatus === "เสร็จสิ้น") {

                finishPopup.classList.add("show");

                return;

            }

        }
    );

});



// ========================================
// UPDATE STATUS
// ========================================

async function updateStatus(
    status,
    remark
) {

    if (!selectedOrder) {

        alert(
            "ไม่พบ ORDER ที่เลือก"
        );

        return false;

    }


    if (isSaving) return false;


    isSaving = true;


    if (saveStatusBtn) {

        saveStatusBtn.disabled = true;

        saveStatusBtn.textContent =
            "กำลังบันทึก...";

    }


    try {

        const response =
            await fetch(
                API_URL,
                {

                    method: "POST",

                    body: JSON.stringify({

                        action:
                            "updateStatus",

                        orderNo:
                            selectedOrder.orderNo,

                        status:
                            status,

                        remark:
                            remark || "",

                        finishOrder:
                            finishData.finishOrder,

                        gradeA:
                            finishData.gradeA,

                        gradeB:
                            finishData.gradeB,

                        lostOrder:
                            finishData.lostOrder

                    })

                }
            );


        const result =
            await response.json();


        console.log(
            "UPDATE RESULT:",
            result
        );


        if (!result.success) {

            alert(

                result.message ||

                "อัปเดตสถานะไม่สำเร็จ"

            );


            return false;

        }


        selectedOrder.status =
            status;


        updateCurrentStatusUI(
            status
        );


        await loadRunningOrders();


        return true;


    } catch (error) {

        console.error(
            "UPDATE STATUS ERROR:",
            error
        );


        alert(
            "อัปเดตสถานะไม่สำเร็จ"
        );


        return false;


    } finally {

        isSaving = false;


        if (saveStatusBtn) {

            saveStatusBtn.disabled = false;

            saveStatusBtn.textContent =
                "บันทึกสถานะ";

        }

    }

}



// ========================================
// SAVE STATUS
// ========================================

if (saveStatusBtn) {

    saveStatusBtn.addEventListener(
        "click",
        async () => {

            if (!selectedStatus) {

                alert(
                    "กรุณาเลือกสถานะการผลิต"
                );

                return;

            }


            const remark =
                remarkInput
                    ? remarkInput.value.trim()
                    : "";


            const success =
                await updateStatus(

                    selectedStatus,

                    remark

                );


            if (!success) return;


            if (controlPopup) {

                controlPopup.classList.remove(
                    "show"
                );

            }


            selectedOrder = null;

            selectedStatus = "";


            if (remarkInput) {

                remarkInput.value = "";

            }

        }
    );

}



// ========================================
// CLOSE POPUP
// ========================================

if (closePopup) {

    closePopup.addEventListener(
        "click",
        () => {

            if (controlPopup) {

                controlPopup.classList.remove(
                    "show"
                );

            }


            selectedOrder = null;

            selectedStatus = "";

        }
    );

}


if (controlPopup) {

    controlPopup.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                controlPopup
            ) {

                controlPopup.classList.remove(
                    "show"
                );


                selectedOrder = null;

                selectedStatus = "";

            }

        }
    );

}



// ========================================
// REFRESH
// ========================================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        async () => {

            if (isLoading) return;

            refreshBtn.disabled = true;

            refreshBtn.textContent =
                "⏳ กำลังรีเฟรช...";

            try {

                await loadRunningOrders();

            } finally {

                refreshBtn.disabled = false;

                refreshBtn.textContent =
                    "↻ รีเฟรชข้อมูล";

            }

        }
    );

}
// ========================================
// LOGIN
// ========================================

const LOGIN_PASSWORD =
    "8888";      // <<< เปลี่ยนรหัสตรงนี้

let refreshTimer = null;

function startSystem() {

    loadRunningOrders();

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

    }

    refreshTimer =
        setInterval(
            loadRunningOrders,
            5000
        );

}

function loginSuccess() {

    const login =
        document.getElementById(
            "loginScreen"
        );

    if (login) {

        login.style.display =
            "none";

    }

    startSystem();

}

function initializeLogin() {

    const login =
        document.getElementById(
            "loginScreen"
        );

    const password =
        document.getElementById(
            "loginPassword"
        );

    const button =
        document.getElementById(
            "loginBtn"
        );

    const error =
        document.getElementById(
            "loginError"
        );

    if (
       !login ||
       !password ||
       !button
    ) {

       console.error(
           "Login HTML not found"
        );

        return;

    }


    login.style.display =
        "flex";

    button.onclick = () => {

        if (
            password.value ===
            LOGIN_PASSWORD
        ) {

            if (error) {

                error.textContent =
                    "";

            }

            loginSuccess();

        }

        else {

            if (error) {

                error.textContent =
                    "รหัสผ่านไม่ถูกต้อง";

            }

            password.value = "";

            password.focus();

        }

    };

    password.addEventListener(
        "keydown",
        e => {

            if (
                e.key === "Enter"
            ) {

                button.click();

            }

        }
    );

}
/* ========================================
FINISH POPUP
======================================== */

closeFinishPopup.onclick = () => {

    finishPopup.classList.remove("show");

};

saveFinishDataBtn.onclick = () => {

    finishData.finishOrder =
        Number(
            document.getElementById(
                "finishOrderKg"
            ).value || 0
        );

    finishData.gradeA =
        Number(
            document.getElementById(
                "gradeAKg"
            ).value || 0
        );

    finishData.gradeB =
        Number(
            document.getElementById(
                "gradeBKg"
            ).value || 0
        );

    finishData.lostOrder =
        Number(
            document.getElementById(
                "lostOrderKg"
            ).value || 0
        );

    finishPopup.classList.remove("show");

};

window.addEventListener(
    "load",
    initializeLogin
);

