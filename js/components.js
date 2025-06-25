// Komponenty loader
class ComponentLoader {
    constructor() {
        this.cache = new Map();
    }

    async loadComponent(path) {
        // Pokud je komponenta v cache, vrátíme ji
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${path}`);
            }
            const html = await response.text();
            
            // Uložíme do cache
            this.cache.set(path, html);
            return html;
        } catch (error) {
            console.error('Error loading component:', error);
            return '';
        }
    }

    async insertHeader(selector = '#header-placeholder') {
        const element = document.querySelector(selector);
        if (element) {
            const currentPath = window.location.pathname;
            const depth = (currentPath.match(/\//g) || []).length - 1;
            const prefix = depth > 0 ? '../'.repeat(depth) : '';
            
            const headerHtml = await this.loadComponent(prefix + 'components/header.html');
            element.innerHTML = headerHtml;
            
            // Znovu inicializuj mobile menu po vložení headeru
            this.initMobileMenu();
        }
    }

    async insertFooter(selector = '#footer-placeholder') {
        const element = document.querySelector(selector);
        if (element) {
            const currentPath = window.location.pathname;
            const depth = (currentPath.match(/\//g) || []).length - 1;
            const prefix = depth > 0 ? '../'.repeat(depth) : '';
            
            const footerHtml = await this.loadComponent(prefix + 'components/footer.html');
            element.innerHTML = footerHtml;
            
            // Inicializuj footer formulář
            this.initFooterForm();
        }
    }

    // Inicializace mobile menu
    initMobileMenu() {
        const button = document.querySelector('.mobile-menu-button');
        const menu = document.querySelector('.mobile-menu');
        
        if (!button || !menu) return;

        const iconClosed = button.querySelector('svg:first-of-type');
        const iconOpen = button.querySelector('svg:last-of-type');

        button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                menu.classList.add('hidden');
                iconClosed.classList.remove('hidden');
                iconOpen.classList.add('hidden');
                button.setAttribute('aria-expanded', 'false');
            } else {
                menu.classList.remove('hidden');
                iconClosed.classList.add('hidden');
                iconOpen.classList.remove('hidden');
                button.setAttribute('aria-expanded', 'true');
            }
        });

        // Zavřít menu při kliknutí na odkaz
        const menuLinks = menu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.add('hidden');
                iconClosed.classList.remove('hidden');
                iconOpen.classList.add('hidden');
                button.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Inicializace footer formuláře
    initFooterForm() {
        const form = document.querySelector('footer form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]').value;
                
                if (email) {
                    // Zde můžete přidat logiku pro odeslání emailu
                    alert('Děkujeme za váš zájem! Brzy se vám ozveme.');
                    form.reset();
                } else {
                    alert('Prosím zadejte platný e-mail.');
                }
            });
        }
    }

    // Oprava relativních cest v komponentách podle aktuální stránky
    fixRelativePaths() {
        const currentPath = window.location.pathname;
        const depth = (currentPath.match(/\//g) || []).length - 1;
        
        if (depth > 0) {
            const prefix = '../'.repeat(depth);
            
            // Oprava cest pro obrázky
            document.querySelectorAll('img[src^="images/"]').forEach(img => {
                img.src = prefix + img.getAttribute('src');
            });
            
            // Oprava cest pro odkazy
            document.querySelectorAll('a[href$=".html"]').forEach(link => {
                if (!link.href.includes('://') && !link.href.startsWith('#') && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:')) {
                    const href = link.getAttribute('href');
                    if (!href.startsWith('/') && !href.startsWith('../')) {
                        link.href = prefix + href;
                    }
                }
            });
        }
    }

    // Hlavní inicializační metoda
    async init() {
        await Promise.all([
            this.insertHeader(),
            this.insertFooter()
        ]);
        
        // Oprava cest po načtení komponent
        this.fixRelativePaths();
    }
}

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ComponentLoader();
    loader.init();
});

// Export pro případné další použití
window.ComponentLoader = ComponentLoader;
