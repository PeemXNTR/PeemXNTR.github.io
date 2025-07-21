/**
 * charts.js - ไฟล์ JavaScript สำหรับการสร้างกราฟและการวิเคราะห์ข้อมูลในระบบจัดการฟาร์มไก่
 */

// ฟังก์ชันสร้างกราฟเส้นสำหรับข้อมูลไข่
function createEggsChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // ตั้งค่าเริ่มต้น
    const defaultOptions = {
        title: 'จำนวนไข่',
        titleColor: '#16a34a',
        lineColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)', 
        borderWidth: 2,
        pointRadius: 4,
        displayLegend: true
    };
    
    // รวมค่าที่ตั้งไว้กับค่าที่ส่งมา
    const chartOptions = { ...defaultOptions, ...options };
    
    // แปลงข้อมูลจาก Object เป็น Array ที่ Chart.js ต้องการ
    let labels = [];
    let values = [];
    
    if (typeof data === 'object' && !Array.isArray(data)) {
        // กรณีส่งเป็น object
        labels = Object.keys(data);
        values = Object.values(data);
    } else if (Array.isArray(data)) {
        // กรณีส่งเป็น array ของ objects
        data.forEach(item => {
            labels.push(item.label);
            values.push(item.value);
        });
    }
    
    // สร้างกราฟ
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: chartOptions.title,
                data: values,
                backgroundColor: chartOptions.backgroundColor,
                borderColor: chartOptions.lineColor,
                borderWidth: chartOptions.borderWidth,
                pointBackgroundColor: chartOptions.lineColor,
                pointRadius: chartOptions.pointRadius,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartOptions.displayLegend
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + ' ฟอง';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + ' ฟอง';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    return chart;
}

// ฟังก์ชันสร้างกราฟเส้นสำหรับยอดขาย
function createSalesChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // ตั้งค่าเริ่มต้น
    const defaultOptions = {
        title: 'ยอดขาย',
        titleColor: '#2563eb',
        lineColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)', 
        borderWidth: 2,
        pointRadius: 4,
        displayLegend: true
    };
    
    // รวมค่าที่ตั้งไว้กับค่าที่ส่งมา
    const chartOptions = { ...defaultOptions, ...options };
    
    // แปลงข้อมูลจาก Object เป็น Array ที่ Chart.js ต้องการ
    let labels = [];
    let values = [];
    
    if (typeof data === 'object' && !Array.isArray(data)) {
        // กรณีส่งเป็น object
        labels = Object.keys(data);
        values = Object.values(data);
    } else if (Array.isArray(data)) {
        // กรณีส่งเป็น array ของ objects
        data.forEach(item => {
            labels.push(item.label);
            values.push(item.value);
        });
    }
    
    // สร้างกราฟ
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: chartOptions.title,
                data: values,
                backgroundColor: chartOptions.backgroundColor,
                borderColor: chartOptions.lineColor,
                borderWidth: chartOptions.borderWidth,
                pointBackgroundColor: chartOptions.lineColor,
                pointRadius: chartOptions.pointRadius,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartOptions.displayLegend
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('th-TH', {
                                    style: 'currency',
                                    currency: 'THB',
                                    minimumFractionDigits: 2
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('th-TH', {
                                style: 'currency',
                                currency: 'THB',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    return chart;
}

// ฟังก์ชันสร้างกราฟวงกลมสำหรับการแสดงสัดส่วน
function createPieChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // ตั้งค่าเริ่มต้น
    const defaultOptions = {
        title: 'สัดส่วน',
        colors: [
            '#16a34a', '#2563eb', '#f59e0b', '#dc2626', 
            '#8b5cf6', '#ec4899', '#0891b2', '#84cc16',
            '#64748b', '#9f1239', '#1e293b', '#92400e'
        ],
        displayLegend: true
    };
    
    // รวมค่าที่ตั้งไว้กับค่าที่ส่งมา
    const chartOptions = { ...defaultOptions, ...options };
    
    // แปลงข้อมูลเป็นรูปแบบที่ Chart.js ต้องการ
    let labels = [];
    let values = [];
    let backgroundColors = [];
    
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            labels.push(item.label);
            values.push(item.value);
            // ใช้สีที่กำหนดหรือสีเริ่มต้น
            const colorIndex = index % chartOptions.colors.length;
            backgroundColors.push(item.color || chartOptions.colors[colorIndex]);
        });
    } else if (typeof data === 'object') {
        let index = 0;
        for (const key in data) {
            labels.push(key);
            values.push(data[key]);
            const colorIndex = index % chartOptions.colors.length;
            backgroundColors.push(chartOptions.colors[colorIndex]);
            index++;
        }
    }
    
    // สร้างกราฟ
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartOptions.displayLegend,
                    position: 'right'
                },
                title: {
                    display: !!chartOptions.title,
                    text: chartOptions.title
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    return chart;
}

