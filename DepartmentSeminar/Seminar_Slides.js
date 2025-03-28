document.addEventListener('DOMContentLoaded', function () {
    // ====================================
    // Core Presentation Variables
    // ====================================
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;

    // Find the current active slide
    slides.forEach((slide, index) => {
        if (slide.classList.contains('active')) {
            currentSlide = index;
        }
    });

    // ====================================
    // UI Elements
    // ====================================
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slideSlider = document.getElementById('slideSlider');
    const sliderLabel = document.getElementById('sliderLabel');
    const sideNavToggle = document.getElementById('sideNavToggle');
    const closeNav = document.getElementById('closeNav');
    const sideNav = document.getElementById('sideNav');
    const sideNavContent = document.getElementById('sideNavContent');

    // ====================================
    // Core Navigation Function
    // ====================================
    function showSlide(index) {
        // Store old slide index for event triggers
        const oldIndex = currentSlide;

        // Hide all slides
        slides.forEach(slide => {
            slide.classList.remove('active');
        });

        // Ensure index is within bounds
        if (index < 0) index = 0;
        if (index >= slides.length) index = slides.length - 1;

        // Show the selected slide
        slides[index].classList.add('active');
        currentSlide = index;

        // Trigger change event for all UI updates
        triggerSlideChanged(oldIndex, currentSlide);
    }

    // Event handler for slide changes - updates all UI elements
    function triggerSlideChanged(oldIndex, newIndex) {
        updateProgressBar();
        updateSlider();
        updateSideNavActive();
    }

    // ====================================
    // Button Navigation
    // ====================================
    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            showSlide(currentSlide - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            showSlide(currentSlide + 1);
        });
    }

    // ====================================
    // Keyboard Navigation
    // ====================================
    document.addEventListener('keydown', function (e) {
        // If an input element is focused, don't handle keyboard navigation
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        if (e.key === 'ArrowLeft') {
            showSlide(currentSlide - 1);
        } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            showSlide(currentSlide + 1);
        } else if (e.key === 'Home') {
            showSlide(0);
        } else if (e.key === 'End') {
            showSlide(slides.length - 1);
        } else if (e.key === 'm' || e.key === 'M') {
            toggleSideNav();
        }
    });

    // ====================================
    // Agenda and Section Navigation
    // ====================================
    function setupAgendaLinks() {
        const agendaLinks = document.querySelectorAll('.agenda-link');
        agendaLinks.forEach(link => {
            link.addEventListener('click', function () {
                const section = parseInt(this.getAttribute('data-section'));
                navigateToSection(section);
            });
        });
    }

    function navigateToSection(sectionNumber) {
        // Find the corresponding section slide
        slides.forEach((slide, index) => {
            if (slide.classList.contains('section-slide') &&
                slide.querySelector('h2') &&
                slide.querySelector('h2').textContent.startsWith(`${sectionNumber}.`)) {
                showSlide(index);
            }
        });
    }

    function setupNavigationLinks() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function () {
                const target = this.getAttribute('data-goto');
                if (target === 'agenda') {
                    navigateToAgenda();
                }
            });
        });
    }

    function navigateToAgenda() {
        // Find the agenda slide
        slides.forEach((slide, index) => {
            if (slide.querySelector('h2') &&
                slide.querySelector('h2').textContent === 'Presentation Agenda') {
                showSlide(index);
            }
        });
    }

    // Initialize navigation links
    setupAgendaLinks();
    setupNavigationLinks();

    // ====================================
    // Touch Navigation
    // ====================================
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe left - next slide
            showSlide(currentSlide + 1);
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe right - previous slide
            showSlide(currentSlide - 1);
        }
    }

    // ====================================
    // Progress Bar
    // ====================================
    function createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        document.body.appendChild(progressBar);
        return progressBar;
    }

    const progressBar = createProgressBar();

    function updateProgressBar() {
        const progress = (currentSlide / (slides.length - 1)) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // Initialize progress bar
    updateProgressBar();

    // ====================================
    // Slider Navigation
    // ====================================
    function setupSlider() {
        if (!slideSlider) return;

        // Set max value based on actual slide count
        slideSlider.max = slides.length;

        // Listen for slider changes
        slideSlider.addEventListener('input', function () {
            showSlide(parseInt(this.value) - 1);
        });
    }

    function updateSlider() {
        if (!slideSlider || !sliderLabel) return;

        slideSlider.value = currentSlide + 1;
        sliderLabel.textContent = `${currentSlide + 1} / ${slides.length}`;
    }

    // Initialize slider
    setupSlider();
    updateSlider();

    // ====================================
    // Side Navigation
    // ====================================
    function toggleSideNav() {
        if (!sideNav) return;

        if (sideNav.classList.contains('open')) {
            sideNav.classList.remove('open');
        } else {
            sideNav.classList.add('open');
        }
    }

    function setupSideNav() {
        if (!sideNavToggle || !closeNav || !sideNav || !sideNavContent) return;

        // Toggle side nav
        sideNavToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleSideNav();
        });

        // Close side nav
        closeNav.addEventListener('click', function () {
            sideNav.classList.remove('open');
        });

        // Click outside to close
        document.addEventListener('click', function (event) {
            if (sideNav.classList.contains('open') &&
                !sideNav.contains(event.target) &&
                event.target !== sideNavToggle &&
                !sideNavToggle.contains(event.target)) {
                sideNav.classList.remove('open');
            }
        });

        // Populate side nav
        populateSideNav();
    }

    function populateSideNav() {
        if (!sideNavContent) return;

        sideNavContent.innerHTML = '';
        let currentSection = '';

        slides.forEach((slide, index) => {
            // Check if it's a section slide
            if (slide.classList.contains('section-slide')) {
                const heading = slide.querySelector('h2');
                if (heading) {
                    currentSection = heading.textContent;
                    const sectionEl = document.createElement('div');
                    sectionEl.className = 'nav-section-title';
                    sectionEl.textContent = currentSection;
                    sideNavContent.appendChild(sectionEl);
                }
            }
            // Regular slide
            else {
                const heading = slide.querySelector('h2');
                const title = heading ? heading.textContent : `Slide ${index + 1}`;

                const slideEl = document.createElement('div');
                slideEl.className = 'nav-slide-item';
                if (index === currentSlide) {
                    slideEl.classList.add('active');
                }
                slideEl.textContent = title;
                slideEl.dataset.index = index;

                slideEl.addEventListener('click', function () {
                    const slideIndex = parseInt(this.dataset.index);
                    showSlide(slideIndex);
                    sideNav.classList.remove('open');
                });

                sideNavContent.appendChild(slideEl);
            }
        });
    }

    function updateSideNavActive() {
        if (!sideNavContent) return;

        const items = sideNavContent.querySelectorAll('.nav-slide-item');
        items.forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.index) === currentSlide) {
                item.classList.add('active');
                // Scroll to make active item visible
                setTimeout(() => {
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 50);
            }
        });
    }

    // Load external components
    function loadExternalComponent(containerId, filePath) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }
        
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading component:', error);
                container.innerHTML = `<p class="error">Failed to load component. Error: ${error.message}</p>`;
            });
    }



    // Load external components
    loadExternalComponent('table-container', 'results-table.html');


    // Initialize side navigation
    setupSideNav();

    // Show initial slide (triggers all UI updates)
    showSlide(currentSlide);
});
