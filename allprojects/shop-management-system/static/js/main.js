/**
 * main.js - ไฟล์ JavaScript หลักสำหรับระบบจัดการฟาร์มไก่
 */

document.addEventListener('DOMContentLoaded', function() {
    // เริ่มต้นไอคอน Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('show');
        });
    }
    
    // ตั้งค่า NProgress (Loading indicator)
    if (typeof NProgress !== 'undefined') {
        NProgress.configure({ showSpinner: false });
        
        // ใช้งาน loading indicator กับลิงก์
        const links = document.querySelectorAll('a:not([target="_blank"])');
        links.forEach(link => {
            link.addEventListener('click', function() {
                // ไม่ใช้งาน loading สำหรับลิงก์ที่มี # หรือ javascript:
                if (this.getAttribute('href').startsWith('#') || 
                    this.getAttribute('href').startsWith('javascript:')) return;
                NProgress.start();
            });
        });

        // ใช้งาน loading indicator กับฟอร์ม
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', function() {
                NProgress.start();
            });
        });
    }
    
    // จัดการ Dropdown selects ให้มี style ที่สวยงาม
    setupCustomDropdowns();
    
    // จัดการ Flash messages ให้หายไปอัตโนมัติ
    setupFlashMessages();
    
    // จัดการ Table sorting
    setupTableSorting();
    
    // จัดการแสดงรูปภาพก่อน upload
    setupImagePreviews();
    
    // จัดรูปแบบตัวเลขทั้งหมดในหน้าเว็บ
    formatNumbersOnPage();
    
    // ตั้งค่าระบบยืนยันการลบ
    setupDeleteConfirmation();
});

/**
 * ฟังก์ชันสร้าง Dropdown ที่สวยงาม
 */
function setupCustomDropdowns() {
    const selects = document.querySelectorAll('select:not(.no-style)');
    
    selects.forEach(select => {
        const existingWrapper = select.parentElement.classList.contains('relative');
        
        if (!existingWrapper) {
            const wrapper = document.createElement('div');
            wrapper.className = 'relative';
            
            const icon = document.createElement('div');
            icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>';
            icon.className = 'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3';
            
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);
            wrapper.appendChild(icon);
        }
    });
}

/**
 * ฟังก์ชันทำให้ Flash messages หายไปอัตโนมัติหลังจากแสดงได้สักพัก
 */
function setupFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.classList.add('opacity-0');
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
}

/**
 * ฟังก์ชันเพิ่มความสามารถในการเรียงลำดับตาราง
 */
function setupTableSorting() {
    const tables = document.querySelectorAll('table.sortable');
    
    tables.forEach(table => {
        const headers = table.querySelectorAll('th.sortable');
        
        headers.forEach(header => {
            header.addEventListener('click', function() {
                const index = Array.from(header.parentNode.children).indexOf(header);
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));
                
                const isNumeric = header.classList.contains('numeric');
                const isDate = header.classList.contains('date');
                const isAscending = !header.classList.contains('asc');
                
                // เปลี่ยนสถานะการเรียง
                headers.forEach(h => {
                    h.classList.remove('asc', 'desc');
                });
                
                header.classList.add(isAscending ? 'asc' : 'desc');
                
                // เรียงข้อมูล
                rows.sort((a, b) => {
                    let aValue = a.children[index].textContent.trim();
                    let bValue = b.children[index].textContent.trim();
                    
                    if (isNumeric) {
                        aValue = parseFloat(aValue.replace(/[^\d.-]/g, ''));
                        bValue = parseFloat(bValue.replace(/[^\d.-]/g, ''));
                    } else if (isDate) {
                        aValue = new Date(aValue);
                        bValue = new Date(bValue);
                    }
                    
                    if (aValue < bValue) return isAscending ? -1 : 1;
                    if (aValue > bValue) return isAscending ? 1 : -1;
                    return 0;
                });
                
                // แสดงข้อมูลใหม่
                rows.forEach(row => tbody.appendChild(row));
            });
        });
    });
}

/**
 * ฟังก์ชันแสดงภาพตัวอย่างก่อนอัปโหลด
 */
function setupImagePreviews() {
    const imageInputs = document.querySelectorAll('input[type="file"][data-preview]');
    
    imageInputs.forEach(input => {
        const previewId = input.getAttribute('data-preview');
        const preview = document.getElementById(previewId);
        
        if (preview) {
            input.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        preview.src = e.target.result;
                        preview.classList.remove('hidden');
                    };
                    
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }
    });
}

/**
 * ฟังก์ชันยืนยันก่อนลบข้อมูล
 * @param {string} message - ข้อความที่จะแสดงให้ผู้ใช้ยืนยัน
 * @returns {boolean} - คืนค่า true ถ้าผู้ใช้ยืนยัน
 */
function confirmDelete(message) {
    return confirm(message || 'คุณต้องการลบข้อมูลนี้ใช่หรือไม่?');
}

/**
 * ฟังก์ชันค้นหาและกรองข้อมูลในตาราง
 * @param {string} inputId - ID ของช่องค้นหา
 * @param {string} tableId - ID ของตาราง
 */
