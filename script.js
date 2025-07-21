// ฟังก์ชันสำหรับเมนูมือถือ
function toggleMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
    body.classList.toggle('menu-open');
}

// ฟังก์ชันสำหรับเปลี่ยนภาษา
let currentLang = 'th';

function switchLanguage() {
    const elements = document.querySelectorAll('[data-th]');
    const newLang = currentLang === 'th' ? 'en' : 'th';
    
    elements.forEach(element => {
        element.classList.add('switching');
        setTimeout(() => {
            element.textContent = element.getAttribute(`data-${newLang}`);
            element.classList.remove('switching');
        }, 150);
    });
    
    currentLang = newLang;
}

// ฟังก์ชันสำหรับ Dark Mode
function toggleTheme() {
    const body = document.documentElement;
    const isDark = body.getAttribute('data-theme') === 'dark';
    const themeToggle = document.getElementById('themeToggle');
    
    if (isDark) {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    }
}

// แอนิเมชั่นเมื่อเลื่อนหน้า
function handleScroll() {
    const elements = document.querySelectorAll('.fade-in');
    const windowHeight = window.innerHeight;
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('visible');
        }
    });
}

// ฟังก์ชันสำหรับการเลื่อนแบบนุ่มนวล
function smoothScroll(target) {
    const element = document.querySelector(target);
    const headerOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Project Modal Functions
function showProjectDetails(projectId) {
    const modal = document.getElementById(projectId + '-modal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal when clicking the close button or outside the modal
document.addEventListener('DOMContentLoaded', function() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    closeButtons.forEach(button => {
        button.onclick = function() {
            const modal = button.closest('.modal');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    modals.forEach(modal => {
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
});

// Image Preview Functions
document.addEventListener('DOMContentLoaded', function() {
    const previewImages = document.querySelectorAll('.image-preview img');
    
    previewImages.forEach(img => {
        img.onclick = function() {
            const mainImage = img.closest('.project-images').querySelector('.main-image');
            const tempSrc = mainImage.src;
            mainImage.src = img.src;
            img.src = tempSrc;
        }
    });
});

// เพิ่ม Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // เพิ่มคลาส fade-in ให้กับทุกเซ็กชัน
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('fade-in');
    });
    
    // ตั้งค่า Event Listeners
    document.getElementById('menuToggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('langToggle').addEventListener('click', switchLanguage);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // จัดการการเลื่อนแบบนุ่มนวล
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = anchor.getAttribute('href');
            smoothScroll(target);
            
            // ปิดเมนูมือถือถ้าเปิดอยู่
            const navLinks = document.querySelector('.nav-links');
            if (navLinks.classList.contains('active')) {
                toggleMobileMenu();
            }
        });
    });
    
    // เรียกใช้ handleScroll ครั้งแรก
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    
    // ตรวจสอบธีมที่บันทึกไว้
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // เพิ่มแอนิเมชั่นให้กับการ์ด
    const cards = document.querySelectorAll('.skill-card, .project-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px)';
            card.style.boxShadow = '0 15px 40px var(--shadow-color)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 10px 30px var(--shadow-color)';
        });
    });
    
    // เพิ่มแอนิเมชั่น Parallax สำหรับ Hero Section
    const heroContent = document.querySelector('.hero-content');
    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth - 0.5;
        const mouseY = e.clientY / window.innerHeight - 0.5;
        
        heroContent.style.transform = `
            translate(${mouseX * 20}px, ${mouseY * 20}px)
            rotateX(${mouseY * 10}deg) rotateY(${mouseX * 10}deg)
        `;
    });
}); 