// ฟังก์ชันสร้างกราฟแท่งสำหรับข้อมูลเปรียบเทียบ
function createBarChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // ตั้งค่าเริ่มต้น
    const defaultOptions = {
        title: 'กราฟแท่ง',
        colors: ['#16a34a', '#2563eb', '#f59e0b', '#dc2626'],
        displayLegend: true,
        horizontal: false, // แนวตั้งหรือแนวนอน
        stacked: false     // ซ้อนกันหรือไม่
    };
    
    // รวมค่าที่ตั้งไว้กับค่าที่ส่งมา
    const chartOptions = { ...defaultOptions, ...options };
    
    // แปลงข้อมูลเป็นรูปแบบที่ Chart.js ต้องการ
    let labels = [];
    let datasets = [];
    
    if (data.labels && Array.isArray(data.datasets)) {
        labels = data.labels;
        
        data.datasets.forEach((dataset, index) => {
            const colorIndex = index % chartOptions.colors.length;
            
            datasets.push({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.backgroundColor || chartOptions.colors[colorIndex],
                borderColor: dataset.borderColor || chartOptions.colors[colorIndex],
                borderWidth: dataset.borderWidth || 1
            });
        });
    } else if (typeof data === 'object' && !Array.isArray(data)) {
        // กรณีส่งเป็น object เดียว
        labels = Object.keys(data);
        datasets = [{
            label: chartOptions.title,
            data: Object.values(data),
            backgroundColor: chartOptions.colors[0],
            borderColor: chartOptions.colors[0],
            borderWidth: 1
        }];
    }
    
    // สร้างกราฟ
    const chart = new Chart(ctx, {
        type: chartOptions.horizontal ? 'horizontalBar' : 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartOptions.displayLegend
                },
                title: {
                    display: !!chartOptions.title,
                    text: chartOptions.title
                }
            },
            scales: {
                x: {
                    stacked: chartOptions.stacked,
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: chartOptions.stacked,
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    return chart;
}

// ฟังก์ชันสร้าง QR Code
function generateQRCode(elementId, data, options = {}) {
    const defaultOptions = {
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    };
    
    const qrOptions = { ...defaultOptions, ...options };
    
    // ลบข้อมูลเดิมก่อนสร้างใหม่
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        new QRCode(element, {
            text: data,
            width: qrOptions.width,
            height: qrOptions.height,
            colorDark: qrOptions.colorDark,
            colorLight: qrOptions.colorLight,
            correctLevel: qrOptions.correctLevel
        });
    }
}

// ฟังก์ชันจัดรูปแบบเงินบาท
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2
    }).format(amount);
}

// ฟังก์ชันจัดรูปแบบวันที่
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', options);
}

// ฟังก์ชันคำนวณอัตราการออกไข่
function calculateEggRate(eggsCount, chickensCount, days = 1) {
    if (!chickensCount || chickensCount <= 0) return 0;
    return ((eggsCount / chickensCount) / days) * 100;
}

// ฟังก์ชันจัดการการแจ้งเตือน
function setupNotifications() {
    // ตรวจสอบและอัปเดตการแจ้งเตือนทุก 5 นาที
    setInterval(function() {
        fetch('/api/notifications/unread')
            .then(response => response.json())
            .then(data => {
                if (data.count > 0) {
                    // อัปเดตตัวเลขการแจ้งเตือน
                    const notificationBadge = document.getElementById('notification-badge');
                    if (notificationBadge) {
                        notificationBadge.textContent = data.count;
                        notificationBadge.classList.remove('hidden');
                    }
                    
                    // เพิ่มการแจ้งเตือนใหม่ลงใน dropdown
                    const notificationList = document.getElementById('notification-list');
                    if (notificationList && data.notifications && data.notifications.length > 0) {
                        notificationList.innerHTML = ''; // ล้างรายการเดิม
                        
                        data.notifications.forEach(notification => {
                            const item = document.createElement('a');
                            item.href = '#';
                            item.className = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
                            item.dataset.id = notification.id;
                            
                            item.innerHTML = `
                                <div class="flex items-start">
                                    <div class="flex-shrink-0">
                                        <span class="w-2 h-2 rounded-full bg-${notification.type === 'อาหาร' ? 'yellow' : notification.type === 'สุขภาพ' ? 'red' : 'green'}-500 inline-block mt-1.5 mr-2"></span>
                                    </div>
                                    <div>
                                        <p class="font-medium">${notification.title}</p>
                                        <p class="text-gray-500 text-xs mt-0.5">${formatDate(notification.created_at)}</p>
                                    </div>
                                </div>
                            `;
                            
                            // เพิ่ม event listener สำหรับการคลิกที่การแจ้งเตือน
                            item.addEventListener('click', function(e) {
                                e.preventDefault();
                                markNotificationAsRead(notification.id);
                            });
                            
                            notificationList.appendChild(item);
                        });
                    }
                }
            })
            .catch(error => console.error('Error fetching notifications:', error));
    }, 300000); // ทุก 5 นาที (300,000 มิลลิวินาที)
}

// ฟังก์ชันทำเครื่องหมายการแจ้งเตือนว่าอ่านแล้ว
function markNotificationAsRead(notificationId) {
    fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // อ่านการแจ้งเตือนสำเร็จ
            const notification = document.querySelector(`[data-id="${notificationId}"]`);
            if (notification) {
                notification.classList.add('bg-gray-50');
                // อาจเปลี่ยนเส้นทางไปยังหน้าที่เกี่ยวข้องตาม data.redirect_url
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                }
            }
        }
    })
    .catch(error => console.error('Error marking notification as read:', error));
} 