function setupTableFilter(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    
    if (input && table) {
        input.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                let text = row.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? '' : 'none';
            });
        });
    }
}

/**
 * สร้างแผนภูมิโดยใช้ Chart.js
 * @param {string} canvasId - ID ของ canvas element
 * @param {Object} config - การตั้งค่าแผนภูมิ
 */
function createChart(canvasId, config) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        new Chart(canvas, config);
    }
}

/**
 * ฟังก์ชันจัดรูปแบบตัวเลขในหน้าเว็บ (เพิ่มเครื่องหมายคอมม่า)
 * ค้นหาและจัดรูปแบบตัวเลขทั้งหมดที่ไม่อยู่ใน input fields
 */
function formatNumbersOnPage() {
    // รับทุก text node ในหน้าเว็บ
    const textNodes = getTextNodesIn(document.body);
    
    // ค้นหาตัวเลขและเพิ่มเครื่องหมายคอมม่า
    textNodes.forEach(node => {
        // ข้ามโหนดที่อยู่ใน script, style, input, textarea, select
        if (isInSkipElement(node)) return;
        
        // แก้ไขเฉพาะโหนดที่มีตัวเลข
        const text = node.nodeValue;
        if (/\d{4,}/.test(text)) {
            // แปลงตัวเลขที่มีมากกว่า 3 หลักให้มีเครื่องหมายคอมม่า
            node.nodeValue = text.replace(/(\d+)(\.\d+)?/g, function(match, number, decimal) {
                // ไม่แปลงถ้าเป็นส่วนหนึ่งของวันที่, เวลา, หรือรหัส
                if (isPartOfDateOrCode(match, text)) return match;
                
                // แปลงตัวเลขให้มีเครื่องหมายคอมม่า
                const formattedNumber = parseInt(number).toLocaleString('th-TH');
                return formattedNumber + (decimal || '');
            });
        }
    });
}

/**
 * ค้นหา text nodes ทั้งหมดภายใน element
 * @param {Element} element - element ที่ต้องการค้นหา text nodes
 * @returns {Array} - array ของ text nodes
 */
function getTextNodesIn(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    return textNodes;
}

/**
 * ตรวจสอบว่า node อยู่ใน element ที่ต้องการข้ามหรือไม่
 * @param {Node} node - text node ที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้า node อยู่ใน element ที่ต้องข้าม
 */
function isInSkipElement(node) {
    let parent = node.parentNode;
    const skipTags = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION'];
    
    while (parent) {
        if (skipTags.includes(parent.tagName)) {
            return true;
        }
        parent = parent.parentNode;
    }
    
    return false;
}

/**
 * ตรวจสอบว่าตัวเลขเป็นส่วนหนึ่งของวันที่, เวลา, หรือรหัสหรือไม่
 * @param {string} match - ตัวเลขที่จับคู่ได้
 * @param {string} fullText - ข้อความเต็ม
 * @returns {boolean} - true ถ้าเป็นส่วนหนึ่งของวันที่, เวลา, หรือรหัส
 */
function isPartOfDateOrCode(match, fullText) {
    // เช็คว่าเป็นรูปแบบวันที่หรือไม่
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/;
    // เช็คว่าเป็นรูปแบบเวลาหรือไม่
    const timePattern = /\d{1,2}:\d{2}(:\d{2})?/;
    // เช็คว่าเป็นรหัสหรือไม่ (เช่น รหัสไปรษณีย์, รหัสสินค้า)
    const codePattern = /[A-Za-z]{1,5}\d{4,}/;
    
    return datePattern.test(fullText) || timePattern.test(fullText) || codePattern.test(fullText);
}

/**
 * ฟังก์ชันสร้างและจัดการ Modal ยืนยันการลบที่สวยงาม
 * สามารถใช้งานได้ทั่วทั้งระบบ
 */
