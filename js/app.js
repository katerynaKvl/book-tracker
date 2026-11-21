/*Фреймворк Vue3 обрано через можливість швидкого підключення через CDN 
без необхідності налаштування складних локальних збірок (Node.js/Vite), 
що дозволяє повноцінно реалізувати компонентний підхід для навчального завдання. 
*/

console.log('app.js підключено');

const API_URL = 'https://openlibrary.org/search.json?q=harrypotter';

/* ==========================================
   РОБОТА З LOCALSTORAGE (Кроки 2-3)
   ========================================== */
function saveToLocalStorage(items) {
    try {
        localStorage.setItem('appItems', JSON.stringify(items));
    } catch (error) {
        console.error('Помилка збереження в localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem('appItems');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

/* ==========================================
   РОБОТА З INDEXEDDB (Кроки 5, 6, 7, 8, 11)
   ========================================== */
const DB_NAME = 'BooksDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

// Відкриття бази даних з обробником onupgradeneeded та обгорткою в Promise
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// CRUD - Отримати всі записи (readonly)
async function getAllItems() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('IndexedDB недоступна (можливо, режим інкогніто):', error);
        throw new Error('IndexedDB недоступна. Перевірте налаштування браузера.');
    }
}

// CRUD - Додати або оновити запис через put (readwrite)
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// CRUD - Видалити запис за id (readwrite)
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Допоміжна функція нормалізації прогресу (гарантує коректні currentPage та pages)
function normalizeBookProgress(book) {
    const totalPages = Math.max(1, Number(book.pages) || 1);
    let current = Number(book.currentPage);

    if (Number.isNaN(current)) {
        if (book.status === 'completed' || book.finished) {
            current = totalPages;
        } else if (book.status === 'reading') {
            current = Math.round(totalPages * 0.25);
        } else {
            current = 0;
        }
    }

    current = Math.min(Math.max(0, current), totalPages);
    return {
        ...book,
        pages: totalPages,
        currentPage: current
    };
}

/* 
  Дочірній компонент BookRow (Пр. 12, Варіант 9).
  Відображає анімований CSS-прогрес-бар читання «сторінка X із Y» на основі реальних даних книги
  та дозволяє оновлювати поточну сторінку з плавною анімацією через transition.
*/
const BookRow = {
    props: ['book'],
    emits: ['toggle-status', 'delete-book', 'update-progress'],
    data() {
        return {
            draftPage: this.book.currentPage ?? 0
        };
    },
    watch: {
        'book.currentPage'(newVal) {
            this.draftPage = newVal ?? 0;
        },
        'book.pages'() {
            if (this.draftPage > this.book.pages) {
                this.draftPage = this.book.pages;
            }
        }
    },
    computed: {
        totalPages() {
            return Math.max(1, Number(this.book.pages) || 1);
        },
        currentPageSafe() {
            const val = Number(this.book.currentPage) || 0;
            return Math.min(Math.max(0, val), this.totalPages);
        },
        progressPercent() {
            return Math.round((this.currentPageSafe / this.totalPages) * 100);
        }
    },
    methods: {
        commitProgress() {
            const clamped = Math.min(Math.max(0, Number(this.draftPage) || 0), this.totalPages);
            this.draftPage = clamped;
            this.$emit('update-progress', this.book.id, clamped);
        }
    },
    template: `
        <article class="card" :data-pages="book.pages" :class="{ unread: !book.finished }">
            <div class="cover-placeholder">Обкладинка</div>
            <h3>{{ book.title }}</h3>
            <p class="author">{{ book.author }}</p>

            <!-- Пр. 12 (Варіант 9): Прогрес-бар читання «сторінка X із Y» з CSS transition -->
            <div class="reading-progress" :aria-label="'Прогрес читання: сторінка ' + currentPageSafe + ' із ' + totalPages">
                <div class="reading-progress__header">
                    <span>стор. {{ currentPageSafe }} із {{ totalPages }}</span>
                    <span>{{ progressPercent }}%</span>
                </div>
                <div class="reading-progress__track">
                    <div 
                        class="reading-progress__fill" 
                        :class="'progress-' + book.status"
                        :style="{ width: progressPercent + '%' }"
                    ></div>
                </div>
                <div class="reading-progress__controls">
                    <label :for="'page-input-' + book.id" class="sr-only">Поточна сторінка</label>
                    <input
                        :id="'page-input-' + book.id"
                        type="number"
                        class="page-progress-input"
                        min="0"
                        :max="totalPages"
                        v-model.number="draftPage"
                        @change="commitProgress"
                        @keyup.enter="commitProgress"
                        title="Введіть поточну сторінку та натисніть Enter або вийдіть з поля"
                    />
                    <button
                        type="button"
                        class="update-progress-btn"
                        @click="commitProgress"
                        title="Оновити прогрес сторінки"
                    >
                        Ок
                    </button>
                </div>
            </div>

            <div class="status-wrapper" style="display: flex; flex-direction: column; gap: 8px;">
                <select 
                    class="book-status-select" 
                    :class="'status-' + book.status"
                    :value="book.status"
                    @change="$emit('toggle-status', book.id, $event.target.value)"
                >
                    <option value="reading">Читаю</option>
                    <option value="completed">Прочитано</option>
                    <option value="planned">В планах</option>
                    <option value="gaveup">Закинуто</option>
                </select>
                <button 
                    type="button" 
                    class="delete-book-btn" 
                    @click="$emit('delete-book', book.id)"
                >
                    Видалити
                </button>
            </div>
        </article>
    `
};

/* Головний застосунок Vue */
const App = {
    data() {
        return {
            books: [],
            // Поля форми додавання книги
            formTitle: '',
            formAuthor: '',
            formPages: '',
            formCurrentPage: 0,
            formStatus: 'reading',
            // Стани для API запитів
            apiMessage: '',
            isApiError: false,
            isLoading: false
        };
    },
    computed: {
        completedCount() {
            return this.books.filter(b => b.status === 'completed').length;
        },
        readingCount() {
            return this.books.filter(b => b.status === 'reading').length;
        },
        gaveupCount() {
            return this.books.filter(b => b.status === 'gaveup').length;
        }
    },
    async mounted() {
        // Початкові дефолтні дані з урахуванням поточного прогресу (сторінка X із Y)
        const defaultBooks = [
            { id: 1, title: 'Елегантний всесвіт', author: 'Браян Грін', pages: 400, currentPage: 140, finished: false, status: 'reading' },
            { id: 2, title: 'Таємна історія', author: 'Донна Тарт', pages: 560, currentPage: 560, finished: true, status: 'completed' },
            { id: 3, title: 'Ніби ми злодії', author: 'М.Л. Ріо', pages: 430, currentPage: 430, finished: true, status: 'completed' },
            { id: 4, title: 'Оповідь про мистецтво', author: 'Ернст Гомбріх', pages: 990, currentPage: 210, finished: false, status: 'gaveup' },
            { id: 5, title: 'Орландо', author: 'Вірджинія Вульф', pages: 270, currentPage: 0, finished: false, status: 'planned' }
        ];

        try {
            let dbBooks = await getAllItems();

            // Одноразова міграція з localStorage в IndexedDB, якщо база порожня
            if (dbBooks.length === 0) {
                const isMigrated = localStorage.getItem('migrated');
                if (!isMigrated) {
                    const localData = loadFromLocalStorage();
                    const initialItems = (localData && localData.length > 0) ? localData : defaultBooks;
                    
                    for (const book of initialItems) {
                        await addItem(normalizeBookProgress(book));
                    }
                    localStorage.setItem('migrated', 'true');
                    dbBooks = await getAllItems();
                }
            }

            this.books = dbBooks.map(normalizeBookProgress);
            saveToLocalStorage(this.books);

        } catch (error) {
            console.error('Помилка ініціалізації IndexedDB:', error);
            this.apiMessage = 'Увага: IndexedDB недоступна. Використовується localStorage.';
            this.isApiError = true;
            
            const localData = loadFromLocalStorage();
            const fallback = (localData && localData.length > 0) ? localData : defaultBooks;
            this.books = fallback.map(normalizeBookProgress);
        }
    },
    methods: {
        // Оновлення статусу книги та синхронізація прогресу (якщо статус "Прочитано")
        async toggleBookStatus(id, newStatus) {
            const book = this.books.find(b => b.id === id);
            if (book) {
                book.status = newStatus;
                book.finished = (newStatus === 'completed');
                if (newStatus === 'completed') {
                    book.currentPage = book.pages;
                }
                
                try {
                    const plainBook = JSON.parse(JSON.stringify(book));
                    await addItem(plainBook);
                    saveToLocalStorage(this.books);
                    console.log('Статус успішно оновлено!');
                } catch (e) {
                    console.error('Помилка оновлення в БД:', e);
                }
            }
        },

        // Пр. 12 (Крок 6): Оновлення прочитаної сторінки X із Y та збереження в БД
        async updateBookProgress(id, newPage) {
            const book = this.books.find(b => b.id === id);
            if (!book) return;

            const totalPages = Math.max(1, Number(book.pages) || 1);
            const clampedPage = Math.min(Math.max(0, Number(newPage) || 0), totalPages);

            book.currentPage = clampedPage;
            if (clampedPage === totalPages && totalPages > 0) {
                book.status = 'completed';
                book.finished = true;
            } else if (book.status === 'completed' && clampedPage < totalPages) {
                book.status = 'reading';
                book.finished = false;
            }

            try {
                const plainBook = JSON.parse(JSON.stringify(book));
                await addItem(plainBook);
                saveToLocalStorage(this.books);
            } catch (e) {
                console.error('Помилка оновлення прогресу в БД:', e);
            }
        },

        // Обробка форми додавання нової книги
        async addNewBook() {
            if (!this.formTitle || !this.formAuthor || !this.formPages) return;

            const totalPages = Math.max(1, Number(this.formPages));
            const isCompleted = this.formStatus === 'completed';
            const initialCurrentPage = isCompleted
                ? totalPages
                : Math.min(Math.max(0, Number(this.formCurrentPage) || 0), totalPages);
            
            const newBook = {
                id: Date.now(),
                title: this.formTitle,
                author: this.formAuthor,
                pages: totalPages,
                currentPage: initialCurrentPage,
                status: this.formStatus,
                finished: isCompleted
            };

            this.books.push(newBook);

            try {
                await addItem(newBook);
                saveToLocalStorage(this.books);
            } catch (e) {
                console.error('Помилка додавання до БД:', e);
            }

            // Очищення полів форми
            this.formTitle = '';
            this.formAuthor = '';
            this.formPages = '';
            this.formCurrentPage = 0;
            this.formStatus = 'reading';
        },

        // Видалення книги з IndexedDB, реактивного стану та localStorage
        async removeBook(id) {
            try {
                await deleteItem(id);
                this.books = this.books.filter(b => b.id !== id);
                saveToLocalStorage(this.books);
            } catch (e) {
                console.error('Помилка видалення книги з БД:', e);
            }
        },

        // Асинхронне завантаження даних із Open Library API 
        async loadBooksData() {
            this.apiMessage = 'Завантаження даних із сервера...';
            this.isApiError = false;
            this.isLoading = true;

            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Помилка серверу: код ${response.status}`);
                }

                const data = await response.json();
                if (!data.docs || data.docs.length === 0) {
                    throw new Error('За запитом нічого не знайдено.');
                }

                const fetchedBooks = data.docs.slice(0, 5).map((item, index) => ({
                    id: Date.now() + index,
                    title: item.title,
                    author: item.author_name ? item.author_name.join(', ') : 'Невідомий автор',
                    pages: item.number_of_pages_median || 300,
                    currentPage: 0,
                    finished: false,
                    status: 'planned'
                }));

                for (const b of fetchedBooks) {
                    this.books.push(b);
                    await addItem(b);
                }
                saveToLocalStorage(this.books);

                this.apiMessage = 'Дані успішно завантажено та збережено.';
            } catch (error) {
                console.error('Деталі помилки запиту:', error);
                if (error.message === 'За запитом нічого не знайдено.') {
                    this.apiMessage = 'За запитом нічого не знайдено.';
                } else if (!navigator.onLine) {
                    this.apiMessage = 'Мережевий збій: перевірте підключення до інтернету.';
                } else {
                    this.apiMessage = 'Не вдалося завантажити дані. Спробуйте пізніше.';
                }
                this.isApiError = true;
            } finally {
                this.isLoading = false;
            }
        }
    }
};

// Створення та монтування Vue-застосунку в елемент #app
const app = Vue.createApp(App);
app.component('book-row', BookRow);
app.mount('#app');