function setupDeleteConfirmation() {
    // เช็คว่าในหน้ามี Modal ยืนยันการลบอยู่แล้วหรือไม่
    let confirmModal = document.getElementById('global-delete-confirm-modal');
    
    // ถ้ายังไม่มี Modal ให้สร้างขึ้นมาใหม่
    if (!confirmModal) {
        // สร้าง DOM element ของ Modal
        confirmModal = document.createElement('div');
        confirmModal.id = 'global-delete-confirm-modal';
        confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden backdrop-blur-sm transition-all duration-300 opacity-0';
        
        // HTML ของ Modal
        confirmModal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full transform scale-95 transition-all duration-300 border-t-4 border-red-500">
                <div class="text-center mb-6">
                    <div class="bg-red-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-5 transform transition-transform hover:scale-105">
                        <i data-feather="trash-2" class="h-12 w-12 text-red-500"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบข้อมูล</h3>
                    <p class="text-gray-600 mt-2 mb-3">คุณต้องการลบข้อมูลนี้ใช่หรือไม่?</p>
                    <div class="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg mb-2">
                        <i data-feather="alert-triangle" class="h-5 w-5"></i>
                        <p class="text-sm">การกระทำนี้ไม่สามารถยกเลิกได้</p>
                    </div>
                </div>
                <div class="flex justify-center gap-4">
                    <button id="global-cancel-delete" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium flex-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300">
                        ยกเลิก
                    </button>
                    <button id="global-confirm-delete" class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium flex-1 hover:shadow-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500">
                        <i data-feather="trash-2" class="h-4 w-4 mr-2"></i>
                        ยืนยันการลบ
                    </button>
                </div>
            </div>
        `;
        
        // เพิ่ม Modal เข้าไปใน DOM
        document.body.appendChild(confirmModal);
        
        // ต้องเรียก feather.replace() อีกครั้งเพื่อให้ไอคอนแสดงผล
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    const modalContent = confirmModal.querySelector('div');
    const cancelBtn = document.getElementById('global-cancel-delete');
    const confirmBtn = document.getElementById('global-confirm-delete');
    let currentForm = null;
    let currentItemName = '';
    let deleteCallback = null;
    
    // ฟังก์ชันแสดง Modal
    window.showDeleteConfirmation = function(itemName, formElement, callback) {
        currentItemName = itemName || 'รายการนี้';
        const titleElement = confirmModal.querySelector('p.text-gray-600');
        titleElement.textContent = `คุณต้องการลบ${currentItemName}ใช่หรือไม่?`;
        
        // เก็บฟอร์มหรือ callback ไว้ใช้ตอนยืนยัน
        if (formElement) {
            currentForm = formElement;
            deleteCallback = null;
        } else if (callback && typeof callback === 'function') {
            deleteCallback = callback;
            currentForm = null;
        }
        
        confirmModal.classList.remove('hidden');
        setTimeout(() => {
            confirmModal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
            modalContent.classList.add('scale-100');
        }, 10);
    };
    
    // ฟังก์ชันซ่อน Modal
    const hideModal = function() {
        confirmModal.classList.add('opacity-0');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
        setTimeout(() => {
            confirmModal.classList.add('hidden');
        }, 300);
    };
    
    // ปุ่มยกเลิกการลบ
    cancelBtn.addEventListener('click', hideModal);
    
    // ปุ่มยืนยันการลบ
    confirmBtn.addEventListener('click', function() {
        this.classList.add('scale-95');
        setTimeout(() => {
            if (currentForm) {
                currentForm.submit();
            } else if (deleteCallback) {
                deleteCallback();
            }
        }, 150);
    });
    
    // ปิด Modal เมื่อคลิกพื้นหลัง
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            hideModal();
        }
    });
    
    // ตั้งค่า form และปุ่มลบทั้งหมดในหน้า
    setupDeleteButtons();
}

/**
 * ตั้งค่าปุ่มลบทั้งหมดในหน้าให้แสดง Modal ยืนยันการลบ
 */
function setupDeleteButtons() {
    // จัดการ form ที่ใช้สำหรับการลบด้วย method="POST" และมี action ที่มีคำว่า delete หรือ remove
    const deleteForms = document.querySelectorAll('form[action*="delete"], form[action*="remove"]');
    
    deleteForms.forEach(form => {
        // ข้ามถ้ามีการตั้งค่า onsubmit ไว้แล้ว
        if (form.hasAttribute('onsubmit')) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // พยายามหาชื่อของรายการที่จะลบ
            let itemName = '';
            const nameAttr = this.getAttribute('data-item-name');
            if (nameAttr) {
                itemName = nameAttr;
            } else {
                // พยายามหาจากตำแหน่งข้อมูลใกล้เคียง
                const nearbyRow = this.closest('tr');
                if (nearbyRow) {
                    const nameCell = nearbyRow.querySelector('td:first-child, td:nth-child(2)');
                    if (nameCell) itemName = nameCell.textContent.trim();
                }
            }
            
            if (itemName) {
                itemName = `ข้อมูล "${itemName}"`;
            } else {
                itemName = 'ข้อมูลนี้';
            }
            
            window.showDeleteConfirmation(itemName, this);
        });
    });
    
    // จัดการปุ่มที่มี class delete-btn หรือ remove-btn
    const deleteButtons = document.querySelectorAll('.delete-btn, .remove-btn, [data-action="delete"]');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // พยายามหาชื่อของรายการที่จะลบ
            let itemName = this.getAttribute('data-item-name') || 'ข้อมูลนี้';
            
            // หา URL สำหรับลบจาก data attribute หรือ href
            const deleteUrl = this.getAttribute('data-delete-url') || this.getAttribute('href');
            
            if (deleteUrl) {
                window.showDeleteConfirmation(itemName, null, function() {
                    // สร้างและส่ง form ไปลบข้อมูล
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = deleteUrl;
                    document.body.appendChild(form);
                    form.submit();
                });
            }
        });
    });
}

// เพิ่ม animation เมื่อกดปุ่ม
function addButtonPressEffects() {
    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
    buttons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.classList.add('scale-95');
        });
        button.addEventListener('mouseup', function() {
            this.classList.remove('scale-95');
        });
        button.addEventListener('mouseleave', function() {
            this.classList.remove('scale-95');
        });
    });
} 